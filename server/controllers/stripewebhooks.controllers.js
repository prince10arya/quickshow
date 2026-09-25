import stripe from 'stripe';
import { bookingService } from '../modules/booking/booking.service.js';
import { idempotencyService } from '../modules/shared/idempotency/idempotency.service.js';

export const stripeWebHooks = async (req, res) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    console.warn('[webhook] Stripe credentials missing in environment.');
    return res.status(200).json({ received: true, simulated: true });
  }

  const stripeInstance = new stripe(stripeSecretKey);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripeInstance.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // ── Idempotency Check on Event ID ──────────────────────────────────────────
  const eventId = event.id;
  const acquisition = idempotencyService.acquire(eventId, event.type);
  if (acquisition.status === 'CACHED' || acquisition.status === 'IN_PROGRESS') {
    console.log(`[webhook] Event ${eventId} (${event.type}) already processed or in-progress. Deduplicated.`);
    return res.status(200).json({ received: true, deduplicated: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.payment_status !== 'paid') {
          console.log(`[webhook] checkout.session.completed with payment_status=${session.payment_status} — awaiting async confirmation.`);
          break;
        }

        const { bookingId } = session.metadata ?? {};
        if (!bookingId) {
          console.warn('[webhook] checkout.session.completed missing bookingId in metadata:', session.id);
          return res.status(400).send('Booking ID not found in metadata.');
        }

        await bookingService.confirmBooking(bookingId, {
          sessionId: session.id,
          eventId,
          paymentStatus: session.payment_status,
        });
        console.log(`[webhook] Booking ${bookingId} confirmed via Stripe webhook.`);
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        const { bookingId } = session.metadata ?? {};
        if (!bookingId) break;

        await bookingService.confirmBooking(bookingId, {
          sessionId: session.id,
          eventId,
          asyncPayment: true,
        });
        console.log(`[webhook] Async payment succeeded. Booking ${bookingId} confirmed.`);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const { bookingId } = session.metadata ?? {};
        if (!bookingId) break;

        await bookingService.failBooking(bookingId, 'STRIPE_SESSION_EXPIRED');
        console.log(`[webhook] Seats released for expired session. bookingId: ${bookingId}`);
        break;
      }

      default:
        console.log('[webhook] Unhandled event type:', event.type);
    }

    idempotencyService.complete(eventId, 200, { received: true });
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[webhook] Processing error:', error.message);
    idempotencyService.abort(eventId);
    return res.status(500).send('Internal server error');
  }
};
