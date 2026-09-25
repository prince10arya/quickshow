/**
 * Structured Booking Flow Context
 * The AI Agent and Stream Handler track this explicit state rather than relying
 * purely on unstructured conversational text.
 */

export const BOOKING_FLOW_STATUS = Object.freeze({
  DISCOVERING: 'DISCOVERING',
  SHOW_SELECTED: 'SHOW_SELECTED',
  SEATS_SELECTED: 'SEATS_SELECTED',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  SEATS_HELD: 'SEATS_HELD',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  FAILED: 'FAILED',
});

export class BookingContext {
  constructor(initial = {}) {
    this.movieId = initial.movieId || null;
    this.movieTitle = initial.movieTitle || null;
    this.showId = initial.showId || null;
    this.theaterId = initial.theaterId || 'QuickShow Cinema Main';
    this.seatIds = Array.isArray(initial.seatIds) ? [...initial.seatIds] : [];
    this.ticketCount = initial.ticketCount || 0;
    this.reservationId = initial.reservationId || null;
    this.paymentId = initial.paymentId || null;
    this.bookingId = initial.bookingId || null;
    this.totalAmount = initial.totalAmount || 0;
    this.status = initial.status || BOOKING_FLOW_STATUS.DISCOVERING;
    this.expiresAt = initial.expiresAt || null;
  }

  update(delta = {}) {
    Object.assign(this, delta);
    return this;
  }

  toJSON() {
    return {
      movieId: this.movieId,
      movieTitle: this.movieTitle,
      showId: this.showId,
      theaterId: this.theaterId,
      seatIds: this.seatIds,
      ticketCount: this.ticketCount,
      reservationId: this.reservationId,
      paymentId: this.paymentId,
      bookingId: this.bookingId,
      totalAmount: this.totalAmount,
      status: this.status,
      expiresAt: this.expiresAt,
    };
  }
}
