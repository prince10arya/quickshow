# QuickShow — Reservation & Seat Hold Lifecycle

## 1. Sequence Overview
The reservation flow decouples seat discovery and recommendation from transactional holding. An availability inquiry or contiguous seat recommendation never locks inventory. Inventory is exclusively locked when an explicit `holdSeats` command is issued with an idempotency key.

---

## 2. End-to-End Sequence Diagram

```text
User / Agent               Reservation Service           Redis Cache           Database (Source of Truth)
     |                              |                         |                           |
     | 1. suggestContiguousSeats    |                         |                           |
     |----------------------------->|                         |                           |
     |                              |-- Get available seats ->|                           |
     |                              |   from DB/Cache ------->|                           |
     |                              |<-- Available seats -----|                           |
     |<-- Suggested ["G12", "G13"] -|                         |                           |
     |                              |                         |                           |
     | 2. User Confirms Selection   |                         |                           |
     |                              |                         |                           |
     | 3. holdSeats(showId, seats)  |                         |                           |
     |    [Idempotency-Key]         |                         |                           |
     |----------------------------->|                         |                           |
     |                              | 4. Atomic Lua Hold      |                           |
     |                              |    (SET NX PX 300000)   |                           |
     |                              |------------------------>|                           |
     |                              |<-- SUCCESS (Held) ------|                           |
     |                              |                                                     |
     |                              | 5. Persist Reservation (status='HELD')              |
     |                              |    + Update ShowSeat conditionally                  |
     |                              |---------------------------------------------------->|
     |                              |<-- DB Updated --------------------------------------|
     |                              |                                                     |
     |<-- ReservationId, expiresAt -|                                                     |
     |    (e.g., 5 min remaining)   |                                                     |
     |                              |                                                     |
     |------------------------------+-----------------------------------------------------|
     |                              SCENARIO A: Checkout & Payment                        |
     |------------------------------------------------------------------------------------|
     |                              |                                                     |
     | 6. Checkout Payment Success  |                                                     |
     |----------------------------->| 7. confirmBooking(reservationId)                    |
     |                              |---------------------------------------------------->|
     |                              |    - Mark Reservation 'CONFIRMED'                   |
     |                              |    - Mark ShowSeat 'BOOKED'                         |
     |                              |-- DEL Redis Hold Key -->|                           |
     |<-- Confirmed Ticket Pass ----|                                                     |
     |                              |                                                     |
     |------------------------------+-----------------------------------------------------|
     |                              SCENARIO B: Expiry / Abandonment                      |
     |------------------------------------------------------------------------------------|
     |                              |                                                     |
     | (No payment within 5 min)    |                                                     |
     |                              | 8. Redis Key TTL expires naturally                  |
     |                              | 9. Reaper / Inquiry detects expiresAt < now         |
     |                              |    - Mark Reservation 'EXPIRED'                     |
     |                              |    - Release ShowSeat to 'AVAILABLE'                |
     |                              |    - Publish ReservationExpired event               |
```

---

## 3. Reservation Domain Model

```typescript
export interface Reservation {
  id: string;
  userId: string;
  showId: string;
  seatIds: string[];
  status: 'PENDING' | 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: Date;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 4. Safety Invariants

1. **Re-validation on Hold**: Even if `suggest_contiguous_seats` reported seats available 500ms ago, `holdSeats` must independently revalidate that each requested seat is currently free before placing the hold.
2. **Batch All-or-Nothing Acquisition**: If a user requests 3 seats (`["A1", "A2", "A3"]`), and `A1` and `A2` are held successfully but `A3` fails, the system immediately rolls back holds on `A1` and `A2`. Partial holds are never returned to the user.
3. **Audit Preservation**: Expired reservations transition to `EXPIRED` status rather than being deleted from the database. This guarantees financial traceability and behavioral analytics.
