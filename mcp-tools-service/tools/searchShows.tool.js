import mongoose from 'mongoose';
import { z } from 'zod';
import Movie from '../models/movie.model.js';
import Show from '../models/show.model.js';
import { formatShowDate, formatShowTime, getRelativeDateLabel } from '../utils/date.utils.js';
import { getSeatAvailabilityStats } from '../utils/seat.utils.js';

export const searchShowsDefinition = {
  name: 'search_upcoming_shows',
  title: 'Search Upcoming Shows',
  description:
    'Find real upcoming QuickShow movie showtimes by movie title and optional date (YYYY-MM-DD in IST). Returns show timings, ticket prices, and available seats.',
  inputSchema: {
    query: z.string().describe('The movie title or search term (e.g. "Interstellar")'),
    date: z
      .string()
      .optional()
      .describe('Optional IST date in YYYY-MM-DD format (e.g. "2026-09-23")'),
  },
  handler: async ({ query, date }) => {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = undefined;
    }
    if (mongoose.connection.readyState !== 1) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: 'QuickShow database is currently connecting. Please try again shortly.',
              shows: [],
            }),
          },
        ],
      };
    }

    try {
      const movieFilter = query?.trim()
        ? { title: { $regex: query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
        : {};

      const movies = await Movie.find(movieFilter).select('_id title poster_path genres vote_average runtime').limit(10);
      if (!movies.length) {
        const output = {
          success: false,
          message: query ? `No movies found matching "${query}".` : 'No movies found.',
          shows: [],
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      const nowIso = new Date().toISOString();
      const shows = await Show.find({
        movie: { $in: movies.map((m) => m._id) },
        showDateTime: { $gte: nowIso },
      })
        .populate('movie')
        .sort({ showDateTime: 1 })
        .limit(30);

      const filtered = shows.filter((show) => {
        if (!date) return true;
        const showDate = formatShowDate(show.showDateTime);
        return showDate === date;
      });

      const formatted = filtered.map((show) => {
        const stats = getSeatAvailabilityStats(show.occupiedSeates);
        const showDateStr = formatShowDate(show.showDateTime);
        return {
          showId: show._id.toString(),
          movieId: show.movie?._id ? show.movie._id.toString() : '',
          title: show.movie?.title || 'Unknown Title',
          poster: show.movie?.poster_path || null,
          genres: Array.isArray(show.movie?.genres) ? show.movie.genres.slice(0, 3) : [],
          rating: show.movie?.vote_average ? Number(show.movie.vote_average.toFixed(1)) : null,
          runtime: show.movie?.runtime ? `${show.movie.runtime}m` : null,
          startsAt: show.showDateTime,
          date: showDateStr,
          dateLabel: getRelativeDateLabel(showDateStr),
          time: formatShowTime(show.showDateTime),
          price: show.showPrice,
          availableSeats: stats.availableCount,
          isHouseFull: stats.isHouseFull,
        };
      });

      const output = {
        success: true,
        count: formatted.length,
        shows: formatted,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    } catch (err) {
      const output = {
        success: false,
        message: `Error searching shows: ${err.message}`,
        shows: [],
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  },
};

export default searchShowsDefinition;
