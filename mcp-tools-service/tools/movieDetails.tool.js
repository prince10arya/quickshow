import mongoose from 'mongoose';
import { z } from 'zod';
import Movie from '../models/movie.model.js';

export const movieDetailsDefinition = {
  name: 'get_movie_details',
  title: 'Get Movie Details',
  description:
    'Retrieve in-depth details about a specific movie including synopsis, cast, runtime, release date, rating, and genres. Call this when the user asks what a movie is about, who is in it, or for details on a specific title.',
  inputSchema: {
    movieId: z.string().optional().describe('The ID of the movie if known'),
    title: z.string().optional().describe('The title of the movie to search for'),
  },
  handler: async ({ movieId, title }) => {
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
      let movie = null;
      if (movieId) {
        movie = await Movie.findById(movieId);
      }
      if (!movie && title) {
        const cleanTitle = title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        movie = await Movie.findOne({
          title: { $regex: cleanTitle, $options: 'i' },
        });
      }

      if (!movie) {
        const output = {
          success: false,
          message: `Movie "${title || movieId}" not found in QuickShow catalog.`,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output,
        };
      }

      const output = {
        success: true,
        movie: {
          id: movie._id.toString(),
          title: movie.title,
          overview: movie.overview,
          tagline: movie.tagline,
          poster: movie.poster_path,
          backdrop: Array.isArray(movie.backdrop_path) ? movie.backdrop_path[0] : null,
          genres: movie.genres,
          rating: movie.vote_average ? Number(movie.vote_average.toFixed(1)) : null,
          runtime: movie.runtime ? `${movie.runtime} minutes` : 'N/A',
          releaseDate: movie.release_date,
          casts: Array.isArray(movie.casts)
            ? movie.casts.slice(0, 5).map((c) => (typeof c === 'string' ? c : c.name || c.original_name))
            : [],
        },
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    } catch (err) {
      const output = {
        success: false,
        message: `Error fetching movie details: ${err.message}`,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  },
};

export default movieDetailsDefinition;
