import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, ref: 'User' },
    show: { type: String, required: true, ref: 'Show' },
    seatIds: { type: [String], required: true },
    status: {
      type: String,
      enum: ['PENDING', 'HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED'],
      default: 'HELD',
    },
    amount: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    idempotencyKey: { type: String, index: true },
  },
  { timestamps: true }
);

reservationSchema.index({ show: 1, status: 1 });
reservationSchema.index({ expiresAt: 1, status: 1 });

const Reservation = mongoose.model('Reservation', reservationSchema);
export default Reservation;
