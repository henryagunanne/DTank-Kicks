const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, { apiVersion: process.env.STRIPE_API_VERSION || "2026-03-25.dahlia" });
const Refund = require("../models/Refund");
const ReturnRequest = require("../models/ReturnRequest");
const Order = require("../models/Order");
const AuditLog = require("../models/AuditLog");

function toCents(amount) {
  // Order prices appear to be stored as whole units (e.g., 6500). Keep consistent with existing code which multiplies by 100 elsewhere.
  return Math.round(Number(amount || 0) * 100);
}

async function createRefund({ orderId, returnRequestId, amount, reason, actorId }) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  // Prevent duplicate refunds: check Refunds already created for this returnRequestId
  const existing = await Refund.findOne({ returnRequestId, amount });
  if (existing && existing.status === "succeeded") {
    return existing;
  }

  const paymentIntent = order.paymentIntentId || order.stripePaymentIntentId;
  if (!paymentIntent) {
    const err = new Error("No payment intent available for this order");
    err.statusCode = 400;
    throw err;
  }

  // Create Refund record in DB as pending
  const refundDoc = await Refund.create({ orderId, returnRequestId, amount, currency: order.currency, status: "pending", reason });

  try {
    const stripeRefund = await stripe.refunds.create({
      payment_intent: paymentIntent,
      amount: toCents(amount),
      metadata: { orderId: String(order._id), returnRequestId: String(returnRequestId), refundId: String(refundDoc._id) },
    }, { idempotencyKey: `refund:${String(returnRequestId)}:${toCents(amount)}` });

    refundDoc.stripeRefundId = stripeRefund.id;
    refundDoc.status = stripeRefund.status === "succeeded" ? "succeeded" : "pending";
    refundDoc.stripeRaw = stripeRefund;
    await refundDoc.save();

    await AuditLog.create({ actorId: actorId || null, actorRole: actorId ? "admin" : "system", action: "refund_initiated", entityType: "Refund", entityId: refundDoc._id.toString(), after: refundDoc });

    // Link Refund to ReturnRequest document if provided
    if (returnRequestId) {
      try {
        const rr = await ReturnRequest.findById(returnRequestId);
        if (rr) {
          rr.refund = rr.refund || {};
          rr.refund.refundAmount = amount;
          rr.refund.currency = order.currency;
          rr.refund.refundId = refundDoc._id;
          rr.refund.status = refundDoc.status || "pending";
          await rr.save();
        }
      } catch (e) {
        console.error("Failed to link refund to return request", e.message);
      }
    }

    return refundDoc;
  } catch (err) {
    refundDoc.status = "failed";
    refundDoc.failureReason = err.message;
    await refundDoc.save();
    await AuditLog.create({ actorId: actorId || null, actorRole: actorId ? "admin" : "system", action: "refund_failed", entityType: "Refund", entityId: refundDoc._id.toString(), after: refundDoc });
    throw err;
  }
}

module.exports = { createRefund };
