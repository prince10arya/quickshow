import stripe from 'stripe';


import Booking from "../models/booking.model.js";
import Show from "../models/show.model.js";

//* CheckSeat availability
const checkSeatsAvail = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if(!showData) return false;
    const occupiedSeats = showData.occupiedSeates;

    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);

    return !isAnySeatTaken;
  } catch (error) {
    console.log('error', error.message)
  }
};
export const createBooking = async (req,res) => {
  try {
    const { userId }  = req.auth();
    const { showId, selectedSeats } = req.body;
    const { origin } = req.headers;

    //* Check Seat avail
    const isAvailable = await checkSeatsAvail(showId, selectedSeats);
    if(!isAvailable)
      return res.json({
        success: false, message: "Selected Seat are not isAvailable."
    })

    const showData = await Show.findById(showId).populate('movie');

    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeates: selectedSeats,
    });
    selectedSeats.map((seat) => {
      showData.occupiedSeates[seat] = userId;
    })
    showData.markModified('occupiedSeates');

    await showData.save();

    // Todo -> Stripe Gateway Initialize
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    const lineItems = [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: showData.movie.title
        },
        unit_amount: Math.floor(booking.amount)* 100
      },
      quantity: 1
    }]
    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: lineItems,
      mode: 'payment',
      metadata: {
        bookingId: booking._id.toString(),
      },
      expires_at: Math.floor(Date.now()/ 1000)+ 30 *60, // ! exopires in 10 minutes
    });
    booking.paymentLink = session.url;
    await booking.save();
    res.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.log('error in create bookinngs', error.message)
    res.status(400).json({
      success: false,
      message: success.message,
    })
  }
}

export const getOccupiedSeats = async (req, res) => {
  try {
    const {showId} = req.params;
    const showData = await Show.findById(showId);
    const occupiedSeats = Object.keys(showData.occupiedSeates);

    res.status(200).json({
      success: true,
      occupiedSeats,
    })

  } catch (error) {
    console.log("error", error.message);
    res.status(400).json({
      success: false,
      message: success.message,
    });
  }
}
