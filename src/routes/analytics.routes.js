const express = require('express');
const { query } = require('express-validator');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * /api/analytics/summary:
 *   get:
 *     summary: Income/expense/balance summary for a period (Power BI friendly)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: "Summary totals for the period"
 */
router.get('/summary', [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()], validate, analyticsController.getSummary);

/**
 * @swagger
 * /api/analytics/by-category:
 *   get:
 *     summary: Totals grouped by category for a period (Power BI friendly)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: "Array of objects: { categoryId, categoryName, categoryType, color, total, transactionCount }"
 */
router.get(
  '/by-category',
  [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  validate,
  analyticsController.getByCategory
);

/**
 * @swagger
 * /api/analytics/monthly-trend:
 *   get:
 *     summary: Income vs expense grouped by month over the last N months (Power BI friendly)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 12
 *     responses:
 *       200:
 *         description: "Array of objects: { month, income, expense }"
 */
router.get('/monthly-trend', [query('months').optional().isInt({ min: 1, max: 60 })], validate, analyticsController.getMonthlyTrend);

/**
 * @swagger
 * /api/analytics/cash-flow:
 *   get:
 *     summary: Daily income/expense cash flow for a period (Power BI friendly)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: "Array of objects: { date, income, expense }"
 */
router.get('/cash-flow', [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()], validate, analyticsController.getCashFlow);

/**
 * @swagger
 * /api/analytics/export/csv:
 *   get:
 *     summary: Export all transactions as CSV (for Excel / Power BI import)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export/csv', analyticsController.exportCSV);

module.exports = router;
