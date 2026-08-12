const db = require('../database/db');

const userRepository = {
  create({ name, email, passwordHash, apiKey }) {
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash, api_key) VALUES (?, ?, ?, ?)')
      .run(name, email, passwordHash, apiKey);
    return this.findById(info.lastInsertRowid);
  },

  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findByApiKey(apiKey) {
    return db.prepare('SELECT * FROM users WHERE api_key = ?').get(apiKey);
  },

  updateApiKey(id, apiKey) {
    db.prepare("UPDATE users SET api_key = ?, updated_at = datetime('now') WHERE id = ?").run(apiKey, id);
    return this.findById(id);
  },
};

module.exports = userRepository;
