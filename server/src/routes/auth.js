// routes/auth.js

/*

This file defines the Express routes for user authentication in the DTank Kicks application. 
It includes endpoints for user registration, login, fetching the current user's profile, 
initiating password reset via email, and completing password reset with a token. 
The routes use middleware for rate limiting, input validation, and authentication.

*/

const router = require("express").Router();
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const { body } = require("express-validator");
const User = require("../models/User");
const { sign, authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/error");
const { sendEmail } = require("../utils/email");

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

const cookieOpts = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" };

// POST /api/auth/register` - creates a new user account with name, email, and password. Returns user info and JWT access token.
router.post("/register",
  authLimiter,
  body("name").trim().isLength({ min: 1, max: 100 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8, max: 128 }),
  validate,
  async (req, res) => {

    const { name, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(409).json({ error: "Email already in use" });
    
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    const { access, refresh } = sign(user);
    
    res.cookie("refresh", refresh, { ...cookieOpts, maxAge: 7 * 86400000 });
    res.json({ 
      user: { 
        id: user._id, 
        name, 
        email,
        role: user.role,
        phone: user.phone,
        addresses: user.addresses
      }, 
      access 
      });
  }
);

// POST /api/auth/login` - authenticates a user with email and password. Returns user info and JWT access token.
router.post("/login",
  authLimiter,
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 1 }),
  validate,
  async (req, res) => {

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { access, refresh } = sign(user);

    res.cookie("refresh", refresh, { ...cookieOpts, maxAge: 7 * 86400000 });
    res.json({ 
      user: { 
        id: user._id, 
        name: user.name, 
        email, 
        role: user.role,
        phone: user.phone,
        addresses: user.addresses
      }, 
      access 
    });
  }
);

router.get("/me", authenticate, (req, res) => res.json({ user: req.user }));

// PUT /api/auth/change-password` - allows an authenticated user to change their password by providing the current password and a new password. Validates that the new password is different from the current one.
router.put("/change-password",
  authenticate,
  body("currentPassword").isLength({ min: 1 }),
  body("newPassword").isLength({ min: 8, max: 128 }),
  body("confirmPassword").custom((value, { req }) => value === req.body.newPassword),
  validate,
  async (req, res) => {
      try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: "User not found" });

        if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
          return res.status(400).json({ error: "Current password is incorrect" });
        }

        if (currentPassword === newPassword) {
          return res.status(400).json({ error: "New password must be different from current password" });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 12);
        await user.save();
        res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to change password" });
    }
  }
);

// POST /api/auth/forgot-password` - initiates password reset by generating a token and sending a reset link to the user's email.
router.post("/forgot-password",
  authLimiter,
  body("email").isEmail().normalizeEmail(),
  validate,
  async (req, res) => {

    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.resetToken = token;
      user.resetTokenExpires = new Date(Date.now() + 3600000);
      
      await user.save();
      const link = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
      await sendEmail(user.email, "Reset your DTank Kicks account password", `<p>Reset link: <a href="${link}">${link}</a></p>`);
    }
    res.json({ ok: true });
  }
);


// POST /api/auth/reset-password` - completes the password reset process by validating the token and updating the user's password.
// Maybe used when the user clicks the reset link in their email. Validates the token and allows the user to set a new password.
router.post("/reset-password",
  authLimiter,
  body("token").isString().isLength({ min: 10, max: 128 }),
  body("password").isLength({ min: 8, max: 128 }),
  body("confirmPassword").custom((value, { req }) => value === req.body.password),
  validate,
  async (req, res) => {

    const user = await User.findOne({ resetToken: req.body.token, resetTokenExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: "Invalid or expired token" });
    
    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    res.json({ ok: true });
  }
);


// POST /api/auth/logout` - clears the refresh token cookie to log the user out.
router.post("/logout", (req, res) => {
  res.clearCookie("refresh", cookieOpts);
  res.json({ ok: true });
});

module.exports = router;
