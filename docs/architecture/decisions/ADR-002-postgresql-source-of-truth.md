# ADR-002: Durable Database as the Source of Truth

## Context
Redis provides fast in-memory locking and TTL support, but in-memory stores can experience eviction, failover data loss, or cold restarts. Ticket bookings require durable financial and legal audit trails.

## Decision
The primary database (PostgreSQL/MongoDB with ACID transactions and unique composite constraints) remains the **durable source of truth**. Redis acts as an ephemeral holding acceleration layer. Every final booking confirmation and reservation state transition must be durably committed in the database before acknowledgment.

## Alternatives Considered
1. **Redis-only booking state**: Rejected because Redis restart or cluster failover could result in lost bookings and double-sold tickets.
2. **Database-only with pessimistic locking**: Feasible but can saturate database connection pools under viral ticket drops.

## Trade-offs & Consequences
* **Benefits**: Rock-solid consistency, zero lost transactions on cache restarts, full compliance and financial auditability.
* **Drawbacks**: Requires two-phase synchronization: release or confirm in Redis, then persist conditionally in database.
