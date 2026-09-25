import assert from 'node:assert/strict';
import test from 'node:test';
import { seatHoldStore } from '../modules/inventory/seatHoldStore.js';

test('Concurrency: 100 simultaneous users competing for the same seat results in exactly 1 hold and 99 rejections', async () => {
  seatHoldStore.clear();

  const showId = 'show_concurrency_101';
  const targetSeat = 'G12';
  const totalUsers = 100;

  // Launch 100 concurrent promises simulating 100 users hitting the atomic hold simultaneously
  const attempts = Array.from({ length: totalUsers }, (_, index) => {
    const userId = `user_${index + 1}`;
    const reservationId = `res_${index + 1}`;
    return seatHoldStore.holdSeatsAtomic(showId, [targetSeat], reservationId, userId, 300000);
  });

  const results = await Promise.all(attempts);

  const successfulHolds = results.filter((r) => r.success);
  const rejectedHolds = results.filter((r) => !r.success);

  assert.equal(successfulHolds.length, 1, 'Exactly one user must win the seat hold');
  assert.equal(rejectedHolds.length, 99, 'All other 99 users must be rejected');

  // Verify the winning user is recorded in the hold store
  const activeHold = seatHoldStore.getSeatHold(showId, targetSeat);
  assert.ok(activeHold, 'Active hold must exist in the store');
  assert.equal(seatHoldStore.isSeatHeld(showId, targetSeat), true);
});

test('Concurrency: Multi-seat all-or-nothing rollback prevents partial holds', async () => {
  seatHoldStore.clear();

  const showId = 'show_concurrency_102';
  // User 1 holds G13 first
  const user1 = await seatHoldStore.holdSeatsAtomic(showId, ['G13'], 'res_u1', 'user_1', 300000);
  assert.equal(user1.success, true);

  // User 2 requests G12, G13, G14 (G13 is taken)
  const user2 = await seatHoldStore.holdSeatsAtomic(showId, ['G12', 'G13', 'G14'], 'res_u2', 'user_2', 300000);
  assert.equal(user2.success, false, 'Batch must fail if any seat is contested');
  assert.equal(user2.conflictedSeat, 'G13');

  // Neither G12 nor G14 should have been partially held by user 2
  assert.equal(seatHoldStore.isSeatHeld(showId, 'G12'), false, 'G12 must remain free');
  assert.equal(seatHoldStore.isSeatHeld(showId, 'G14'), false, 'G14 must remain free');
  assert.equal(seatHoldStore.isSeatHeld(showId, 'G13'), true, 'G13 remains held by User 1');
});
