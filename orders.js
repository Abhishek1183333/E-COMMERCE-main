const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth, admin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status
    } = req.query;

    const query = { user: req.user.id };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images specifications')
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order'
    });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', auth, [
  body('shippingAddress.street').trim().isLength({ min: 1 }).withMessage('Street address is required'),
  body('shippingAddress.city').trim().isLength({ min: 1 }).withMessage('City is required'),
  body('shippingAddress.state').trim().isLength({ min: 1 }).withMessage('State is required'),
  body('shippingAddress.zipCode').trim().isLength({ min: 1 }).withMessage('Zip code is required'),
  body('shippingAddress.country').trim().isLength({ min: 1 }).withMessage('Country is required'),
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'paypal', 'stripe', 'cash_on_delivery']).withMessage('Invalid payment method'),
  body('billingAddress').optional().isObject().withMessage('Billing address must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Check product availability and update stock
    for (const cartItem of cart.items) {
      const product = cartItem.product;
      
      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is no longer available`
        });
      }

      if (!product.inStock && !product.inventory.allowBackorder) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is out of stock`
        });
      }

      if (product.inventory.stock < cartItem.quantity && !product.inventory.allowBackorder) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.inventory.stock} items of ${product.name} are available`
        });
      }
    }

    // Create order items
    const orderItems = cart.items.map(cartItem => ({
      product: cartItem.product._id,
      name: cartItem.product.name,
      price: cartItem.price,
      quantity: cartItem.quantity,
      image: cartItem.product.images[0]?.url,
      specifications: cartItem.specifications
    }));

    // Calculate totals
    const totals = cart.calculateTotal();

    // Create order
    const order = new Order({
      user: req.user.id,
      items: orderItems,
      subtotal: totals.subtotal,
      tax: cart.estimatedTax,
      shipping: cart.estimatedShipping,
      discount: cart.couponDiscount,
      totalAmount: totals.total,
      paymentMethod,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      notes,
      couponCode: cart.couponCode
    });

    await order.save();

    // Update product stock and sales count
    for (const cartItem of cart.items) {
      await Product.findByIdAndUpdate(cartItem.product._id, {
        $inc: {
          'inventory.stock': -cartItem.quantity,
          salesCount: cartItem.quantity
        }
      });
    }

    // Clear cart
    await cart.clearCart();

    // Add initial status to history
    order.addStatusHistory('pending', 'Order placed successfully', req.user.id);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order'
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Admin only)
// @access  Private (Admin)
router.put('/:id/status', auth, admin, [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).withMessage('Invalid status'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, note, trackingNumber, estimatedDelivery } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order
    const updateData = { status };
    if (note) updateData.note = note;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (estimatedDelivery) updateData.estimatedDelivery = estimatedDelivery;

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('items.product', 'name images');

    // Add status to history
    await updatedOrder.addStatusHistory(status, note || `Status updated to ${status}`, req.user.id);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order: updatedOrder }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status'
    });
  }
});

// @route   POST /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.post('/:id/cancel', auth, [
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Reason is required and must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { reason } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    // Update order status
    order.status = 'cancelled';
    await order.addStatusHistory('cancelled', reason, req.user.id);

    // Restore product stock
    for (const orderItem of order.items) {
      await Product.findByIdAndUpdate(orderItem.product, {
        $inc: {
          'inventory.stock': orderItem.quantity,
          salesCount: -orderItem.quantity
        }
      });
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling order'
    });
  }
});

// @route   POST /api/orders/:id/refund-request
// @desc    Request refund
// @access  Private
router.post('/:id/refund-request', auth, [
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Reason is required and must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { reason } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Refund can only be requested for delivered orders'
      });
    }

    // Check if refund already requested
    if (order.refundRequest.status !== 'none') {
      return res.status(400).json({
        success: false,
        message: 'Refund already requested'
      });
    }

    // Update refund request
    order.refundRequest = {
      reason,
      status: 'requested',
      requestedAt: new Date(),
      refundAmount: order.totalAmount
    };

    await order.save();

    res.json({
      success: true,
      message: 'Refund request submitted successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Refund request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing refund request'
    });
  }
});

// @route   GET /api/orders/admin/all
// @desc    Get all orders (Admin only)
// @access  Private (Admin)
router.get('/admin/all', auth, admin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      search
    } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
});

module.exports = router;
