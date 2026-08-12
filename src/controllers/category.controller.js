const categoryService = require('../services/category.service');
const asyncHandler = require('../utils/asyncHandler');

const categoryController = {
  create: asyncHandler(async (req, res) => {
    const category = await categoryService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: category });
  }),

  findAll: asyncHandler(async (req, res) => {
    const categories = await categoryService.findAll(req.user.id, req.query.type);
    res.json({ success: true, data: categories });
  }),

  update: asyncHandler(async (req, res) => {
    const category = await categoryService.update(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: category });
  }),

  delete: asyncHandler(async (req, res) => {
    await categoryService.delete(req.user.id, req.params.id);
    res.status(204).send();
  }),
};

module.exports = categoryController;
