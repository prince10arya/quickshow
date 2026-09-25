# QuickShow — Production-Grade Agent Memory Architecture

## 1. Architectural Invariant

> **"LLM memory is context. MongoDB application state is truth."**

Generative LLMs are non-deterministic and context-window-bounded. The agent memory architecture establishes a clear separation between:
1. **Transactional Truth**: Movie selections, showtimes, seat reservations, and payment states reside exclusively in MongoDB collections (`booking_sessions`, `bookings`). The LLM cannot mutate application state by text hallucination.
2. **Contextual Memory**: Working memory, recent messages, conversation summaries, user preferences, and semantic memories are retrieved concurrently, sanitized, bounded, and provided to the agent as read-only prompt context.

```text
                         USER MESSAGE
                              │
                              ▼
                     ┌─────────────────┐
                     │ Context Builder │
                     └────────┬────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
     Recent Messages    Booking State     Long-Term Memory
            │                 │                 │
            ▼                 ▼          ┌──────┴───────┐
     Conversation        Current        │              │
       Summary           Booking     Preferences   Semantic
            │                 │        History       Memory
            │                 │          │              │
            └─────────────────┼──────────┴──────────────┘
                              ▼
                       Agent Context
                              │
                              ▼
                         LangGraph
                              │
                              ▼
                         Tool Calls
                              │
               ┌──────────────┼───────────────┐
               │              │               │
               ▼              ▼               ▼
          Tool Result    Booking Update   Agent Events
               │              │               │
               │              │               ▼
               │              │          Frontend UI
               │              │      Activity / Status
               │              │
               └──────────────┘
                       │
                       ▼
                Final Response
                       │
                       ▼
              Persist Assistant Message
```

---

## 2. Seven MongoDB Collections & Tiers

The memory architecture uses MongoDB as the exclusive persistent store. Collections are strictly separated by lifecycle and responsibility:

| Collection | Model | Responsibility | Key Indexes |
| :--- | :--- | :--- | :--- |
| `booking_sessions` | `BookingSession` | Transactional working memory & booking state machine | `{ conversationId: 1 }`, `{ userId: 1, status: 1 }`, `{ expiresAt: 1 }` (TTL: 0s) |
| `messages` | `Message` | Recent message log in chronological order | `{ conversationId: 1, createdAt: -1 }` |
| `conversation_summaries` | `ConversationSummary` | Periodic compression of conversations exceeding threshold | `{ conversationId: 1 }` (unique) |
| `user_preferences` | `UserPreference` | Key-value preferences with source confidence | `{ userId: 1, key: 1 }` (unique compound) |
| `memories` | `Memory` | Long-term semantic, episodic, and factual insights | `{ userId: 1, type: 1 }`, `{ userId: 1, createdAt: -1 }` |
| `agent_events` | `AgentEvent` | Granular tool execution timeline, statuses, and duration | `{ conversationId: 1, createdAt: 1 }` |
| `bookings` | `Booking` | Completed transactions and historical bookings | `{ user: 1, createdAt: -1 }` |

---

## 3. Booking Session State Machine & Optimistic Concurrency

The booking flow is formalized as a deterministic state machine managed by `BookingSessionService` and `BookingSessionRepository`:

```text
BROWSING
   ↓
MOVIE_SELECTED
   ↓
SHOW_SELECTED
   ↓
AVAILABILITY_CHECKED
   ↓
SEATS_SELECTED
   ↓
REVIEW
   ↓
CONFIRMED / CANCELLED / EXPIRED
```

### Cascade Invalidation Rules
When a parent selection changes, dependent state is invalidated in application code:
- **Movie changes**: `showId` cleared, `selectedSeats` emptied, `seatCount = 0`, status becomes `movie_selected`.
- **Show changes**: `selectedSeats` emptied, `seatCount = 0`, status becomes `show_selected`.

### Optimistic Concurrency Control
Concurrent booking mutations (e.g. rapid double-clicks or multiple user devices) are guarded by an integer `version` field:
```typescript
const result = await db.collection("booking_sessions").updateOne(
  { _id: sessionId, version: currentVersion },
  { $set: updates, $inc: { version: 1 } }
);
if (result.matchedCount === 0) {
  throw new ConflictError("Optimistic concurrency conflict on booking session.");
}
```

### Session Expiration
Each session defines `expiresAt: Date` (default 15 minutes). A MongoDB TTL index automatically cleans up stale documents in the background:
```javascript
bookingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```
Application code verifies `expiresAt <= new Date()` before using any session, guaranteeing expired sessions are never resurrected even before MongoDB background TTL collection sweeps.

---

## 4. Context Builder & Intent-Aware Retrieval

`ContextBuilder` aggregates memory slices concurrently using `Promise.all`:

