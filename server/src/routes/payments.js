const router = require("express").Router();
const { body } = require("express-validator");
const { authenticateOptional } = require("../middleware/auth");
const { validate } = require("../middleware/error");
const paymentController = require("../controllers/payment.controller");
const { verifyStripeWebhook } = require("../middleware/verifyStripeWebhook");

router.post(
  "/create-checkout-session",
  authenticateOptional,
  body("shippingAddress.name").notEmpty(),
  body("shippingAddress.email").isEmail(),
  body("shippingAddress.line1").notEmpty(),
  body("shippingAddress.city").notEmpty(),
  body("shippingAddress.province").notEmpty(),
  body("shippingAddress.country").notEmpty(),
  body("deliveryMethod").optional().isIn(["standard", "express"]),
  validate,
  paymentController.createCheckoutSession
);


router.post(
  "/create-payment-intent",
  authenticateOptional,
  body("shippingAddress.name").notEmpty(),
  body("shippingAddress.email").isEmail(),
  body("shippingAddress.line1").notEmpty(),
  body("shippingAddress.city").notEmpty(),
  body("shippingAddress.province").notEmpty(),
  body("shippingAddress.country").notEmpty(),
  body("deliveryMethod").optional().isIn(["standard", "express"]),
  validate,
  paymentController.createPaymentIntent
);


// Stripe webhook endpoint
router.post(
  "/webhook",
  verifyStripeWebhook,
  paymentController.webhook
);

module.exports = router;
