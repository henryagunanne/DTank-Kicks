// models/Review.js

/*

This file defines the Mongoose schema and model for product reviews in the DTank Kicks application. 
Each review is associated with a specific product and user, contains a rating, title, body, optional images, 
and a flag for verified purchase status. The schema also includes timestamps for tracking when reviews are created and updated.

*/  

const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  title: {
    type: String,
    maxlength: 100,
  },
  body: {
    type: String,
    maxlength: 1000,
  },
  images: {
    type: [String],
  },
  verifiedPurchase: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("Review", ReviewSchema);
