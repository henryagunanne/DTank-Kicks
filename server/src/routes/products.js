// src/routes/products.js - product management routes for DTank Kicks API

/*

This file defines the Express routes for managing products in the DTank Kicks application. 
It includes endpoints for retrieving a paginated list of products with filtering and sorting options, 
getting details of a single product by ID, creating new products (admin only), updating existing products (admin only), and deleting products (admin only). 
The routes use Multer for handling image uploads and include validation middleware to ensure data integrity.

*/

const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const { body, query } = require("express-validator");
const Product = require("../models/Product");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { validate } = require("../middleware/error");

// Configure Multer for image uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "uploads"),
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
    if (color) filter["colors.name"] = color;
    if (size) filter["sizes"] = { $elemMatch: { size: Number(size), stock: { $gt: 0 } } };
    if (minPrice || maxPrice) filter.price = { ...(minPrice && { $gte: Number(minPrice) }), ...(maxPrice && { $lte: Number(maxPrice) }) };
    if (rating) filter.rating = { $gte: Number(rating) };
    if (q) filter.$text = { $search: q };

    const sortMap = { "price-asc": { price: 1 }, "price-desc": { price: -1 }, newest: { createdAt: -1 }, rated: { rating: -1 } };
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
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});

// POST /api/products` - creates a new product. Admin only. Accepts multipart/form-data with fields for name, brand, category, description, price, sizes (JSON array), colors (JSON array), and images (up to 6 files).
router.post("/", authenticate, requireAdmin, upload.array("images", 6),
  body("name").trim().isLength({ min: 1, max: 200 }),
  body("brand").isString(),
  body("category").isIn(["Sneakers", "Boots", "Formal", "Sports", "Sandals"]),
  body("price").isFloat({ min: 0 }),
  validate,
  async (req, res) => {

    const images = (req.files || []).map((f) => `/uploads/${f.filename}`);
    const product = await Product.create({ ...req.body, images, sizes: JSON.parse(req.body.sizes || "[]"), colors: JSON.parse(req.body.colors || "[]") });
    res.status(201).json(product);
  }
);

// PUT /api/products/:id` - updates an existing product by its ID. Admin only. Accepts multipart/form-data with fields for name, brand, category, description, price, sizes (JSON array), colors (JSON array), and images (up to 6 files).
router.put("/:id", authenticate, requireAdmin, async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!product) return res.status(404).json({ error: "Not found" });
  res.json(product);
});

// DELETE /api/products/:id` - deletes a product by its ID. Admin only.
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
