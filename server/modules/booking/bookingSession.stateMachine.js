import { ConflictError } from '../../errors/appError.js';
import { BOOKING_SESSION_STATUS } from '../../models/bookingSession.model.js';

export const ALLOWED_STATUS_TRANSITIONS = {
  [BOOKING_SESSION_STATUS.BROWSING]: new Set([
    BOOKING_SESSION_STATUS.BROWSING,
    BOOKING_SESSION_STATUS.MOVIE_SELECTED,
    BOOKING_SESSION_STATUS.SHOW_SELECTED,
    BOOKING_SESSION_STATUS.CANCELLED,
    BOOKING_SESSION_STATUS.EXPIRED,
  ]),
  [BOOKING_SESSION_STATUS.MOVIE_SELECTED]: new Set([
    BOOKING_SESSION_STATUS.BROWSING,
    BOOKING_SESSION_STATUS.MOVIE_SELECTED,
    BOOKING_SESSION_STATUS.SHOW_SELECTED,
    BOOKING_SESSION_STATUS.CANCELLED,
    BOOKING_SESSION_STATUS.EXPIRED,
  ]),
  [BOOKING_SESSION_STATUS.SHOW_SELECTED]: new Set([
    BOOKING_SESSION_STATUS.MOVIE_SELECTED,
    BOOKING_SESSION_STATUS.SHOW_SELECTED,
    BOOKING_SESSION_STATUS.AVAILABILITY_CHECKED,
    BOOKING_SESSION_STATUS.SEATS_SELECTED,
    BOOKING_SESSION_STATUS.CANCELLED,
    BOOKING_SESSION_STATUS.EXPIRED,
  ]),
  [BOOKING_SESSION_STATUS.AVAILABILITY_CHECKED]: new Set([
    BOOKING_SESSION_STATUS.SHOW_SELECTED,
    BOOKING_SESSION_STATUS.AVAILABILITY_CHECKED,
    BOOKING_SESSION_STATUS.SEATS_SELECTED,
    BOOKING_SESSION_STATUS.MOVIE_SELECTED,
    BOOKING_SESSION_STATUS.CANCELLED,
    BOOKING_SESSION_STATUS.EXPIRED,
  ]),
  [BOOKING_SESSION_STATUS.SEATS_SELECTED]: new Set([
    BOOKING_SESSION_STATUS.AVAILABILITY_CHECKED,
    BOOKING_SESSION_STATUS.SEATS_SELECTED,
    BOOKING_SESSION_STATUS.REVIEW,
    BOOKING_SESSION_STATUS.SHOW_SELECTED,
    BOOKING_SESSION_STATUS.MOVIE_SELECTED,
    BOOKING_SESSION_STATUS.CANCELLED,
    BOOKING_SESSION_STATUS.EXPIRED,
  ]),
  [BOOKING_SESSION_STATUS.REVIEW]: new Set([
    BOOKING_SESSION_STATUS.SEATS_SELECTED,
    BOOKING_SESSION_STATUS.REVIEW,
    BOOKING_SESSION_STATUS.CONFIRMED,
    BOOKING_SESSION_STATUS.SHOW_SELECTED,
    BOOKING_SESSION_STATUS.MOVIE_SELECTED,
    BOOKING_SESSION_STATUS.CANCELLED,
    BOOKING_SESSION_STATUS.EXPIRED,
  ]),
  [BOOKING_SESSION_STATUS.CONFIRMED]: new Set(),
  [BOOKING_SESSION_STATUS.CANCELLED]: new Set(),
  [BOOKING_SESSION_STATUS.EXPIRED]: new Set(),
};

/**
 * Validate whether transition between two states is permitted.
 * @param {string} fromStatus
 * @param {string} toStatus
 * @returns {boolean}
 */
export const isValidSessionTransition = (fromStatus, toStatus) => {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus];
  return Boolean(allowed && allowed.has(toStatus));
};

/**
 * Assert that a state transition is legal.
 * @throws {ConflictError} if invalid
 */
export const assertSessionTransition = (fromStatus, toStatus, sessionId = '') => {
  if (!isValidSessionTransition(fromStatus, toStatus)) {
    throw new ConflictError(
      `Invalid booking session transition from "${fromStatus}" to "${toStatus}"${sessionId ? ` for session ${sessionId}` : ''}.`
    );
  }
};

/**
 * Compute cascade invalidations when parent state changes.
 * Section 6: Movie changes -> clear show & seats. Show changes -> clear seats.
 * @param {Object} currentSession
 * @param {Object} updates
 * @returns {Object} updates with cascaded invalidations applied
 */
export const applyCascadeInvalidations = (currentSession, updates = {}) => {
  const result = { ...updates };

  // If movie changed to a different movie
  const hasNewMovie = updates.movieId !== undefined && updates.movieId !== null;
  const movieChanged = hasNewMovie && String(updates.movieId) !== String(currentSession.movieId);

  if (movieChanged) {
    result.showId = null;
    result.selectedSeats = [];
    result.seatCount = 0;
    if (!result.status || result.status === currentSession.status) {
      result.status = BOOKING_SESSION_STATUS.MOVIE_SELECTED;
    }
    return result;
  }

  // If show changed to a different show
  const hasNewShow = updates.showId !== undefined && updates.showId !== null;
  const showChanged = hasNewShow && String(updates.showId) !== String(currentSession.showId);

  if (showChanged) {
    result.selectedSeats = [];
    result.seatCount = 0;
    if (!result.status || result.status === currentSession.status) {
      result.status = BOOKING_SESSION_STATUS.SHOW_SELECTED;
    }
    return result;
  }

  return result;
};
