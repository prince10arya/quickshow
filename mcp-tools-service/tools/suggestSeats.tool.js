import mongoose from 'mongoose';
import { z } from 'zod';
import Show from '../models/show.model.js';
import { CHAT_CONFIG } from '../config/chat.config.js';
import { findContiguousSeats } from '../utils/seat.utils.js';

export const suggestSeatsDefinition = {
  name: 'suggest_contiguous_seats',
  title: 'Suggest Contiguous Seats',
  description:
    'Find and suggest available contiguous seats together for a real showId and number of tickets (1 to 5).',
  inputSchema: {
    showId: z.string().describe('The showId returned from search_upcoming_shows'),
    ticketCount: z
      .number()
      .int()
      .min(1)
      .max(CHAT_CONFIG.MAX_TICKETS)
      .describe('Number of tickets needed (1 to 5)'),
  },
  handler: async ({ showId, ticketCount }) => {
    if (mongoose.connection.readyState !== 1) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              seats: [],
              message: 'QuickShow database is currently connecting. Please try again shortly.',
            }),
          },
        ],
      };
    }

    try {
      if (!mongoose.isValidObjectId(showId)) {
        const output = { success: false, seats: [], message: 'That show is not available.' };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      const show = await Show.findOne({
        _id: showId,
        showDateTime: { $gte: new Date().toISOString() },
      });

      if (!show) {
        const output = { success: false, seats: [], message: 'That show is no longer available.' };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      const seats = findContiguousSeats(show.occupiedSeates, ticketCount);
      if (!seats.length) {
        const output = {
          success: false,
          seats: [],
          message: `No contiguous ${ticketCount} seats remain for that show. Please consider fewer tickets or another time slot.`,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      const output = {
        success: true,
        seats,
        ticketCount,
        showId,
        pricePerTicket: show.showPrice,
        totalAmount: show.showPrice * ticketCount,
        message: `Great! Contiguous seats ${seats.join(', ')} found.`,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    } catch (err) {
      const output = {
        success: false,
        seats: [],
        message: `Error suggesting seats: ${err.message}`,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  },
};

export default suggestSeatsDefinition;
