// models/Order.js

/*

This file defines the Mongoose schema and model for orders in the DTank Kicks application. 
Each order is associated with a user (or guest email), contains an array of ordered items, 
shipping address details, delivery method, payment and fulfillment status, and financial breakdown of the order. 
The schema also includes timestamps for tracking when orders are created and updated.

*/

const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: {
    type: String,
  },
  name: {
    type: String,
  },
  image: {
    type: String,
  },
  brand: {
    type: String,
  },
  size: {
    type: Number,
  },
  color: {
    type: String,
  },
  quantity: {
    type: Number,
    min: 1,
  },
  price: {
    type: Number,
  },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  guestEmail: {
    type: String,
  },
  items: {
    type: [OrderItemSchema],
  },
  cartItemIds: {
    type: [String],
    default: [],
  },
  shippingAddress: {
    name:{ 
      type: String
    },
    email: { 
      type: String
    },
    line1:{ 
      type: String
    }, 
    city: { 
      type: String 
    }, 
    province: { 
      type: String 
    }, 
    postalCode: { 
      type: String 
    }, 
    country: { 
      type: String 
    }, 
    phone: { 
      type: String 
    }
  },
  billingAddress: {
    name: { type: String },
    email: { type: String },
    line1: { type: String },
    city: { type: String },
    province: { type: String },
    postalCode: { type: String },
    country: { type: String },
    phone: { type: String }
  },
  deliveryMethod: {
    type: String,
    enum: ["standard", "express", "international"],
    default: "standard",
  },
  status: {
    type: String,
    enum: ["pending", "processing payment", "paid", "packing", "shipped", "delivered", "cancelled", "refunded", "payment failed"],
    default: "pending",
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  
  fulfillmentStatus: {
    type: String,
    enum: ["placed", "processing", "shipped", "delivered", "cancelled"],
    default: "placed",
  },

  paymentIntentId: {
    type: String,
  },
  paymentMethod: {
    type: String,
  },
  currency: {
    type: String,
  },
  stripeCustomerId: {
    type: String,
  },
  receiptUrl: {
    type: String,
  },
  paidAt: {
    type: Date,
  },
  trackingNumber: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  carrier: {
    type: String,
  },
  subtotal: {
    type: Number,
  },
  shipping: {
    type: Number,
  },
  tax: {
    type: Number,
  },
  discount: {
    type: Number,
  },
  total: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Order", OrderSchema);
