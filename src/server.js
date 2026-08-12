const app = require('./app');
const logger = require('./utils/logger');
const scheduleRecurringTransactionsJob = require('./jobs/recurringTransactions.job');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`FinTrack API running on port ${PORT}`);
  logger.info(`API docs available at http://localhost:${PORT}/api-docs`);
  logger.info(`OpenAPI spec (for Power Apps custom connectors) at http://localhost:${PORT}/api-docs.json`);
});

scheduleRecurringTransactionsJob();

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = server;
