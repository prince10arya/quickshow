import { tool } from 'langchain';
import { z } from 'zod';
import { getMcpChatTools } from '../agent/mcpClient.js';

export const searchShowsHandler = async (input) => {
  const tools = await getMcpChatTools();
  const mcpTool = tools.find((t) => t.name === 'search_upcoming_shows');
  if (!mcpTool) {
    return JSON.stringify({ success: false, message: 'MCP tool search_upcoming_shows not available.', shows: [] });
  }
  const result = await mcpTool.invoke(input);
  return typeof result === 'string' ? result : result?.text || JSON.stringify(result);
};

export const searchShowsTool = tool(searchShowsHandler, {
  name: 'search_upcoming_shows',
  description:
    'Find real upcoming QuickShow movie showtimes by movie title and optional date (YYYY-MM-DD in IST). Returns show timings, ticket prices, and available seats.',
  schema: z.object({
    query: z.string().describe('The movie title or search term (e.g. "Interstellar")'),
    date: z
      .string()
      .optional()
      .describe('Optional IST date in YYYY-MM-DD format (e.g. "2026-09-23")'),
  }),
});

export default searchShowsTool;
