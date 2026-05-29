const express = require("express");
const mongoose = require("mongoose");
const { authenticate } = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();


// ─────────────────────────────────────────────
// GET current user's wishlist
// ─────────────────────────────────────────────

router.get("/", authenticate, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("wishlist");

  if (!user) {
    return res.status(404).json({
      error: "User not found",
    });
  }

  res.json(user.wishlist);
});



// POST /api/wishlist/toggle/:productId - toggle a product in the wishlist (add if not present, remove if already in wishlist)
router.post("/toggle/:productId", authenticate, async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({
      error: "Invalid product ID",
    });
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      error: "User not found",
    });
  }

  const exists = user.wishlist.some(
    (id) => id.toString() === productId
  );

  if (exists) {
    user.wishlist = user.wishlist.filter(
      (id) => id.toString() !== productId
    );
  } else {
    user.wishlist.push(productId);
  }

  await user.save();

  res.json({
    success: true,
    wished: !exists,
    wishlist: user.wishlist,
  });
});


module.exports = router;

