import mongoose from 'mongoose';

export const BOOKING_SESSION_STATUS = Object.freeze({
  BROWSING: 'browsing',
  MOVIE_SELECTED: 'movie_selected',
  SHOW_SELECTED: 'show_selected',
  AVAILABILITY_CHECKED: 'availability_checked',
  SEATS_SELECTED: 'seats_selected',
  REVIEW: 'review',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

const bookingSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: false, default: null, index: true },
    conversationId: { type: String, required: true, index: true },
    movieId: { type: String, default: null },
    movieTitle: { type: String, default: null },
    showId: { type: String, default: null },
    theatreId: { type: String, default: 'QuickShow Cinema Main' },
    seatCount: { type: Number, default: 0 },
    selectedSeats: { type: [String], default: [] },
    status: {
      type: String,
      enum: Object.values(BOOKING_SESSION_STATUS),
      default: BOOKING_SESSION_STATUS.BROWSING,
      index: true,
    },
    version: { type: Number, default: 1 },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes
bookingSessionSchema.index({ userId: 1, status: 1 });
bookingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BookingSession = mongoose.model('BookingSession', bookingSessionSchema);

export default BookingSession;
