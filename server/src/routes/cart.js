const router = require("express").Router();
const { authenticate } = require("../middleware/auth");

// Cart is client-side localStorage. Optional server sync per user via a simple in-memory map.
const userCarts = new Map();

router.get("/", authenticate, (req, res) => {
  res.json({ items: userCarts.get(String(req.user._id)) || [] });
});

router.post("/add", authenticate, (req, res) => {
  const items = userCarts.get(String(req.user._id)) || [];
  items.push({ ...req.body, id: Date.now().toString(36) });
  userCarts.set(String(req.user._id), items);
  res.json({ items });
});

router.put("/update", authenticate, (req, res) => {
  const { itemId, quantity } = req.body;
  const items = (userCarts.get(String(req.user._id)) || []).map((i) => i.id === itemId ? { ...i, quantity } : i);
  userCarts.set(String(req.user._id), items);
  res.json({ items });
});

router.delete("/remove/:itemId", authenticate, (req, res) => {
  const items = (userCarts.get(String(req.user._id)) || []).filter((i) => i.id !== req.params.itemId);
  userCarts.set(String(req.user._id), items);
  res.json({ items });
});

module.exports = router;
