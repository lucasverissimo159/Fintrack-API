const express = require('express');
const { body, param, query } = require('express-validator');
const categoryController = require('../controllers/category.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a custom category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type]
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [income, expense] }
 *               color: { type: string, example: "#6366F1" }
 *               icon: { type: string }
 *     responses:
 *       201:
 *         description: Category created
 */
router.post(
  '/',
  [
    body('name').isString().trim().notEmpty(),
    body('type').isIn(['income', 'expense']),
    body('color').optional().isHexColor(),
    body('icon').optional().isString(),
  ],
  validate,
  categoryController.create
);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: List all categories for the authenticated user
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/', [query('type').optional().isIn(['income', 'expense'])], validate, categoryController.findAll);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('name').optional().isString().trim().notEmpty(),
    body('color').optional().isHexColor(),
    body('icon').optional().isString(),
  ],
  validate,
  categoryController.update
);

router.delete('/:id', [param('id').isInt({ min: 1 })], validate, categoryController.delete);

module.exports = router;
