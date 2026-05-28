// models/Coupon.js

/*

This file defines the Mongoose schema and model for coupons in the DTank Kicks application. 
Each coupon has a unique code, a discount type (either percentage or fixed amount), 
a discount value, and optional fields for minimum order value, usage limits, and expiration date. 
The schema also includes timestamps for tracking when coupons are created and updated.

*/
const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true 
  },
  discountType: { 
    type: String, 
    enum: ["percent", "fixed"], 
    default: "percent" 
  },
  discountValue: { 
    type: Number, 
    required: true 
  },
  minOrderValue: { 
    type: Number, 
    default: 0 
  },
  usageLimit: { 
    type: Number, 
    default: 0 
  },
  usageCount: { 
    type: Number, 
    default: 0 
  },
  expiresAt: Date,
}, { timestamps: true });

module.exports = mongoose.model("Coupon", CouponSchema);
