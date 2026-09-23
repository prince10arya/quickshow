import mongoose from 'mongoose';
import { z } from 'zod';
import Show from '../models/show.model.js';
import { formatShowDate, formatShowTime } from '../utils/date.utils.js';
import { getSeatAvailabilityStats } from '../utils/seat.utils.js';

export const showAvailabilityDefinition = {
  name: 'check_show_availability',
  title: 'Check Show Availability',
  description:
    'Check real-time seat availability, pricing, and timing for a specific show by its showId.',
  inputSchema: {
    showId: z.string().describe('The ID of the show to inspect'),
  },
  handler: async ({ showId }) => {
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
      if (!mongoose.isValidObjectId(showId)) {
        const output = { success: false, message: 'Invalid show ID provided.' };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      const show = await Show.findOne({
        _id: showId,
        showDateTime: { $gte: new Date().toISOString() },
      }).populate('movie');

      if (!show) {
        const output = {
          success: false,
          message: 'That show is no longer available or has already started.',
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      const stats = getSeatAvailabilityStats(show.occupiedSeates);

      const output = {
        success: true,
        show: {
          showId: show._id.toString(),
          movieTitle: show.movie?.title,
          startsAt: show.showDateTime,
          date: formatShowDate(show.showDateTime),
          time: formatShowTime(show.showDateTime),
          price: show.showPrice,
          ...stats,
        },
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    } catch (err) {
      const output = {
        success: false,
        message: `Error checking availability: ${err.message}`,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  },
};

export default showAvailabilityDefinition;
