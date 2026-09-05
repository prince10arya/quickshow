import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import Show from "../models/show.model.js";
import Movie from "../models/movie.model.js";
import Booking from "../models/booking.model.js";
import stripe from "stripe";

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

export const chatWithAI = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { messages } = req.body;
    const { origin } = req.headers;

    const result = streamText({
      model: groq('groq/compound-mini'),
      system: `You are a helpful movie booking assistant for QuickShow. 
      Help users find movies, check showtimes, and book tickets. 
      When listing movies, use the getNowPlayingMovies tool. 
      When booking, use the bookTicket tool which will provide a Stripe link.`,
      messages,
      maxSteps: 5,
      tools: {
        getNowPlayingMovies: tool({
          description: 'Get the list of movies currently playing in theaters.',
          parameters: z.object({}),
          execute: async () => {
            const shows = await Show.find({ 
              showDateTime: { $gte: new Date().toISOString() } 
            }).populate('movie').sort({ showDateTime: 1 });
            
            const uniqueMovies = Array.from(
              new Set(shows.map(show => JSON.stringify(show.movie)))
            ).map(s => JSON.parse(s));
            
            return uniqueMovies;
          },
        }),
        getShowtimes: tool({
          description: 'Get showtimes for a specific movie.',
          parameters: z.object({
            movieId: z.string().description('The ID of the movie'),
          }),
          execute: async ({ movieId }) => {
            const shows = await Show.find({ 
              movie: movieId, 
              showDateTime: { $gte: new Date().toISOString() } 
            }).sort({ showDateTime: 1 });
            return shows;
          },
        }),
        bookTicket: tool({
          description: 'Initiate the booking process for a movie show.',
          parameters: z.object({
            showId: z.string().description('The ID of the show'),
            seats: z.array(z.string()).description('List of seat IDs/numbers to book'),
          }),
          execute: async ({ showId, seats }) => {
            const showData = await Show.findById(showId).populate('movie');
            if (!showData) return { success: false, message: "Show not found" };

            // Mock booking logic (simplified for brevity)
            const booking = new Booking({
              show: showId,
              user: userId,
              seats,
              amount: showData.price * seats.length,
            });

            const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
            const session = await stripeInstance.checkout.sessions.create({
              success_url: `${origin}/loading/my-bookings`,
              cancel_url: `${origin}/my-bookings`,
              line_items: [{
                price_data: {
                  currency: 'eur',
                  product_data: { name: showData.movie.title },
                  unit_amount: Math.floor(booking.amount) * 100
                },
                quantity: 1
              }],
              mode: 'payment',
              metadata: { bookingId: booking._id.toString() },
            });

            booking.paymentLink = session.url;
            await booking.save();

            return { success: true, url: session.url };
          },
        }),
      },
    });

    result.pipeDataStreamToResponse(res);
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};