// services/order.service.js

const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { sendEmail } = require("../utils/email");

/**
 * Cancels an order, restores inventory, updates status,
 * and sends a cancellation email.
 *
 * @param {Document} order - Mongoose Order document
 * @param {Object} options
 * @param {Boolean} options.sendCancellationEmail
 * @returns {Promise<Document>}
 */
exports.cancelOrder = async (order, { sendCancellationEmail = true } = {}) => {
  if (!order) {
    throw new Error("Order not found");
  }

  if (["shipped", "delivered"].includes(order.fulfillmentStatus)) {
    throw new Error(
      "Order cannot be cancelled after it has been shipped."
    );
  }

  if (order.fulfillmentStatus === "cancelled") {
    throw new Error("Order is already cancelled.");
  }

  
  try {

    // Restore inventory
    for (const item of order.items) {
      const inventoryUpdate = await Product.updateOne(
        {
          _id: item.product,
          "variants._id": item.variantId,
        },
        {
          $inc: {
            "variants.$.stock": item.quantity,
          },
        },
      );

      if (inventoryUpdate.modifiedCount === 0) {
        throw new Error(
          `Failed to restore stock for product ${item.product}, variant ${item.variantId}`
        );
      }
    }

    // Update order
    order.fulfillmentStatus = "cancelled";
    order.cancelledAt = new Date();

    await order.save();


    // Send email after successful commit
    if (
      sendCancellationEmail &&
      order.shippingAddress?.email
    ) {
      await sendEmail({
        to: order.shippingAddress.email,
        subject: `Order Cancellation - ${order._id}`,
        text: `
          <h2>Your order has been cancelled</h2>

          <p>Your order
          <strong>${order._id}</strong>
          has been cancelled successfully.</p>

          <p>
            We would send you an email request your
            desired method to recieve your refund.
          </p>

          <p>
            If you have any questions,
            please contact our support team.
          </p>
        `,
      });
    }

    return order;

  } catch (err) {
    throw err;
    console.log("Error cancelling order:", err);
  } 
};