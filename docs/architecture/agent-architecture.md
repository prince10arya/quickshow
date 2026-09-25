# QuickShow — AI Agent & Tool Execution Architecture

## 1. Domain Separation Invariant
The QuickShow AI Concierge acts as a conversational interface and decision assistant. It **never owns business truth** and **never writes directly to database collections**.

```text
User Request: "Book 2 seats for Oppenheimer at 7 PM"
               |
               v
     +-------------------+
     |   AI Agent LLM    |
     | (LangChain Model) |
     +---------+---------+
               | Decides intent & invokes tool
               v
     +-------------------+
     |   Tool Executor   |
     |  (MCP / Adapters) |
     +---------+---------+
               | HTTP / In-Process Call
               v
     +-------------------+
     |  Domain Services  | <--- All Business Rules, Permissions,
     | (Inventory/Shows) |      Atomicity & Validation Enforced HERE
     +---------+---------+
               | Durable Write
               v
     +-------------------+
     | Database / Cache  |
     +-------------------+
```

---

## 2. Tool Classification: Read-Only vs. Mutating

### Read-Only Tools (Safe for Unprompted Execution)
* `list_all_movies`: Lists upcoming and playing movies.
* `list_movies_by_genre`: Filters movies by genre.
* `get_movie_details`: Gets overview, runtime, rating, and cast.
* `search_upcoming_shows`: Finds shows by date and movie ID.
* `check_show_availability`: Queries seat map occupancy stats.
* `suggest_contiguous_seats`: Algorithmic suggestion of adjacent seats.

### Mutating Tools (Side Effects / Transactional Guardrails)
* `hold_seats`: Issues a temporary hold on specific seats.
* `confirm_booking`: Converts a reservation into a confirmed booking upon payment.
* `cancel_booking`: Cancels an existing reservation or booking.

**Safety Rule**: Mutating tools require explicit user confirmation or structured workflow context. The LLM cannot invent transaction IDs or bypass seat validation.

---

## 3. Structured Booking Context (Workflow State)

Instead of relying on unstructured conversational memory, the booking workflow is tracked by a strongly typed `BookingContext`:

```typescript
export type BookingFlowStatus =
  | 'DISCOVERING'
  | 'MOVIE_SELECTED'
  | 'SHOW_SELECTED'
  | 'SEATS_SELECTED'
  | 'AWAITING_CONFIRMATION'
  | 'SEATS_HELD'
  | 'PAYMENT_PENDING'
  | 'BOOKING_CONFIRMED'
  | 'FAILED';

export interface BookingContext {
  movieId?: string;
  movieTitle?: string;
  showId?: string;
  showDateTime?: string;
  seatIds?: string[];
  ticketCount?: number;
  totalAmount?: number;
  reservationId?: string;
  bookingId?: string;
  status: BookingFlowStatus;
  expiresAt?: string;
}
```

The agent emits structured events that drive the frontend stepper and UI cards in real-time.
