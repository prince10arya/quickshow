import { ConflictError, BadRequestError } from '../../errors/appError.js';

/**
 * Seat States
 */
export const SEAT_STATES = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  HELD: 'HELD',
  BOOKED: 'BOOKED',
});

/**
 * Valid Transition Map: Source State -> Set of allowed Target States
 */
const VALID_TRANSITIONS = {
  [SEAT_STATES.AVAILABLE]: new Set([SEAT_STATES.HELD]),
  [SEAT_STATES.HELD]: new Set([SEAT_STATES.BOOKED, SEAT_STATES.AVAILABLE]),
  [SEAT_STATES.BOOKED]: new Set([SEAT_STATES.AVAILABLE]), // Only via refund/admin action
};

/**
 * Check if a seat transition is valid.
 * @param {string} fromState
 * @param {string} toState
 * @param {{ allowAdminRefund?: boolean }} [options]
 * @returns {boolean}
 */
export const isValidSeatTransition = (fromState, toState, options = {}) => {
  if (!fromState || !toState) return false;
  if (fromState === toState) return true; // Idempotent no-op

  const allowed = VALID_TRANSITIONS[fromState];
  if (!allowed || !allowed.has(toState)) {
    return false;
  }

  // BOOKED -> AVAILABLE requires explicit administrative/refund permission
  if (fromState === SEAT_STATES.BOOKED && toState === SEAT_STATES.AVAILABLE) {
    return Boolean(options.allowAdminRefund);
  }

  return true;
};

/**
 * Assert that a seat transition is valid or throw an AppError.
 */
export const assertSeatTransition = (fromState, toState, seatId = '', options = {}) => {
  if (!isValidSeatTransition(fromState, toState, options)) {
    throw new ConflictError(
      `Invalid seat state transition from ${fromState} to ${toState}${seatId ? ` for seat ${seatId}` : ''}.`
    );
  }
};
