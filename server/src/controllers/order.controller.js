const Order = require("../models/Order");
const orderService = require("../services/order.service");


exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        const cancelledOrder = await orderService.cancelOrder(order);

        res.json({
            message: "Order cancelled successfully",
            order: cancelledOrder,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Unable to cancel order.",
        });
    }
};


exports.cancelGuestOrder = async (req, res) => {
    try {
        const order = await Order.findOne({
            trackingNumber: req.params.token,
        });

        const cancelledOrder = await orderService.cancelOrder(order);

        res.json({
            message: "Order cancelled successfully",
            order: cancelledOrder,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Unable to cancel order.",
        });
    }
};


