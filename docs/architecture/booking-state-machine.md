# QuickShow — Booking State Machine Specification

## 1. Overview
The Booking entity tracks customer orders from initial checkout intent to fulfillment or cancellation. It establishes a formal boundary between customer commitments, payment gateways, and inventory allocation.

---

## 2. Booking State Transitions

```text
                               +-------------------+
                               |      PENDING      |
                               +---------+---------+
                                         |
                                         | 1. createPaymentIntent()
                                         v
                               +-------------------+
                               |  PAYMENT_PENDING  |
                               +----+---------+----+
                                    |         |
                   2. paymentSuccess|         | 3. paymentFailed / expired
                                    v         v
                         +-------------+   +-------------+
                         |  CONFIRMED  |   |   FAILED    |
                         +------+------+   +-------------+
                                |
                                | 4. refundRequested()
                                v
                         +---------------+
                         | REFUND_PENDING|
                         +-------+-------+
                                 |
                                 | 5. refundConfirmed()
                                 v
                         +---------------+
                         |   REFUNDED    |
                         +---------------+
```

---

## 3. State Transition Matrix

| Current State | Event / Trigger | Target State | Actions & Side Effects |
| :--- | :--- | :--- | :--- |
| `PENDING` | `initiatePayment` | `PAYMENT_PENDING` | Generates gateway checkout session URL. |
| `PAYMENT_PENDING` | `paymentSucceeded` (webhook) | `CONFIRMED` | Confirms seat inventory (`BOOKED`), creates `Ticket`, publishes `BookingConfirmed`. |
| `PAYMENT_PENDING` | `paymentFailed` / timeout | `FAILED` | Releases held seats (`AVAILABLE`), publishes `BookingFailed`. |
| `CONFIRMED` | `requestRefund` (Admin) | `REFUND_PENDING` | Submits refund instruction to Stripe gateway. |
| `REFUND_PENDING` | `chargeRefunded` (webhook) | `REFUNDED` | Releases seats to inventory (or flags as refunded), publishes `BookingRefunded`. |
| `CONFIRMED` | `cancelBooking` | `CANCELLED` | Explicit user cancellation before cutoff. Releases seats. |

---

## 4. Invariants & Rules

1. **Terminal States**: `CONFIRMED` (unless refunded), `FAILED`, and `REFUNDED` are final states. Once `CONFIRMED`, a booking cannot transition to `FAILED`.
2. **Double Webhook Protection**: If a `paymentSucceeded` event arrives for a booking already in `CONFIRMED` status, the transition handler executes as an idempotent no-op and returns HTTP 200.
3. **No Direct Frontend Status Updates**: The frontend cannot alter booking statuses. Only verified backend domain services and cryptographic webhook signature verifiers can trigger transitions.
