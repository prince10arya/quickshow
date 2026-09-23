import mongoose from 'mongoose';
import { z } from 'zod';
import Show from '../models/show.model.js';
import { CHAT_CONFIG } from '../config/chat.config.js';
import { formatShowDate, formatShowTime } from '../utils/date.utils.js';
import { areContiguousSeats, findContiguousSeats } from '../utils/seat.utils.js';

export const buildVerifiedSummary = async ({ showId, ticketCount, seats }) => {
  if (mongoose.connection.readyState !== 1) return null;
  if (!showId || !ticketCount || !mongoose.isValidObjectId(showId)) return null;

  const show = await Show.findOne({
    _id: showId,
    showDateTime: { $gte: new Date().toISOString() },
  }).populate('movie');

  if (!show) return null;

  const suggestedSeats = findContiguousSeats(show.occupiedSeates, ticketCount);
  const selectedSeatsAreValid =
    Array.isArray(seats) &&
    seats.length === ticketCount &&
    areContiguousSeats(seats) &&
    seats.every((seat) => !show.occupiedSeates[seat]);

  const safeSeats = selectedSeatsAreValid ? [...seats].sort() : suggestedSeats;
  if (safeSeats.length !== ticketCount) return null;

  return {
    venue: 'QuickShow',
    movie: {
      id: show.movie._id.toString(),
      title: show.movie.title,
      poster: show.movie.poster_path,
    },
    show: {
      id: show._id.toString(),
      startsAt: show.showDateTime,
      date: formatShowDate(show.showDateTime),
      time: formatShowTime(show.showDateTime),
    },
    ticketCount,
    seats: safeSeats,
    pricePerTicket: show.showPrice,
    amount: show.showPrice * ticketCount,
  };
};

export const bookingSummaryDefinition = {
  name: 'prepare_booking_summary',
  title: 'Prepare Booking Summary',
  description:
    'Prepare the verified booking summary card for checkout once the user has chosen a show, ticket count, and seats. Call this when ready to show the user their booking ticket with checkout button.',
  inputSchema: {
    showId: z.string().describe('The showId being booked'),
    ticketCount: z
      .number()
      .int()
      .min(1)
      .max(CHAT_CONFIG.MAX_TICKETS)
      .describe('Number of tickets'),
    seats: z
      .array(z.string())
      .max(CHAT_CONFIG.MAX_TICKETS)
      .optional()
      .describe('Optional seat IDs e.g. ["A1", "A2"] if specific seats chosen'),
  },
  handler: async ({ showId, ticketCount, seats }) => {
    const sanitizedSeats = Array.isArray(seats)
      ? seats.filter((s) => typeof s === 'string' && /^[A-J][1-9]$/.test(s))
      : undefined;
    if (mongoose.connection.readyState !== 1) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: 'QuickShow database is currently connecting. Please try again shortly.',
            }),
          },
        ],
      };
    }

    try {
      const summary = await buildVerifiedSummary({ showId, ticketCount, seats: sanitizedSeats });
      if (!summary) {
        const output = {
          success: false,
          message: 'Could not create booking summary. The show may be sold out or the seats are invalid.',
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      const output = {
        success: true,
        message: 'Booking summary prepared successfully.',
        bookingSummary: summary,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    } catch (err) {
      const output = {
        success: false,
        message: `Error building summary: ${err.message}`,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  },
};

export default bookingSummaryDefinition;
