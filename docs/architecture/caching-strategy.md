# QuickShow — Caching Strategy

## 1. Overview
Caching is applied strategically to high-read, low-mutation catalog endpoints while strictly avoiding caching in correctness-critical transaction paths.

---

## 2. Cache Categorization

| Domain Data | Read/Write Ratio | Cache Strategy | TTL | Invalidation Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **Movie Catalog** (`/api/shows/all`) | 1000 : 1 | Cache-aside | 30 minutes | Admin adds or modifies movie |
| **Movie Details** (`/api/shows/:id`) | 500 : 1 | Cache-aside | 1 hour | Movie update |
| **Show Metadata** (Date/Times) | 100 : 1 | Cache-aside | 10 minutes | Admin adds showtime |
| **Seat Map Availability** | 50 : 1 | Short TTL / Realtime Redis | 2 seconds | Seat hold / Booking confirmed |
| **Reservations & Payments** | Transactional | **NO CACHE** | 0s | Must always query source of truth |

---

## 3. Cache Invalidation Patterns
1. **Time-To-Live (TTL)**: Primary defense against stale catalog entries.
2. **Event-Driven Purge**: When an admin updates a show or adds movie metadata, an event triggers eviction of related cache keys.
