const transactionRepository = require('../repositories/transaction.repository');
const categoryRepository = require('../repositories/category.repository');
const ApiError = require('../utils/ApiError');

/**
 * NOTE (known limitation): this uses JS Date month arithmetic, which rolls
 * over on short months — e.g. Jan 31 + 1 month lands on Mar 3, not Feb 28.
 * A production version would clamp to the last day of the target month.
 * Left as-is here and called out in the README as a documented next step.
 */
function calculateNextOccurrence(date, frequency) {
  const d = new Date(`${date}T00:00:00Z`);
  switch (frequency) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case 'monthly':
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case 'yearly':
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
    default:
      throw new ApiError(400, `Unknown recurring frequency: ${frequency}`);
  }
  return d.toISOString().split('T')[0];
}

const transactionService = {
  async create(userId, payload) {
    const category = categoryRepository.findById(payload.categoryId, userId);
    if (!category) throw new ApiError(404, 'Category not found');
    if (category.type !== payload.type) {
      throw new ApiError(
        400,
        `Category "${category.name}" is a ${category.type} category and cannot be used for a ${payload.type} transaction`
      );
    }

    const nextOccurrenceDate = payload.isRecurring ? calculateNextOccurrence(payload.date, payload.recurringFrequency) : null;

    return transactionRepository.create({
      userId,
      categoryId: payload.categoryId,
      type: payload.type,
      amount: payload.amount,
      description: payload.description,
      date: payload.date,
      isRecurring: payload.isRecurring,
      recurringFrequency: payload.recurringFrequency,
      nextOccurrenceDate,
    });
  },

  async findAll(userId, filters) {
    const result = transactionRepository.findAll(userId, filters);
    return {
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit) || 0,
      },
    };
  },

  async findById(userId, id) {
    const transaction = transactionRepository.findById(id, userId);
    if (!transaction) throw new ApiError(404, 'Transaction not found');
    return transaction;
  },

  async update(userId, id, updates) {
    const existing = transactionRepository.findById(id, userId);
    if (!existing) throw new ApiError(404, 'Transaction not found');

    // create() enforces category.type === transaction.type; update() was
    // only checking the category existed, not that it still matched — so a
    // PUT could silently turn an "expense" into a transaction pointing at an
    // income category (or vice versa). Cover all three cases: categoryId
    // changes, type changes, or both.
    const effectiveType = updates.type || existing.type;

    if (updates.categoryId) {
      const category = categoryRepository.findById(updates.categoryId, userId);
      if (!category) throw new ApiError(404, 'Category not found');
      if (category.type !== effectiveType) {
        throw new ApiError(
          400,
          `Category "${category.name}" is a ${category.type} category and cannot be used for a ${effectiveType} transaction`
        );
      }
    } else if (updates.type && updates.type !== existing.type) {
      const currentCategory = categoryRepository.findById(existing.category_id, userId);
      if (currentCategory && currentCategory.type !== updates.type) {
        throw new ApiError(
          400,
          `Cannot change type to ${updates.type}: current category "${currentCategory.name}" is a ${currentCategory.type} category. Provide a matching categoryId too.`
        );
      }
    }

    return transactionRepository.update(id, userId, updates);
  },

  async delete(userId, id) {
    const existing = transactionRepository.findById(id, userId);
    if (!existing) throw new ApiError(404, 'Transaction not found');
    transactionRepository.delete(id, userId);
  },

  calculateNextOccurrence,
};

module.exports = transactionService;
