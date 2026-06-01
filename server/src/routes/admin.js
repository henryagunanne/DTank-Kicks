const express = require("express");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");

const { authenticate, requireAdmin } = require("../middleware/auth");
const { validate } = require("../middleware/error");

const router = express.Router();


// GET /api/admin/dashboard - returns key metrics for the admin dashboard, including total revenue in the last 30 days, total orders, total customers, low stock products, and revenue chart data for the last 30 days.
router.get("/dashboard", authenticate, requireAdmin, async (req, res) => {
    try {
      const now = new Date();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const orders = await Order.find({
        createdAt: { $gte: thirtyDaysAgo },
      });

      const revenue30d = orders.reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );

      const totalOrders = await Order.countDocuments();

      const customers = await User.countDocuments({role: "customer"});

      const products = await Product.find();

      // Count low stock products (total stock across all variants <= 5)
      const lowStock = products.filter(product =>
        (product.variants || []).some(
            variant => variant.stock <= 5
        )
      ).length;

      // Revenue chart data for the last 30 days
      const revenueChartRaw = await Order.aggregate([
        {
            $match: {
            createdAt: {
                $gte: thirtyDaysAgo,
            },
            },
        },
        {
            $group: {
            _id: {
                $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                },
            },
            revenue: {
                $sum: "$total",
            },
            },
        },
        {
            $sort: {
            _id: 1,
            },
        },
      ]);


      const revenueMap = new Map(
        revenueChartRaw.map(item => [
            item._id,
            item.revenue,
        ])
      );

        const revenueChart = [];

        for (let i = 29; i >= 0; i--) {
            const day = new Date();
            day.setHours(0, 0, 0, 0);
            day.setDate(day.getDate() - i);

            const key = day.toISOString().slice(0, 10);

            revenueChart.push({
                day: day.getDate(),
                revenue: revenueMap.get(key) || 0,
            });
        }

        const totalProducts = await Product.countDocuments();

      res.json({
        revenue30d,
        totalOrders,
        customers,
        lowStock,
        revenueChart,
        totalProducts,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Failed to load dashboard",
      });
    }
  }
);


// GET /api/admin/customers - returns a list of customers with their total orders and total spend.
router.get("/customers", authenticate, requireAdmin, async (req, res) => {
    try {
      const customers = await User.find({
        role: "customer",
      }).lean();

      const result = await Promise.all(
        customers.map(async (customer) => {
          const orders = await Order.find({
            user: customer._id,
          });

          const spend = orders.reduce(
            (sum, order) => sum + order.total,
            0
          );

          return {
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            orders: orders.length,
            spend,
            createdAt: customer.createdAt,
          };
        })
      );

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Failed to fetch customers",
      });
    }
  }
);


// GET /api/admin/orders - returns a list of all orders with user info. Supports filtering by fulfillment status.
router.get("/orders", authenticate, requireAdmin, async (req, res) => {
    try {
      const orders = await Order.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 });

      res.json(orders);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Failed to fetch orders",
      });
    }
  }
);

// PATCH /api/admin/orders/:id/status - updates the fulfillment status of an order. 
router.patch("/orders/:id/status", authenticate, requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;

      const allowed = [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
      ];

      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: "Invalid status",
        });
      }

      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!order) {
        return res.status(404).json({
          error: "Order not found",
        });
      }

      res.json(order);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Failed to update order",
      });
    }
  }
);


// GET /api/admin/low-stock - returns a list of products that are low in stock (total stock across all sizes <= 5).
router.get("/low-stock", authenticate, requireAdmin, async (req, res) => {
    try {
      const products = await Product.find();

      const lowStock = products.filter((product) => {
        const totalStock = product.sizes.reduce(
          (sum, size) => sum + size.stock,
          0
        );

        return totalStock <= 5;
      });

      res.json(lowStock);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Failed to fetch low stock products",
      });
    }
  }
);


// GET /api/admin/activity - returns recent admin activity, including recent orders and customer signups.
router.get("/activity", authenticate, requireAdmin, async (req, res) => {
    try {
      const recentOrders = await Order.find()
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .limit(10);

      res.json(recentOrders);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Failed to fetch activity",
      });
    }
  }
);

module.exports = router;