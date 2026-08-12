const db = require('../database/db');

const budgetRepository = {
  create({ userId, categoryId, amount, period }) {
    const info = db
      .prepare('INSERT INTO budgets (user_id, category_id, amount, period) VALUES (?, ?, ?, ?)')
      .run(userId, categoryId, amount, period);
    return this.findById(info.lastInsertRowid, userId);
  },

  findById(id, userId) {
    return db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(id, userId);
  },

  findByCategoryAndPeriod(userId, categoryId, period) {
    return db.prepare('SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND period = ?').get(userId, categoryId, period);
  },

  // Joins each budget with how much was actually spent in the category during
  // the current month/year, so the caller can compute remaining % and status.
  //
  // The JOIN is bounded to `date('now', 'start of year')`: that's always an
  // earlier-or-equal bound for BOTH a monthly window (this month) and a
  // yearly one (this year), so it's provably safe for either period — while
  // keeping a category with years of transaction history from having every
  // one of those old rows joined in just to be summed away as 0. Without it,
  // an account with, say, 5+ years of daily entries in one category re-scans
  // its entire lifetime every time this endpoint is hit.
  findAllWithSpending(userId) {
    return db
      .prepare(
        `
      SELECT
        b.id, b.user_id, b.category_id, b.amount, b.period,
        c.name as category_name, c.color as category_color, c.icon as category_icon,
        COALESCE(SUM(
          CASE
            WHEN b.period = 'monthly' AND strftime('%Y-%m', t.date) = strftime('%Y-%m', 'now') THEN t.amount
            WHEN b.period = 'yearly' AND strftime('%Y', t.date) = strftime('%Y', 'now') THEN t.amount
            ELSE 0
          END
        ), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id
        AND t.user_id = b.user_id
        AND t.type = 'expense'
        AND t.date >= date('now', 'start of year')
      WHERE b.user_id = ?
      GROUP BY b.id
      ORDER BY b.id
    `
      )
      .all(userId);
  },

  // Used by category.service.js to block deleting a category that still has
  // a budget attached — the FK is ON DELETE CASCADE (so the DB stays
  // consistent either way), but silently deleting someone's budget as a side
  // effect of deleting its category is a surprise worth stopping explicitly.
  countByCategory(categoryId) {
    const row = db.prepare('SELECT COUNT(*) as count FROM budgets WHERE category_id = ?').get(categoryId);
    return row.count;
  },

  update(id, userId, updates) {
    const fields = [];
    const params = { id, userId };
    if (updates.amount !== undefined) {
      fields.push('amount = @amount');
      params.amount = updates.amount;
    }
    if (updates.period !== undefined) {
      fields.push('period = @period');
      params.period = updates.period;
    }
    if (fields.length === 0) return this.findById(id, userId);

    db.prepare(`UPDATE budgets SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = @id AND user_id = @userId`).run(params);
    return this.findById(id, userId);
  },

  delete(id, userId) {
    const info = db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(id, userId);
    return info.changes > 0;
  },
};

module.exports = budgetRepository;
