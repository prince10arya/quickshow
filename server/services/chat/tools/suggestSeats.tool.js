import { tool } from 'langchain';
import mongoose from 'mongoose';
import { z } from 'zod';
import Show from '../../../models/show.model.js';
import { CHAT_CONFIG } from '../config/chat.config.js';
import { findContiguousSeats } from '../utils/seat.utils.js';

export const suggestSeatsHandler = async ({ showId, ticketCount }) => {
  if (mongoose.connection.readyState !== 1) {
    return JSON.stringify({
      success: false,
      seats: [],
      message: 'QuickShow database is currently connecting. Please try again shortly.',
    });
  }

  try {
    if (!mongoose.isValidObjectId(showId)) {
      return JSON.stringify({ success: false, seats: [], message: 'That show is not available.' });
    }

    const show = await Show.findOne({
      _id: showId,
      showDateTime: { $gte: new Date().toISOString() },
    });

    if (!show) {
      return JSON.stringify({ success: false, seats: [], message: 'That show is no longer available.' });
    }

    const seats = findContiguousSeats(show.occupiedSeates, ticketCount);
    if (!seats.length) {
      return JSON.stringify({
        success: false,
        seats: [],
        message: `No contiguous ${ticketCount} seats remain for that show. Please consider fewer tickets or another time slot.`,
      });
    }

    return JSON.stringify({
      success: true,
      seats,
      ticketCount,
      showId,
      pricePerTicket: show.showPrice,
      totalAmount: show.showPrice * ticketCount,
      message: `Great! Contiguous seats ${seats.join(', ')} found.`,
    });
  } catch (err) {
    return JSON.stringify({
      success: false,
      seats: [],
      message: `Error suggesting seats: ${err.message}`,
    });
  }
};

export const suggestSeatsTool = tool(suggestSeatsHandler, {
  name: 'suggest_contiguous_seats',
  description:
    'Find and suggest available contiguous seats together for a real showId and number of tickets (1 to 5).',
  schema: z.object({
    showId: z.string().describe('The showId returned from search_upcoming_shows'),
    ticketCount: z
      .number()
      .int()
      .min(1)
      .max(CHAT_CONFIG.MAX_TICKETS)
      .describe('Number of tickets needed (1 to 5)'),
  }),
});
