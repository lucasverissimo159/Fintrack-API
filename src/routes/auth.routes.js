const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (auto-seeds default categories and an API key)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Ana Silva" }
 *               email: { type: string, format: email, example: "ana@example.com" }
 *               password: { type: string, minLength: 8, example: "senha12345" }
 *     responses:
 *       201:
 *         description: User registered — returns the user, JWT token and API key
 *       409:
 *         description: Email already registered
 */
router.post(
  '/register',
  [
    body('name').isString().trim().notEmpty().withMessage('name is required'),
    body('email').isEmail().withMessage('a valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters long'),
  ],
  validate,
  authController.register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and receive a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', [body('email').isEmail().normalizeEmail(), body('password').notEmpty()], validate, authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Current user profile (includes the Power BI / Power Apps api_key)
 */
router.get('/me', authenticate, authController.getProfile);

/**
 * @swagger
 * /api/auth/api-key/regenerate:
 *   post:
 *     summary: Invalidate the current API key and generate a new one
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: New API key generated
 */
router.post('/api-key/regenerate', authenticate, authController.regenerateApiKey);

module.exports = router;
