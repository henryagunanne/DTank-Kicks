const crypto = require("crypto");
const router = require("express").Router();
const { body } = require("express-validator");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: process.env.STRIPE_API_VERSION || "2026-03-25.dahlia",
});
const Order = require("../models/Order");
const Product = require("../models/Product");
const orderController = require("../controllers/order.controller");
const { authenticate, authenticateOptional, requireAdmin } = require("../middleware/auth");
const { validate } = require("../middleware/error");
const { sendEmail } = require("../utils/email");
const returnService = require("../services/return.service");


// Helper function to generate order tracking token
async function generateUniqueTrackingToken() {
  let token;
  let existingOrder;

  do {
    token = crypto.randomBytes(16).toString("hex");
    existingOrder = await Order.findOne({ trackingNumber: token });
  } while (existingOrder);

  return token;
}

// POST /api/orders - Legacy endpoint for creating an order. This is now handled by the Stripe checkout session, but this endpoint is kept for backward compatibility.
router.post("/",
  body("items").isArray({ min: 1 }),
  body("shippingAddress.name").notEmpty(),
  body("shippingAddress.phone").notEmpty(),
  body("shippingAddress.email").isEmail(),
  body("shippingAddress.line1").notEmpty(),
  body("shippingAddress.city").notEmpty(),
  body("shippingAddress.province").notEmpty(),
  body("shippingAddress.country").notEmpty(),
  body("deliveryMethod").isIn(["standard", "express"]),
  body("subtotal").isFloat({ min: 0 }),
  body("shipping").isFloat({ min: 0 }),
  body("tax").isFloat({ min: 0 }),
  body("discount").isFloat({ min: 0 }),
  body("total").isFloat({ min: 0 }),
  validate,
  async (req, res) => {  
    try {
      let user;
      try {
        const jwt = require("jsonwebtoken");
        const token = req.headers.authorization?.replace(/^Bearer /, "");
        if (token) user = jwt.verify(token, process.env.JWT_SECRET).sub;
      } catch {}

      const { items, guestEmail, shippingAddress, deliveryMethod, subtotal, shipping, tax, discount, total } = req.body;

      const trackingNumber = await generateUniqueTrackingToken();

      const order = await Order.create({
        user: user || null,
        guestEmail: guestEmail,
        items: items,
        shippingAddress: shippingAddress,
        deliveryMethod: deliveryMethod,
        status: "pending",
        paymentStatus: "pending",
        fulfillmentStatus: "placed",
        subtotal: subtotal,
        shipping: shipping,
        tax: tax,
        discount: discount,
        total: total,
        trackingNumber,
      });

      if (!order) {
        return res.status(500).json({ error: "Failed to create order" });
      }

      

      // send confirmation email to user
      const recipientEmail = shippingAddress?.email || guestEmail;
      if (recipientEmail) {
        const trackingUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/track/${trackingNumber}`;
        await sendEmail(
          recipientEmail,
          `Order Confirmation - ${order._id}`,
          `<h2>Thank you for your order!</h2><p>Your order ID is ${order._id}.</p><p>Your tracking token is <strong>${trackingNumber}</strong>.</p><p>You can track your order here: <a href="${trackingUrl}">${trackingUrl}</a></p>`
        );
      }
      res.status(201).json(order);
    } catch (err) {
      console.error("Error creating order", err);
      res.status(500).json({ error: "Failed to create order" });
    }
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
  const orders = await Order.find(filter)
                            .sort({ createdAt: -1 })
                            .populate("user", "name email")
                            .populate("items.product");;
  res.json(orders);
}); 


// GET /api/orders/:id - retrieves details of a single order by its ID. Admins can access any order, while regular users can only access their own orders.
router.get("/:id", authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ error: "Not found" });

    // Check if the order exists and if the user has permission to view it.
    //  Admins can view any order, while regular users can only view their own orders.
    if (
      req.user.role !== "admin" &&
      order.user?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        error: "Forbidden",
      });
    }
    
    res.json(order);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch order",
    });
  }
});



// GET /api/orders/track/:token - track order using token (most useful for guest orders)
router.get("/track/:token", async (req, res) => {
  try {
    const order = await Order.findOne({
      trackingNumber: req.params.token,
    });

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch order",
    });
  }
});



async function updateOrderStatus(req, res) {
  try {
    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) return res.status(404).json({ error: "Order not found" });

    const nextStatus = req.body.status;
    const allowedStatuses = [
      "pending",
      "processing payment",
      "paid",
      "packing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "payment failed",
      "return requested",
      "return approved",
      "return rejected",
    ];

    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    let paymentStatus = currentOrder.paymentStatus;
    if (["paid", "refunded", "payment failed"].includes(nextStatus)) {
      paymentStatus = nextStatus === "payment failed" ? "failed" : nextStatus;
    }
    if (nextStatus === "refunded") {
      paymentStatus = "refunded";
    }

    let fulfillmentStatus = currentOrder.fulfillmentStatus;
    if (["shipped", "delivered"].includes(nextStatus)) fulfillmentStatus = nextStatus;
    if (["cancelled", "return requested", "return approved"].includes(nextStatus)) fulfillmentStatus = nextStatus;
    if (nextStatus === "return rejected") fulfillmentStatus = "delivered";

    const order = await Order.findByIdAndUpdate(req.params.id, {
      status: nextStatus,
      paymentStatus,
      fulfillmentStatus,
      ...(nextStatus === "return requested" ? {
        returnRequest: {
          ...currentOrder.returnRequest,
          requestedAt: new Date(),
          status: "requested",
          reason: req.body.reason || currentOrder.returnRequest?.reason || "",
          adminNote: req.body.adminNote || currentOrder.returnRequest?.adminNote || "",
        },
      } : {}),
      ...(nextStatus === "return approved" ? {
        returnRequest: {
          ...currentOrder.returnRequest,
          status: "approved",
          adminNote: req.body.adminNote || currentOrder.returnRequest?.adminNote || "",
          refundAmount: Number(req.body.refundAmount ?? currentOrder.returnRequest?.refundAmount ?? currentOrder.total ?? 0),
        },
      } : {}),
      ...(nextStatus === "return rejected" ? {
        returnRequest: {
          ...currentOrder.returnRequest,
          status: "rejected",
          adminNote: req.body.adminNote || currentOrder.returnRequest?.adminNote || "",
        },
      } : {}),
      ...(nextStatus === "refunded" ? {
        paymentStatus: "refunded",
        returnRequest: {
          ...currentOrder.returnRequest,
          status: "completed",
          refundAmount: Number(req.body.refundAmount ?? currentOrder.returnRequest?.refundAmount ?? currentOrder.total ?? 0),
        },
      } : {}),
    }, { new: true });

    const recipientEmail = order.shippingAddress?.email || order.guestEmail;
    if (recipientEmail) {
      await sendEmail(
        recipientEmail,
        `Order Update - ${order._id}`,
        `<h2>Your order status has been updated</h2><p>Your order ID is ${order._id} and its new status is ${order.status}.</p>`
      );
    }

    res.json(order);
  } catch (err) {
    console.error("Error updating order status", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
}

// PATCH /api/orders/:id/status - updates the fulfillment status of an order. Admins can update any order.
router.patch("/:id/status", authenticate, requireAdmin,
  body("status").isIn([
    "pending",
    "processing payment",
    "paid",
    "packing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "payment failed",
    "return requested",
    "return approved",
    "return rejected",
  ]),
  validate,
  updateOrderStatus
);

// PUT /api/orders/:id/status - updates the fulfillment status of an order. Admins can update any order.
router.put("/:id/status", authenticate, requireAdmin,
  body("status").isIn([
    "pending",
    "processing payment",
    "paid",
    "packing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "payment failed",
    "return requested",
    "return approved",
    "return rejected",
  ]),
  validate,
  updateOrderStatus
);


// POST /api/orders/:id/refund - allows an admin to refund an order. This should update the order's payment status to "refunded" and the fulfillment status to "cancelled". It should also trigger a refund through Stripe if the order was paid via Stripe.
router.post("/:id/refund", authenticate, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const refundAmount = Number(req.body.refundAmount ?? order.returnRequest?.refundAmount ?? order.total ?? 0);
    const paymentIntents = [order.paymentIntentId, order.stripePaymentIntentId].filter(Boolean);

    let refund = null;
    if (paymentIntents.length > 0 && order.paymentStatus !== "refunded") {
      refund = await stripe.refunds.create({
        payment_intent: paymentIntents[0],
        amount: Math.round(refundAmount * 100),
        metadata: { orderId: order._id.toString() },
      });
    }

    const pendingApprovedItems = Array.isArray(order.returnRequest?.returnItems) && order.returnRequest.returnItems.length
      ? order.returnRequest.returnItems
      : (Array.isArray(order.returnedItems) ? order.returnedItems : []);

    const mergedReturned = Array.isArray(order.returnedItems) ? [...order.returnedItems] : [];
    for (const item of pendingApprovedItems) {
      const key = `${String(item.product || "")}-${String(item.variantId || item.product || "")}`;
      if (!mergedReturned.some((saved) => `${String(saved.product || "")}-${String(saved.variantId || saved.product || "")}` === key)) {
        mergedReturned.push({
          product: item.product,
          variantId: item.variantId,
          name: item.name,
          quantity: item.quantity || 1,
          price: item.price || 0,
          refundedAt: new Date(),
        });
      }
    }

    order.returnedItems = mergedReturned;
    order.paymentStatus = "refunded";
    order.status = "refunded";
    order.fulfillmentStatus = "cancelled";
    order.returnRequest = {
      ...order.returnRequest,
      status: "completed",
      refundAmount,
      adminNote: req.body.adminNote || order.returnRequest?.adminNote || "",
      returnItems: Array.isArray(order.returnRequest?.returnItems) && order.returnRequest.returnItems.length
        ? order.returnRequest.returnItems
        : mergedReturned,
    };
    order.returnHistory = [
      ...(Array.isArray(order.returnHistory) ? order.returnHistory : []),
      {
        requestedAt: order.returnRequest?.requestedAt || new Date(),
        status: "completed",
        reason: order.returnRequest?.reason || "",
        refundAmount,
        adminNote: req.body.adminNote || order.returnRequest?.adminNote || "",
        items: Array.isArray(order.returnRequest?.returnItems) && order.returnRequest.returnItems.length
          ? order.returnRequest.returnItems
          : mergedReturned,
      },
    ];
    order.receiptUrl = order.receiptUrl || refund?.id || order.receiptUrl;
    await order.save();

    res.json({ refund, order });
  } catch (err) {
    console.error("Refund failed", err);
    res.status(500).json({ error: "Failed to refund order" });
  }
});

router.post("/:id/return-request", authenticateOptional, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const userMatches = req.user && order.user && order.user.toString() === req.user._id.toString();
    const guestMatches = !req.user && (order.guestEmail === req.body.email || order.shippingAddress?.email === req.body.email);
    if (!userMatches && !guestMatches && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { items = [], customerNote = "" } = req.body;
    const result = await returnService.createReturnRequest({ orderId: req.params.id, userId: req.user?._id, items, customerNote });

    res.json({ message: "Return requested", order: result.order, returnRequest: result.returnRequest });
  } catch (error) {
    console.error("Return request failed", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Failed to request return" });
  }
});

router.post("/:id/return-approve", authenticate, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const requestedItems = Array.isArray(req.body.items) && req.body.items.length
      ? req.body.items
      : (Array.isArray(order.returnRequest?.returnItems) ? order.returnRequest.returnItems : []);

    const normalizedItems = requestedItems.map((item) => ({
      product: item.product || item.productId || null,
      variantId: item.variantId || item.variant || null,
      name: item.name || "Item",
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
    })).filter((item) => item.product || item.name);

    const existingReturned = Array.isArray(order.returnedItems) ? order.returnedItems : [];
    const currentReturned = [...existingReturned];
    for (const item of normalizedItems) {
      const key = `${String(item.product || "")}-${String(item.variantId || item.product || "")}`;
      if (!currentReturned.some((saved) => `${String(saved.product || "")}-${String(saved.variantId || saved.product || "")}` === key)) {
        currentReturned.push({
          product: item.product,
          variantId: item.variantId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          refundedAt: new Date(),
        });
      }
    }

    order.returnedItems = currentReturned;
    order.returnRequest = {
      ...order.returnRequest,
      status: "approved",
      adminNote: req.body.adminNote || order.returnRequest?.adminNote || "",
      refundAmount: Number(req.body.refundAmount ?? order.returnRequest?.refundAmount ?? order.total ?? 0),
      returnItems: normalizedItems,
    };
    order.returnHistory = [
      ...(Array.isArray(order.returnHistory) ? order.returnHistory : []),
      {
        requestedAt: order.returnRequest?.requestedAt || new Date(),
        status: "approved",
        reason: order.returnRequest?.reason || "",
        refundAmount: Number(req.body.refundAmount ?? order.returnRequest?.refundAmount ?? order.total ?? 0),
        adminNote: req.body.adminNote || order.returnRequest?.adminNote || "",
        items: normalizedItems,
      },
    ];
    order.status = "return approved";
    order.fulfillmentStatus = "return approved";
    order.paymentStatus = order.paymentStatus === "paid" ? "pending_refund" : order.paymentStatus;
    await order.save();

    res.json({ message: "Return approved", order });
  } catch (error) {
    console.error("Approve return failed", error);
    res.status(500).json({ error: "Failed to approve return" });
  }
});

// POST /api/orders/:id/cancel - allows a user to cancel their order if it hasn't been shipped yet. 
// This should update the order's fulfillment status to "cancelled" and restore the stock for the cancelled items.
router.post("/:id/cancel", authenticate, orderController.cancelOrder);

// POST /api/orders/guest/:token/cancel - allows a guest user to cancel their order if it hasn't been shipped yet.
router.patch("/guest/:token/cancel", orderController.cancelGuestOrder);

module.exports = router;
