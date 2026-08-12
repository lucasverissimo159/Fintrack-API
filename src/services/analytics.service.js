const db = require('../database/db');

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

/**
 * Every method here returns flat, clean tabular JSON on purpose — this is
 * exactly the shape Power BI's "Get Data > Web" connector (and Power Query)
 * consume best, with no nested objects to unwind.
 */
const analyticsService = {
  getSummary(userId, { startDate, endDate } = {}) {
    const range = startDate && endDate ? { startDate, endDate } : getDefaultDateRange();
    const row = db
      .prepare(
        `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense,
        COUNT(*) as transactionCount
      FROM transactions
      WHERE user_id = ? AND date BETWEEN ? AND ?
    `
      )
      .get(userId, range.startDate, range.endDate);

    return {
      period: range,
      totalIncome: row.totalIncome,
      totalExpense: row.totalExpense,
      balance: row.totalIncome - row.totalExpense,
      transactionCount: row.transactionCount,
    };
  },

  getByCategory(userId, { startDate, endDate } = {}) {
    const range = startDate && endDate ? { startDate, endDate } : getDefaultDateRange();
    return db
      .prepare(
        `
      SELECT
        c.id as categoryId, c.name as categoryName, c.type as categoryType, c.color,
        COALESCE(SUM(t.amount), 0) as total,
        COUNT(t.id) as transactionCount
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = c.user_id AND t.date BETWEEN ? AND ?
      WHERE c.user_id = ?
      GROUP BY c.id
      HAVING total > 0
      ORDER BY total DESC
    `
      )
      .all(range.startDate, range.endDate, userId);
  },

  getMonthlyTrend(userId, months = 12) {
    // Build the SQLite date modifier ("-12 months") in JS rather than
    // concatenating it inside the query with `||`. Both work — SQLite does
    // coerce a bound integer to text for `||` — but binding the finished
    // string as a single parameter is unambiguous and easier to unit test.
    const monthsModifier = `-${months} months`;
    return db
      .prepare(
        `
      SELECT
        strftime('%Y-%m', date) as month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE user_id = ? AND date >= date('now', ?)
      GROUP BY month
      ORDER BY month
    `
      )
      .all(userId, monthsModifier);
  },

  getCashFlow(userId, { startDate, endDate } = {}) {
    const range = startDate && endDate ? { startDate, endDate } : getDefaultDateRange();
    return db
      .prepare(
        `
      SELECT
        date,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id = ? AND date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date
    `
      )
      .all(userId, range.startDate, range.endDate);
  },
};

module.exports = analyticsService;
