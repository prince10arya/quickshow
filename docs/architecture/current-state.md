# QuickShow — Current State Architectural Audit

## Executive Summary
QuickShow is an AI-powered movie discovery and ticket-booking application modeled after platforms like BookMyShow. It features a React 19 + Vite frontend, an Express 5 backend with MongoDB (Mongoose), an Inngest background event processor, a Model Context Protocol (MCP) cinema tools service, and a LangChain-powered conversational booking concierge with Server-Sent Events (SSE) streaming and token-budget governance.

This audit evaluates the system across all tiers to establish the baseline before evolving it into a production-grade, highly concurrent, idempotent, event-driven ticketing architecture.

---

## Current Architecture

```text
                                  +------------------------------------+
                                  |         Browser Client             |
                                  |  (React 19 + Vite + Tailwind CSS)  |
                                  +------------------+-----------------+
                                                     |
                                    REST & SSE /api  |
                                                     v
                                  +------------------------------------+
                                  |       Express 5 Gateway (:3000)    |
                                  |   (Routes, JWT Auth, Middlewares)  |
                                  +---------+----------------+---------+
                                            |                |
                       +--------------------+                +--------------------+
                       |                                                          |
                       v                                                          v
        +------------------------------+                           +------------------------------+
        |   Core Domain Controllers    |                           |      Chat & Agent Layer      |
        | - show.controller.js         |                           | - chat.controller.js         |
        | - booking.controller.js      |                           | - agent.factory.js           |
        | - auth.controller.js         |                           | - streamHandler.js           |
        | - stripewebhooks.controller  |                           | - budget.service.js          |
        +--------------+---------------+                           +--------------+---------------+
                       |                                                          |
                       | Mongoose Queries                                         | Tool Invocations
                       |                                                          | (HTTP/SSE or STDIO)
                       v                                                          v
        +------------------------------+                           +------------------------------+
        |     MongoDB / Mongoose       |                           |  MCP Tools Service (:3002)   |
        | - Movie, Show, Booking,      |                           | - list_all_movies            |
        |   User, ChatConversation,    |                           | - list_movies_by_genre       |
        |   AiUsage                    |                           | - get_movie_details          |
        +--------------+---------------+                           | - search_upcoming_shows      |
                       ^                                           | - check_show_availability    |
                       | Mongoose Queries                          | - suggest_contiguous_seats   |
                       |                                           | - prepare_booking_summary    |
                       +-------------------------------------------+------------------------------+
                                                                                  |
                                                                                  v
                                                                   +------------------------------+
                                                                   |       External LLM API       |
                                                                   | (OpenRouter / Groq / Ollama) |
                                                                   +------------------------------+
```

---

## Detailed Component Audit

### 1. Repository Structure & Workspace
* `client/`: React 19 frontend built with Vite, Tailwind CSS v4, Lucide icons, Framer Motion, Keen Slider.
* `server/`: Express 5 application hosting REST endpoints, SSE streams, Inngest handlers, Stripe webhooks, and LangChain agent runtime.
* `mcp-tools-service/`: Standalone Model Context Protocol microservice exposing read-only and booking-summary tools via `@modelcontextprotocol/sdk` over SSE (`:3002/sse`) and STDIO fallback.
* `docs/`: System documentation, HTML/JSON interactive architecture diagrams.
* `docker-compose.yml`: Minimal Docker compose running client dev server.

### 2. Frontend Architecture
* **State Management**: React context (`AppContext.jsx`) holds user tokens, user session state, and global axios instance. Chat state is managed by `useChatStream.js` hook with `eventReducer.js` reducing agent streaming events into message history, tool activities, thinking steps, and stepper progress.
* **Streaming & Reactive UI**: Connects to `POST /api/chat/stream` via `fetch` reader. Parses SSE payloads (`token`, `tool_start`, `tool_end`, `ui`, `done`, `error`) and updates UI progressively.
* **Component Modularity**: High quality components for chat (`BookingAssistant.jsx`, `ChatMessageList.jsx`, `BookingProgress.jsx`, `AgentThinking.jsx`). Generative widgets exist for movie grids, showtimes, and booking summary review cards.
* **Current Limitation**: Checkout from chat triggers direct POST `/api/bookings/create` bypassing any reservation hold step. Seat layout in `SeatLayout.jsx` relies on poll/fetch to `/api/bookings/seats/:showId`.

