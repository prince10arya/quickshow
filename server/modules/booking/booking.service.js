import stripe from 'stripe';
import Booking from '../../models/booking.model.js';
import Show from '../../models/show.model.js';
import Reservation from '../reservation/reservation.model.js';
import { reservationService } from '../reservation/reservation.service.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { seatHoldStore } from '../inventory/seatHoldStore.js';
import { globalEventBus } from '../../events/eventBus.js';
import { createDomainEvent } from '../../events/domainEvent.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../errors/appError.js';

const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class BookingService {
  /**
   * Create a booking from requested seats or an existing reservation hold.
   */
  async createBooking({ userId, showId, selectedSeats, reservationId = null, origin = 'http://localhost:5173' }) {
    if (!userId) throw new BadRequestError('User ID is required');
    if (!showId) throw new BadRequestError('Show ID is required');
    if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) {
      throw new BadRequestError('At least one seat must be selected');
    }

    const show = await Show.findById(showId).populate('movie');
    if (!show) throw new NotFoundError('Show not found');

    let activeReservationId = reservationId;

    // If reservationId not provided, hold the seats atomically now
    if (!activeReservationId) {
      const reservation = await reservationService.holdSeats({
        userId,
        showId,
        seatIds: selectedSeats,
        ttlMs: PAYMENT_TIMEOUT_MS,
      });
      activeReservationId = reservation._id.toString();
    } else {
      // Validate existing reservation
      const resDoc = await Reservation.findById(activeReservationId);
      if (!resDoc || resDoc.status !== 'HELD') {
        throw new ConflictError('Reservation hold has expired or is invalid. Please select seats again.');
      }
    }

    const totalAmount = show.showPrice * selectedSeats.length;

    // Create durable Booking entity
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: totalAmount,
      bookedSeates: selectedSeats,
      expiresAt: new Date(Date.now() + PAYMENT_TIMEOUT_MS),
      isPaid: false,
    });

    const bookingId = booking._id.toString();

    // ── Dummy payment mode ────────────────────────────────────────────────────────
    if (process.env.DUMMY_PAYMENT === 'true') {
      const clientUrl = process.env.CLIENT_URL || origin;
      const paymentPageUrl = `${clientUrl}/payment/${bookingId}`;
      booking.paymentLink = paymentPageUrl;
      await booking.save();

      return {
        success: true,
        bookingId,
        url: paymentPageUrl,
        dummy: true,
      };
    }

    // ── Real Stripe Checkout Flow ──────────────────────────────────────────────────
    if (!process.env.STRIPE_SECRET_KEY) {
      // Fallback to local payment link if stripe key not set in dev
      const clientUrl = process.env.CLIENT_URL || origin;
      const paymentPageUrl = `${clientUrl}/payment/${bookingId}`;
      booking.paymentLink = paymentPageUrl;
      await booking.save();
      return { success: true, bookingId, url: paymentPageUrl, dummy: true };
    }

    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: show.movie?.title || 'Cinema Ticket' },
            unit_amount: Math.floor(totalAmount) * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: { bookingId, showId, reservationId: activeReservationId },
      expires_at: Math.floor(Date.now() / 1000) + Math.floor(PAYMENT_TIMEOUT_MS / 1000),
    });

    booking.paymentLink = session.url;
    await booking.save();

    return { success: true, bookingId, url: session.url };
  }

  /**
   * Confirm booking upon successful payment capture.
   * Fully idempotent.
   */
  async confirmBooking(bookingId, paymentDetails = {}) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new NotFoundError(`Booking not found with ID ${bookingId}`);

    // If already confirmed, return idempotently
    if (booking.isPaid) {
      return { success: true, booking, alreadyConfirmed: true };
    }

    const show = await Show.findById(booking.show);
    if (!show) throw new NotFoundError('Show not found');

    // 1. Commit durable seats to show document
    if (!show.occupiedSeates) {
      show.occupiedSeates = {};
    }
    booking.bookedSeates.forEach((seat) => {
      show.occupiedSeates[seat] = booking.user.toString();
    });
    show.markModified('occupiedSeates');
    await show.save();

    // 2. Mark booking paid
    booking.isPaid = true;
    booking.paymentLink = '';
    await booking.save();

    // 3. Release ephemeral hold store key
    await seatHoldStore.releaseSeats(booking.show.toString(), booking.bookedSeates);

    // 4. Update matching reservation if one exists
    await Reservation.updateMany(
      { show: booking.show, user: booking.user, status: 'HELD' },
      { status: 'CONFIRMED' }
    );

    // 5. Publish Domain Event
    await globalEventBus.publish(
      createDomainEvent('BookingConfirmed', booking._id.toString(), {
        bookingId: booking._id.toString(),
        userId: booking.user.toString(),
        showId: booking.show.toString(),
        seats: booking.bookedSeates,
        amount: booking.amount,
        paymentDetails,
      })
    );

    return { success: true, booking };
  }

  /**
   * Fail / cancel unpaid booking and release hold.
   */
  async failBooking(bookingId, reason = 'PAYMENT_FAILED') {
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.isPaid) return;

    const show = await Show.findById(booking.show);
    if (show && show.occupiedSeates) {
      booking.bookedSeates.forEach((seat) => {
        delete show.occupiedSeates[seat];
      });
      show.markModified('occupiedSeates');
      await show.save();
    }

    await seatHoldStore.releaseSeats(booking.show.toString(), booking.bookedSeates);

    await Reservation.updateMany(
      { show: booking.show, user: booking.user, status: 'HELD' },
      { status: 'EXPIRED' }
    );

    await globalEventBus.publish(
      createDomainEvent('BookingFailed', booking._id.toString(), {
        bookingId: booking._id.toString(),
        showId: booking.show.toString(),
        seats: booking.bookedSeates,
        reason,
      })
    );
  }
}

export const bookingService = new BookingService();
export default bookingService;
