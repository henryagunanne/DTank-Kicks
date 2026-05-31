const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // client line id (uuid)
    productId: { type: mongoose.Schema.Types.Mixed, required: true },
    name: { type: String, required: true },
    brand: { type: String, default: "" },
    image: { type: String, default: "" },
    size: { type: Number, required: true },
    color: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const CartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true }
);


// Virtuals
CartSchema.methods.toClient = function () {
  const items = this.items || [];
  return {
    items,
    totalItems: items.reduce((s, i) => s + (i.quantity || 0), 0),
    totalPrice: items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0),
  };
};

module.exports = mongoose.model("Cart", CartSchema);
