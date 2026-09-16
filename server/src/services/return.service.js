const mongoose = require("mongoose");
const Order = require("../models/Order");
const ReturnRequest = require("../models/ReturnRequest");
const Refund = require("../models/Refund");
const AuditLog = require("../models/AuditLog");

async function calculateReturnableQuantities(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  // Build map of purchased quantities by key product-variant-index
  const purchased = order.items.map((it, idx) => ({
    index: idx,
    product: String(it.product || ""),
    variantId: it.variantId || "",
    quantity: Number(it.quantity || 0),
    unitPrice: Number(it.price || 0),
  }));

  // Sum previously returned quantities from ReturnRequest documents for this order
  const existingReturns = await ReturnRequest.find({ orderId: order._id, status: { $in: ["approved","shipped","received","inspected","refund_pending","refunded"] } });
  const returnedByIndex = new Map();
  for (const rr of existingReturns) {
    for (const item of rr.items || []) {
      const key = Number(item.orderItemIndex);
      returnedByIndex.set(key, (returnedByIndex.get(key) || 0) + Number(item.quantity || 0));
    }
  }

  const result = purchased.map((p) => {
    const returned = returnedByIndex.get(p.index) || 0;
    return {
      orderItemIndex: p.index,
      product: p.product,
      variantId: p.variantId,
      purchasedQuantity: p.quantity,
      previouslyReturnedQuantity: returned,
      returnableQuantity: Math.max(0, p.quantity - returned),
      unitPrice: p.unitPrice,
    };
  });

  return result;
}

async function createReturnRequest({ orderId, userId, items = [], customerNote = "" , email }) {
  // Validate order and quantities
  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  // Policy: only delivered orders within window are returnable
  const deliveredAt = order.deliveredAt || order.updatedAt || order.createdAt;
  const RETURN_WINDOW_DAYS = Number(process.env.RETURN_WINDOW_DAYS || 30);
  const daysSinceDelivery = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
  if (order.fulfillmentStatus === "delivered" && daysSinceDelivery > RETURN_WINDOW_DAYS) {
    const err = new Error("Return window expired");
    err.statusCode = 400;
    throw err;
  }

  // Calculate returnable quantities
  const availability = await calculateReturnableQuantities(orderId);
  const avaMap = new Map(availability.map((a) => [a.orderItemIndex, a]));

  const normalizedItems = (items || []).map((it) => {
    const idx = Number(it.orderItemIndex ?? it.itemIndex ?? -1);
    const qty = Number(it.quantity || 0);
    const ava = avaMap.get(idx);
    if (!ava) {
      const err = new Error(`Invalid order item reference: ${idx}`);
      err.statusCode = 400;
      throw err;
    }
    if (qty < 1 || qty > ava.returnableQuantity) {
      const err = new Error(`Invalid quantity for item at index ${idx}. Returnable: ${ava.returnableQuantity}`);
      err.statusCode = 400;
      throw err;
    }

    return {
      orderItemIndex: idx,
      product: ava.product,
      variantId: ava.variantId,
      name: order.items[idx]?.name || "",
      image: order.items[idx]?.image || "",
      size: order.items[idx]?.size || "",
      color: order.items[idx]?.color || "",
      quantity: qty,
      unitPrice: ava.unitPrice,
      reason: it.reason || "",
      condition: it.condition || "new",
      customerNote: it.customerNote || "",
      images: Array.isArray(it.images) ? it.images : [],
    };
  });

  // Calculate refund amount (server-side) — sum unitPrice * qty (using order snapshot values)
  const refundAmount = normalizedItems.reduce((s, it) => s + (Number(it.unitPrice || 0) * Number(it.quantity || 0)), 0);

  // Create ReturnRequest document
  const rr = await ReturnRequest.create({ orderId, userId: userId || null, items: normalizedItems, customerNote });

  // Update order.latest return summary for backwards compatibility
  order.returnRequest = {
    requestedAt: new Date(),
    status: "requested",
    reason: normalizedItems[0]?.reason || "",
    refundAmount,
    adminNote: "",
    returnItems: normalizedItems.map((i) => ({ product: i.product, variantId: i.variantId, name: i.name, quantity: i.quantity, price: i.unitPrice }))
  };
  order.status = "return requested";
  order.fulfillmentStatus = "return requested";
  await order.save();

  // Audit
  await AuditLog.create({ actorId: userId || null, actorRole: userId ? "customer" : "guest", action: "return_requested", entityType: "ReturnRequest", entityId: rr._id.toString(), after: rr });

  return { returnRequest: rr, order };
}

async function approveReturn({ returnRequestId, adminId, adminNote = "" }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const rr = await ReturnRequest.findById(returnRequestId).session(session);
    if (!rr) throw new Error("Return request not found");
    if (rr.status !== "requested") throw new Error("Return request not in a state that can be approved");

    rr.status = "approved";
    rr.adminNote = adminNote;
    await rr.save({ session });

    // update order compatibility fields
    const order = await Order.findById(rr.orderId).session(session);
    order.returnRequest = { ...order.returnRequest, status: "approved", adminNote, refundAmount: rr.items.reduce((s,i)=>s + (i.unitPrice * i.quantity),0) };
    order.status = "return approved";
    order.fulfillmentStatus = "return approved";
    order.paymentStatus = order.paymentStatus === "paid" ? "pending_refund" : order.paymentStatus;
    await order.save({ session });

    await AuditLog.create([{ actorId: adminId, actorRole: "admin", action: "return_approved", entityType: "ReturnRequest", entityId: rr._id.toString(), before: null, after: rr }], { session });

    await session.commitTransaction();
    session.endSession();
    return { returnRequest: rr, order };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = {
  calculateReturnableQuantities,
  createReturnRequest,
  approveReturn,
};
