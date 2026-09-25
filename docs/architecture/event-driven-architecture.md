# QuickShow — Event-Driven Architecture Specification

## 1. Motivation
In a cinema ticketing platform, booking confirmation must be blazingly fast and rock-solid. Secondary concerns—such as sending confirmation emails, generating SMS/WhatsApp notifications, streaming real-time analytics, or updating recommendation engines—must not sit in the critical synchronous transaction path.

If an email server is slow or down, the user's booking must still succeed.

---

## 2. Event Model & Contract

Every domain event adheres to a standard contract:

```typescript
export interface DomainEvent<T = Record<string, unknown>> {
  id: string;               // Unique event ID (UUID v4)
  name: string;             // e.g. "BookingConfirmed"
  timestamp: string;        // ISO 8601 UTC
  correlationId?: string;   // Trace / Request ID
  aggregateId: string;      // e.g. bookingId or reservationId
  payload: T;               // Strongly typed event details
}
```

### Core Domain Events

| Event Name | Aggregate | Trigger Condition | Consumers |
| :--- | :--- | :--- | :--- |
| `ReservationHeld` | Reservation | User/Agent holds seats | Expiration timer scheduler, Analytics |
| `ReservationExpired` | Reservation | Hold TTL expires without payment | Inventory release listener, Analytics |
| `ReservationCancelled`| Reservation | User cancels hold explicitly | Inventory release listener |
| `PaymentSucceeded` | Payment | Stripe/Gateway captures payment | Booking confirmation service |
| `PaymentFailed` | Payment | Gateway reports failed payment | Booking failure handler, Inventory release |
| `BookingConfirmed` | Booking | Booking transitioned to `CONFIRMED` | Ticket generation, Email worker, Push alerts |
| `BookingCancelled` | Booking | Booking cancelled / refunded | Seat release, Accounting notification |

---

## 3. EventBus Interface

```typescript
export interface IEventBus {
  publish<T>(event: DomainEvent<T>): Promise<void>;
  subscribe<T>(eventName: string, handler: (event: DomainEvent<T>) => Promise<void>): void;
}
```

### In-Memory Adapter with Outbox Extensibility
During Phase 1–5, an `InMemoryEventBus` is utilized to decouple domain services without adding external Kafka/RabbitMQ operational complexity.

For production durability under high distributed scale:
- Critical events are written to an `outbox_events` table inside the same database transaction.
- An outbox worker tails the table and publishes events to Redis Streams or Apache Kafka.
