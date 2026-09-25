import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import { idempotencyMiddleware } from '../shared/idempotency/idempotency.middleware.js';
import { reservationService } from './reservation.service.js';

const reservationRouter = Router();

/**
 * POST /api/reservations/hold
 * Atomically holds seats with 5-minute TTL.
 */
reservationRouter.post('/hold', protect, idempotencyMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { showId, seatIds, ttlMs } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] || null;

    const reservation = await reservationService.holdSeats({
      userId,
      showId,
      seatIds,
      ttlMs,
      idempotencyKey,
    });

    res.status(201).json({
      success: true,
      reservationId: reservation._id.toString(),
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      amount: reservation.amount,
      seatIds: reservation.seatIds,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reservations/:id
 * Queries reservation status.
 */
reservationRouter.get('/:id', protect, async (req, res, next) => {
  try {
    const reservation = await reservationService.getReservation(req.params.id);
    res.json({
      success: true,
      reservation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reservations/:id/cancel
 * Cancels a held reservation and releases seats.
 */
reservationRouter.post('/:id/cancel', protect, async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const cancelled = await reservationService.cancelReservation(req.params.id, userId);
    res.json({
      success: true,
      message: 'Reservation cancelled and seats released.',
      reservation: cancelled,
    });
  } catch (error) {
    next(error);
  }
});

export default reservationRouter;
