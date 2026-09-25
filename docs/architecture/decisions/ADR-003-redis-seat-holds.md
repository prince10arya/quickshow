# ADR-003: Redis Atomic Seat Holds with TTL

## Context
When high-demand tickets go on sale, high concurrency on popular seats causes severe database lock contention. An ephemeral fast-lock layer is required to absorb the contention spike.

## Decision
We implement atomic seat holds using Redis key-value pairs formatted as `show:{showId}:seat:{seatId}` with an atomic multi-key Lua script and a 5-minute TTL. An in-memory store adapter is provided as a drop-in replacement when Redis is absent.

## Alternatives Considered
1. **Database row locks (`SELECT FOR UPDATE`)**: High DB CPU and thread pool exhaustion under 1000+ RPS contention.
2. **Pessimistic table locks**: Unacceptable degradation of unrelated shows.

## Trade-offs & Consequences
* **Benefits**: Sub-millisecond atomic hold verification, automatic TTL expiration without database sweeps, scales to tens of thousands of concurrent seat inquiries.
* **Drawbacks**: Requires handling dual-state reconciliation between Redis hold expiration and database records.
