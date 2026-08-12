const analyticsService = require('../services/analytics.service');
const transactionRepository = require('../repositories/transaction.repository');
const asyncHandler = require('../utils/asyncHandler');
const { toCSV } = require('../utils/csvExporter');

const analyticsController = {
  getSummary: asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const summary = analyticsService.getSummary(req.user.id, { startDate, endDate });
    res.json({ success: true, data: summary });
  }),

  getByCategory: asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = analyticsService.getByCategory(req.user.id, { startDate, endDate });
    res.json({ success: true, data });
  }),

  getMonthlyTrend: asyncHandler(async (req, res) => {
    const months = req.query.months ? parseInt(req.query.months, 10) : 12;
    const data = analyticsService.getMonthlyTrend(req.user.id, months);
    res.json({ success: true, data });
  }),

  getCashFlow: asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = analyticsService.getCashFlow(req.user.id, { startDate, endDate });
    res.json({ success: true, data });
  }),

  exportCSV: asyncHandler(async (req, res) => {
    const { data } = transactionRepository.findAll(req.user.id, { limit: 100000, page: 1 });
    const csv = toCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  }),
};

module.exports = analyticsController;
