# QuickShow — Payment Failure & Anomaly Handling

## 1. Overview
Payment gateways are distributed, external third-party systems that can fail, timeout, or deliver messages out of order. QuickShow treats payment processing as inherently non-atomic with database transactions and implements resilient reconciliation strategies.

---

## 2. Failure Scenarios and Recovery Strategies

### Scenario 1: Payment Succeeds, Booking Succeeds
* **Path**: User pays on Stripe -> Webhook `checkout.session.completed` arrives with signature -> Booking marked `CONFIRMED` -> Seats marked `BOOKED` -> Ticket issued.
* **Guarantee**: Clean completion under normal network conditions.

### Scenario 2: Payment Fails or Cancelled by User
* **Path**: User payment card declined or checkout abandoned -> Stripe sends `checkout.session.expired` or frontend cancel url hit.
* **Recovery**:
  1. Booking status marked `FAILED`.
  2. Inventory hold released back to `AVAILABLE`.
  3. Redis hold key deleted.
  4. User is shown a descriptive reason and prompted to select alternative seats.

### Scenario 3: Payment Times Out (Network Disconnection)
* **Path**: User enters credentials, but browser disconnects or mobile loses connectivity during 3D Secure verification.
* **Recovery**:
  - The seat hold has an explicit TTL (e.g. 5 minutes).
  - If payment succeeds on the bank's side, Stripe's background webhook will still reach QuickShow's `/api/stripe` endpoint.
  - If payment does not complete within the hold TTL, the session expires naturally, and the hold is reclaimed by the system.

### Scenario 4: Payment Succeeds, but QuickShow Server Crashes Before Processing
* **Path**: Stripe captures funds, but QuickShow server crashes while handling the webhook.
* **Recovery**:
  - Stripe retries webhooks with exponential backoff over several days until an HTTP 2xx is received.
  - Upon server restart, the retried webhook is received, signature verified, and the booking is confirmed.
  - Additionally, a background reconciliation cron queries Stripe for any `paid` checkout sessions without matching `CONFIRMED` bookings.

### Scenario 5: Duplicate Webhook Delivery
* **Path**: Stripe sends the same `checkout.session.completed` event multiple times due to gateway retries.
* **Recovery**:
  - **Idempotency Ledger**: An `idempotency_keys` collection tracks processed `eventId`s (e.g., `evt_1Nz...`).
  - If `eventId` is already present, QuickShow immediately returns `HTTP 200 { received: true }` without re-executing booking confirmation, avoiding duplicate ticket generation.

### Scenario 6: Webhook Arrives After Hold Expiration
* **Path**: Severe network delay causes the webhook to arrive after the 5-minute hold TTL elapsed, and the seat was subsequently reserved by another user.
* **Recovery**:
  1. Domain service checks seat availability before confirmation.
  2. If the seat has been acquired by User B, the system flags the booking as `CONCURRENCY_CONFLICT_REFUND_REQUIRED`.
  3. An automated refund is immediately initiated via Stripe API for the original customer.
  4. An alert/notification is sent to the user explaining the rare race condition and confirming their full refund.

---

## 3. Idempotent Webhook Processing Flowchart

```text
Stripe Webhook Event
        |
        v
Validate Stripe-Signature Header
        |
        +---> [Invalid] ---> 400 Bad Request
        |
        v [Valid]
Check if event.id already processed (Idempotency Key)
        |
        +---> [Already Processed] ---> 200 OK (Early Return)
        |
        v [New Event]
Record event.id as 'PROCESSING'
        |
Execute Domain Transition:
  - checkout.session.completed (paid) -> confirmBooking()
  - checkout.session.expired          -> releaseHold()
        |
Update event.id to 'COMPLETED'
        |
Return 200 OK to Stripe
```
