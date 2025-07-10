import stripe from 'stripe';
import Booking from '../models/booking.model.js';

export const stripeWebHooks = async (req, res) => {
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers["stripe-signature"]


    let event ;

    try {
        event = stripeInstance.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        return  res.status(400).send(`Webhooks Error: ${error.message}`)
    }

    try {
        switch (event.type) {
            case "payment_intent.succeeded":
                { const paymentIntent = event.data.object;
                    const sessionList = await stripeInstance.checkout.sessions.list({
                        payment_intent: paymentIntent.id
                    })

                    const session  = sessionList.data[0];
                    const {bookingId} = session.metadata;
                    if (!bookingId) {
                      console.warn(
                        "bookingId not found in session metadata for payment intent:",
                        paymentIntent.id
                      );
                      // You might want to handle this case, maybe log it for manual review
                      return res
                        .status(400)
                        .send("Booking ID not found in metadata.");
                    }
                    await Booking.findByIdAndUpdate(bookingId, {
                        isPaid: true,
                        paymentLink: "",
                    })
                    break;
                }
            default:
                console.log(' Unhandled event.type: ', event.type);
        }

        res.status(200).json({recieved: true})
    } catch (error) {
        console.error("Webhook processing error: ", error.message);
        res.status(500).send("Internal server error");
    }
}
