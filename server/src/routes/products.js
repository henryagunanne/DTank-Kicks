// src/routes/products.js - product management routes for DTank Kicks API

/*

This file defines the Express routes for managing products in the DTank Kicks application. 
It includes endpoints for retrieving a paginated list of products with filtering and sorting options, 
getting details of a single product by ID, creating new products (admin only), updating existing products (admin only), and deleting products (admin only). 
The routes use Multer for handling image uploads and include validation middleware to ensure data integrity.

*/

const router = require("express").Router();
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");
const { body, query } = require("express-validator");
const Product = require("../models/Product");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { validate } = require("../middleware/error");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Configure Multer for image uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "uploads/products"),
    filename: (_req, file, cb) => cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});


// GET /api/products` - retrieves a paginated list of products with optional filtering by category, brand, size, color, price range, rating, and search query. Supports sorting by price, newest, and rating.
router.get("/",
  query("page").optional().toInt(), query("limit").optional().toInt(),
  validate,
  async (req, res) => {
    
    const { category, brand, size, color, minPrice, maxPrice, rating, sort, page = 1, limit = 12, q } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    // Variant-based filters
    if (size && color) {
      filter.variants = { $elemMatch: { size: Number(size), "color.name": color, stock: { $gt: 0 } } };
    } else if (size) {
      filter.variants = { $elemMatch: { size: Number(size), stock: { $gt: 0 } } };
    } else if (color) {
      filter["variants.color.name"] = color;
    } 

    // Price range filter on variants
    if (minPrice || maxPrice) {
      filter.variants = {
        ...(filter.variants || {}),
        $elemMatch: {
          ...(size && { size: Number(size) }),
          ...(color && { "color.name": color }),

          ...(minPrice && {
            price: { $gte: Number(minPrice) }
          }),

          ...(maxPrice && {
            price: {
              ...(minPrice
                ? { $gte: Number(minPrice) }
                : {}),
              $lte: Number(maxPrice)
            }
          })
        }
      };
    }
    
    if (rating) filter.rating = { $gte: Number(rating) };
    if (q) filter.$text = { $search: q };

    // Sorting
    const sortMap = { "price-asc": { variants: { $elemMatch: { price: 1 } } }, "price-desc": { variants: { $elemMatch: { price: -1 } } }, newest: { createdAt: -1 }, rated: { rating: -1 } };
    const sortBy = sortMap[sort] || { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Product.find(filter).sort(sortBy).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({ 
      items, 
      total, 
      page: Number(page), 
      pages: Math.ceil(total / Number(limit)) 
    });
  }
);


// GET /api/products/:id` - retrieves details of a single product by its ID.
router.get("/:id", async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: "Not found" });
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});


