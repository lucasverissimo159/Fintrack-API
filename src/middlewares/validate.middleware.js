const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after an express-validator chain. Collects any failed rules and
 * turns them into a single 400 ApiError with a field-by-field breakdown.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(new ApiError(400, 'Validation failed', formatted));
  }
  next();
}

module.exports = validate;
