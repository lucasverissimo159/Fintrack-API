require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const db = require('./database/db');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { apiLimiter, authLimiter } = require('./middlewares/rateLimit.middleware');
const logger = require('./utils/logger');

const app = express();

// Deployed behind a reverse proxy or PaaS (Render, Railway, Heroku, nginx...),
// Express sees the proxy's IP on every request unless told to trust the
// X-Forwarded-For header. Left unset, express-rate-limit buckets every real
// visitor together under the proxy's single IP — a false "too many requests"
// for everyone, not a bottleneck exactly, but exactly the kind of thing that
// surfaces the day traffic actually grows. Off by default (safe for a bare
// process); set TRUST_PROXY when you actually sit behind one hop of proxy.
function parseTrustProxy(value) {
  if (value === undefined || value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value; // e.g. 'loopback', or a comma-separated list of trusted IPs/subnets
}
const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
if (trustProxy !== undefined) {
  app.set('trust proxy', trustProxy);
}

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Interactive API documentation + the raw OpenAPI JSON used to build a
// Power Apps / Power Automate Custom Connector (Data > Custom connectors >
// New custom connector > Import an OpenAPI file).
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
