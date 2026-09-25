import Booking from '../models/booking.model.js';
import { bookingService } from '../modules/booking/booking.service.js';
import { inventoryService } from '../modules/inventory/inventory.service.js';

/**
 * Release seats held by an unpaid booking.
 * Backward-compatible helper.
 */
export const releaseSeats = async (bookingId) => {
  try {
    await bookingService.failBooking(bookingId, 'TIMEOUT');
    console.log(`[releaseSeats] Handled release for booking ${bookingId}`);
  } catch (err) {
    console.error('[releaseSeats] error:', err.message);
  }
};

/**
 * POST /api/bookings/create
 * Supports optional reservationId or creates an atomic seat hold automatically.
 */
export const createBooking = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { showId, selectedSeats, reservationId } = req.body;
    const { origin } = req.headers;

    const result = await bookingService.createBooking({
      userId,
      showId,
      selectedSeats,
      reservationId,
      origin,
    });

    return res.json(result);
  } catch (error) {
    console.error('createBooking error', error.message);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/bookings/confirm-dummy/:bookingId
 * Confirms dummy payment and redirects to client.
 */
export const confirmDummyPayment = async (req, res, next) => {
  if (process.env.DUMMY_PAYMENT !== 'true') {
    return res.status(403).json({ success: false, message: 'Dummy payments are disabled.' });
  }

  try {
    const { bookingId } = req.params;
    await bookingService.confirmBooking(bookingId, { provider: 'dummy' });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/my-bookings`);
  } catch (error) {
    console.error('confirmDummyPayment error', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/bookings/seats/:showId
 * Retrieves both durable occupied seats and active ephemeral holds.
 */
export const getOccupiedSeats = async (req, res, next) => {
  try {
    const { showId } = req.params;
    const occupiedSeats = await inventoryService.getOccupiedSeats(showId);
    res.status(200).json({ success: true, occupiedSeats });
  } catch (error) {
    console.error('getOccupiedSeats error', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};
