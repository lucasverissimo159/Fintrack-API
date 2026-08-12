const transactionService = require('../services/transaction.service');
const recurringService = require('../services/recurring.service');
const asyncHandler = require('../utils/asyncHandler');

const transactionController = {
  create: asyncHandler(async (req, res) => {
    const transaction = await transactionService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: transaction });
  }),

  findAll: asyncHandler(async (req, res) => {
    const { type, categoryId, startDate, endDate, page, limit } = req.query;
    const result = await transactionService.findAll(req.user.id, {
      type,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    res.json({ success: true, ...result });
  }),

  findById: asyncHandler(async (req, res) => {
    const transaction = await transactionService.findById(req.user.id, req.params.id);
    res.json({ success: true, data: transaction });
  }),

  update: asyncHandler(async (req, res) => {
    const transaction = await transactionService.update(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: transaction });
  }),

  delete: asyncHandler(async (req, res) => {
    await transactionService.delete(req.user.id, req.params.id);
    res.status(204).send();
  }),

  // Scoped to the authenticated user only — see recurring.service.js for the
  // system-wide variant used by the nightly cron job.
  processRecurring: asyncHandler(async (req, res) => {
    const result = recurringService.processRecurringTransactions(req.user.id);
    res.json({ success: true, data: result, message: `${result.processed} recurring transaction(s) processed` });
  }),
};

module.exports = transactionController;
