import Show from '../../models/show.model.js';
import { seatHoldStore } from './seatHoldStore.js';
import { findContiguousSeats } from '../../services/chat/utils/seat.utils.js';
import { ConflictError, NotFoundError } from '../../errors/appError.js';

export class InventoryService {
  /**
   * Get all occupied and actively held seats for a show.
   */
  async getOccupiedSeats(showId) {
    const show = await Show.findById(showId);
    if (!show) {
      throw new NotFoundError(`Show not found with ID ${showId}`);
    }

    const occupiedInDb = Object.keys(show.occupiedSeates || {});
    const combined = new Set(occupiedInDb);

    // Also check ephemeral holds in the fast-lock store
    for (let rowCode = 65; rowCode <= 74; rowCode += 1) { // A through J
      const row = String.fromCharCode(rowCode);
      for (let num = 1; num <= 9; num += 1) {
        const seatId = `${row}${num}`;
        if (!combined.has(seatId) && seatHoldStore.isSeatHeld(showId, seatId)) {
          combined.add(seatId);
        }
      }
    }

    return Array.from(combined);
  }

  /**
   * Check if specific seats are free from both durable bookings and active holds.
   */
  async checkSeatsAvailability(showId, seatIds) {
    const show = await Show.findById(showId);
    if (!show) return false;

    for (const seatId of seatIds) {
      if (show.occupiedSeates?.[seatId]) return false;
      if (seatHoldStore.isSeatHeld(showId, seatId)) return false;
    }

    return true;
  }

  /**
   * Suggest contiguous seats taking into account both DB bookings and active ephemeral holds.
   */
  async suggestContiguousSeats(showId, ticketCount) {
    const show = await Show.findById(showId);
    if (!show) {
      throw new NotFoundError(`Show not found with ID ${showId}`);
    }

    // Merge DB occupied seats with ephemeral holds
    const mergedOccupied = { ...(show.occupiedSeates || {}) };
    for (let rowCode = 65; rowCode <= 74; rowCode += 1) {
      const row = String.fromCharCode(rowCode);
      for (let num = 1; num <= 9; num += 1) {
        const seatId = `${row}${num}`;
        if (!mergedOccupied[seatId] && seatHoldStore.isSeatHeld(showId, seatId)) {
          mergedOccupied[seatId] = 'HELD';
        }
      }
    }

    return findContiguousSeats(mergedOccupied, ticketCount);
  }

  /**
   * Atomically hold seats for a show.
   */
  async holdSeats({ showId, seatIds, reservationId, userId, ttlMs = 300000 }) {
    const show = await Show.findById(showId);
    if (!show) {
      throw new NotFoundError(`Show not found with ID ${showId}`);
    }

    // Step 1: Ensure none are booked in the durable database
    for (const seatId of seatIds) {
      if (show.occupiedSeates?.[seatId]) {
        throw new ConflictError(`Seat ${seatId} is already booked.`);
      }
    }

    // Step 2: Atomic lock in hold store
    const holdResult = await seatHoldStore.holdSeatsAtomic(
      showId,
      seatIds,
      reservationId,
      userId,
      ttlMs
    );

    if (!holdResult.success) {
      throw new ConflictError(
        `Seat ${holdResult.conflictedSeat} is currently held by another customer. Please select another seat.`
      );
    }

    return {
      success: true,
      heldSeats: holdResult.heldSeats,
      expiresAt: new Date(Date.now() + ttlMs),
    };
  }

  /**
   * Release held seats.
   */
  async releaseHeldSeats({ showId, seatIds, reservationId }) {
    await seatHoldStore.releaseSeats(showId, seatIds, reservationId);
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
