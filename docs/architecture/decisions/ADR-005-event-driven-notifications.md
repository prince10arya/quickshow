# ADR-005: Decoupled Event-Driven Domain Notifications

## Context
When a ticket booking completes, downstream tasks (email confirmations, SMS alerts, analytics ingestion, loyalty points) must be triggered. Tying these directly into the checkout response slows latency and creates failure cascades if third-party notification APIs fail.

## Decision
We implement a decoupled domain event model using an `EventBus` interface. On booking confirmation, the domain publishes `BookingConfirmed`. Notification workers subscribe to this event and execute asynchronously outside the HTTP request-response cycle.

## Alternatives Considered
1. **Synchronous in-handler email sending**: Blocks HTTP response for 500–2000ms and fails the booking if SMTP/Resend is down.
2. **Heavy distributed broker (Kafka/RabbitMQ)**: Overkill for immediate monolithic deployment; can be plugged in later behind the `EventBus` interface.

## Trade-offs & Consequences
* **Benefits**: Sub-100ms checkout confirmation responses, total resilience against notification failures, clean event-driven extensibility.
* **Drawbacks**: Notification errors must be monitored independently via dead-letter logging or retry queues.
