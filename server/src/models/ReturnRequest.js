const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const ReturnItemSchema = new mongoose.Schema({
  // Reference to order and identifying info. Orders in this app embed items without item _ids,
  // so we keep a stable reference using orderItemIndex plus product/variant snapshot.
  orderItemIndex: { type: Number, required: true },
  orderItemId: { type: String },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  variantId: { type: String },
  name: { type: String },
  image: { type: String },
  size: { type: String },
  color: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true }, // minor units assumed? stored in same units as Order
  reason: { type: String },
  condition: { type: String, enum: ["new","like_new","worn","damaged","defective","incomplete"], default: "new" },
  customerNote: { type: String },
  images: { type: [String], default: [] },
}, { _id: false });

const ReturnRequestSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  returnNumber: { type: String, unique: true, index: true },
  items: { type: [ReturnItemSchema], required: true },
  status: { type: String, enum: ["requested","approved","rejected","shipped","received","inspected","refund_pending","refunded","refund_failed","cancelled"], default: "requested", index: true },
  customerNote: { type: String },
  adminNote: { type: String },
  shippingInformation: {
    carrier: String,
    trackingNumber: String,
    shippedAt: Date,
  },
  inspection: {
    condition: { type: String },
    notes: { type: String },
    photos: { type: [String], default: [] },
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    inspectedAt: Date,
    restock: { type: Boolean }
  },
  refund: { // summary of refund attempt(s)
    refundAmount: { type: Number, default: 0 },
    currency: { type: String },
    refundId: { type: mongoose.Schema.Types.ObjectId, ref: "Refund" },
    status: { type: String, enum: ["pending","succeeded","failed","none"], default: "none" },
    failureReason: { type: String }
  },
  inventoryRestoredAt: { type: Date },
}, { timestamps: true });

// simple sequence used to generate human-friendly return numbers
ReturnRequestSchema.plugin(AutoIncrement, { inc_field: 'seq' });

ReturnRequestSchema.pre("save", function(next) {
  if (!this.returnNumber && this.seq != null) {
    this.returnNumber = `RET-${String(this.seq).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model("ReturnRequest", ReturnRequestSchema);
