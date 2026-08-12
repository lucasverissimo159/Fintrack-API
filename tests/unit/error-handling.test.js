process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../../src/app');
const { errorHandler } = require('../../src/middlewares/error.middleware');

test('malformed JSON body returns 400, not a generic 500', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{ this is not valid json');

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.success, false);
});

test('a raw SQLite UNIQUE constraint error is translated to a clean 409 (not a leaked 500)', () => {
  const fakeReq = { method: 'POST', originalUrl: '/api/budgets' };
  const fakeErr = new Error('UNIQUE constraint failed: budgets.user_id, budgets.category_id, budgets.period');
  fakeErr.code = 'SQLITE_CONSTRAINT_UNIQUE';

  let statusCode;
  let body;
  const fakeRes = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  errorHandler(fakeErr, fakeReq, fakeRes, () => {});

  assert.strictEqual(statusCode, 409);
  assert.strictEqual(body.success, false);
  // the raw SQL error text must never reach the client
  assert.ok(!JSON.stringify(body).includes('UNIQUE constraint failed'));
});

test('better-sqlite3 actually throws err.code = SQLITE_CONSTRAINT_UNIQUE on a raw unique violation', () => {
  // Verifies the assumption the fix above depends on, against the real
  // driver rather than a mock — inserting the same (user, category, period)
  // budget twice, bypassing the app-level pre-check by calling the
  // repository directly.
  const db = require('../../src/database/db');
  const userRepository = require('../../src/repositories/user.repository');
  const categoryRepository = require('../../src/repositories/category.repository');
  const budgetRepository = require('../../src/repositories/budget.repository');

  const user = userRepository.create({ name: 'Race Test', email: `race.${Date.now()}@example.com`, passwordHash: 'x', apiKey: `key-${Date.now()}` });
  const category = categoryRepository.create({ userId: user.id, name: 'RaceCategory', type: 'expense', isDefault: false });
  budgetRepository.create({ userId: user.id, categoryId: category.id, amount: 100, period: 'monthly' });

  assert.throws(
    () => budgetRepository.create({ userId: user.id, categoryId: category.id, amount: 200, period: 'monthly' }),
    (err) => {
      assert.ok(typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT'), `expected SQLITE_CONSTRAINT* code, got ${err.code}`);
      return true;
    }
  );

  db.prepare('DELETE FROM budgets WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM categories WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
});

test('/health reports database status', async () => {
  const res = await request(app).get('/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.database, 'up');
});