```typescript
const [recentMessages, summaryDoc, bookingState, userPreferences] = await Promise.all([
  messageRepo.getRecentMessages(conversationId, { limit: 20 }),
  summaryRepo.getSummary(conversationId),
  bookingRepo.findActiveByConversation(conversationId),
  userPreferenceRepo.getUserPreferences(userId),
]);
```

### Intent Classification
Memory retrieval is tailored to the query intent:
1. **`booking_action`** ("book 2 seats"): Skips semantic memory retrieval to minimize latency and token overhead.
2. **`recommendation`** ("suggest something I would like"): Retrieves user preferences, past booking history, and semantic memory vectors/keywords.
3. **`history`** ("what did I watch last week?"): Retrieves verified booking records from the `bookings` collection.
4. **`conversation_reference`** ("what was that movie you mentioned earlier?"): Prioritizes conversation summaries and recent messages.

---

## 5. Context Serialization & Token Bounding

`ContextSerializer` sanitizes raw database documents into clean, human-readable Markdown before injecting into the agent's system prompt:

- **Metadata Stripping**: Removes MongoDB internal IDs (`_id`, `__v`), tokens, hashes, and internal timestamps.
- **Strict Bounds**:
  - `MAX_RECENT_MESSAGES`: 20 messages
  - `MAX_SUMMARY_CHARS`: 1,000 characters
  - `MAX_MEMORIES`: 5 items
  - `MAX_MEMORY_CHARS`: 500 characters
  - `MAX_BOOKINGS`: 3 past bookings

Example Serialized Output:
```text
## CURRENT BOOKING SESSION
Status: show_selected
Movie: Interstellar
Show ID: 67bb...
Theatre: QuickShow Cinema Main

## USER PREFERENCES
- preferred_format: IMAX (explicit)
- preferred_genre: sci-fi (explicit)

## CONVERSATION SUMMARY
User searched for evening sci-fi movies and selected Interstellar 8 PM show.

## RECENT CONVERSATION
User: What about Interstellar?
Assistant: Interstellar is playing tonight at 8:00 PM in IMAX!
```

---

## 6. Preferences Precedence & Extraction

`MemoryExtractor` parses completed conversation turns to identify durable user preferences while filtering conversational noise ("ok", "thanks", "sure", "show me"):

- **Precedence Rule**: Explicit user declarations (`source: 'explicit'`) take absolute priority over inferred preferences (`source: 'inferred'`). An inferred preference can never overwrite an existing explicit preference.
- **Logical Identity**: Compound unique index `{ userId: 1, key: 1 }` guarantees zero duplicate preference keys per user.

---

## 7. Semantic Memory & Vector Search Abstraction

Long-term semantic memory is accessed via the `MemoryVectorStore` interface:

```typescript
interface MemoryVectorStore {
  search(params: {
    userId: string;
    embedding: number[];
    limit: number;
  }): Promise<Memory[]>;
}
```

- **Implementation**: `MongoMemoryVectorStore` uses MongoDB Atlas Vector Search (`$vectorSearch` stage in aggregation pipeline).
- **Graceful Fallback**: If Atlas Vector Search index is unconfigured or running on local MongoDB, the store gracefully degrades to user-scoped keyword and recency retrieval without throwing errors or breaking booking flows.
- **Privacy & User Isolation**: All vector and keyword queries require `{ filter: { userId } }`. Cross-user memory contamination is architecturally impossible.

---

## 8. Observability & Structured Logs

The architecture records structured logs with latency measurements to provide full operational visibility:

| Log Event | Description | Key Attributes |
| :--- | :--- | :--- |
| `context_build_started` | Context assembly initiated | `conv`, `user`, `intent` |
| `context_build_completed` | Context assembly finished | `contextBuilderMs`, `msgs`, `summary`, `bookingStatus`, `prefs`, `memories` |
| `memory_retrieval_started` | Long-term memory query started | `user`, `intent`, `query` |
| `memory_retrieval_completed` | Long-term memory query finished | `memoryRetrievalMs`, `retrievedCount` |
| `memory_extraction_started` | Post-response preference extraction started | `user`, `text` |
| `memory_created` | Preference or memory persisted | `key`, `value`, `source` |
| `booking_state_updated` | State machine transition succeeded | `session`, `status`, `version` |
| `booking_state_conflict` | Optimistic concurrency mismatch detected | `session`, `expectedVersion` |
| `summary_updated` | Incremental conversation summary saved | `summaryGenerationMs`, `conv`, `version` |

---

## 9. Error Resilience Invariants

1. **Memory is an Enhancement, Booking is Core**: If memory retrieval, vector search, or summarization encounters an error, the failure is caught and logged. The agent proceeds with empty context rather than failing the user's booking attempt.
2. **Deterministic Tool Updates**: When tools return structured results (e.g. `suggest_contiguous_seats`), the application code deterministically updates the `BookingSession`. The LLM is never tasked with computing database updates.
3. **No CoT Exposure**: Chain-of-thought and private model reasoning are never persisted to messages or memory collections.
