# ADR-001: Modular Monolith Architecture

## Context
QuickShow requires distinct domain separation across catalog, show scheduling, inventory management, reservations, bookings, payments, and AI agent coordination. Splitting immediately into multiple microservices introduces significant operational overhead (distributed deployment, RPC network latency, distributed transactions, partial failures).

## Decision
We adopt a **modular monolith** architecture. Domain boundaries (`catalog`, `shows`, `inventory`, `reservation`, `booking`, `payment`, `ticket`, `agent`, `events`) are implemented within the same application codebase with clean internal interfaces.

## Alternatives Considered
1. **Microservices from day 1**: Rejected due to premature complexity and unnecessary infrastructure cost.
2. **Unstructured single-tier monolith**: Rejected because tangled business logic across controllers causes regression risks and inhibits testing.

## Trade-offs & Consequences
* **Benefits**: Single repository, unified database migrations, zero network serialization between domains, simpler atomic transactions, frictionless local development.
* **Drawbacks**: Requires discipline to prevent direct cross-module coupling; requires strict enforcement of internal service interfaces.
