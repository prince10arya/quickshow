import { tool } from 'langchain';
import { z } from 'zod';
import { getMcpChatTools } from '../agent/mcpClient.js';

export const listByGenreHandler = async ({ genre }) => {
  const tools = await getMcpChatTools();
  const mcpTool = tools.find((t) => t.name === 'list_movies_by_genre');
  if (!mcpTool) {
    return JSON.stringify({ success: false, message: 'MCP tool list_movies_by_genre not available.', movies: [] });
  }
  const result = await mcpTool.invoke({ genre });
  return typeof result === 'string' ? result : result?.text || JSON.stringify(result);
};

export const listByGenreTool = tool(listByGenreHandler, {
  name: 'list_movies_by_genre',
  description:
    'Search and return movies belonging to a specific genre (e.g. "Action", "Comedy", "Sci-Fi", "Drama", "Horror", "Animation"). Call this whenever the user asks for movies of a specific genre or style.',
  schema: z.object({
    genre: z
      .string()
      .describe('The genre name to search for (e.g. "Action", "Comedy", "Sci-Fi", "Drama", "Horror")'),
  }),
});

export default listByGenreTool;
