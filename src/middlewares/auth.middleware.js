const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Accepts EITHER credential:
 *   - Authorization: Bearer <JWT>   → used by the interactive app (login-based sessions)
 *   - ?api_key=... or X-API-Key     → long-lived key meant for machine/tool integrations
 *                                     such as Power BI (Get Data > Web) and Power Apps /
 *                                     Power Automate custom connectors, where an
 *                                     interactive login flow isn't practical.
 *
 * Both paths attach the same req.user shape, so every route behaves identically
 * regardless of which credential was used.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const apiKey = req.query.api_key || req.headers['x-api-key'];

  if (apiKey) {
    const user = userRepository.findByApiKey(apiKey);
    if (!user) throw new ApiError(401, 'Invalid API key');
    req.user = { id: user.id, name: user.name, email: user.email };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required: provide a Bearer token or an api_key');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = userRepository.findById(decoded.id);
    if (!user) throw new ApiError(401, 'Invalid authentication token');
    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'Invalid or expired authentication token');
  }
});

module.exports = { authenticate };
