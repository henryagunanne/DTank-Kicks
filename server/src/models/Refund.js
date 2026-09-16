const mongoose = require("mongoose");

const RefundSchema = new mongoose.Schema({
  refundNumber: { type: String, unique: true, index: true },
  stripeRefundId: { type: String, index: true },
  paymentIntentId: { type: String, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  returnRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "ReturnRequest" },
  amount: { type: Number, required: true },
  currency: { type: String },
  status: { type: String, enum: ["pending","succeeded","failed","canceled"], default: "pending" },
  reason: { type: String },
  failureReason: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  stripeRaw: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model("Refund", RefundSchema);
