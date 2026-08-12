const db = require('../database/db');

const transactionRepository = {
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO transactions
        (user_id, category_id, type, amount, description, date, is_recurring, recurring_frequency, recurring_parent_id, next_occurrence_date)
      VALUES (@userId, @categoryId, @type, @amount, @description, @date, @isRecurring, @recurringFrequency, @recurringParentId, @nextOccurrenceDate)
    `);
    const info = stmt.run({
      userId: data.userId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description || null,
      date: data.date,
      isRecurring: data.isRecurring ? 1 : 0,
      recurringFrequency: data.recurringFrequency || null,
      recurringParentId: data.recurringParentId || null,
      nextOccurrenceDate: data.nextOccurrenceDate || null,
    });
    return this.findById(info.lastInsertRowid, data.userId);
  },

  findById(id, userId) {
    return db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId);
  },

  findAll(userId, filters = {}) {
    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters.categoryId) {
      query += ' AND category_id = ?';
      params.push(filters.categoryId);
    }
    if (filters.startDate) {
      query += ' AND date >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND date <= ?';
      params.push(filters.endDate);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const { total } = db.prepare(countQuery).get(...params);

    query += ' ORDER BY date DESC, id DESC LIMIT ? OFFSET ?';
    const limit = filters.limit || 20;
    const offset = ((filters.page || 1) - 1) * limit;
    params.push(limit, offset);

    const data = db.prepare(query).all(...params);
    return { data, total, page: filters.page || 1, limit };
  },

  update(id, userId, updates) {
    // isRecurring / recurringFrequency are deliberately NOT updatable here.
    // Flipping is_recurring on via a generic update without also recomputing
    // next_occurrence_date (which only the create() path does) would produce
    // a transaction flagged recurring that findDueRecurring() can never pick
    // up — a "recurring" charge that silently never recurs. To change
    // recurrence, delete and recreate the transaction.
    const fieldMap = {
      categoryId: 'category_id',
      type: 'type',
      amount: 'amount',
      description: 'description',
      date: 'date',
    };

    const fields = [];
    const params = { id, userId };
    for (const [key, value] of Object.entries(updates)) {
      const column = fieldMap[key];
      if (!column) continue;
      fields.push(`${column} = @${key}`);
      params[key] = value;
    }
    if (fields.length === 0) return this.findById(id, userId);

    const query = `UPDATE transactions SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = @id AND user_id = @userId`;
    db.prepare(query).run(params);
    return this.findById(id, userId);
  },

  delete(id, userId) {
    const info = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId);
    return info.changes > 0;
  },

  // userId is optional: omitted for the daily system-wide cron job, provided
  // when a single user manually triggers processing via the API.
  findDueRecurring(date, userId) {
    if (userId) {
      return db
        .prepare(
          'SELECT * FROM transactions WHERE is_recurring = 1 AND next_occurrence_date IS NOT NULL AND next_occurrence_date <= ? AND user_id = ?'
        )
        .all(date, userId);
    }
    return db
      .prepare('SELECT * FROM transactions WHERE is_recurring = 1 AND next_occurrence_date IS NOT NULL AND next_occurrence_date <= ?')
      .all(date);
  },

  updateNextOccurrence(id, nextDate) {
    db.prepare('UPDATE transactions SET next_occurrence_date = ? WHERE id = ?').run(nextDate, id);
  },
};

module.exports = transactionRepository;
