const budgetService = require('../services/budget.service');
const asyncHandler = require('../utils/asyncHandler');

const budgetController = {
  create: asyncHandler(async (req, res) => {
    const budget = await budgetService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: budget });
  }),

  findAll: asyncHandler(async (req, res) => {
    const budgets = await budgetService.findAllWithStatus(req.user.id);
    res.json({ success: true, data: budgets });
  }),

  update: asyncHandler(async (req, res) => {
    const budget = await budgetService.update(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: budget });
  }),

  delete: asyncHandler(async (req, res) => {
    await budgetService.delete(req.user.id, req.params.id);
    res.status(204).send();
  }),
};

module.exports = budgetController;
