const db = require('../database/db');
const transactionRepository = require('../repositories/transaction.repository');
const transactionService = require('./transaction.service');
const logger = require('../utils/logger');

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

const recurringService = {
  /**
   * Finds every recurring transaction whose next_occurrence_date has arrived,
   * creates the concrete transaction instance for that date, and rolls the
   * template forward to its following occurrence.
   *
   * Called two ways:
   *   - no userId  → the nightly cron job (src/jobs), system-wide
   *   - with userId → the authenticated "process my recurring transactions
   *                    now" endpoint, scoped to that user only
   */
  processRecurringTransactions(userId) {
    const today = getTodayISO();
    const due = transactionRepository.findDueRecurring(today, userId);
    let processed = 0;

    // Two reasons this runs as one DB transaction instead of N independent
    // writes: (1) at scale — thousands of recurring transactions across all
    // users after, say, a weekend of downtime — batching avoids a disk sync
    // per row; (2) correctness — each due item does two writes (create the
    // instance, roll next_occurrence_date forward). Without atomicity, a
    // crash mid-loop could commit the new transaction but leave the template's
    // next_occurrence_date stale, generating a duplicate on the next run.
    const processAllDue = db.transaction(() => {
      for (const original of due) {
        transactionRepository.create({
          userId: original.user_id,
          categoryId: original.category_id,
          type: original.type,
          amount: original.amount,
          description: original.description,
          date: original.next_occurrence_date,
          isRecurring: false,
          recurringFrequency: null,
          recurringParentId: original.id,
          nextOccurrenceDate: null,
        });

        const nextDate = transactionService.calculateNextOccurrence(original.next_occurrence_date, original.recurring_frequency);
        transactionRepository.updateNextOccurrence(original.id, nextDate);
        processed++;
      }
    });
    processAllDue();

    if (processed > 0) {
      logger.info(`Processed ${processed} recurring transaction(s)${userId ? ` for user ${userId}` : ' (system-wide)'}`);
    }

    return { processed };
  },
};

module.exports = recurringService;
