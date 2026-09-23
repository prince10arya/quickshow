import mongoose from 'mongoose';
import { z } from 'zod';
import Movie from '../models/movie.model.js';
import Show from '../models/show.model.js';

export const listMoviesDefinition = {
  name: 'list_all_movies',
  title: 'List All Movies',
  description:
    'List all movies currently available or playing at QuickShow. Call this whenever the user asks what movies are playing, asks for movie recommendations, or wants to see the movie catalog.',
  inputSchema: {},
  handler: async () => {
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
      const upcomingShows = await Show.find({
        showDateTime: { $gte: new Date().toISOString() },
      }).distinct('movie');

      let movies = [];
      if (upcomingShows.length > 0) {
        movies = await Movie.find({ _id: { $in: upcomingShows } })
          .select('_id title overview poster_path genres vote_average runtime release_date')
          .limit(12);
      }

      if (!movies.length) {
        movies = await Movie.find({})
          .select('_id title overview poster_path genres vote_average runtime release_date')
          .sort({ vote_average: -1 })
          .limit(10);
      }

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
        count: formatted.length,
        movies: formatted,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    } catch (err) {
      const output = {
        success: false,
        message: `Failed to list movies: ${err.message}`,
        movies: [],
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    }
  },
};

export default listMoviesDefinition;
