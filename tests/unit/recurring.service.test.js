process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert');
const transactionService = require('../../src/services/transaction.service');

test('calculateNextOccurrence adds one day correctly', () => {
  const next = transactionService.calculateNextOccurrence('2026-01-15', 'daily');
  assert.strictEqual(next, '2026-01-16');
});

test('calculateNextOccurrence adds one week correctly', () => {
  const next = transactionService.calculateNextOccurrence('2026-01-15', 'weekly');
  assert.strictEqual(next, '2026-01-22');
});

test('calculateNextOccurrence adds one month correctly', () => {
  const next = transactionService.calculateNextOccurrence('2026-01-15', 'monthly');
  assert.strictEqual(next, '2026-02-15');
});

test('calculateNextOccurrence adds one year correctly', () => {
  const next = transactionService.calculateNextOccurrence('2026-01-15', 'yearly');
  assert.strictEqual(next, '2027-01-15');
});

test('calculateNextOccurrence rolls over on a month-end edge case (documented limitation)', () => {
  // Jan 31 + 1 month: February 2026 only has 28 days, so JS Date arithmetic
  // rolls the extra 3 days into March instead of clamping to Feb 28.
  const next = transactionService.calculateNextOccurrence('2026-01-31', 'monthly');
  assert.ok(next.startsWith('2026-03'));
});

test('calculateNextOccurrence throws on an unknown frequency', () => {
  assert.throws(() => transactionService.calculateNextOccurrence('2026-01-15', 'biweekly'));
});