### 3. Backend Architecture & API Routes
* `routes/auth.routes.js`: Registration, login, token refresh, logout, `/me`.
* `routes/show.routes.js`: Public upcoming shows (`/all`), single movie shows (`/:movieId`), admin show creation (`/addshow`), now playing (`/nowshowing`).
* `routes/booking.routes.js`: Booking creation (`/create`), occupied seats check (`/seats/:showId`), dummy payment confirm (`/confirm-dummy/:bookingId`).
* `routes/chat.routes.js`: SSE streaming (`/stream`), synchronous fallback (`/message`), conversation history (`/conversation`), reset (`/new`).
* `routes/admin.routes.js`: Dashboard statistics, all bookings, all shows.
* `routes/user.routes.js`: User bookings, booking history, favorites.
* `stripewebhooks.controllers.js`: Listens to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.expired`.

### 4. Database Schema & ORM Layer
* **Storage Engine**: MongoDB via Mongoose ODM.
* **Models**:
  * `Movie`: TMDb/IMDb movie metadata, genres, cast, backdrop paths, runtime, rating.
  * `Show`: References `Movie`, contains `showDateTime`, `showPrice`, and `occupiedSeates` (Mongoose object mapping seat IDs to user IDs).
  * `Booking`: References `User` and `Show`, contains `amount`, `bookedSeates` (array), `isPaid` (boolean), `paymentLink`, and `expiresAt`.
  * `User`: Name, email, hashed password, role (`user` | `admin`), favorites array.
  * `ChatConversation`: User or guest chat messages and draft summary.
  * `AiUsage`: Monthly token spend tracking against cost budget.

### 5. Authentication & Security
* **JWT Access + Refresh Token flow**: Access token in `Authorization: Bearer <token>`, refresh token stored in `httpOnly` strict cookie.
* **Middleware**: `protect` checks access token validity and unpacks `sub` and `role`. `optionalProtect` allows guest users to query chat while attaching user ID when present. `protectAdmin` restricts administrative endpoints.
* **Password Hashing**: `bcryptjs` with salt rounds = 10.
* **Security Gap**: Sensitive monetary values like `amount` are calculated in controllers, but booking mutations lack idempotency keys and seat holds lack race condition isolation.

### 6. AI Agent Implementation & Tool Execution Flow
* **Framework**: LangChain (`createAgent` with `@langchain/openai`, `@langchain/ollama`, or `@langchain/groq`).
* **MCP Integration**: `mcpClient.js` connects to `mcp-tools-service` over SSE (`http://localhost:3002/sse`) or spawns child process with STDIO transport (`--stdio`).
* **Tools Defined**:
  1. `list_all_movies`: Lists upcoming/now-playing movies.
  2. `list_movies_by_genre`: Filters movies by genre.
  3. `get_movie_details`: Retrieves synopsis, cast, and rating.
  4. `search_upcoming_shows`: Finds showtimes by date and movie.
  5. `check_show_availability`: Returns seat occupancy stats.
  6. `suggest_contiguous_seats`: Finds N contiguous seats on a show.
  7. `prepare_booking_summary`: Builds a verified ticket summary with total amount for review.
* **Agent Safety**: The existing agent tools are strictly read-only or read-and-format. The agent cannot directly reserve or purchase seats or modify balances. This adheres directly to Rule 9.

