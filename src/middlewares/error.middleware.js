const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Malformed JSON body: express.json() throws a SyntaxError with status 400
  // and type 'entity.parse.failed'. Without this check it fell through to the
  // generic 500 branch below — a client typo became a "server error".
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    logger.warn(`${req.method} ${req.originalUrl} - 400 - Malformed JSON body`);
    return res.status(400).json({ success: false, message: 'Malformed JSON in request body' });
  }

  // SQLite constraint violations that slip past application-level checks —
  // e.g. two processes sharing the same DB file racing to insert the same
  // unique (user, category, period) budget — are translated into a clean,
  // safe 409 instead of leaking a raw SQL error and stack trace to the client.
  if (typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
    logger.error(`${req.method} ${req.originalUrl} - 409 - ${err.code}: ${err.message}`);
    return res.status(409).json({ success: false, message: 'This operation conflicts with existing data' });
  }

  let statusCode = err.statusCode;
  let message = err.message;
  const errors = err.errors;

  if (!(err instanceof ApiError)) {
    statusCode = 500;
    message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  }
  statusCode = statusCode || 500;

  logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`);

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && errors.length > 0 ? { errors } : {}),
    ...(process.env.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {}),
  });
}

function notFoundHandler(req, res, next) { // eslint-disable-line no-unused-vars
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = { errorHandler, notFoundHandler };
