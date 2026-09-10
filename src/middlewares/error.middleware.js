const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const headerValue = req && req.headers && req.headers[env.requestIdHeader];
  const requestId = req && req.id ? req.id : headerValue || crypto.randomUUID();

  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    logger.warn(`${req.method} ${req.originalUrl} - 400 - Malformed JSON body`);
    return res.status(400).json({ success: false, message: 'Malformed JSON in request body', requestId });
  }

  if (typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
    logger.error(`${req.method} ${req.originalUrl} - 409 - ${err.code}: ${err.message}`);
    return res.status(409).json({ success: false, message: 'This operation conflicts with existing data', requestId });
  }

  let statusCode = err.statusCode;
  let message = err.message;
  const errors = err.errors;

  if (!(err instanceof ApiError)) {
    statusCode = 500;
    message = env.nodeEnv === 'production' ? 'Internal server error' : err.message;
  }
  statusCode = statusCode || 500;

  logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`);

  if (res && typeof res.setHeader === 'function') {
    res.setHeader(env.requestIdHeader, requestId);
  }
  res.status(statusCode).json({
    success: false,
    message,
    requestId,
    ...(errors && errors.length > 0 ? { errors } : {}),
    ...(env.nodeEnv !== 'production' && err.stack ? { stack: err.stack } : {}),
  });
}

function notFoundHandler(req, res, next) { // eslint-disable-line no-unused-vars
  const headerValue = req && req.headers && req.headers[env.requestIdHeader];
  const requestId = req && req.id ? req.id : headerValue || crypto.randomUUID();

  if (res && typeof res.setHeader === 'function') {
    res.setHeader(env.requestIdHeader, requestId);
  }

  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = { errorHandler, notFoundHandler };
