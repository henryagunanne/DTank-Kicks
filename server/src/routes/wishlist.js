const express = require("express");
const mongoose = require("mongoose");
const { Wishlist } = require("../models/Wishlist.js");
const { authenticate } = require("../middleware/auth.js");

const router = express.Router();


// ─────────────────────────────────────────────
// GET current user's wishlist
// ─────────────────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  let wishlist = await Wishlist.findOne({
    user: req.user.id,
  }).populate("products");

  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: req.user.id,
      products: [],
    });
  }

  res.json(wishlist.products);
});


// ─────────────────────────────────────────────
// TOGGLE wishlist item
// ─────────────────────────────────────────────
router.post("/:productId", authenticate, async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      error: "Invalid product ID",
    });
  }

  let wishlist = await Wishlist.findOne({
    user: req.user.id,
  });

  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: req.user.id,
      products: [],
    });
  }

  const exists = wishlist.products.some(
    (p) => p.toString() === productId
  );

  if (exists) {
    wishlist.products = wishlist.products.filter(
      (p) => p.toString() !== productId
    );
  } else {
    wishlist.products.push(productId);
  }

  await wishlist.save();

  res.json({
    success: true,
    wished: !exists,
    ids: wishlist.products,
  });
});

// Remove a specific product from wishlist
router.delete("/:productId", authenticate, async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      error: "Invalid product ID",
    });
  }

  let wishlist = await Wishlist.findOne({
    user: req.user.id,
  });

  if (!wishlist) {
    return res.status(404).json({
      error: "Wishlist not found",
    });
  }

  const exists = wishlist.products.some(
    (p) => p.toString() === productId
  );

  if (!exists) {
    return res.status(404).json({
      error: "Product not in wishlist",
    });
  }

  wishlist.products = wishlist.products.filter(
    (p) => p.toString() !== productId
  );

  await wishlist.save();

  res.json({
    success: true,
    ids: wishlist.products,
  });
});

module.exports = router;

