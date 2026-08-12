process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../../src/app');

test('POST /api/auth/register creates a new user and returns a token + api_key', async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Ana Silva',
    email: 'ana.silva@example.com',
    password: 'senha12345',
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.token);
  assert.ok(res.body.data.user.api_key);
  assert.strictEqual(res.body.data.user.email, 'ana.silva@example.com');
  assert.strictEqual(res.body.data.user.password_hash, undefined);
});

test('POST /api/auth/register rejects a duplicate email', async () => {
  const payload = { name: 'Bruno Costa', email: 'bruno.costa@example.com', password: 'senha12345' };
  await request(app).post('/api/auth/register').send(payload);
  const res = await request(app).post('/api/auth/register').send(payload);

  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.body.success, false);
});

test('POST /api/auth/register rejects a short password', async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Carla Souza',
    email: 'carla.souza@example.com',
    password: '123',
  });

  assert.strictEqual(res.status, 400);
});

test('POST /api/auth/login returns a token for valid credentials', async () => {
  await request(app).post('/api/auth/register').send({
    name: 'Diego Lima',
    email: 'diego.lima@example.com',
    password: 'senha12345',
  });

  const res = await request(app).post('/api/auth/login').send({
    email: 'diego.lima@example.com',
    password: 'senha12345',
  });

  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.token);
});

test('POST /api/auth/login rejects invalid credentials', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: 'nao.existe@example.com',
    password: 'senha12345',
  });

  assert.strictEqual(res.status, 401);
});

test('GET /api/auth/me requires authentication', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.strictEqual(res.status, 401);
});

test('POST /api/auth/api-key/regenerate issues a new key', async () => {
  const registerRes = await request(app).post('/api/auth/register').send({
    name: 'Elis Regina',
    email: 'elis.regina@example.com',
    password: 'senha12345',
  });
  const { token, user } = registerRes.body.data;

  const res = await request(app).post('/api/auth/api-key/regenerate').set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.api_key);
  assert.notStrictEqual(res.body.data.api_key, user.api_key);
});