### 7. Observability, Logging & Error Handling
* **Error Classes**: `AppError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `TooManyRequestsError`, `ServiceUnavailableError`.
* **Middlewares**: `notFoundHandler` (404) and `globalErrorHandler` (formats AppErrors, Mongoose duplicate key/validation errors, JWT errors).
* **Observability**: `@lmnr-ai/lmnr` installed in `package.json` for Laminar tracing. Structured logging exists in chat controllers with console prefixes (`[Server:Chat]`, `[Server:MCPClient]`).

---

## What Already Exists & Works Well (To Be Reused)

1. **Authentication Layer**: JWT access and refresh token authentication with bcrypt and cookies is well-structured and functional.
2. **Error Handling Framework**: `AppError` hierarchy, centralized `globalErrorHandler`, and domain error categorization are clean and easily extensible.
3. **MCP Tool Architecture**: LangChain MCP client (`mcpClient.js`) with SSE + STDIO dual transport fallback works reliably.
4. **SSE Streaming Flow**: Agent token streaming and widget dispatching (`token`, `tool_start`, `tool_end`, `ui`, `done`) are well integrated with client reducer.
5. **Client Chat & Widget UX**: Booking progress stepper, thinking indicators, movie cards, and summary widgets provide a strong interactive foundation.
6. **Cost Governance**: `budget.service.js` with monthly USD caps and token usage reservation protects against runaway LLM costs.

---

## What Should Be Refactored

1. **Transactional Boundary Violations**:
   - `booking.controller.js` currently reads availability, creates a booking, updates `occupiedSeates` on the show document, and schedules an in-memory `setTimeout` all within standard async handler calls without ACID transactions or atomic locks.
   - Concurrency risk: Two users requesting seat "A1" simultaneously will both see it available and race to overwrite `occupiedSeates`.
2. **Volatile In-Memory Timeouts**:
   - `setTimeout(() => releaseSeats(bookingId), PAYMENT_TIMEOUT_MS)` does not survive server restarts, multi-instance scale-outs, or crashes.
3. **Destructive Seat Release**:
   - `releaseSeats` calls `await booking.deleteOne()`, permanently destroying audit records of abandoned or expired reservations.
4. **Lack of Reservation Domain**:
   - Currently, a pending booking directly occupies the seat in `Show.occupiedSeates`. There is no separate `Reservation` entity representing a temporary hold versus a confirmed booking.
5. **Absence of Idempotency**:
   - Neither `createBooking` nor Stripe webhook handling verifies idempotency keys or event delivery identifiers. Duplicate network calls create duplicate bookings or unhandled conflicts.

---

## What Is Missing for Production-Grade Ticketing

1. **Explicit Seat State Machine**:
   - Formal states: `AVAILABLE -> HELD -> BOOKED` and `HELD -> AVAILABLE` (expiry/cancellation).
   - Strict rejection of invalid transitions (`BOOKED -> AVAILABLE` without refund/admin action).
2. **Atomic Seat Holding (Redis + Durable DB)**:
   - Atomic reservation mechanism (Lua scripts / Redis atomic transactions) ensuring that high-concurrency requests cannot double-hold seats.
   - Durable consistency in the database using conditional updates and unique compound constraints (`showId + seatId`).
3. **Reservation Domain & Timed Expiration**:
   - Dedicated `Reservation` entity with `status`, `expiresAt`, `userId`, `showId`, `seatIds`.
   - Durable expiration scheduler (Inngest / Redis Keyspace Notifications / scheduled cleanup worker).
4. **Idempotency Engine**:
   - Persisted idempotency storage tracking key, method, path, request hash, response status, and response body.
5. **Decoupled Event Bus & Domain Events**:
   - `DomainEvent` abstraction (`ReservationHeld`, `ReservationExpired`, `PaymentSucceeded`, `BookingConfirmed`, `BookingCancelled`).
   - In-memory event bus with pluggable interface for outbox pattern and message queues.
6. **Comprehensive Concurrency & Failure Test Suites**:
   - Tests validating 100 concurrent requests for the same seat, duplicate webhooks, network retries, and hold expirations.

---

## Architectural Risks & Technical Debt

| Area | Current Risk | Impact | Target Remediation |
| :--- | :--- | :--- | :--- |
| **Seat Contention** | Read-then-write race condition in `createBooking` | Double-booking high-demand shows | Atomic Redis hold with Lua script + DB conditional update |
| **Timeout Durability** | `setTimeout` in Node.js process memory | Holds never released if process restarts | Durable TTL via Redis expiration and Inngest/background reaper |
| **Idempotency** | No idempotency key support on booking or webhooks | Duplicate charges, duplicate ticket generation on network retries | Idempotency middleware & webhook deduplication ledger |
| **Data Loss on Expiry** | `releaseSeats` calls `booking.deleteOne()` | Loss of conversion metrics, financial audit trail | Mark status `EXPIRED` / `CANCELLED`; preserve record |
| **Tight Coupling** | Controllers directly mutate documents across domains | Difficult to test and reason about state transitions | Modular monolith with domain boundaries (`catalog`, `shows`, `inventory`, `reservation`, `booking`, `payment`, `events`) |

---

## Recommended Migration Sequence

* **Phase 1: Foundation & Modular Architecture**
  - Establish domain modules (`catalog`, `shows`, `inventory`, `reservation`, `booking`, `payment`, `ticket`, `events`).
  - Introduce core domain event bus and idempotency infrastructure.
* **Phase 2: Inventory & Seat State Machine**
  - Implement explicit `AVAILABLE`, `HELD`, `BOOKED` state machine.
  - Implement Redis atomic hold service with Lua script.
  - Implement database conditional atomic locking as durable source of truth.
* **Phase 3: Reservation Domain & Expiration**
  - Implement `Reservation` model and service with configurable TTL (e.g. 5–10 minutes).
  - Implement background hold release worker ensuring expired seats return to inventory cleanly.
* **Phase 4: Booking & Payment State Machines**
  - Implement `Booking` state transitions (`PENDING`, `PAYMENT_PENDING`, `CONFIRMED`, `FAILED`, `CANCELLED`).
  - Implement idempotent Stripe webhook processing and dummy payment reconciliation.
* **Phase 5: Event-Driven Decoupling**
  - Publish domain events on state transitions (`ReservationHeld`, `BookingConfirmed`, etc.).
  - Decouple notifications and analytics from synchronous booking paths.
* **Phase 6: AI Agent Integration**
  - Add strongly typed, safe transactional tools (`hold_seats`, `get_reservation_status`) while keeping read-only discovery tools intact.
  - Maintain structured booking flow state without letting the LLM mutate database records directly.
* **Phase 7: Testing & Verification**
  - Automated concurrency stress tests (100 simultaneous holds on the same seat).
  - Idempotency retry tests for clients and webhooks.
  - Seat hold expiration and cancellation tests.
* **Phase 8: Documentation & ADRs**
  - Document all state machines, failure scenarios, and architectural decision records (ADRs).
