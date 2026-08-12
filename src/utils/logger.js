const fs = require('fs');
const path = require('path');
const winston = require('winston');

const logsDir = path.join(__dirname, '..', '..', 'logs');

// Some deployment targets (serverless platforms, containers with a read-only
// root filesystem outside of specific mounted volumes) won't allow creating
// this directory. Don't let logging — a side concern — take the whole app
// down on boot: fall back to console-only logging instead of throwing.
let fileLoggingEnabled = true;
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (err) {
  fileLoggingEnabled = false;
}

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }),
];

if (fileLoggingEnabled) {
  transports.push(new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }));
  transports.push(new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }));
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports,
});

// winston's File transport opens/writes lazily and can fail asynchronously
// (e.g. the filesystem becomes read-only after startup, or a permissions
// change) by emitting 'error' on the logger. Node's EventEmitter treats an
// unhandled 'error' event as fatal and crashes the process — the one thing
// logging should never do. This keeps the app alive on whatever transports
// still work (at minimum, the console one above).
logger.on('error', (err) => {
  console.error(`Logger transport error: ${err.message}`);
});

// Avoid noisy file transports while running the test suite
if (process.env.NODE_ENV === 'test') {
  logger.clear();
  logger.add(new winston.transports.Console({ silent: true }));
}

module.exports = logger;
