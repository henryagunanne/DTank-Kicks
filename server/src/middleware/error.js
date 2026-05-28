const { validationResult } = require("express-validator");

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
}

function errorHandler(err, _req, res, _next) {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
}

module.exports = { validate, errorHandler };
