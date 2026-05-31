const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const Cart = require("../models/Cart");

function sameLine(a, b) {
  return (
    String(a.productId) === String(b.productId) &&
    Number(a.size) === Number(b.size) &&
    String(a.color || "") === String(b.color || "")
  );
}

async function getOrCreate(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

// GET /api/cart  — hydrate cart on login
router.get("/", authenticate, async (req, res, next) => {
  try {
    const cart = await getOrCreate(req.user._id);
    res.json(cart.toClient());
  } catch (e) {
    next(e);
  }
});

// POST /api/cart  — add or update a single line (idempotent by id, merges duplicates)
router.post("/", authenticate, async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.productId || !body.size || !body.price || !body.name) {
      return res.status(400).json({ error: "Missing required cart item fields" });
    }
    const item = {
      id: body.id || Date.now().toString(36),
      productId: body.productId,
      name: body.name,
      brand: body.brand || "",
      image: body.image || "",
      size: Number(body.size),
      color: body.color || "",
      quantity: Math.max(1, Number(body.quantity) || 1),
      price: Number(body.price),
    };

    const cart = await getOrCreate(req.user._id);
    const byId = cart.items.find((i) => i.id === item.id);
    if (byId) {
      byId.quantity = item.quantity;
    } else {
      const dup = cart.items.find((i) => sameLine(i, item));
      if (dup) dup.quantity += item.quantity;
      else cart.items.push(item);
    }
    await cart.save();
    res.json(cart.toClient());
  } catch (e) {
    next(e);
  }
});

// DELETE /api/cart/:id  — remove a line
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const cart = await getOrCreate(req.user._id);
    cart.items = cart.items.filter((i) => i.id !== req.params.id);
    await cart.save();
    res.json(cart.toClient());
  } catch (e) {
    next(e);
  }
});

// PUT /api/cart/merge  — merge a guest (localStorage) cart into the user's db cart
router.put("/merge", authenticate, async (req, res, next) => {
  try {
    const incoming = Array.isArray(req.body?.items) ? req.body.items : [];
    const cart = await getOrCreate(req.user._id);

    for (const raw of incoming) {
      if (!raw || !raw.productId || !raw.size) continue;
      const item = {
        id: raw.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        productId: raw.productId,
        name: raw.name || "",
        brand: raw.brand || "",
        image: raw.image || "",
        size: Number(raw.size),
        color: raw.color || "",
        quantity: Math.max(1, Number(raw.quantity) || 1),
        price: Number(raw.price) || 0,
      };
      const dup = cart.items.find((i) => sameLine(i, item));
      if (dup) dup.quantity += item.quantity;
      else cart.items.push(item);
    }

    await cart.save();
    res.json(cart.toClient());
  } catch (e) {
    next(e);
  }
});

// DELETE /api/cart  — clear cart
router.delete("/", authenticate, async (req, res, next) => {
  try {
    const cart = await getOrCreate(req.user._id);
    cart.items = [];
    await cart.save();
    res.json(cart.toClient());
  } catch (e) {
    next(e);
  }
});

module.exports = router;
