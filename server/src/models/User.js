// models/User.js

/*

This file defines the Mongoose schema and model for users in the DTank Kicks application. 
Each user has fields for name, email, password hash, role (customer or admin), phone number, 
an array of addresses, a wishlist of product references, and fields for password reset tokens. 
The schema also includes timestamps for tracking when users are created and updated.

*/

const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  label: {
    type: String,
  },
  name: {
    type: String,
  },
  line1: {
    type: String,
  },
  city: {
    type: String,
  },
  province: {
    type: String,
  },
  postalCode: {
    type: String,
  },
  country: {
    type: String,
    default: "Philippines",
  },
  phone: {
    type: String,
  },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["customer", "admin"],
    default: "customer",
  },
  phone: {
    type: String,
  },
  addresses: {
    type: [AddressSchema],
  },
  wishlist: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  resetToken: {
    type: String,
  },
  resetTokenExpires: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
