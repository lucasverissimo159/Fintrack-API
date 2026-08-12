const express = require('express');
const { body, query, param } = require('express-validator');
const transactionController = require('../controllers/transaction.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();
router.use(authenticate);

const recurringFrequencyRule = body('recurringFrequency').custom((value, { req }) => {
  if (req.body.isRecurring && !value) {
    throw new Error('recurringFrequency is required when isRecurring is true');
  }
  return true;
});

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a new income or expense transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, type, amount, date]
 *             properties:
 *               categoryId: { type: integer }
 *               type: { type: string, enum: [income, expense] }
 *               amount: { type: number, example: 89.90 }
 *               description: { type: string }
 *               date: { type: string, format: date, example: "2026-08-03" }
 *               isRecurring: { type: boolean }
 *               recurringFrequency: { type: string, enum: [daily, weekly, monthly, yearly] }
 *     responses:
 *       201:
 *         description: Transaction created
 */
router.post(
  '/',
  [
    body('categoryId').isInt({ min: 1 }).withMessage('categoryId must be a positive integer'),
    body('type').isIn(['income', 'expense']).withMessage('type must be income or expense'),
    body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
    body('date').isISO8601().withMessage('date must be a valid ISO 8601 date'),
    body('description').optional().isString().trim().isLength({ max: 255 }),
    body('isRecurring').optional().isBoolean(),
    body('recurringFrequency').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']),
    recurringFrequencyRule,
  ],
  validate,
  transactionController.create
);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: List transactions with filters and pagination
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *       - in: query
 *         name: categoryId
 *         schema: { type: integer }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of transactions
 */
router.get(
  '/',
  [
    query('type').optional().isIn(['income', 'expense']),
    query('categoryId').optional().isInt({ min: 1 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  transactionController.findAll
);

/**
 * @swagger
 * /api/transactions/process-recurring:
 *   post:
 *     summary: Manually trigger generation of due recurring transactions for the current user
 *     description: Normally runs automatically every night via a cron job (src/jobs); exposed here so it can also be triggered on demand (e.g. from a Power Automate flow).
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Number of recurring transactions processed
 */
router.post('/process-recurring', transactionController.processRecurring);

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get a transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Transaction found }
 *       404: { description: Transaction not found }
 */
router.get('/:id', [param('id').isInt({ min: 1 })], validate, transactionController.findById);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('categoryId').optional().isInt({ min: 1 }),
    body('type').optional().isIn(['income', 'expense']),
    body('amount').optional().isFloat({ gt: 0 }),
    body('date').optional().isISO8601(),
    body('description').optional().isString().trim().isLength({ max: 255 }),
  ],
  validate,
  transactionController.update
);

router.delete('/:id', [param('id').isInt({ min: 1 })], validate, transactionController.delete);

module.exports = router;
