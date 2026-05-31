const router = require("express").Router({ mergeParams: true });
const multer = require("multer");
const path = require("path");
const { body } = require("express-validator");
const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { validate } = require("../middleware/error");

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "uploads"),
    filename: (_req, file, cb) => cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/:id/reviews", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const [items, total] = await Promise.all([
    Review.find({ product: req.params.id }).populate("user", "name").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Review.countDocuments({ product: req.params.id }),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

router.post("/:id/reviews",
  authenticate, upload.array("images", 4),
  body("rating").isInt({ min: 1, max: 5 }),
  body("title").trim().isLength({ min: 1, max: 100 }),
  body("body").trim().isLength({ min: 1, max: 1000 }),
  validate,
  async (req, res) => {
    const verified = !!(await Order.findOne({ user: req.user._id, "items.product": req.params.id }));
    const images = (req.files || []).map((f) => `/uploads/${f.filename}`);
    const review = await Review.create({
      product: req.params.id, 
      user: req.user._id,
      rating: Number(req.body.rating), 
      title: req.body.title, 
      body: req.body.body,
      images, 
      verifiedPurchase: verified,
    });
    // refresh product rating
    const agg = await Review.aggregate([
      { $match: { product: review.product } },
      { $group: { _id: "$product", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (agg[0]) await Product.findByIdAndUpdate(req.params.id, { rating: agg[0].avg, reviewCount: agg[0].count });
    res.status(201).json(review);
  }
);

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  await Review.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
