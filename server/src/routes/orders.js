const router = require("express").Router();
const { body } = require("express-validator");
const Order = require("../models/Order");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { validate } = require("../middleware/error");
const { sendEmail } = require("../utils/email");

router.post("/",
  body("items").isArray({ min: 1 }),
  body("total").isFloat({ min: 0 }),
  validate,
  async (req, res) => {
    let user;
    try {
      const jwt = require("jsonwebtoken");
      const token = req.headers.authorization?.replace(/^Bearer /, "");
      if (token) user = jwt.verify(token, process.env.JWT_SECRET).sub;
    } catch {}
    const order = await Order.create({ ...req.body, user });
    if (req.body.guestEmail || req.body.shippingAddress?.email) {
      await sendEmail(req.body.guestEmail || req.body.shippingAddress.email,
        `SoleStore order ${order._id} confirmed`,
        `<h2>Thanks for your order!</h2><p>Your order #${order._id} has been received.</p>`);
    }
    res.status(201).json(order);
  }
);

router.get("/my", authenticate, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

router.get("/", authenticate, requireAdmin, async (req, res) => {
  const filter = {};
  if (req.query.status) filter.fulfillmentStatus = req.query.status;
  const orders = await Order.find(filter).sort({ createdAt: -1 }).populate("user", "name email");
  res.json(orders);
});


// GET /api/orders/my-orders
router.get("/my-orders", authenticate, async (req, res) => {
  const orders = await Order.find({
    user: req.user.id,
  })
    .sort({ createdAt: -1 })
    .populate("items.product");

  res.json(orders);
});


router.get("/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });
  res.json(order);
});

router.put("/:id/status", authenticate, requireAdmin,
  body("status").isIn(["placed", "processing", "shipped", "delivered", "cancelled"]),
  validate,
  async (req, res) => {
    const order = await Order.findByIdAndUpdate(req.params.id, { fulfillmentStatus: req.body.status }, { new: true });
    res.json(order);
  }
);

module.exports = router;
