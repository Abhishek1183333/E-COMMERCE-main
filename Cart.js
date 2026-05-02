const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  specifications: {
    type: Map,
    of: String
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  couponCode: String,
  couponDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  estimatedTax: {
    type: Number,
    default: 0,
    min: 0
  },
  estimatedShipping: {
    type: Number,
    default: 0,
    min: 0
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 86400 * 30 // 30 days
  }
}, {
  timestamps: true
});

// Calculate cart total
cartSchema.methods.calculateTotal = function() {
  const subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + this.estimatedTax + this.estimatedShipping - this.couponDiscount;
  return {
    subtotal,
    total,
    itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0)
  };
};

// Add item to cart
cartSchema.methods.addItem = function(productId, quantity, price, specifications) {
  const existingItem = this.items.find(item => 
    item.product.toString() === productId.toString() &&
    JSON.stringify(item.specifications) === JSON.stringify(specifications)
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({
      product: productId,
      quantity,
      price,
      specifications
    });
  }
  
  return this.save();
};

// Update item quantity
cartSchema.methods.updateItemQuantity = function(productId, quantity, specifications) {
  const item = this.items.find(item => 
    item.product.toString() === productId.toString() &&
    JSON.stringify(item.specifications) === JSON.stringify(specifications)
  );
  
  if (item) {
    if (quantity <= 0) {
      this.items = this.items.filter(item => 
        !(item.product.toString() === productId.toString() &&
          JSON.stringify(item.specifications) === JSON.stringify(specifications))
      );
    } else {
      item.quantity = quantity;
    }
  }
  
  return this.save();
};

// Remove item from cart
cartSchema.methods.removeItem = function(productId, specifications) {
  this.items = this.items.filter(item => 
    !(item.product.toString() === productId.toString() &&
      JSON.stringify(item.specifications) === JSON.stringify(specifications))
  );
  return this.save();
};

// Clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.couponCode = undefined;
  this.couponDiscount = 0;
  return this.save();
};

module.exports = mongoose.model('Cart', cartSchema);
