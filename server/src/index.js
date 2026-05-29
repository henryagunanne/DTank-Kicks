// Entry point for the DTank Kicks API server. Sets up Express, connects to MongoDB, and defines routes and middleware.

require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");

const connectDB = require("./config/db");
const { errorHandler } = require("./middleware/error");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const reviewRoutes = require("./routes/reviews");
const paymentRoutes = require("./routes/payments");
const couponRoutes = require("./routes/coupons");
const wishlistRoutes = require("./routes/wishlist");

const app = express();

// Stripe webhook must receive raw body before json parser
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"))); // Serve uploaded images from the /uploads directory
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/products", reviewRoutes); // nested /:id/reviews
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wishlist", wishlistRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`API on http://localhost:${PORT}`);
    }).addListener("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    });
  })
}

module.exports = app; // Export app for testing 
