process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../../src/app');

async function setupUserWithBudget() {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Budget Tester',
      email: `budget.${Date.now()}.${Math.random()}@example.com`,
      password: 'senha12345',
    });
  const token = registerRes.body.data.token;

  const categoriesRes = await request(app).get('/api/categories?type=expense').set('Authorization', `Bearer ${token}`);
  const categoryId = categoriesRes.body.data[0].id;

  await request(app).post('/api/budgets').set('Authorization', `Bearer ${token}`).send({ categoryId, amount: 500, period: 'monthly' });

  return { token, categoryId };
}

test('Budget status is "ok" when there is no spending yet', async () => {
  const { token } = await setupUserWithBudget();
  const res = await request(app).get('/api/budgets').set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data[0].status, 'ok');
  assert.strictEqual(res.body.data[0].spent, 0);
});

test('Budget status becomes "warning" between 80% and 100% of the limit', async () => {
  const { token, categoryId } = await setupUserWithBudget();
  const today = new Date().toISOString().split('T')[0];

  await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId, type: 'expense', amount: 450, date: today }); // 90% of 500

  const res = await request(app).get('/api/budgets').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.body.data[0].status, 'warning');
});

test('Budget status becomes "exceeded" once spending passes the limit', async () => {
  const { token, categoryId } = await setupUserWithBudget();
  const today = new Date().toISOString().split('T')[0];

  await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId, type: 'expense', amount: 600, date: today });

  const res = await request(app).get('/api/budgets').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.body.data[0].status, 'exceeded');
  assert.strictEqual(res.body.data[0].spent, 600);
  assert.strictEqual(res.body.data[0].remaining, -100);
});

test('Duplicate budget for the same category/period is rejected with 409', async () => {
  const { token, categoryId } = await setupUserWithBudget();
  const res = await request(app)
    .post('/api/budgets')
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId, amount: 300, period: 'monthly' });

  assert.strictEqual(res.status, 409);
});

test('Budget cannot be created for an income category', async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Income Budget Tester',
      email: `incomebudget.${Date.now()}@example.com`,
      password: 'senha12345',
    });
  const token = registerRes.body.data.token;

  const categoriesRes = await request(app).get('/api/categories?type=income').set('Authorization', `Bearer ${token}`);
  const categoryId = categoriesRes.body.data[0].id;

  const res = await request(app)
    .post('/api/budgets')
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId, amount: 1000 });

  assert.strictEqual(res.status, 400);
});

test('PUT /api/budgets/:id rejects a period change that collides with another budget', async () => {
  const { token, categoryId } = await setupUserWithBudget(); // budget A: same category, period=monthly

  const budgetB = await request(app)
    .post('/api/budgets')
    .set('Authorization', `Bearer ${token}`)
    .send({ categoryId, amount: 2000, period: 'yearly' }); // budget B: same category, period=yearly — allowed, periods differ

  // Now try to flip budget B to 'monthly' — collides with budget A (same category + period)
  const res = await request(app).put(`/api/budgets/${budgetB.body.data.id}`).set('Authorization', `Bearer ${token}`).send({ period: 'monthly' });

  assert.strictEqual(res.status, 409);
});

test('Category with an attached budget cannot be deleted', async () => {
  const { token, categoryId } = await setupUserWithBudget();

  const res = await request(app).delete(`/api/categories/${categoryId}`).set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 409);
});
