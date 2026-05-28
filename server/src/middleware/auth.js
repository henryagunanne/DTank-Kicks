const jwt = require("jsonwebtoken");
const User = require("../models/User");

function sign(user) {
  const access = jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });

  const refresh = jwt.sign({ sub: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { access, refresh };
}

async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, "") || req.cookies?.access;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).select("-passwordHash");
    if (!user) return res.status(401).json({ error: "Invalid token" });
    
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}

module.exports = { sign, authenticate, requireAdmin };
