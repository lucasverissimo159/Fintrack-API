require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../src/database/db');
const defaultCategories = require('../src/database/seeds/defaultCategories');

function randomAmount(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

async function seed() {
  console.log('Seeding demo data...');

  const email = 'demo@fintrack.com';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.log('Demo user already exists — skipping. Delete data/finance.db to reseed from scratch.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash('demo12345', 10);
  const apiKey = crypto.randomBytes(24).toString('hex');

  const userInfo = db
    .prepare('INSERT INTO users (name, email, password_hash, api_key) VALUES (?, ?, ?, ?)')
    .run('Demo User', email, passwordHash, apiKey);
  const userId = userInfo.lastInsertRowid;

  const categoryIds = {};
  const insertCategory = db.prepare('INSERT INTO categories (user_id, name, type, color, icon, is_default) VALUES (?, ?, ?, ?, ?, 1)');
  for (const cat of defaultCategories) {
    const info = insertCategory.run(userId, cat.name, cat.type, cat.color, cat.icon);
    categoryIds[cat.name] = info.lastInsertRowid;
  }

  const insertTransaction = db.prepare(`
    INSERT INTO transactions (user_id, category_id, type, amount, description, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 12);

  // ~700 individual .run() calls each auto-commit on their own by default —
  // every insert forces a separate disk sync, which is the difference between
  // a seed that finishes instantly and one that visibly drags. db.transaction()
  // batches the whole day-by-day loop into a single BEGIN/COMMIT.
  let count = 0;
  const insertAllTransactions = db.transaction(() => {
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      if (d.getDate() === 5) {
        insertTransaction.run(userId, categoryIds['Salário'], 'income', randomAmount(4500, 5500), 'Salário mensal', formatDate(d));
        count++;
      }
      if (Math.random() < 0.05) {
        insertTransaction.run(userId, categoryIds['Freelance'], 'income', randomAmount(300, 1500), 'Projeto freelance', formatDate(d));
        count++;
      }
      if (d.getDate() === 10) {
        insertTransaction.run(userId, categoryIds['Moradia'], 'expense', 1400, 'Aluguel', formatDate(d));
        count++;
      }
      if (Math.random() < 0.6) {
        insertTransaction.run(userId, categoryIds['Alimentação'], 'expense', randomAmount(15, 80), 'Supermercado / restaurante', formatDate(d));
        count++;
      }
      if (Math.random() < 0.4) {
        insertTransaction.run(userId, categoryIds['Transporte'], 'expense', randomAmount(10, 60), 'Combustível / app de transporte', formatDate(d));
        count++;
      }
      if (d.getDate() === 1) {
        insertTransaction.run(userId, categoryIds['Assinaturas'], 'expense', randomAmount(40, 120), 'Streaming e assinaturas', formatDate(d));
        count++;
      }
      if (Math.random() < 0.15) {
        insertTransaction.run(userId, categoryIds['Lazer'], 'expense', randomAmount(30, 200), 'Cinema / saída', formatDate(d));
        count++;
      }
      if (Math.random() < 0.05) {
        insertTransaction.run(userId, categoryIds['Saúde'], 'expense', randomAmount(50, 300), 'Farmácia / consulta', formatDate(d));
        count++;
      }
    }
  });
  insertAllTransactions();

  db.prepare('INSERT INTO budgets (user_id, category_id, amount, period) VALUES (?, ?, ?, ?)').run(userId, categoryIds['Alimentação'], 1200, 'monthly');
  db.prepare('INSERT INTO budgets (user_id, category_id, amount, period) VALUES (?, ?, ?, ?)').run(userId, categoryIds['Transporte'], 600, 'monthly');
  db.prepare('INSERT INTO budgets (user_id, category_id, amount, period) VALUES (?, ?, ?, ?)').run(userId, categoryIds['Lazer'], 400, 'monthly');

  console.log(`Seed complete: ${count} transactions created for ${email}`);
  console.log('---');
  console.log(`Login:   ${email} / demo12345`);
  console.log(`API key (for Power BI / Power Apps): ${apiKey}`);
  console.log('---');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
