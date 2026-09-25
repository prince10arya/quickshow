# ADR-004: End-to-End Idempotency for Mutation APIs and Webhooks

## Context
Network timeouts, mobile browser retries, load balancer reconnects, and payment provider retries frequently re-send mutation requests. Without idempotency, duplicate bookings and duplicate charges will occur.

## Decision
All state-mutating endpoints (`POST /api/bookings/create`, `POST /api/reservations/hold`, `POST /api/stripe`) accept and enforce idempotency identifiers (`Idempotency-Key` header or Stripe `event.id`). Results are recorded in an idempotency repository and returned on identical re-invocations without side effects.

## Alternatives Considered
1. **Client-side deduplication only**: Completely vulnerable to client reloads, app restarts, and network drops.
2. **Database unique index alone**: Detects collisions but causes unhandled 500/409 errors on legitimate client retries.

## Trade-offs & Consequences
* **Benefits**: Safe retries for flaky mobile clients and third-party webhook gateways; zero double-charging.
* **Drawbacks**: Requires maintaining an idempotency cache with appropriate TTL (24 hours).
