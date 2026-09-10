const categoryRepository = require('../repositories/category.repository');
const budgetRepository = require('../repositories/budget.repository');
const ApiError = require('../utils/ApiError');

const categoryService = {
  async create(userId, payload) {
    return categoryRepository.create({ userId, ...payload, isDefault: false });
  },

  async findAll(userId, type) {
    return categoryRepository.findAll(userId, type);
  },

  async update(userId, id, updates) {
    const existing = categoryRepository.findById(id, userId);
    if (!existing) throw new ApiError(404, 'Category not found');
    return categoryRepository.update(id, userId, updates);
  },

  async delete(userId, id) {
    const existing = categoryRepository.findById(id, userId);
    if (!existing) throw new ApiError(404, 'Category not found');

    const txCount = categoryRepository.countTransactions(id);
    if (txCount > 0) {
      throw new ApiError(409, `Cannot delete category: it has ${txCount} associated transaction(s)`);
    }

    // The FK is ON DELETE CASCADE, so skipping this check wouldn't corrupt
    // anything — it would just silently delete the user's budget along with
    // the category, which is a surprising side effect worth blocking explicitly.
    const budgetCount = budgetRepository.countByCategory(id);
    if (budgetCount > 0) {
      throw new ApiError(409, 'Cannot delete category: it has a budget attached. Delete the budget first.');
    }

    if (existing.is_default) throw new ApiError(400, 'Default categories cannot be deleted');

    categoryRepository.delete(id, userId);
  },
};

module.exports = categoryService;
