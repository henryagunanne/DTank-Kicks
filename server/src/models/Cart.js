const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    name: String,
    brand: String,
    image: String,

    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },

    priceAtAdd: {
      type: Number,
      required: true,
    },
    size: Number,
    color: String,
  }, { _id: false });

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
    totalPrice: items.reduce((s, i) => s + (i.priceAtAdd || 0) * (i.quantity || 0), 0),
  };
};



module.exports = mongoose.model("Cart", CartSchema);
