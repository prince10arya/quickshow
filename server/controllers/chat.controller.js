import Groq from "groq-sdk";
import Show from "../models/show.model.js";
import Movie from "../models/movie.model.js";
import Booking from "../models/booking.model.js";
import stripe from "stripe";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const tools = [
  {
    type: "function",
    function: {
      name: "get_movies",
      description: "Get the list of currently playing movies",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_showtimes",
      description: "Get the showtimes and show IDs for a specific movie",
      parameters: {
        type: "object",
        properties: {
          movie_id: { type: "string", description: "The ID of the movie" }
        },
        required: ["movie_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_available_seats",
      description: "Get the list of occupied and available seats for a specific show",
      parameters: {
        type: "object",
        properties: {
          show_id: { type: "string", description: "The ID of the show" }
        },
        required: ["show_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "book_ticket",
      description: "Initiate a booking for a show and specific seats. Returns a checkout URL.",
      parameters: {
        type: "object",
        properties: {
          show_id: { type: "string", description: "The ID of the show" },
          seats: { type: "array", items: { type: "string" }, description: "List of seat IDs to book (e.g., A1, B5)" }
        },
        required: ["show_id", "seats"]
      }
    }
  }
];

const handleToolCall = async (toolCall, userId, origin) => {
  const { name, arguments: argsString } = toolCall.function;
  const args = JSON.parse(argsString);

  switch (name) {
    case "get_movies": {
      const shows = await Show.find({ showDateTime: { $gte: new Date().toISOString() } }).populate('movie').sort({ showDateTime: 1 });
      const uniqueMovies = Array.from(new Set(shows.map(show => JSON.stringify(show.movie)))).map(s => JSON.parse(s));
      return JSON.stringify(uniqueMovies);
    }
    case "get_showtimes": {
      const shows = await Show.find({ movie: args.movie_id, showDateTime: { $gte: new Date().toISOString() } });
      return JSON.stringify(shows);
    }
    case "get_available_seats": {
      const show = await Show.findById(args.show_id);
      if (!show) return "Show not found";
      const occupiedSeats = Object.keys(show.occupiedSeates);
      return JSON.stringify({ occupiedSeats, totalSeats: 60 }); // Assuming 60 seats for now
    }
    case "book_ticket": {
      const { show_id, seats } = args;
      const showData = await Show.findById(show_id).populate('movie');
      if (!showData) return "Show not found";

      // Check seat availability
      const occupiedSeats = showData.occupiedSeates;
      const isAnySeatTaken = seats.some((seat) => occupiedSeats[seat]);
      if (isAnySeatTaken) return "Some selected seats are already taken.";

      // Create Booking
      const booking = await Booking.create({
        user: userId,
        show: show_id,
        amount: showData.showPrice * seats.length,
        bookedSeates: seats,
      });

      // Mark seats as occupied
      seats.forEach((seat) => {
        showData.occupiedSeates[seat] = userId;
      });
      showData.markModified('occupiedSeates');
      await showData.save();

      // Initialize Stripe
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
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      });

      booking.paymentLink = session.url;
      await booking.save();

      return JSON.stringify({ success: true, url: session.url });
    }
    default:
      return "Unknown tool";
  }
};

export const chatWithAI = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { messages } = req.body;
    const { origin } = req.headers;

    const response = await groq.chat.completions.create({
      model: "qwen/qwen3-32b",
      messages: [
        { role: "system", content: "You are a helpful movie booking assistant for QuickShow. Help users find movies, check showtimes, and book tickets. Use the provided tools to fetch real-time data. When booking, explain that you will provide a Stripe checkout link." },
        ...messages
      ],
      tools,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      const toolCalls = responseMessage.tool_calls;
      const toolResponses = [];

      for (const toolCall of toolCalls) {
        const result = await handleToolCall(toolCall, userId, origin);
        toolResponses.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: result,
        });
      }

      const secondResponse = await groq.chat.completions.create({
        model: "qwen/qwen3-32b",
        messages: [
          { role: "system", content: "You are a helpful movie booking assistant for QuickShow." },
          ...messages,
          responseMessage,
          ...toolResponses
        ],
      });

      const finalContent = secondResponse.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      return res.json({ success: true, message: finalContent });
    }

    const finalContent = responseMessage.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    res.json({ success: true, message: finalContent });
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ success: false, message: "Chat failed. Make sure GROQ_API_KEY is set." });
  }
};
