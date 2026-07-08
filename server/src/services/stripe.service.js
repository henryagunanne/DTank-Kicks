const crypto = require("crypto");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: process.env.STRIPE_API_VERSION || "2026-03-25.dahlia",
});
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { sendEmail } = require("../utils/email");

const DEFAULT_CURRENCY = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();

function getAmountInCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function buildBreakdown({ subtotal, deliveryMethod, discount }) {
  const shipping = deliveryMethod === "express" ? 350 : subtotal >= 2000 ? 0 : 150;
  const tax = Math.round(subtotal * 0.12);
  const total = Math.max(0, subtotal + shipping + tax - Number(discount || 0));

  return {
    subtotal,
    shipping,
    tax,
    discount: Number(discount || 0),
    total,
  };
}

async function generateUniqueTrackingToken() {
  let token;
  let existingOrder;

  do {
    token = crypto.randomBytes(16).toString("hex");
    existingOrder = await Order.findOne({ trackingNumber: token });
  } while (existingOrder);

  return token;
}

function toOrderItem(item, variant, product) {
  return {
    product: item.productId,
    variantId: item.variantId,
    name: item.name,
    image: item.image,
    brand: item.brand,
    size: variant.size,
    color: variant.color?.name || item.color,
    quantity: item.quantity,
    price: Number(variant.price),
  };
}

async function validateCartItems(userId, selectedItemIds = [], selectedItems = []) {
  const checkoutItems = Array.isArray(selectedItems) && selectedItems.length
    ? selectedItems
    : [];

  if (checkoutItems.length) {
    const productIds = [...new Set(checkoutItems.map((item) => item.productId.toString()))];
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    const orderItems = [];
    let subtotal = 0;

    for (const item of checkoutItems) {
      const product = productMap.get(item.productId.toString());
      if (!product) {
        const error = new Error(`Product ${item.productId} no longer exists.`);
        error.statusCode = 404;
        throw error;
      }

      const variant = product.variants.id(item.variantId);
      if (!variant) {
        const error = new Error(`Variant ${item.variantId} is no longer available.`);
        error.statusCode = 404;
        throw error;
      }

      if (variant.stock < item.quantity) {
        const error = new Error(`Insufficient stock for ${product.name}.`);
        error.statusCode = 409;
        throw error;
      }

      const lineTotal = Number(variant.price) * item.quantity;
      subtotal += lineTotal;
      orderItems.push(toOrderItem(item, variant, product));
    }

    return { cartItems: checkoutItems, orderItems, subtotal };
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart || !cart.items?.length) {
    const error = new Error("Your cart is empty.");
    error.statusCode = 400;
    throw error;
  }

  const normalizedSelectedIds = (selectedItemIds || []).map((id) => String(id)).filter(Boolean);
  const cartItems = normalizedSelectedIds.length
    ? cart.items.filter((item) => normalizedSelectedIds.includes(String(item.id)))
    : cart.items;

  if (!cartItems.length) {
    const error = new Error("No selected items to checkout.");
    error.statusCode = 400;
    throw error;
  }

  const productIds = [...new Set(cartItems.map((item) => item.productId.toString()))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  const orderItems = [];
  let subtotal = 0;

  for (const item of cartItems) {
    const product = productMap.get(item.productId.toString());
    if (!product) {
      const error = new Error(`Product ${item.productId} no longer exists.`);
      error.statusCode = 404;
      throw error;
    }

    const variant = product.variants.id(item.variantId);
    if (!variant) {
      const error = new Error(`Variant ${item.variantId} is no longer available.`);
      error.statusCode = 404;
      throw error;
    }

    if (variant.stock < item.quantity) {
      const error = new Error(`Insufficient stock for ${product.name}.`);
      error.statusCode = 409;
      throw error;
    }

    const lineTotal = Number(variant.price) * item.quantity;
    subtotal += lineTotal;
    orderItems.push(toOrderItem(item, variant, product));
  }

  return { cart, cartItems, orderItems, subtotal };
}

async function createCheckoutSession({ user, shippingAddress, deliveryMethod, discount = 0, selectedItemIds = [], selectedItems = [] }) {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("Stripe is not configured.");
    error.statusCode = 500;
    throw error;
  }

  const userId = user?._id;
  const { cartItems, orderItems, subtotal } = await validateCartItems(userId, selectedItemIds, selectedItems);
  const breakdown = buildBreakdown({ subtotal, deliveryMethod, discount });
  const trackingNumber = await generateUniqueTrackingToken();

  const order = await Order.create({
    user: userId || null,
    guestEmail: shippingAddress?.email,
    items: orderItems,
    shippingAddress,
    cartItemIds: (cartItems || []).map((item) => String(item.id)),
    deliveryMethod,
    status: "processing payment",
    paymentStatus: "pending",
    fulfillmentStatus: "placed",
    subtotal: breakdown.subtotal,
    shipping: breakdown.shipping,
    tax: breakdown.tax,
    discount: breakdown.discount,
    total: breakdown.total,
    currency: DEFAULT_CURRENCY.toUpperCase(),
    trackingNumber,
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "elements",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: DEFAULT_CURRENCY,
            product_data: {
              name: `DTank Kicks order ${order._id}`,
            },
            unit_amount: getAmountInCents(breakdown.total),
          },
          quantity: 1,
        },
      ],
      customer_email: shippingAddress?.email || undefined,
      metadata: {
        orderId: order._id.toString(),
        userId: userId ? userId.toString() : "guest",
        trackingNumber,
      },
    });

    order.paymentIntentId = session.payment_intent || session.id;
    order.stripePaymentIntentId = session.payment_intent || session.id;
    await order.save();

    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
      paymentIntentId: session.payment_intent || session.id,
      orderId: order._id.toString(),
      trackingNumber,
      currency: DEFAULT_CURRENCY.toUpperCase(),
      total: breakdown.total,
    };
  } catch (error) {
    await Order.findByIdAndDelete(order._id);
    throw error;
  }
}

