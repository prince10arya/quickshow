# QuickShow — Production Observability & Telemetry

## 1. Overview
Production-grade ticketing demands complete visibility into seat contention, checkout latency, payment failure rates, and agent tool execution metrics. Every transaction carries end-to-end correlation IDs across the client, API gateway, domain services, and background workers.

---

## 2. Correlation & Tracing Headers
Every HTTP request generates or propagates:
* `X-Request-ID`: Unique UUID v4 for the HTTP request lifecycle.
* `X-Correlation-ID`: Trace identifier propagating across async workflows and domain events.
* `X-Session-ID`: Client browser session identifier.

---

## 3. Structured Logging Standard
All logs emit JSON-compatible structured objects:

```json
{
  "timestamp": "2026-09-23T14:15:00.123Z",
  "level": "info",
  "event": "seat_hold_created",
  "traceId": "trace_a91b2c3d",
  "requestId": "req_847192",
  "userId": "user_64d8a2b...",
  "showId": "66e85d4bf591a27e02dfaa12",
  "seatIds": ["G12", "G13"],
  "reservationId": "res_918237",
  "durationMs": 14.2
}
```

---

## 4. Key Metrics to Measure
1. **Seat Contention Rate**: Number of 409 Conflict responses per show / per minute.
2. **Hold-to-Booking Conversion**: Ratio of `ReservationHeld` to `BookingConfirmed`.
3. **Hold Expiry Rate**: Ratio of held seats that expire without purchase.
4. **Payment Gateway Latency & Error Rate**: Time spent waiting on Stripe checkout or webhook arrival.
5. **Agent Tool Latency**: Execution duration and error rate for each MCP tool call.
