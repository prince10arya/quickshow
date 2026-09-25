# ADR-007: Tiered Agent Memory Architecture & State Separation

## Context
Conversational AI agents in e-commerce and ticketing require both contextual continuity (remembering previous user preferences, past discussions, and recommendations) and absolute transactional consistency (seat selection, showtimes, hold timeouts). Relying on LLM conversational history for transactional state leads to hallucinations, lost context over long sessions, race conditions, and ticket booking corruption.

## Decision
We enforce the foundational invariant:
> **"LLM memory is context. MongoDB application state is truth."**

1. **Working Memory (`booking_sessions`)**: Transactional state is represented as a formal state machine in MongoDB with optimistic concurrency locking (`version`) and automated TTL expiration.
2. **Conversation Memory (`messages`, `conversation_summaries`)**: Recent messages are bounded and chronologically ordered; conversations exceeding threshold ($\ge 10$ messages) are summarized incrementally.
3. **Personal Memory (`user_preferences`, `memories`)**: Explicit preferences take precedence over inferred preferences. Semantic memories are abstracted behind a `MemoryVectorStore` interface using MongoDB Atlas Vector Search with automatic fallback to keyword matching.
4. **Strict User Scoping**: 100% of memory queries are strictly filtered by authenticated `userId`.
5. **Observability (`agent_events`)**: Tool executions, durations, and state transitions are streamed in real time via SSE and persisted to MongoDB.

## Alternatives Considered
1. **Relying entirely on LLM conversation history**: Fails when conversations exceed token limits and permits prompt injection / state hallucination.
2. **Introducing an external Vector DB (Pinecone, Qdrant, Chroma, pgvector)**: Introduces unnecessary operational complexity, synchronization overhead, and additional failure modes. MongoDB Atlas Vector Search satisfies requirements natively within the existing database.
3. **Single monolithic "memories" collection**: Conflates ephemeral session state with durable preferences, preventing optimistic concurrency and TTL lifecycle management.

## Trade-offs & Consequences
* **Benefits**: Zero transactional hallucination, strict concurrency safety, bounded token costs, full auditability via `agent_events`, user data isolation.
* **Drawbacks**: Requires explicit state machine transition checks and cascade invalidation logic in application services.
