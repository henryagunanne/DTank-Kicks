const router = require("express").Router();
const { body } = require("express-validator");
const Coupon = require("../models/Coupon");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { validate } = require("../middleware/error");

router.post("/validate",
  body("code").isString().trim().toUpperCase(),
  body("subtotal").isFloat({ min: 0 }),
  validate,
  async (req, res) => {
    const c = await Coupon.findOne({ code: req.body.code });
    if (!c) return res.status(404).json({ error: "Invalid coupon" });
    if (c.expiresAt && c.expiresAt < new Date()) return res.status(410).json({ error: "Coupon expired" });
    if (req.body.subtotal < (c.minOrderValue || 0)) return res.status(400).json({ error: `Minimum order ₱${c.minOrderValue}` });
    const discount = c.discountType === "percent" ? Math.round(req.body.subtotal * (c.discountValue / 100)) : c.discountValue;
    res.json({ code: c.code, discount });
  }
);

router.post("/", authenticate, requireAdmin,
  body("code").isString().trim().toUpperCase(),
  body("discountValue").isFloat({ min: 0 }),
  validate,
  async (req, res) => {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  }
);

module.exports = router;
