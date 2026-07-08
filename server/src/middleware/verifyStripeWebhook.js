const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

function verifyStripeWebhook(req, res, next) {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).json({ error: "Missing Stripe signature" });
  }

  try {
    req.event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    next();
  } catch (error) {
    res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
}

module.exports = { verifyStripeWebhook };
