const budgetRepository = require('../repositories/budget.repository');
const categoryRepository = require('../repositories/category.repository');
const ApiError = require('../utils/ApiError');

const budgetService = {
  async create(userId, payload) {
    const category = categoryRepository.findById(payload.categoryId, userId);
    if (!category) throw new ApiError(404, 'Category not found');
    if (category.type !== 'expense') {
      throw new ApiError(400, 'Budgets can only be set for expense categories');
    }

    const period = payload.period || 'monthly';
    const existing = budgetRepository.findByCategoryAndPeriod(userId, payload.categoryId, period);
    if (existing) {
      throw new ApiError(409, 'A budget already exists for this category and period');
    }

    return budgetRepository.create({ userId, categoryId: payload.categoryId, amount: payload.amount, period });
  },

  async findAllWithStatus(userId) {
    const budgets = budgetRepository.findAllWithSpending(userId);
    return budgets.map((b) => {
      const percentage = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
      let status = 'ok';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= 80) status = 'warning';

      return {
        ...b,
        remaining: Math.round((b.amount - b.spent) * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
        status,
      };
    });
  },

  async update(userId, id, updates) {
    const existing = budgetRepository.findById(id, userId);
    if (!existing) throw new ApiError(404, 'Budget not found');

    // Changing period alone (e.g. monthly -> yearly) can collide with another
    // budget already covering that category+period — the DB's UNIQUE
    // constraint would catch it too, but checking here gives a clear 409
    // instead of a translated-from-SQLite one.
    if (updates.period && updates.period !== existing.period) {
      const conflict = budgetRepository.findByCategoryAndPeriod(userId, existing.category_id, updates.period);
      if (conflict) throw new ApiError(409, 'A budget already exists for this category and period');
    }

    return budgetRepository.update(id, userId, updates);
  },

  async delete(userId, id) {
    const existing = budgetRepository.findById(id, userId);
    if (!existing) throw new ApiError(404, 'Budget not found');
    budgetRepository.delete(id, userId);
  },
};

module.exports = budgetService;
