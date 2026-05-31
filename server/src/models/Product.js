// models/Product.js

/*

This file defines the Mongoose schema and model for products in the DTank Kicks application. 
Each product has fields for name, brand, category, description, price, images, 
available sizes and colors, and aggregated rating information.
The schema also includes timestamps for tracking when products are created and updated.

*/  

const mongoose = require("mongoose");

const VariantSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      trim: true,
    },

    size: {
      type: Number,
      required: true,
    },

    color: {
      name: {
        type: String,
        required: true,
      },

      hex: {
        type: String,
      },
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    compareAtPrice: {
      type: Number,
      min: 0,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
  }, { _id: true });


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
  images: {
    type: [String],
  },
  variants: {
    type: [VariantSchema],
    default: [],
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

// Virtual fields for minPrice and maxPrice based on the variants array. 
// These are not stored in the database but are calculated on the fly when converting to JSON.
ProductSchema.virtual("minPrice").get(function () {
  if (!this.variants?.length) return 0;

  return Math.min(
    ...this.variants.map(v => v.price)
  );
});

ProductSchema.virtual("maxPrice").get(function () {
  if (!this.variants?.length) return 0;

  return Math.max(
    ...this.variants.map(v => v.price)
  );
});

module.exports = mongoose.model("Product", ProductSchema);
