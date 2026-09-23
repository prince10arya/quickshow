import mongoose from 'mongoose';
import { z } from 'zod';
import Movie from '../models/movie.model.js';

export const listByGenreDefinition = {
  name: 'list_movies_by_genre',
  title: 'List Movies by Genre',
  description:
    'Search and return movies belonging to a specific genre (e.g. "Action", "Comedy", "Sci-Fi", "Drama", "Horror", "Animation"). Call this whenever the user asks for movies of a specific genre or style.',
  inputSchema: {
    genre: z
      .string()
      .describe('The genre name to search for (e.g. "Action", "Comedy", "Sci-Fi", "Drama", "Horror")'),
  },
  handler: async ({ genre }) => {
    if (mongoose.connection.readyState !== 1) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: 'QuickShow database is currently connecting. Please try again shortly.',
              movies: [],
            }),
          },
        ],
      };
    }

    try {
      if (!genre || !genre.trim()) {
        const output = { success: false, message: 'Please provide a valid genre name.', movies: [] };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      const cleanGenre = genre.trim();
      const safeGenre = cleanGenre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safeGenre, 'i');

      const movies = await Movie.find({
        genres: { $elemMatch: { $regex: regex } },
      })
        .select('_id title overview poster_path genres vote_average runtime release_date')
        .sort({ vote_average: -1 })
        .limit(10);

      const formatted = movies.map((m) => ({
        id: m._id.toString(),
        title: m.title,
        overview: m.overview ? `${m.overview.slice(0, 160)}...` : '',
        poster: m.poster_path,
        genres: Array.isArray(m.genres) ? m.genres.slice(0, 3) : [],
        rating: m.vote_average ? Number(m.vote_average.toFixed(1)) : null,
        runtime: m.runtime ? `${m.runtime} mins` : undefined,
      }));

      const output = {
        success: true,
        genre: cleanGenre,
        count: formatted.length,
        movies: formatted,
        message: formatted.length
          ? `Found ${formatted.length} ${cleanGenre} movies available at QuickShow.`
          : `No ${cleanGenre} movies found in our catalog. Try another genre like Action or Sci-Fi!`,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    } catch (err) {
      const output = {
        success: false,
        message: `Failed to search by genre: ${err.message}`,
        movies: [],
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  },
};

export default listByGenreDefinition;
