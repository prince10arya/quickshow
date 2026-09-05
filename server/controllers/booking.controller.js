import stripe from 'stripe';

import Booking from '../models/booking.model.js';
import Show from '../models/show.model.js';

/** How long (ms) a pending booking holds seats before auto-release. Min 30 min (Stripe requirement). */
const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000; // 30 minutes

/**
 * Release seats held by an unpaid booking and delete the booking.
 * Safe to call multiple times — no-ops if booking is already paid or gone.
 */
export const releaseSeats = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking || booking.isPaid) return; // already paid or cleaned up

    const show = await Show.findById(booking.show);
    if (show) {
      booking.bookedSeates.forEach((seat) => {
        delete show.occupiedSeates[seat];
      });
      show.markModified('occupiedSeates');
      await show.save();
    }

    await booking.deleteOne();
    console.log(`[releaseSeats] Released seats for booking ${bookingId}`);
  } catch (err) {
    console.error('[releaseSeats] error:', err.message);
  }
};

//* Check seat availability
const checkSeatsAvail = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) return false;
    return !selectedSeats.some((seat) => showData.occupiedSeates[seat]);
  } catch (error) {
    console.error('checkSeatsAvail error', error.message);
    return false;
  }
};

/**
 * POST /api/bookings/create
 *
 * If DUMMY_PAYMENT=true in env, skips Stripe and returns a dummy confirm URL.
 * A server-side timeout releases the seats after PAYMENT_TIMEOUT_MS if unpaid.
 */
export const createBooking = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { showId, selectedSeats } = req.body;
    const { origin } = req.headers;

    const isAvailable = await checkSeatsAvail(showId, selectedSeats);
    if (!isAvailable)
      return res.json({ success: false, message: 'Selected seats are not available.' });

    const showData = await Show.findById(showId).populate('movie');

    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeates: selectedSeats,
      expiresAt: new Date(Date.now() + PAYMENT_TIMEOUT_MS),
    });

    // Lock seats
    selectedSeats.forEach((seat) => {
      showData.occupiedSeates[seat] = userId;
    });
    showData.markModified('occupiedSeates');
    await showData.save();

    // ── Seat-release timeout (runs in-process; survives only while server is up) ──
    // For production use a persistent job queue (BullMQ, Agenda, Inngest, etc.)
    const bookingId = booking._id.toString();
    setTimeout(() => releaseSeats(bookingId), PAYMENT_TIMEOUT_MS);

    // ── Dummy payment mode ────────────────────────────────────────────────────────
    if (process.env.DUMMY_PAYMENT === 'true') {
      const clientUrl = process.env.CLIENT_URL || origin;
      const paymentPageUrl = `${clientUrl}/payment/${bookingId}`;
      booking.paymentLink = paymentPageUrl;
      await booking.save();

      return res.json({
        success: true,
        url: paymentPageUrl,
        dummy: true,
      });
    }

    // ── Real Stripe flow ──────────────────────────────────────────────────────────
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    const lineItems = [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: showData.movie.title },
          unit_amount: Math.floor(booking.amount) * 100,
        },
        quantity: 1,
      },
    ];

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: lineItems,
      mode: 'payment',
      metadata: { bookingId },
      expires_at: Math.floor(Date.now() / 1000) + PAYMENT_TIMEOUT_MS / 1000,
    });

    booking.paymentLink = session.url;
    await booking.save();

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('createBooking error', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/bookings/confirm-dummy/:bookingId
 *
 * Only active when DUMMY_PAYMENT=true.
 * Marks the booking as paid and redirects to My Bookings.
 */
export const confirmDummyPayment = async (req, res) => {
  if (process.env.DUMMY_PAYMENT !== 'true')
    return res.status(403).json({ success: false, message: 'Dummy payments are disabled.' });

  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    booking.isPaid = true;
    booking.paymentLink = '';
    await booking.save();

    // Redirect to client My Bookings page
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/my-bookings`);
  } catch (error) {
    console.error('confirmDummyPayment error', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const showData = await Show.findById(showId);
    const occupiedSeats = Object.keys(showData.occupiedSeates);

    res.status(200).json({ success: true, occupiedSeats });
  } catch (error) {
    console.error('getOccupiedSeats error', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};
