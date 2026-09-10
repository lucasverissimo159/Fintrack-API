require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const crypto = require('crypto');

const swaggerSpec = require('./config/swagger');
const env = require('./config/env');
const routes = require('./routes');
const db = require('./database/db');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { apiLimiter, authLimiter } = require('./middlewares/rateLimit.middleware');
const logger = require('./utils/logger');

const app = express();

if (env.trustProxy !== undefined) {
  app.set('trust proxy', env.trustProxy);
}

app.use((req, res, next) => {
  const requestId = req.headers[env.requestIdHeader] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader(env.requestIdHeader, requestId);
  next();
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!env.isTest) {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.get('/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ success: true, status: 'ok', database: 'up', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error(`Health check failed: ${err.message}`);
    res.status(503).json({ success: false, status: 'error', database: 'down', timestamp: new Date().toISOString() });
  }
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
