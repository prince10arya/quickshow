# QuickShow — Concurrency & High-Contention Strategy

## 1. The High-Contention Problem
When a blockbuster movie opens ticket sales, hundreds or thousands of users concurrently request the same seats (e.g. Center Row G, seats 10–14) within the same second.

A standard "Read-Then-Write" pattern:
```javascript
const show = await Show.findById(showId);
if (!show.occupiedSeates[seatId]) {
  show.occupiedSeates[seatId] = userId;
  await show.save();
}
```
fails under concurrency. Both requests read `occupiedSeates[seatId] == null`, and both attempt to write, resulting in double-booking or lost updates.

---

## 2. Multi-Layer Concurrency Defense

```text
               100 Simultaneous Requests for Seat G12
                                |
                                v
               [ Layer 1: In-Memory / Redis Hold ]
               Atomic Lua Script (SETNX with 5-min TTL)
                                |
                   +------------+------------+
                   |                         |
         1 Succeeded (G12 Acquired)    99 Rejected (Already Held)
                   |                         |
                   v                         v
       [ Layer 2: Durable DB Lock ]      HTTP 409 Conflict:
       Conditional Atomic Update         "Seat G12 is currently held.
       (ShowSeat status=AVAILABLE)        Please select another seat."
                   |
                   v
         Reservation Confirmed
```

---

## 3. Atomic Multi-Seat Hold Lua Script
When reserving multiple seats (e.g. G12, G13, G14), the hold must be all-or-nothing:

```lua
-- Input:
-- KEYS: array of seat keys (e.g. ['show:101:seat:G12', 'show:101:seat:G13'])
-- ARGV[1]: JSON string payload with reservationId and userId
-- ARGV[2]: TTL in milliseconds (e.g. 300000 = 5 min)

-- Step 1: Check all keys are free
for i, key in ipairs(KEYS) do
  if redis.call("EXISTS", key) == 1 then
    return 0 -- Contention detected!
  end
end

-- Step 2: Acquire all keys atomically
for i, key in ipairs(KEYS) do
  redis.call("SET", key, ARGV[1], "PX", ARGV[2])
end

return 1 -- Success!
```

If the script returns `0`, zero seats are modified.

---

## 4. Fallback In-Memory Locking Adapter
When Redis is not configured or during local test execution, an atomic `MemorySeatHoldStore` with mutex semantics reproduces identical atomic behavior without external infrastructure dependencies.
