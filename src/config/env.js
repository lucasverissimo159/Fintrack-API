const path = require('path');
const crypto = require('crypto');

function parseTrustProxy(value) {
  if (value === undefined || value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'finance.db'),
  jwtSecret: process.env.JWT_SECRET || 'development-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  logLevel: process.env.LOG_LEVEL || 'info',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  requestIdHeader: 'x-request-id',
  apiKeyHashAlgorithm: 'sha256',
};

env.isTest = env.nodeEnv === 'test';

env.hashApiKey = (apiKey) => crypto.createHash(env.apiKeyHashAlgorithm).update(apiKey).digest('hex');

module.exports = env;
