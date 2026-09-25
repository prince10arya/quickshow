import assert from 'node:assert/strict';
import test from 'node:test';
import { seatHoldStore } from '../modules/inventory/seatHoldStore.js';
import { globalEventBus } from '../events/eventBus.js';
import { createDomainEvent } from '../events/domainEvent.js';

test('Reservation Expiry: Expired seat hold is released automatically', async () => {
  seatHoldStore.clear();

  const showId = 'show_expiry_test';
  const seatId = 'A1';

  // Hold seat with a very short TTL: 50 milliseconds
  const result = await seatHoldStore.holdSeatsAtomic(showId, [seatId], 'res_short', 'user_1', 50);
  assert.equal(result.success, true);
  assert.equal(seatHoldStore.isSeatHeld(showId, seatId), true);

  // Wait 70ms for hold to expire
  await new Promise((resolve) => setTimeout(resolve, 70));

  // Seat should now be expired and considered free
  assert.equal(seatHoldStore.isSeatHeld(showId, seatId), false);
  assert.equal(seatHoldStore.getSeatHold(showId, seatId), null);

  // Another user can now acquire the seat cleanly
  const user2Result = await seatHoldStore.holdSeatsAtomic(showId, [seatId], 'res_user2', 'user_2', 300000);
  assert.equal(user2Result.success, true);
  assert.equal(seatHoldStore.isSeatHeld(showId, seatId), true);
});

test('Domain Events: EventBus publishes events and isolates subscriber errors', async () => {
  globalEventBus.clear();

  const receivedEvents = [];

  // Subscriber 1: Records event
  globalEventBus.subscribe('BookingConfirmed', (event) => {
    receivedEvents.push(event);
  });

  // Subscriber 2: Intentionally throws error to test fault-tolerance
  globalEventBus.subscribe('BookingConfirmed', () => {
    throw new Error('Downstream email service is down');
  });

  const event = createDomainEvent('BookingConfirmed', 'booking_12345', {
    amount: 500,
    seats: ['B1', 'B2'],
  });

  // Publishing should NOT throw despite subscriber 2 failing
  await assert.doesNotReject(async () => {
    await globalEventBus.publish(event);
  });

  // Subscriber 1 still received the event successfully
  assert.equal(receivedEvents.length, 1);
  assert.equal(receivedEvents[0].name, 'BookingConfirmed');
  assert.equal(receivedEvents[0].aggregateId, 'booking_12345');
  assert.deepEqual(receivedEvents[0].payload.seats, ['B1', 'B2']);
});
