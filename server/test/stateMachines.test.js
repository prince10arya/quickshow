import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SEAT_STATES,
  isValidSeatTransition,
  assertSeatTransition,
} from '../modules/inventory/seatStateMachine.js';
import {
  BOOKING_STATES,
  isValidBookingTransition,
  assertBookingTransition,
} from '../modules/booking/bookingStateMachine.js';

test('Seat State Machine: Valid transitions succeed', () => {
  // AVAILABLE -> HELD
  assert.equal(isValidSeatTransition(SEAT_STATES.AVAILABLE, SEAT_STATES.HELD), true);

  // HELD -> BOOKED
  assert.equal(isValidSeatTransition(SEAT_STATES.HELD, SEAT_STATES.BOOKED), true);

  // HELD -> AVAILABLE (timeout or cancel)
  assert.equal(isValidSeatTransition(SEAT_STATES.HELD, SEAT_STATES.AVAILABLE), true);

  // Idempotent repeat: HELD -> HELD
  assert.equal(isValidSeatTransition(SEAT_STATES.HELD, SEAT_STATES.HELD), true);

  // BOOKED -> AVAILABLE with admin refund permission
  assert.equal(
    isValidSeatTransition(SEAT_STATES.BOOKED, SEAT_STATES.AVAILABLE, { allowAdminRefund: true }),
    true
  );
});

test('Seat State Machine: Invalid transitions are rejected', () => {
  // AVAILABLE -> BOOKED (cannot bypass HELD)
  assert.equal(isValidSeatTransition(SEAT_STATES.AVAILABLE, SEAT_STATES.BOOKED), false);
  assert.throws(() => {
    assertSeatTransition(SEAT_STATES.AVAILABLE, SEAT_STATES.BOOKED, 'G12');
  }, /Invalid seat state transition/);

  // BOOKED -> HELD (cannot place hold on confirmed seat)
  assert.equal(isValidSeatTransition(SEAT_STATES.BOOKED, SEAT_STATES.HELD), false);

  // BOOKED -> AVAILABLE without admin permission is rejected
  assert.equal(isValidSeatTransition(SEAT_STATES.BOOKED, SEAT_STATES.AVAILABLE), false);
});

test('Booking State Machine: Valid transitions succeed', () => {
  // PENDING -> PAYMENT_PENDING
  assert.equal(isValidBookingTransition(BOOKING_STATES.PENDING, BOOKING_STATES.PAYMENT_PENDING), true);

  // PAYMENT_PENDING -> CONFIRMED
  assert.equal(isValidBookingTransition(BOOKING_STATES.PAYMENT_PENDING, BOOKING_STATES.CONFIRMED), true);

  // PAYMENT_PENDING -> FAILED
  assert.equal(isValidBookingTransition(BOOKING_STATES.PAYMENT_PENDING, BOOKING_STATES.FAILED), true);

  // CONFIRMED -> REFUND_PENDING -> REFUNDED
  assert.equal(isValidBookingTransition(BOOKING_STATES.CONFIRMED, BOOKING_STATES.REFUND_PENDING), true);
  assert.equal(isValidBookingTransition(BOOKING_STATES.REFUND_PENDING, BOOKING_STATES.REFUNDED), true);
});

test('Booking State Machine: Invalid transitions are rejected', () => {
  // CONFIRMED -> FAILED (Confirmed booking cannot silently fail)
  assert.equal(isValidBookingTransition(BOOKING_STATES.CONFIRMED, BOOKING_STATES.FAILED), false);
  assert.throws(() => {
    assertBookingTransition(BOOKING_STATES.CONFIRMED, BOOKING_STATES.FAILED, 'book_123');
  }, /Invalid booking state transition/);

  // FAILED -> CONFIRMED (Terminal failure cannot resurrect directly)
  assert.equal(isValidBookingTransition(BOOKING_STATES.FAILED, BOOKING_STATES.CONFIRMED), false);

  // REFUNDED -> PAYMENT_PENDING (Refunded booking cannot re-request payment)
  assert.equal(isValidBookingTransition(BOOKING_STATES.REFUNDED, BOOKING_STATES.PAYMENT_PENDING), false);
});
