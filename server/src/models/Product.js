// models/Product.js

/*

This file defines the Mongoose schema and model for products in the DTank Kicks application. 
Each product has fields for name, brand, category, description, price, images, 
available sizes and colors, and aggregated rating information.
The schema also includes timestamps for tracking when products are created and updated.

*/  

const mongoose = require("mongoose");

const SizeStockSchema = new mongoose.Schema({
  size: {
    type: Number,
  },
  stock: {
    type: Number,
  },
}, { _id: false });

const ColorSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  hex: {
    type: String,
  },
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  brand: {
    type: String,
    required: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    index: true,
    enum: ["Sneakers", "Boots", "Formal", "Sports", "Sandals"],
  },
  description: {
    type: String,
    default: "",
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  compareAtPrice: {
    type: Number,
  },
  images: {
    type: [String],
  },
  sizes: {
    type: [SizeStockSchema],
  },
  colors: {
    type: [ColorSchema],
  },
  rating: {
    type: Number,
    default: 0,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  tags: {
    type: [String],
  },
}, { timestamps: true });

ProductSchema.index({ 
  name: "text", 
  description: "text", 
  brand: "text" 
});


// Customize the JSON output of products to include an "id" field instead of "_id", and remove the "__v" version key.
ProductSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

module.exports = mongoose.model("Product", ProductSchema);
