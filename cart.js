const express = require('express');
const { body, validationResult } = require('express-validator');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', 'name images price inventory specifications');

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
    }

    const totals = cart.calculateTotal();

    res.json({
      success: true,
      data: {
        cart: {
          ...cart.toObject(),
          ...totals
        }
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching cart'
    });
  }
});

// @route   POST /api/cart/add
// @desc    Add item to cart
// @access  Private
router.post('/add', auth, [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10'),
  body('specifications').optional().isObject().withMessage('Specifications must be an object')
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

    const { productId, quantity, specifications = {} } = req.body;

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is in stock
    if (!product.inStock) {
      return res.status(400).json({
        success: false,
        message: 'Product is out of stock'
      });
    }

    // Check if requested quantity is available
    if (product.inventory.stock < quantity && !product.inventory.allowBackorder) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.inventory.stock} items available in stock`
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Add item to cart
    await cart.addItem(productId, quantity, product.price, specifications);

    // Recalculate totals
    const totals = cart.calculateTotal();

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: {
        cart: {
          ...cart.toObject(),
          ...totals
        }
      }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding item to cart'
    });
  }
});

// @route   PUT /api/cart/update
// @desc    Update cart item quantity
// @access  Private
router.put('/update', auth, [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('quantity').isInt({ min: 0, max: 10 }).withMessage('Quantity must be between 0 and 10'),
  body('specifications').optional().isObject().withMessage('Specifications must be an object')
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

    const { productId, quantity, specifications = {} } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Find the item in cart
    const cartItem = cart.items.find(item => 
      item.product.toString() === productId.toString() &&
      JSON.stringify(item.specifications) === JSON.stringify(specifications)
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // If quantity > 0, check stock availability
    if (quantity > 0) {
      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      if (product.inventory.stock < quantity && !product.inventory.allowBackorder) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.inventory.stock} items available in stock`
        });
      }
    }

    // Update item quantity
    await cart.updateItemQuantity(productId, quantity, specifications);

    // Recalculate totals
    const totals = cart.calculateTotal();

    res.json({
      success: true,
      message: 'Cart updated successfully',
      data: {
        cart: {
          ...cart.toObject(),
          ...totals
        }
      }
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating cart'
    });
  }
});

// @route   DELETE /api/cart/remove
// @desc    Remove item from cart
// @access  Private
router.delete('/remove', auth, [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('specifications').optional().isObject().withMessage('Specifications must be an object')
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

    const { productId, specifications = {} } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.removeItem(productId, specifications);

    // Recalculate totals
    const totals = cart.calculateTotal();

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      data: {
        cart: {
          ...cart.toObject(),
          ...totals
        }
      }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing item from cart'
    });
  }
});

// @route   DELETE /api/cart/clear
// @desc    Clear entire cart
// @access  Private
router.delete('/clear', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.clearCart();

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        cart: {
          ...cart.toObject(),
          subtotal: 0,
          total: 0,
          itemCount: 0
        }
      }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while clearing cart'
    });
  }
});

// @route   POST /api/cart/apply-coupon
// @desc    Apply coupon code
// @access  Private
router.post('/apply-coupon', auth, [
  body('couponCode').trim().isLength({ min: 1 }).withMessage('Coupon code is required')
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

    const { couponCode } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Here you would implement coupon validation logic
    // For now, we'll just apply a simple 10% discount for demo
    if (couponCode === 'SAVE10') {
      const totals = cart.calculateTotal();
      cart.couponCode = couponCode;
      cart.couponDiscount = Math.round(totals.subtotal * 0.1 * 100) / 100;
      await cart.save();

      const newTotals = cart.calculateTotal();

      res.json({
        success: true,
        message: 'Coupon applied successfully',
        data: {
          cart: {
            ...cart.toObject(),
            ...newTotals
          }
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while applying coupon'
    });
  }
});

// @route   DELETE /api/cart/remove-coupon
// @desc    Remove coupon code
// @access  Private
router.delete('/remove-coupon', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.couponCode = undefined;
    cart.couponDiscount = 0;
    await cart.save();

    const totals = cart.calculateTotal();

    res.json({
      success: true,
      message: 'Coupon removed successfully',
      data: {
        cart: {
          ...cart.toObject(),
          ...totals
        }
      }
    });
  } catch (error) {
    console.error('Remove coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing coupon'
    });
  }
});

module.exports = router;
