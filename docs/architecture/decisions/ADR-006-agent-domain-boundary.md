# ADR-006: AI Agent and Transactional Domain Boundary

## Context
Generative AI models and LLM agents are non-deterministic. Allowing an LLM prompt or agent script to directly write to ticket booking databases, manipulate seat statuses, or bypass authorization rules exposes the system to prompt injection, hallucinated transactions, and financial discrepancies.

## Decision
The AI agent is strictly relegated to an intent-recognition and tool-dispatching layer. The agent **NEVER** interacts directly with database models or performs raw updates. All transactional actions (`hold_seats`, `confirm_booking`) are executed via backend domain services that strictly enforce authentication, seat availability, price computation, and business rules.

## Alternatives Considered
1. **Agent direct DB access (Function Calling with DB queries)**: Catastrophic security and data integrity risk.
2. **Hardcoded chatbot without agentic capabilities**: Lacks flexibility for multi-turn conversational discovery and flexible seat recommendations.

## Trade-offs & Consequences
* **Benefits**: 100% deterministic transaction safety, defense against prompt injection, strict auditability, reusable domain services across web and mobile.
* **Drawbacks**: Requires strongly typed MCP and tool schemas with thorough validation.
