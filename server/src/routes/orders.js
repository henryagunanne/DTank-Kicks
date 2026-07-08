const crypto = require("crypto");
const router = require("express").Router();
const { body } = require("express-validator");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../models/Order");
const Product = require("../models/Product");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { validate } = require("../middleware/error");
const { sendEmail } = require("../utils/email");


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

// POST /api/orders - creates a new order. If the user is authenticated, associate the order with their account. If not, allow guest checkout with email. Send an order confirmation email to the user after successful creation.
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
    const paymentStatus = ["paid", "refunded", "payment failed"].includes(nextStatus)
      ? nextStatus
      : currentOrder.paymentStatus;
    const fulfillmentStatus = nextStatus === "shipped"
      ? "shipped"
      : nextStatus === "delivered"
        ? "delivered"
        : nextStatus === "cancelled"
          ? "cancelled"
          : "placed";

    const order = await Order.findByIdAndUpdate(req.params.id, {
      status: nextStatus,
      paymentStatus,
      fulfillmentStatus,
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
  body("status").isIn(["pending", "processing payment", "paid", "packing", "shipped", "delivered", "cancelled", "refunded", "payment failed"]),
  validate,
  updateOrderStatus
);

router.put("/:id/status", authenticate, requireAdmin,
  body("status").isIn(["pending", "processing payment", "paid", "packing", "shipped", "delivered", "cancelled", "refunded", "payment failed"]),
  validate,
  updateOrderStatus
);

router.post("/:id/refund", authenticate, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!order.paymentIntentId && !order.stripePaymentIntentId) {
      return res.status(400).json({ error: "No Stripe payment attached to this order" });
    }

    const refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId || order.stripePaymentIntentId,
      metadata: { orderId: order._id.toString() },
    });

    order.paymentStatus = "refunded";
    order.status = "refunded";
    order.fulfillmentStatus = "cancelled";
    order.receiptUrl = order.receiptUrl || refund.id;
    await order.save();

    res.json({ refund, order });
  } catch (err) {
    console.error("Refund failed", err);
    res.status(500).json({ error: "Failed to refund order" });
  }
});

// POST /api/orders/:id/cancel - allows a user to cancel their order if it hasn't been shipped yet. 
// This should update the order's fulfillment status to "cancelled" and restore the stock for the cancelled items.
router.post("/:id/cancel", authenticate, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // prevent cancel if already shipped/delivered
    if (["shipped", "delivered"].includes(order.status)) {
      return res.status(400).json({
        error: "Order cannot be cancelled after it has been shipped"
      });
    }

    // prevent double cancellation
    if (order.status === "cancelled") {
      return res.status(400).json({
        error: "Order is already cancelled"
      });
    }

    // RESTORE STOCK
    for (const item of order.items) {
      const productInventory = await Product.updateOne(
        {
          _id: item.product,
          "variants._id": item.variantId
        },
        {
          $inc: {
            "variants.$.stock": item.quantity
          }
        }
      );

      if (productInventory.modifiedCount === 0) {
        console.warn(`Failed to restore stock for product ${item.product}, variant ${item.variantId}`);
      }
    }

    // update order status
    const updatedOrder = await Order.updateOne(
      { _id: req.params.id },
      {
        $set: {
          fulfillmentStatus: "cancelled",
        }
      }
    );

    if (updatedOrder.modifiedCount === 0) {
      console.warn(`Failed to update order status to cancelled for order ${req.params.id}`);
    }

    // Alternatively, we could fetch the order again after updating to return the latest data:
    const cancelledOrder = await Order.findById(req.params.id);

     // send cancellation email to user
     if (cancelledOrder.shippingAddress?.email) {
      await sendEmail({
        to: cancelledOrder.shippingAddress.email,
        subject: `Order Cancellation - ${cancelledOrder._id}`,
        text: `<h2>Your order has been cancelled</h2><p>Your order ID is ${cancelledOrder._id}. If you have any questions, please contact our support.</p>`,
      });
    }

    // Note: We could also choose to delete the order instead of marking it as cancelled, depending on business requirements. 
    // However, keeping a record of cancelled orders can be useful for analytics and customer service.

    //order.status = "cancelled";
    //order.cancelledAt = new Date();

    //await order.save();

    res.json({
      message: "Order cancelled successfully",
      order: cancelledOrder
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
