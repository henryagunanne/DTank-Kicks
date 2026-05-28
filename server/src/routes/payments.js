const router = require("express").Router();
const { body } = require("express-validator");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../models/Order");
const { validate } = require("../middleware/error");

router.post("/create-intent",
  body("amount").isInt({ min: 50 }), body("currency").optional().isString(),
  validate,
  async (req, res) => {
    const intent = await stripe.paymentIntents.create({
      amount: req.body.amount, currency: req.body.currency || "php",
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: intent.client_secret, id: intent.id });
  }
);

router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    await Order.findOneAndUpdate({ stripePaymentIntentId: pi.id }, { paymentStatus: "paid" });
  }
  res.json({ received: true });
});

module.exports = router;
