const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Helper function to determine if two cart items are the same line (same product and variant)
function sameLine(a, b) {
  return (
    String(a.productId) === String(b.productId) &&
    String(a.variantId) === String(b.variantId)
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
    if (!body.productId || !body.variantId || !body.priceAtAdd || !body.name) {
      return res.status(400).json({ error: "Missing required cart item fields" });
    }

    const product = await Product.findById(body.productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const variant = product.variants.id(body.variantId);
    if (!variant) return res.status(404).json({ error: "Variant not found" });

    const item = {
      id: body.id || Date.now().toString(36),
      productId: body.productId,
      variantId: body.variantId,
      name: body.name,
      brand: body.brand || "",
      image: body.image || "",
      quantity: Math.max(1, Number(body.quantity) || 1),
      priceAtAdd: Number(variant.price),
      size: variant.size,
      color: variant.color.name,
    };

    // Add or update the item in the cart. 
    // If an item with the same ID exists, update its quantity. 
    // Otherwise, if an item with the same product and variant exists, merge them by summing quantities. 
    // If neither exists, add as a new line.
    const cart = await getOrCreate(req.user._id);
    const byId = cart.items.find((i) => i.id === item.id);
    if (byId) {
      byId.quantity = item.quantity;
    } else {
      const dup = cart.items.find((i) => sameLine(i, item));
      if (dup) dup.quantity += item.quantity;
      else cart.items.push(item);
    }

    cart.markModified("items"); // Tell Mongoose that the items array was modified since we're changing nested fields
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
      if (!raw || !raw.productId || !raw.variantId) continue;

      const product = await Product.findById(raw.productId);
      const variant = product?.variants.id(raw.variantId);

      if (!product || !variant) continue;

      const item = {
        id: raw.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        productId: raw.productId,
        variantId: raw.variantId,
        name: raw.name || "",
        brand: raw.brand || "",
        image: raw.image || "",
        quantity: Math.max(1, Number(raw.quantity) || 1),
        priceAtAdd: Number(variant.price) || 0,
        size: variant.size,
        color: variant.color.name,
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
