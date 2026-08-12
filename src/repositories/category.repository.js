const db = require('../database/db');

const categoryRepository = {
  create({ userId, name, type, color, icon, isDefault }) {
    const info = db
      .prepare('INSERT INTO categories (user_id, name, type, color, icon, is_default) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, name, type, color || '#6366F1', icon || 'tag', isDefault ? 1 : 0);
    return this.findById(info.lastInsertRowid, userId);
  },

  findById(id, userId) {
    return db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId);
  },

  findAll(userId, type) {
    if (type) {
      return db.prepare('SELECT * FROM categories WHERE user_id = ? AND type = ? ORDER BY name').all(userId, type);
    }
    return db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY type, name').all(userId);
  },

  update(id, userId, updates) {
    const fields = [];
    const params = { id, userId };
    for (const key of ['name', 'color', 'icon']) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        params[key] = updates[key];
      }
    }
    if (fields.length === 0) return this.findById(id, userId);

    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = @id AND user_id = @userId`).run(params);
    return this.findById(id, userId);
  },

  delete(id, userId) {
    // is_default = 0 guard prevents deleting the categories auto-seeded at registration
    const info = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ? AND is_default = 0').run(id, userId);
    return info.changes > 0;
  },

  countTransactions(id) {
    const row = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(id);
    return row.count;
  },
};

module.exports = categoryRepository;
