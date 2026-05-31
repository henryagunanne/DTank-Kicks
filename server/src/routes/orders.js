const router = require("express").Router();
const { body } = require("express-validator");
const Order = require("../models/Order");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { validate } = require("../middleware/error");
const { sendEmail } = require("../utils/email");

// POST /api/orders - creates a new order. If the user is authenticated, associate the order with their account. If not, allow guest checkout with email. Send an order confirmation email to the user after successful creation.
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

// GET /api/orders/my - retrieves a list of orders for the authenticated user. 
router.get("/my", authenticate, async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
                            .sort({ createdAt: -1 })
                            .populate("items.product");

  res.json(orders);
});

// GET /api/orders - returns a list of all orders with user info. Supports filtering by fulfillment status. Admin only.
router.get("/", authenticate, requireAdmin, async (req, res) => {
  const filter = {};
  if (req.query.status) filter.fulfillmentStatus = req.query.status;
  const orders = await Order.find(filter).sort({ createdAt: -1 }).populate("user", "name email");
  res.json(orders);
});


// GET /api/orders/:id - retrieves details of a single order by its ID. Admins can access any order, while regular users can only access their own orders.
router.get("/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });
  res.json(order);
});


// PUT /api/orders/:id/status - updates the fulfillment status of an order. Admins can update any order, while regular users can only update their own orders (e.g., to cancel).
router.put("/:id/status", authenticate, requireAdmin,
  body("status").isIn(["placed", "processing", "shipped", "delivered", "cancelled"]),
  validate,
  async (req, res) => {
    const order = await Order.findByIdAndUpdate(req.params.id, { fulfillmentStatus: req.body.status }, { new: true });
    res.json(order);
  }
);

module.exports = router;
