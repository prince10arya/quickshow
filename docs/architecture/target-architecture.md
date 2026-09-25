# QuickShow — Target Modular Monolith Architecture

## 1. Architectural Philosophy
The target architecture evolves QuickShow into a **production-grade modular monolith**. Rather than creating premature microservice overhead (network latency, distributed transaction complexities, deployment operational burdens), we enforce strict domain boundaries internally. Each domain module encapsulates its own data access, business policies, and service interfaces.

Extraction into standalone microservices is deferred until tangible scaling or independent deployment constraints justify the operational cost.

---

## 2. Logical Target Architecture Diagram

```text
                                QuickShow Web Client
                         (React 19 + Vite + Tailwind CSS)
                                        |
                                        v
                                API / BFF Gateway
                          (Authentication, Rate Limiting,
                           Idempotency, Trace Correlation)
                                        |
                      +-----------------+-----------------+
                      |                                   |
                      v                                   v
             AI Agent Layer (Concierge)             REST API Layer
            - LangChain Orchestrator              - Shows / Catalog
            - Budget & Cost Guard                 - Seat Layout
            - Tool Executor                       - Checkout / Payments
                      |                                   |
                      +-----------------+-----------------+
                                        |
                                        v
                            Domain Service Interfaces
                                        |
        +---------------+---------------+---------------+---------------+
        |               |               |               |               |
        v               v               v               v               v
  Catalog Domain  Shows Domain   Inventory Domain  Reservation     Booking Domain
  - Movies        - Theaters     - Seat Map        Domain          - Booking State
  - Genres        - Screens      - ShowSeats       - Holds (TTL)   - Line Items
  - Search        - Showtimes    - Redis Holds     - Expiry Reap   - Confirmation
        |               |               |               |               |
        +---------------+---------------+---------------+---------------+
                                        |
                                        +-------------------------------+
                                        |                               |
                                        v                               v
                                  Payment Domain                  Ticket Domain
                                  - Stripe Checkout               - Digital Pass
                                  - Webhooks (Idempotent)         - QR Code Token
                                  - Reconciliation                - Verification
                                        |
                                        v
                                In-Memory Event Bus
                           (DomainEvent Publisher/Subscriber)
                        +---------------+---------------+
                        |               |               |
                        v               v               v
                Email Notification   Push Alerts    Analytics &
                   (Async Worker)   (Async Worker)   Audit Logs
```

---

## 3. Domain Modules & Internal Boundaries

```text
src/ (or server/modules/)
  ├── catalog/
  │   ├── application/     # Movie query handlers, search services
  │   └── domain/          # Movie entities, genre specifications
  ├── shows/
  │   ├── application/     # Showtime scheduling, upcoming show queries
  │   └── domain/          # Theater, Screen, Show entities
  ├── inventory/
  │   ├── application/     # Availability queries, contiguous seat recommendations
  │   ├── domain/          # Seat, ShowSeat, SeatStatus ('AVAILABLE'|'HELD'|'BOOKED')
  │   └── infrastructure/  # Redis atomic hold scripts, DB seat updates
  ├── reservation/
  │   ├── application/     # HoldSeatsCommand, ReleaseHoldCommand
  │   └── domain/          # Reservation entity, hold lifecycle, TTL policies
  ├── booking/
  │   ├── application/     # CreateBookingCommand, ConfirmBookingCommand
  │   └── domain/          # Booking entity, booking state machine
  ├── payment/
  │   ├── application/     # CreatePaymentIntent, ProcessWebhook
  │   └── domain/          # PaymentTransaction entity, gateway adapter
  ├── ticket/
  │   └── application/     # GenerateTicket, VerifyTicketPass
  ├── events/
  │   └── domain/          # EventBus interface, DomainEvent definitions
  └── agent/
      ├── tools/           # Strongly typed MCP and LangChain tools
      └── context/         # Structured BookingContext state machine
```

---

## 4. Key Architectural Invariants

1. **Separation of LLM from Business Truth**:
   The AI agent has zero direct database write permissions. Every state mutation (e.g. holding a seat, creating a checkout session) must be executed by invoking a domain service API.
2. **Double-Holding Prevention**:
   Seats are protected by a two-tier holding strategy:
   - Tier 1: In-memory atomic hold via Redis with 5-minute TTL.
   - Tier 2: Conditional updates with unique composite constraints in durable storage.
3. **Idempotency by Default**:
   All mutation endpoints accept an `Idempotency-Key` header. Duplicate attempts return the cached outcome without re-executing business logic.
4. **Asynchronous Non-Critical Path**:
   Ticket issuance notifications (email, push, analytics) subscribe to domain events (`BookingConfirmed`) and execute asynchronously without blocking checkout or risking payment rollbacks.