async function clearUserCart(userId, itemIds = []) {
  if (!userId) return;

  const normalizedIds = (itemIds || []).map((id) => String(id)).filter(Boolean);
  if (normalizedIds.length) {
    await Cart.updateOne({ user: userId }, { $pull: { items: { id: { $in: normalizedIds } } } }, { upsert: true });
    return;
  }

  await Cart.updateOne({ user: userId }, { $set: { items: [] } }, { upsert: true });
}

async function decrementInventory(order) {
  for (const item of order.items || []) {
    const result = await Product.updateOne(
      {
        _id: item.product,
        "variants._id": item.variantId,
        "variants.stock": { $gte: item.quantity },
      },
      {
        $inc: {
          "variants.$.stock": -item.quantity,
        },
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error(`Unable to reserve stock for ${item.name}`);
    }
  }
}

async function finalizeSuccessfulOrder(order, paymentIntent, receiptUrl) {
  if (order.paymentStatus === "paid") {
    return order;
  }

  await decrementInventory(order);

  order.paymentStatus = "paid";
  order.status = "paid";
  order.fulfillmentStatus = "processing";
  order.paidAt = new Date();
  order.receiptUrl = receiptUrl || order.receiptUrl;
  order.paymentMethod = paymentIntent?.payment_method_types?.[0] || "card";
  order.currency = order.currency || DEFAULT_CURRENCY.toUpperCase();
  await order.save();

  if (order.user) {
    await clearUserCart(order.user, order.cartItemIds || []);
  }

  const recipientEmail = order.shippingAddress?.email || order.guestEmail;
  if (recipientEmail) {
    const trackingUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/track/${order.trackingNumber}`;
    await sendEmail(
      recipientEmail,
      `Payment confirmed - ${order._id}`,
      `<h2>Payment confirmed</h2><p>Your order <strong>${order._id}</strong> has been paid successfully.</p><p>Track it here: <a href="${trackingUrl}">${trackingUrl}</a></p>`
    );
  }

  return order;
}

async function markOrderFailed(order, status = "payment failed") {
  order.paymentStatus = "failed";
  order.status = status;
  order.fulfillmentStatus = "cancelled";
  await order.save();
  return order;
}

async function handleWebhook(body, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    const error = new Error("Stripe webhook secret is not configured.");
    error.statusCode = 500;
    throw error;
  }

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const order = session.metadata?.orderId
      ? await Order.findById(session.metadata.orderId)
      : await Order.findOne({
          $or: [{ paymentIntentId: session.payment_intent }, { stripePaymentIntentId: session.payment_intent }],
        });

    if (!order) {
      return { received: true, ignored: true };
    }

    if (order.paymentStatus === "paid") {
      return { received: true, ignored: true };
    }

    try {
      order.paymentIntentId = session.payment_intent || order.paymentIntentId;
      order.stripePaymentIntentId = session.payment_intent || order.stripePaymentIntentId;
      await order.save();
      await finalizeSuccessfulOrder(order, session, null);
      return { received: true, handled: true };
    } catch (error) {
      console.error("Stripe webhook payment success handling failed", error);
      await markOrderFailed(order);
      return { received: true, handled: false, error: error.message };
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const order = await Order.findOne({
      $or: [{ paymentIntentId: paymentIntent.id }, { stripePaymentIntentId: paymentIntent.id }],
    });

    if (!order) {
      return { received: true, ignored: true };
    }

    if (order.paymentStatus === "paid") {
      return { received: true, ignored: true };
    }

    try {
      const receiptUrl = paymentIntent?.latest_charge ? `https://dashboard.stripe.com/test/payments/${paymentIntent.latest_charge}` : null;
      await finalizeSuccessfulOrder(order, paymentIntent, receiptUrl);
      return { received: true, handled: true };
    } catch (error) {
      console.error("Stripe webhook payment success handling failed", error);
      await markOrderFailed(order);
      return { received: true, handled: false, error: error.message };
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;
    const order = await Order.findOne({
      $or: [{ paymentIntentId: paymentIntent.id }, { stripePaymentIntentId: paymentIntent.id }],
    });

    if (!order) {
      return { received: true, ignored: true };
    }

    await markOrderFailed(order);
    return { received: true, handled: true };
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const order = await Order.findOne({
      $or: [{ paymentIntentId: charge.payment_intent }, { stripePaymentIntentId: charge.payment_intent }],
    });

    if (!order) {
      return { received: true, ignored: true };
    }

    order.paymentStatus = "refunded";
    order.status = "refunded";
    await order.save();
    return { received: true, handled: true };
  }

  return { received: true, ignored: true };
}

module.exports = {
  createCheckoutSession,
  createPaymentIntent: createCheckoutSession,
  handleWebhook,
  clearUserCart,
};
