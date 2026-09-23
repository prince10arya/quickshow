import { listMoviesDefinition } from './listMovies.tool.js';
import { listByGenreDefinition } from './listByGenre.tool.js';
import { movieDetailsDefinition } from './movieDetails.tool.js';
import { searchShowsDefinition } from './searchShows.tool.js';
import { showAvailabilityDefinition } from './showAvailability.tool.js';
import { suggestSeatsDefinition } from './suggestSeats.tool.js';
import { bookingSummaryDefinition } from './bookingSummary.tool.js';

export const ALL_TOOL_DEFINITIONS = [
  listMoviesDefinition,
  listByGenreDefinition,
  movieDetailsDefinition,
  searchShowsDefinition,
  showAvailabilityDefinition,
  suggestSeatsDefinition,
  bookingSummaryDefinition,
];

export const registerAllTools = (server) => {
  for (const def of ALL_TOOL_DEFINITIONS) {
    const loggingHandler = async (args) => {
      const startTime = Date.now();
      const formattedArgs = args && Object.keys(args).length ? JSON.stringify(args) : '{}';
      console.log(`[MCP:Tool] ▶ Invoking "${def.name}" with args: ${formattedArgs}`);

      try {
        const result = await def.handler(args);
        const duration = Date.now() - startTime;

        let summary = 'ok';
        if (result?.structuredContent) {
          if (Array.isArray(result.structuredContent.movies)) {
            summary = `found ${result.structuredContent.movies.length} movies`;
          } else if (Array.isArray(result.structuredContent.shows)) {
            summary = `found ${result.structuredContent.shows.length} shows`;
          } else if (result.structuredContent.bookingSummary) {
            summary = `booking summary prepared for "${result.structuredContent.bookingSummary.movie?.title}"`;
          } else if (Array.isArray(result.structuredContent.seats)) {
            summary = `seats: ${result.structuredContent.seats.join(', ')}`;
          } else if (result.structuredContent.show) {
            summary = `availability checked (${result.structuredContent.show.availableSeats} seats left)`;
          } else if (result.structuredContent.movie) {
            summary = `details for "${result.structuredContent.movie.title}"`;
          } else if (result.structuredContent.message) {
            summary = result.structuredContent.message;
          }
        }

        console.log(`[MCP:Tool] ✔ "${def.name}" finished in ${duration}ms [${summary}]`);
        return result;
      } catch (err) {
        const duration = Date.now() - startTime;
        console.error(`[MCP:Tool] ✖ "${def.name}" failed after ${duration}ms:`, err.message);
        throw err;
      }
    };

    server.registerTool(
      def.name,
      {
        title: def.title,
        description: def.description,
        inputSchema: def.inputSchema,
      },
      loggingHandler
    );
  }
  console.log(`[MCP Tools Service] Registered ${ALL_TOOL_DEFINITIONS.length} tools`);
};

export {
  listMoviesDefinition,
  listByGenreDefinition,
  movieDetailsDefinition,
  searchShowsDefinition,
  showAvailabilityDefinition,
  suggestSeatsDefinition,
  bookingSummaryDefinition,
};
