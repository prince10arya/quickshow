import mongoose from 'mongoose';
import Reservation from './reservation.model.js';
import Show from '../../models/show.model.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { globalEventBus } from '../../events/eventBus.js';
import { createDomainEvent } from '../../events/domainEvent.js';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../../errors/appError.js';

export class ReservationService {
  /**
   * Hold seats and generate a durable Reservation record.
   */
  async holdSeats({ userId, showId, seatIds, ttlMs = 300000, idempotencyKey = null }) {
    if (!userId) throw new BadRequestError('User ID is required');
    if (!showId) throw new BadRequestError('Show ID is required');
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      throw new BadRequestError('At least one seat must be selected');
    }
    if (seatIds.length > 5) {
      throw new BadRequestError('Cannot reserve more than 5 seats per transaction');
    }

    const show = await Show.findById(showId);
    if (!show) throw new NotFoundError('Show not found');

    const totalAmount = show.showPrice * seatIds.length;
    const reservationId = new mongoose.Types.ObjectId().toString();

    // 1. Atomic hold via inventory service
    const holdResult = await inventoryService.holdSeats({
      showId,
      seatIds,
      reservationId,
      userId,
      ttlMs,
    });

    // 2. Create durable Reservation entity
    const reservation = await Reservation.create({
      _id: reservationId,
      user: userId,
      show: showId,
      seatIds,
      status: 'HELD',
      amount: totalAmount,
      expiresAt: holdResult.expiresAt,
      idempotencyKey,
    });

    // 3. Publish Domain Event
    await globalEventBus.publish(
      createDomainEvent('ReservationHeld', reservation._id.toString(), {
        reservationId: reservation._id.toString(),
        userId,
        showId,
        seatIds,
        amount: totalAmount,
        expiresAt: holdResult.expiresAt.toISOString(),
      })
    );

    return reservation;
  }

  /**
   * Retrieve reservation by ID.
   */
  async getReservation(reservationId) {
    const reservation = await Reservation.findById(reservationId).populate('show');
    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }
    return reservation;
  }

  /**
   * Release hold manually upon cancellation.
   */
  async cancelReservation(reservationId, userId) {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw new NotFoundError('Reservation not found');

    if (reservation.user.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to cancel this reservation');
    }

    if (reservation.status !== 'HELD') {
      throw new ConflictError(`Cannot cancel reservation in ${reservation.status} state`);
    }

    reservation.status = 'CANCELLED';
    await reservation.save();

    await inventoryService.releaseHeldSeats({
      showId: reservation.show.toString(),
      seatIds: reservation.seatIds,
      reservationId: reservation._id.toString(),
    });

    await globalEventBus.publish(
      createDomainEvent('ReservationCancelled', reservation._id.toString(), {
        reservationId: reservation._id.toString(),
        userId,
        showId: reservation.show.toString(),
        seatIds: reservation.seatIds,
      })
    );

    return reservation;
  }

  /**
   * Mark reservation as expired and release inventory.
   */
  async expireReservation(reservationId) {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation || reservation.status !== 'HELD') return null;

    reservation.status = 'EXPIRED';
    await reservation.save();

    await inventoryService.releaseHeldSeats({
      showId: reservation.show.toString(),
      seatIds: reservation.seatIds,
      reservationId: reservation._id.toString(),
    });

    await globalEventBus.publish(
      createDomainEvent('ReservationExpired', reservation._id.toString(), {
        reservationId: reservation._id.toString(),
        showId: reservation.show.toString(),
        seatIds: reservation.seatIds,
      })
    );

    return reservation;
  }

  /**
   * Background sweep for expired reservations.
   */
  async reapExpiredReservations() {
    const now = new Date();
    const expiredList = await Reservation.find({
      status: 'HELD',
      expiresAt: { $lt: now },
    });

    for (const res of expiredList) {
      try {
        await this.expireReservation(res._id.toString());
      } catch (err) {
        console.error(`[ReservationService] Error expiring reservation ${res._id}:`, err.message);
      }
    }

    return expiredList.length;
  }
}

export const reservationService = new ReservationService();
export default reservationService;
