const express = require("express");
const ReturnRequest = require("../models/ReturnRequest");
const Order = require("../models/Order");
const { authenticate, requireAdmin, authenticateOptional } = require("../middleware/auth");
const returnService = require("../services/return.service");
const refundService = require("../services/refund.service");

const router = express.Router();

const Product = require("../models/Product");
const mongoose = require("mongoose");

// Customer: Create a return request for an order (supports guests)
router.post("/orders/:orderId", authenticateOptional, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const userMatches = req.user && order.user && order.user.toString() === req.user._id.toString();
    const guestMatches = !req.user && (order.guestEmail === req.body.email || order.shippingAddress?.email === req.body.email);
    if (!userMatches && !guestMatches && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { items, customerNote = "" } = req.body;
    const { returnRequest, order: updatedOrder } = await returnService.createReturnRequest({ orderId: req.params.orderId, userId: req.user?._id, items, customerNote, email: req.body.email });
    res.json({ message: "Return requested", order: updatedOrder, returnRequest });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message || "Failed to create return request" });
  }
});

// Customer: list their returns
router.get("/my", authenticate, async (req, res) => {
  const returns = await ReturnRequest.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(returns);
});

// Admin: list all returns
router.get("/", authenticate, requireAdmin, async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const results = await ReturnRequest.find(filter).sort({ createdAt: -1 }).populate("orderId");
  res.json(results);
});

// Admin: get return detail
router.get("/:id", authenticate, requireAdmin, async (req, res) => {
  const rr = await ReturnRequest.findById(req.params.id).populate("orderId");
  if (!rr) return res.status(404).json({ error: "Not found" });
  res.json(rr);
});

// Admin: approve
router.post("/:id/approve", authenticate, requireAdmin, async (req, res) => {
  try {
    const { returnRequest, order } = await returnService.approveReturn({ returnRequestId: req.params.id, adminId: req.user._id, adminNote: req.body.adminNote });
    res.json({ returnRequest, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to approve return" });
  }
});

// Admin: initiate refund for approved return
router.post("/:id/refund", authenticate, requireAdmin, async (req, res) => {
  try {
    const rr = await ReturnRequest.findById(req.params.id);
    if (!rr) return res.status(404).json({ error: "Return not found" });
    if (!rr.orderId) return res.status(400).json({ error: "Return missing order reference" });

    const amount = Number(req.body.amount ?? rr.items.reduce((s,i)=>s + (i.unitPrice * i.quantity),0));
    const refund = await refundService.createRefund({ orderId: rr.orderId, returnRequestId: rr._id, amount, reason: req.body.reason || "return_refund", actorId: req.user._id });

    // mark return refund pending
    rr.refund = rr.refund || {};
    rr.refund.refundAmount = amount;
    rr.refund.status = "pending";
    rr.refund.refundId = refund._id;
    await rr.save();

    res.json({ refund, returnRequest: rr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to create refund" });
  }
});

// Admin: record inspection and optionally restock inventory
router.post("/:id/inspect", authenticate, requireAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const rr = await ReturnRequest.findById(req.params.id).session(session);
    if (!rr) return res.status(404).json({ error: "Return not found" });

    if (rr.status !== "approved" && rr.status !== "shipped" && rr.status !== "received") {
      return res.status(400).json({ error: "Return not in a state that can be inspected" });
    }

    const { inspection = {}, restock = false } = req.body;
    rr.inspection = rr.inspection || {};
    rr.inspection.condition = inspection.condition || rr.inspection.condition || "new";
    rr.inspection.notes = inspection.notes || rr.inspection.notes || "";
    rr.inspection.photos = Array.isArray(inspection.photos) ? inspection.photos : rr.inspection.photos || [];
    rr.inspection.inspectedBy = req.user._id;
    rr.inspection.inspectedAt = new Date();
    rr.status = "inspected";

    // Idempotent restock: only restock if requested and not already restored
    if (restock && !rr.inventoryRestoredAt) {
      // For each returned item, increment the matching product variant stock
      const order = await Order.findById(rr.orderId).session(session);
      if (!order) throw new Error("Related order not found");

      for (const item of rr.items || []) {
        const idx = Number(item.orderItemIndex);
        // Use variantId from item snapshot
        const variantId = item.variantId;
        const qty = Number(item.quantity || 0);

        const result = await Product.updateOne(
          { _id: item.product, "variants._id": variantId },
          { $inc: { "variants.$.stock": qty } }
        ).session(session);

        if (result.modifiedCount === 0) {
          // Log but do not fail entire operation
          console.warn(`Failed to restock variant ${variantId} for product ${item.product}`);
        }
      }

      rr.inventoryRestoredAt = new Date();
    }

    await rr.save({ session });
    // Audit: inspection recorded
    try {
      await AuditLog.create({ actorId: req.user._id, actorRole: 'admin', action: 'return_inspected', entityType: 'ReturnRequest', entityId: rr._id.toString(), after: rr });
    } catch (e) { console.error('Failed to write audit log', e.message); }
    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Inspected", returnRequest: rr });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Inspection failed", err);
    res.status(500).json({ error: err.message || "Failed to inspect return" });
  }
});

module.exports = router;
