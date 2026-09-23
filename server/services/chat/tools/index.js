import { bookingSummaryTool, buildVerifiedSummary } from './bookingSummary.tool.js';
import { listByGenreTool } from './listByGenre.tool.js';
import { listMoviesTool } from './listMovies.tool.js';
import { movieDetailsTool } from './movieDetails.tool.js';
import { searchShowsTool } from './searchShows.tool.js';
import { showAvailabilityTool } from './showAvailability.tool.js';
import { suggestSeatsTool } from './suggestSeats.tool.js';

export const ALL_CHAT_TOOLS = [
  listMoviesTool,
  listByGenreTool,
  movieDetailsTool,
  searchShowsTool,
  showAvailabilityTool,
  suggestSeatsTool,
  bookingSummaryTool,
];

export {
  bookingSummaryTool,
  buildVerifiedSummary,
  listByGenreTool,
  listMoviesTool,
  movieDetailsTool,
  searchShowsTool,
  showAvailabilityTool,
  suggestSeatsTool,
};
