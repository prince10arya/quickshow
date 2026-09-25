# QuickShow — Seat State Machine Specification

## 1. Overview
The seat state machine governs the availability and lifecycle of every physical seat for any given cinema show. In a high-traffic ticketing platform, multiple users or automated agents may compete for the exact same seat simultaneously. The seat state machine guarantees single-ownership at all times, provides automatic timeout reclamation, and prevents double-booking.

---

## 2. State Definitions

```text
+---------------+---------------------------------------------------------------------------------+
| State         | Description                                                                     |
+---------------+---------------------------------------------------------------------------------+
| AVAILABLE     | The seat is unreserved and can be held or booked by any active user.            |
| HELD          | The seat is locked temporarily under a Reservation with an active TTL.          |
| BOOKED        | The seat has been successfully paid for and confirmed. Durable final state.     |
+---------------+---------------------------------------------------------------------------------+
```

---

## 3. State Transition Diagram

```text
                  +--------------------------------+
                  |                                |
                  |           AVAILABLE            |<--------------------+
                  |                                |                     |
                  +---------------+----------------+                     |
                                  |                                      |
                                  | 1. holdSeats()                       | 3. TTL Expiry
                                  |    (Atomic Hold)                     |    or Cancellation
                                  v                                      |
                  +--------------------------------+                     |
                  |                                |                     |
                  |              HELD              +---------------------+
                  |   (holdExpiresAt = now + TTL)  |
                  +---------------+----------------+
                                  |
                                  | 2. paymentSuccess()
                                  |    confirmBooking()
                                  v
                  +--------------------------------+
                  |                                |
                  |             BOOKED             |
                  |    (Durable Final State)       |
                  +--------------------------------+
```

---

## 4. Transition Rules & Invariants

| From State | Trigger | To State | Concurrency / Validation Guard |
| :--- | :--- | :--- | :--- |
| `AVAILABLE` | `holdSeats` (User/Agent) | `HELD` | Atomic check: seat must currently be `AVAILABLE` or have an expired hold. Hold record created with TTL. |
| `HELD` | `confirmBooking` (Payment success) | `BOOKED` | Validates active hold ID. Seat cannot be booked if hold expired or belonging to another user. |
| `HELD` | `releaseHold` (TTL expired / User cancel) | `AVAILABLE` | Hold TTL exceeded or explicit cancellation by reservation owner. |
| `BOOKED` | `cancelBooking` (Admin/Refund) | `AVAILABLE` | **Restricted**: Can only occur via audited domain refund workflow; never through standard checkout. |

### Strict Invalid Transitions
* `AVAILABLE -> BOOKED`: A seat **cannot** jump directly to `BOOKED` without an active, validated `HELD` reservation.
* `BOOKED -> HELD`: A booked seat cannot be placed on hold by another party.
* `BOOKED -> AVAILABLE` (normal booking API): Direct unsetting of booked seats is forbidden.
* `HELD(User A) -> HELD(User B)`: An active hold cannot be overwritten before its expiration time.

---

## 5. Concurrency & Atomicity Strategy

To prevent race conditions between User A and User B requesting the same seat:

1. **Redis Atomic Seat Hold**:
   - Key: `show:{showId}:seat:{seatId}`
   - Value: JSON string with `reservationId`, `userId`, `heldAt`, `expiresAt`
   - Atomic acquisition via Lua script (`SET ... NX PX` semantics):
     ```lua
     -- KEYS[1]: show:{showId}:seat:{seatId}
     -- ARGV[1]: payload JSON
     -- ARGV[2]: TTL in milliseconds
     if redis.call("EXISTS", KEYS[1]) == 0 then
       return redis.call("SET", KEYS[1], ARGV[1], "PX", ARGV[2])
     else
       return nil
     end
     ```
   - If ANY seat in a multi-seat request fails acquisition, all previously acquired seats in the batch are immediately rolled back.

2. **Database Durable Invariant**:
   - The database remains the permanent source of truth.
   - For MongoDB, atomic conditional updates with positional or query filters ensure durability:
     ```javascript
     const result = await Show.findOneAndUpdate(
       {
         _id: showId,
         $or: [
           { [`occupiedSeates.${seatId}`]: { $exists: false } },
           { [`occupiedSeates.${seatId}.status`]: 'HELD', [`occupiedSeates.${seatId}.expiresAt`]: { $lt: new Date() } }
         ]
       },
       {
         $set: {
           [`occupiedSeates.${seatId}`]: {
             status: 'HELD',
             reservationId,
             userId,
             expiresAt
           }
         }
       },
       { new: true }
     );
     ```
   - In relational PostgreSQL schemas, this is enforced by a unique composite constraint `UNIQUE(show_id, seat_id)` on confirmed bookings or row-level `SELECT ... FOR UPDATE` locks.

---

## 6. Expiration & Cleanup Mechanism
* **Dual Expiration Layer**:
  1. **Passive**: When querying availability or attempting a new hold, any existing hold with `expiresAt < now` is treated as `AVAILABLE` and eligible for reclamation.
  2. **Active**: A background reaper (Inngest cron or Redis keyspace notification listener) sweeps expired reservations, publishes `ReservationExpired` domain events, and releases held inventory.
