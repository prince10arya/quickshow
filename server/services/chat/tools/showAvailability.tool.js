import { tool } from 'langchain';
import mongoose from 'mongoose';
import { z } from 'zod';
import Show from '../../../models/show.model.js';
import { formatShowDate, formatShowTime } from '../utils/date.utils.js';
import { getSeatAvailabilityStats } from '../utils/seat.utils.js';

export const showAvailabilityHandler = async ({ showId }) => {
  if (mongoose.connection.readyState !== 1) {
    return JSON.stringify({
      success: false,
      message: 'QuickShow database is currently connecting. Please try again shortly.',
    });
  }

  try {
    if (!mongoose.isValidObjectId(showId)) {
      return JSON.stringify({ success: false, message: 'Invalid show ID provided.' });
    }

    const show = await Show.findOne({
      _id: showId,
      showDateTime: { $gte: new Date().toISOString() },
    }).populate('movie');

    if (!show) {
      return JSON.stringify({ success: false, message: 'That show is no longer available or has already started.' });
    }

    const stats = getSeatAvailabilityStats(show.occupiedSeates);

    return JSON.stringify({
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
    });
  } catch (err) {
    return JSON.stringify({
      success: false,
      message: `Error checking availability: ${err.message}`,
    });
  }
};

export const showAvailabilityTool = tool(showAvailabilityHandler, {
  name: 'check_show_availability',
  description:
    'Check real-time seat availability, pricing, and timing for a specific show by its showId.',
  schema: z.object({
    showId: z.string().describe('The ID of the show to inspect'),
  }),
});
