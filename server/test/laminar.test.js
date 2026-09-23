import assert from 'node:assert/strict';
import test from 'node:test';
import { initLaminar, observe, Laminar } from '../services/chat/observability/laminar.js';

test('initLaminar does not throw when LMNR_PROJECT_API_KEY is not set', () => {
  assert.doesNotThrow(() => {
    initLaminar();
  });
});

test('observe executes function and returns sync value when not initialized', () => {
  const result = observe({ name: 'test_span' }, () => 'cinema_result');
  assert.equal(result, 'cinema_result');
});

test('observe executes async function and resolves value when not initialized', async () => {
  const result = await observe({ name: 'async_span' }, async () => {
    return { status: 'booked', seats: ['A1', 'A2'] };
  });
  assert.deepEqual(result, { status: 'booked', seats: ['A1', 'A2'] });
});

test('observe propagates exceptions thrown by inner function', async () => {
  await assert.rejects(
    async () => {
      await observe({ name: 'error_span' }, async () => {
        throw new Error('Database connection failed');
      });
    },
    { message: 'Database connection failed' }
  );
});

test('Laminar export is defined', () => {
  assert.ok(Laminar);
  assert.equal(typeof Laminar.initialize, 'function');
});
