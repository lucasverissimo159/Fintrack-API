const express = require('express');
const { body, param } = require('express-validator');
const budgetController = require('../controllers/budget.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * /api/budgets:
 *   post:
 *     summary: Create a monthly or yearly budget limit for an expense category
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, amount]
 *             properties:
 *               categoryId: { type: integer }
 *               amount: { type: number }
 *               period: { type: string, enum: [monthly, yearly] }
 *     responses:
 *       201: { description: Budget created }
 *       409: { description: A budget already exists for this category/period }
 */
router.post(
  '/',
  [body('categoryId').isInt({ min: 1 }), body('amount').isFloat({ gt: 0 }), body('period').optional().isIn(['monthly', 'yearly'])],
  validate,
  budgetController.create
);

/**
 * @swagger
 * /api/budgets:
 *   get:
 *     summary: List budgets with real-time spent/remaining/status
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Budgets annotated with spent, remaining, percentage and status (ok/warning/exceeded)
 */
router.get('/', budgetController.findAll);

/**
 * @swagger
 * /api/budgets/{id}:
 *   put:
 *     summary: Update a budget's amount and/or period
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200: { description: Budget updated }
 *       409: { description: Another budget already covers the new category/period combination }
 *   delete:
 *     summary: Delete a budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       204: { description: Budget deleted }
 */
router.put(
  '/:id',
  [param('id').isInt({ min: 1 }), body('amount').optional().isFloat({ gt: 0 }), body('period').optional().isIn(['monthly', 'yearly'])],
  validate,
  budgetController.update
);

router.delete('/:id', [param('id').isInt({ min: 1 })], validate, budgetController.delete);

module.exports = router;
