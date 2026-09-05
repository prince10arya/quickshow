import stripe from 'stripe';
import Booking from '../models/booking.model.js';
import { releaseSeats } from './booking.controller.js';

export const stripeWebHooks = async (req, res) => {
  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log(event, ": event")
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      // ── Fulfillment: session completed (payment_status === 'paid') ─────────
      // Best practice: use checkout.session.completed, NOT payment_intent.succeeded.
      // metadata is directly on the session object — no extra API call needed.
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Guard: async payment methods (e.g. bank transfer) complete the session
        // before money arrives. Only fulfil when payment is actually captured.
        if (session.payment_status !== 'paid') {
          console.log(`[webhook] checkout.session.completed but payment_status=${session.payment_status} — waiting for async_payment_succeeded`);
          break;
        }

        const { bookingId } = session.metadata ?? {};
        console.log(bookingId, 'booking id')
        if (!bookingId) {
          console.warn('[webhook] checkout.session.completed: bookingId missing in metadata', session.id);
          return res.status(400).send('Booking ID not found in metadata.');
        }

        await Booking.findByIdAndUpdate(bookingId, {
          isPaid: true,
          paymentLink: '',
        });
        console.log(`[webhook] Booking ${bookingId} marked paid.`);
        break;
      }

      // ── Async payment methods: money arrives after session completes ───────
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        const { bookingId } = session.metadata ?? {};
        if (!bookingId) break;

        await Booking.findByIdAndUpdate(bookingId, {
          isPaid: true,
          paymentLink: '',
        });
        console.log(`[webhook] Async payment succeeded. Booking ${bookingId} marked paid.`);
        break;
      }

      // ── Session expired → release held seats ──────────────────────────────
      case 'checkout.session.expired': {
        const session = event.data.object;
        const { bookingId } = session.metadata ?? {};

        if (!bookingId) {
          console.warn('[webhook] checkout.session.expired: bookingId missing', session.id);
          break;
        }

        await releaseSeats(bookingId);
        console.log(`[webhook] Seats released for expired session. bookingId: ${bookingId}`);
        break;
      }

      default:
        console.log('[webhook] Unhandled event type:', event.type);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[webhook] Processing error:', error.message);
    res.status(500).send('Internal server error');
  }
};