// POST /api/products` - creates a new product. Admin only. Accepts multipart/form-data with fields for name, brand, category, description, price, sizes (JSON array), colors (JSON array), and images (up to 6 files).
router.post("/", authenticate, requireAdmin, upload.array("images", 6),
  body("name").trim().isLength({ min: 1, max: 200 }),
  body("brand").isString(),
  body("category").isIn(["Sneakers", "Boots", "Formal", "Sports", "Sandals"]),
  body("description").trim().isLength({ min: 1, max: 2000 }),
  body("variants").custom((value) => {
    if (!value) return true;
    let variants;
    try {
      variants = JSON.parse(value);
    } catch {
      throw new Error("Variants must be a valid JSON array");
    }
    if (!Array.isArray(variants)) throw new Error("Variants must be an array");
    for (const v of variants) {
      if (typeof v.size !== "number" || v.size <= 0) throw new Error("Variant size must be a positive number");
      if (!v.color) { throw new Error("Variant color is required");}
      if (typeof v.color.name !== "string" || !v.color.name.trim()) throw new Error("Variant colorName is required");
      if (typeof v.color.hex !== "string" || !/^#([0-9A-F]{3}){1,2}$/i.test(v.color.hex)) throw new Error("Variant colorHex must be a valid hex color");
      if (typeof v.price !== "number" || v.price < 0) throw new Error("Variant price must be a non-negative number");
      if (v.compareAtPrice !== undefined && (typeof v.compareAtPrice !== "number" || v.compareAtPrice < 0)) throw new Error("Variant compareAtPrice must be a non-negative number");
      if (typeof v.stock !== "number" || v.stock < 0) throw new Error("Variant stock must be a non-negative number");
    }
    return true;
  }),
  body("tags").optional().isString(),
  validate,
  async (req, res) => {

    const images = (req.files || []).map((f) => `/uploads/products/${f.filename}`);
    const variants = req.body.variants ? JSON.parse(req.body.variants) : [];
    const tags = req.body.tags ? req.body.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const product = await Product.create({
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      description: req.body.description || "",
      images,
      tags,
      variants,
    });
    res.status(201).json(product);
  }
);

// PUT /api/products/:id` - updates an existing product by its ID. Admin only. Accepts multipart/form-data with fields for name, brand, category, description, price, sizes (JSON array), colors (JSON array), and images (up to 6 files).
router.put("/:id", authenticate, requireAdmin, upload.array("images", 6),
  body("name").optional().trim().isLength({ min: 1, max: 200 }),
  body("brand").optional().isString(),
  body("category").optional().isIn(["Sneakers", "Boots", "Formal", "Sports", "Sandals"]),
  body("description").optional().trim().isLength({ min: 1, max: 2000 }),
  body("variants").optional().custom((value) => {
    let variants;
    try {
      variants = JSON.parse(value);
    } catch {
      throw new Error("Variants must be a valid JSON array");
    }
    if (!Array.isArray(variants)) throw new Error("Variants must be an array");
    for (const v of variants) {
      if (typeof v.size !== "number" || v.size <= 0) throw new Error("Variant size must be a positive number");
      if (typeof v.color.name !== "string" || !v.color.name.trim()) throw new Error("Variant colorName is required");
      if (typeof v.color.hex !== "string" || !/^#([0-9A-F]{3}){1,2}$/i.test(v.color.hex)) throw new Error("Variant colorHex must be a valid hex color");
      if (typeof v.price !== "number" || v.price < 0) throw new Error("Variant price must be a non-negative number");
      if (v.compareAtPrice !== undefined && (typeof v.compareAtPrice !== "number" || v.compareAtPrice < 0)) throw new Error("Variant compareAtPrice must be a non-negative number");
      if (typeof v.stock !== "number" || v.stock < 0) throw new Error("Variant stock must be a non-negative number");
    }
    return true;
  }),
  body("tags").optional().isString(),
  validate,
  async (req, res) => {

    if (!isValidId(req.params.id)) return res.status(404).json({ error: "Not found" });

    try {
      const images = (req.files || []).map((f) => `/uploads/products/${f.filename}`);
      const variants = req.body.variants ? JSON.parse(req.body.variants) : [];
      const tags = req.body.tags ? req.body.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
      const product = await Product.findByIdAndUpdate(req.params.id, { ...req.body, ...(images.length > 0 && { images }), ...(variants.length > 0 && { variants }), ...(tags.length > 0 && { tags }) }, { new: true });
      if (!product) return res.status(404).json({ error: "Not found" });

      res.json(product);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Failed to update product",  
      });
    }
  }
);

// DELETE /api/products/:id` - deletes a product by its ID. Admin only.
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: "Not found" });
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Upate stock of a product variant after an order is placed. This endpoint is called internally and is not exposed to clients.
router.post("/:id/update-stock", authenticate, requireAdmin,
  body("variantId").isString(),
  body("quantity").isInt({ min: 1 }),
  validate,
  async (req, res) => {
   
    const upadate = await Product.updateOne(
      {
        _id: req.params.id,
        "variants._id": req.body.variantId
      },
      {
        $inc: {
          "variants.$.stock": -req.body.quantity   // subtract stock
        }
      }
    );

    if (upadate.modifiedCount === 0) {
      return res.status(404).json({ error: "Product or variant not found, or insufficient stock" });
    }
    
    res.json({ ok: true });
  }
);

module.exports = router;
