const cron = require('node-cron');
const logger = require('../utils/logger');
const recurringService = require('../services/recurring.service');

/**
 * Runs every day at 00:00 server time and generates any recurring
 * transaction (rent, salary, subscriptions...) that has come due, for
 * every user in the system. See services/recurring.service.js.
 */
function scheduleRecurringTransactionsJob() {
  cron.schedule('0 0 * * *', () => {
    logger.info('Running scheduled recurring transactions job');
    try {
      const result = recurringService.processRecurringTransactions();
      logger.info(`Recurring transactions job finished: ${result.processed} transaction(s) generated`);
    } catch (err) {
      logger.error(`Recurring transactions job failed: ${err.message}`);
    }
  });
}

module.exports = scheduleRecurringTransactionsJob;
