const stripeService = require("../services/stripe.service");

async function createCheckoutSession(req, res, next) {
  try {
    const payload = await stripeService.createCheckoutSession({
      user: req.user,
      shippingAddress: req.body.shippingAddress,
      deliveryMethod: req.body.deliveryMethod,
      discount: req.body.discount || 0,
      selectedItemIds: req.body.selectedItemIds || [],
      selectedItems: req.body.selectedItems || [],
    });
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
}

const createPaymentIntent = createCheckoutSession;

async function webhook(req, res, next) {
  try {
    const signature = req.headers["stripe-signature"];
    const result = await stripeService.handleWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { createPaymentIntent, createCheckoutSession, webhook };
