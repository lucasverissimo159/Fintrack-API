/**
 * Operational error class used across services/controllers so the centralized
 * error middleware can distinguish expected API errors (bad input, not found,
 * conflicts) from unexpected bugs, and respond with the correct HTTP status.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
