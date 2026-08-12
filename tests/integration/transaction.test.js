process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../../src/app');

async function registerAndLogin() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test User',
      email: `test.${Date.now()}.${Math.random()}@example.com`,
      password: 'senha12345',
    });
  return res.body.data;
}

test('GET /api/categories returns the auto-seeded default categories after registration', async () => {
  const { token } = await registerAndLogin();
  const res = await request(app).get('/api/categories').set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.length > 0);
});

test('POST /api/transactions creates an expense transaction', async () => {
  const { token } = await registerAndLogin();
  const categoriesRes = await request(app).get('/api/categories?type=expense').set('Authorization', `Bearer ${token}`);
  const categoryId = categoriesRes.body.data[0].id;

  const res = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId, type: 'expense', amount: 150.5, date: '2026-01-15', description: 'Test purchase' });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.amount, 150.5);
});

test('POST /api/transactions rejects a category/type mismatch', async () => {
  const { token } = await registerAndLogin();
  const categoriesRes = await request(app).get('/api/categories?type=income').set('Authorization', `Bearer ${token}`);
  const categoryId = categoriesRes.body.data[0].id;

  const res = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId, type: 'expense', amount: 100, date: '2026-01-15' });

  assert.strictEqual(res.status, 400);
});

test('POST /api/transactions requires recurringFrequency when isRecurring is true', async () => {
  const { token } = await registerAndLogin();
  const categoriesRes = await request(app).get('/api/categories?type=expense').set('Authorization', `Bearer ${token}`);
  const categoryId = categoriesRes.body.data[0].id;

  const res = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId, type: 'expense', amount: 50, date: '2026-01-15', isRecurring: true });

  assert.strictEqual(res.status, 400);
});

test('GET /api/transactions requires authentication', async () => {
  const res = await request(app).get('/api/transactions');
  assert.strictEqual(res.status, 401);
});

test('GET /api/analytics/summary works with API key auth (Power BI style)', async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'API Key User',
      email: `apikey.${Date.now()}@example.com`,
      password: 'senha12345',
    });
  const apiKey = registerRes.body.data.user.api_key;

  const res = await request(app).get(`/api/analytics/summary?api_key=${apiKey}`);
  assert.strictEqual(res.status, 200);
  assert.ok('totalIncome' in res.body.data);
  assert.ok('totalExpense' in res.body.data);
});

test('GET /api/analytics/summary rejects an invalid API key', async () => {
  const res = await request(app).get('/api/analytics/summary?api_key=not-a-real-key');
  assert.strictEqual(res.status, 401);
});

test('PUT /api/transactions/:id rejects moving a transaction to a mismatched category', async () => {
  const { token } = await registerAndLogin();
  const expenseCategories = await request(app).get('/api/categories?type=expense').set('Authorization', `Bearer ${token}`);
  const incomeCategories = await request(app).get('/api/categories?type=income').set('Authorization', `Bearer ${token}`);

  const created = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId: expenseCategories.body.data[0].id, type: 'expense', amount: 75, date: '2026-02-01' });

  const res = await request(app)
    .put(`/api/transactions/${created.body.data.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId: incomeCategories.body.data[0].id });

  assert.strictEqual(res.status, 400);
});

test('PUT /api/transactions/:id rejects changing type without a matching category', async () => {
  const { token } = await registerAndLogin();
  const expenseCategories = await request(app).get('/api/categories?type=expense').set('Authorization', `Bearer ${token}`);

  const created = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId: expenseCategories.body.data[0].id, type: 'expense', amount: 75, date: '2026-02-01' });

  const res = await request(app)
    .put(`/api/transactions/${created.body.data.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'income' });

  assert.strictEqual(res.status, 400);
});

test('POST /api/transactions/process-recurring generates a due occurrence and rolls next_occurrence_date forward', async () => {
  const { token } = await registerAndLogin();
  const expenseCategories = await request(app).get('/api/categories?type=expense').set('Authorization', `Bearer ${token}`);
  const categoryId = expenseCategories.body.data[0].id;

  // calculateNextOccurrence works in UTC, so the test mirrors that here to
  // avoid any local-timezone flakiness: a 'daily' transaction dated
  // "yesterday" (UTC) gets next_occurrence_date = "today" (UTC) — already due.
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId, type: 'expense', amount: 29.9, date: yesterdayStr, isRecurring: true, recurringFrequency: 'daily' });

  const before = await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(before.body.pagination.total, 1);

  const processRes = await request(app).post('/api/transactions/process-recurring').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(processRes.status, 200);
  assert.strictEqual(processRes.body.data.processed, 1);

  const after = await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(after.body.pagination.total, 2); // original template + newly generated occurrence

  const generated = after.body.data.find((t) => t.recurring_parent_id !== null);
  assert.ok(generated);
  assert.strictEqual(generated.date, todayStr);
});

test('PUT /api/transactions/:id ignores isRecurring/recurringFrequency (immutable after creation)', async () => {
  const { token } = await registerAndLogin();
  const expenseCategories = await request(app).get('/api/categories?type=expense').set('Authorization', `Bearer ${token}`);

  const created = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId: expenseCategories.body.data[0].id, type: 'expense', amount: 75, date: '2026-02-01' });

  const res = await request(app)
    .put(`/api/transactions/${created.body.data.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ isRecurring: true, recurringFrequency: 'monthly', amount: 80 });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.amount, 80);
  assert.strictEqual(res.body.data.is_recurring, 0);
});
