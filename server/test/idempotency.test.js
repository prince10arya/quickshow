import assert from 'node:assert/strict';
import test from 'node:test';
import { idempotencyService } from '../modules/shared/idempotency/idempotency.service.js';
import { idempotencyMiddleware } from '../modules/shared/idempotency/idempotency.middleware.js';

test('Idempotency Service: First request acquires lock, second identical request returns cached result', () => {
  idempotencyService.clear();

  const key = 'idem_test_key_123';
  const method = 'POST';
  const path = '/api/bookings/create';
  const body = { showId: 'show_1', selectedSeats: ['A1', 'A2'] };

  const hash = idempotencyService.hashRequest(method, path, body);

  // 1. First call: Acquires lock (NEW)
  const first = idempotencyService.acquire(key, hash);
  assert.equal(first.status, 'NEW');

  // Complete first request
  const mockResponse = { success: true, bookingId: 'booking_999', amount: 500 };
  idempotencyService.complete(key, 201, mockResponse);

  // 2. Second call with exact same parameters: Returns CACHED result
  const second = idempotencyService.acquire(key, hash);
  assert.equal(second.status, 'CACHED');
  assert.equal(second.record.responseStatus, 201);
  assert.deepEqual(second.record.responseBody, mockResponse);
});

test('Idempotency Service: Reject mismatched payload for same key with HASH_MISMATCH', () => {
  idempotencyService.clear();

  const key = 'idem_test_key_conflict';
  const hash1 = idempotencyService.hashRequest('POST', '/api/bookings/create', { seat: 'A1' });
  const hash2 = idempotencyService.hashRequest('POST', '/api/bookings/create', { seat: 'B2' });

  // Acquire with payload 1
  idempotencyService.acquire(key, hash1);
  idempotencyService.complete(key, 200, { ok: true });

  // Re-acquire with payload 2 (mismatched payload for same key)
  const conflict = idempotencyService.acquire(key, hash2);
  assert.equal(conflict.status, 'HASH_MISMATCH');
});

test('Idempotency Middleware: Intercepts request and serves cached response directly', () => {
  idempotencyService.clear();

  const key = 'idem_mw_test_456';
  const req = {
    method: 'POST',
    originalUrl: '/api/reservations/hold',
    headers: { 'idempotency-key': key },
    body: { showId: 'show_7', seatIds: ['C1'] },
  };

  let capturedStatusCode = null;
  let capturedBody = null;
  const mockRes = {
    statusCode: 200,
    setHeader() {},
    status(code) {
      capturedStatusCode = code;
      this.statusCode = code;
      return this;
    },
    json(payload) {
      capturedBody = payload;
      return this;
    },
  };

  let nextCalled = false;
  idempotencyMiddleware(req, mockRes, () => {
    nextCalled = true;
    // Simulate controller completion
    mockRes.status(201).json({ success: true, reservationId: 'res_abc' });
  });

  assert.equal(nextCalled, true);
  assert.equal(capturedStatusCode, 201);
  assert.equal(capturedBody.reservationId, 'res_abc');

  // Second request: Should NOT call next(), should return cached response directly
  let secondNextCalled = false;
  let secondStatusCode = null;
  let secondBody = null;
  const mockRes2 = {
    setHeader() {},
    status(code) {
      secondStatusCode = code;
      return this;
    },
    json(payload) {
      secondBody = payload;
      return this;
    },
  };

  idempotencyMiddleware(req, mockRes2, () => {
    secondNextCalled = true;
  });

  assert.equal(secondNextCalled, false, 'Next handler must not be executed on idempotent replay');
  assert.equal(secondStatusCode, 201);
  assert.deepEqual(secondBody, { success: true, reservationId: 'res_abc' });
});
