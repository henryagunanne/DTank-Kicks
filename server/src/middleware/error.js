/* 
  Middleware for validating request data and handling errors in the DTank Kicks server.
  The `validate` function checks for validation errors from express-validator and returns a 400 response if any are found. 
  The `errorHandler` function catches unhandled errors, logs them, and returns a JSON response with the error message and appropriate status code.
*/

const { validationResult } = require("express-validator");

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
}

function errorHandler(err, _req, res, _next) {
  console.error(err);
  res.status(err.statusCode || err.status || 500).json({ error: err.message || "Server error" });
}

module.exports = { validate, errorHandler };
