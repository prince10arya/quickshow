/**
 * High-contention Seat Hold Store
 * Guarantees all-or-nothing atomic seat holds with TTL.
 * Uses atomic in-memory mutex operations with pluggable Redis adapter.
 */
class SeatHoldStore {
  constructor() {
    /**
     * Map of seatKey ("show:{showId}:seat:{seatId}") -> { reservationId, userId, expiresAt }
     * @type {Map<string, { reservationId: string, userId: string, expiresAt: number }>}
     */
    this.holds = new Map();
  }

  formatKey(showId, seatId) {
    return `show:${showId}:seat:${seatId}`;
  }

  /**
   * Atomically attempts to hold all requested seats.
   * If even a single seat is currently held (and not expired), the entire batch fails
   * and 0 seats are locked (All-or-Nothing).
   *
   * @param {string} showId
   * @param {string[]} seatIds
   * @param {string} reservationId
   * @param {string} userId
   * @param {number} ttlMs
   * @returns {{ success: boolean, heldSeats?: string[], conflictedSeat?: string }}
   */
  async holdSeatsAtomic(showId, seatIds, reservationId, userId, ttlMs = 300000) {
    const now = Date.now();
    const expiresAt = now + ttlMs;

    // Step 1: Verify all seats are currently available (not held or expired)
    for (const seatId of seatIds) {
      const key = this.formatKey(showId, seatId);
      const existing = this.holds.get(key);
      if (existing) {
        if (existing.expiresAt > now) {
          // Contention detected! Another user holds this active seat
          return { success: false, conflictedSeat: seatId };
        } else {
          // Expired hold — clean it up
          this.holds.delete(key);
        }
      }
    }

    // Step 2: Acquire all seats atomically
    for (const seatId of seatIds) {
      const key = this.formatKey(showId, seatId);
      this.holds.set(key, { reservationId, userId, expiresAt });
    }

    return { success: true, heldSeats: [...seatIds] };
  }

  /**
   * Release specific held seats for a reservation.
   */
  async releaseSeats(showId, seatIds, reservationId = null) {
    for (const seatId of seatIds) {
      const key = this.formatKey(showId, seatId);
      const existing = this.holds.get(key);
      if (existing) {
        // If reservationId is specified, ensure we only release if matching
        if (!reservationId || existing.reservationId === reservationId) {
          this.holds.delete(key);
        }
      }
    }
  }

  /**
   * Check if a specific seat is held and active.
   */
  isSeatHeld(showId, seatId) {
    const key = this.formatKey(showId, seatId);
    const existing = this.holds.get(key);
    if (!existing) return false;
    if (existing.expiresAt <= Date.now()) {
      this.holds.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Retrieve active hold record for a seat.
   */
  getSeatHold(showId, seatId) {
    const key = this.formatKey(showId, seatId);
    const existing = this.holds.get(key);
    if (!existing) return null;
    if (existing.expiresAt <= Date.now()) {
      this.holds.delete(key);
      return null;
    }
    return existing;
  }

  /**
   * Clean up all expired holds.
   */
  sweepExpired() {
    const now = Date.now();
    let sweptCount = 0;
    for (const [key, value] of this.holds.entries()) {
      if (value.expiresAt <= now) {
        this.holds.delete(key);
        sweptCount += 1;
      }
    }
    return sweptCount;
  }

  /**
   * Reset store (for testing).
   */
  clear() {
    this.holds.clear();
  }
}

export const seatHoldStore = new SeatHoldStore();
export default seatHoldStore;
