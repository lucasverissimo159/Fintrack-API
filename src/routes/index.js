const express = require('express');
const authRoutes = require('./auth.routes');
const categoryRoutes = require('./category.routes');
const transactionRoutes = require('./transaction.routes');
const budgetRoutes = require('./budget.routes');
const analyticsRoutes = require('./analytics.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budgets', budgetRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
