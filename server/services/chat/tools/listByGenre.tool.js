import { tool } from 'langchain';
import mongoose from 'mongoose';
import { z } from 'zod';
import Movie from '../../../models/movie.model.js';

export const listByGenreHandler = async ({ genre }) => {
  if (mongoose.connection.readyState !== 1) {
    return JSON.stringify({
      success: false,
      message: 'QuickShow database is currently connecting. Please try again shortly.',
      movies: [],
    });
  }

  try {
    if (!genre || !genre.trim()) {
      return JSON.stringify({ success: false, message: 'Please provide a valid genre name.', movies: [] });
    }

    const cleanGenre = genre.trim();
    const regex = new RegExp(cleanGenre, 'i');

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
      genres: Array.isArray(m.genres) ? m.genres : [],
      rating: m.vote_average ? Number(m.vote_average.toFixed(1)) : null,
      runtime: m.runtime ? `${m.runtime} mins` : undefined,
    }));

    return JSON.stringify({
      success: true,
      genre: cleanGenre,
      count: formatted.length,
      movies: formatted,
    });
  } catch (err) {
    return JSON.stringify({
      success: false,
      message: `Failed to search by genre: ${err.message}`,
      movies: [],
    });
  }
};

export const listByGenreTool = tool(listByGenreHandler, {
  name: 'list_movies_by_genre',
  description:
    'Find and list movies belonging to a specific genre (e.g., Action, Sci-Fi, Comedy, Drama, Horror, Romance, Thriller, Adventure, Animation, Fantasy). Call this when the user asks for movies of a certain genre or category.',
  schema: z.object({
    genre: z.string().describe('The genre to filter by, e.g. Action, Sci-Fi, Comedy, Horror, Romance'),
  }),
});
