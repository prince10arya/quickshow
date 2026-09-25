import { ConflictError } from '../../errors/appError.js';

export const BOOKING_STATES = Object.freeze({
  PENDING: 'PENDING',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
});

const VALID_BOOKING_TRANSITIONS = {
  [BOOKING_STATES.PENDING]: new Set([BOOKING_STATES.PAYMENT_PENDING, BOOKING_STATES.FAILED]),
  [BOOKING_STATES.PAYMENT_PENDING]: new Set([BOOKING_STATES.CONFIRMED, BOOKING_STATES.FAILED]),
  [BOOKING_STATES.CONFIRMED]: new Set([BOOKING_STATES.REFUND_PENDING, BOOKING_STATES.CANCELLED]),
  [BOOKING_STATES.REFUND_PENDING]: new Set([BOOKING_STATES.REFUNDED, BOOKING_STATES.CONFIRMED]),
  [BOOKING_STATES.FAILED]: new Set(),
  [BOOKING_STATES.CANCELLED]: new Set(),
  [BOOKING_STATES.REFUNDED]: new Set(),
};

export const isValidBookingTransition = (fromState, toState) => {
  if (!fromState || !toState) return false;
  if (fromState === toState) return true; // Idempotent repeat
  const allowed = VALID_BOOKING_TRANSITIONS[fromState];
  return Boolean(allowed && allowed.has(toState));
};

export const assertBookingTransition = (fromState, toState, bookingId = '') => {
  if (!isValidBookingTransition(fromState, toState)) {
    throw new ConflictError(
      `Invalid booking state transition from ${fromState} to ${toState}${bookingId ? ` on booking ${bookingId}` : ''}.`
    );
  }
};
