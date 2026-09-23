import { tool } from 'langchain';
import { z } from 'zod';
import { getMcpChatTools } from '../agent/mcpClient.js';

export const movieDetailsHandler = async (input) => {
  const tools = await getMcpChatTools();
  const mcpTool = tools.find((t) => t.name === 'get_movie_details');
  if (!mcpTool) {
    return JSON.stringify({ success: false, message: 'MCP tool get_movie_details not available.' });
  }
  const result = await mcpTool.invoke(input);
  return typeof result === 'string' ? result : result?.text || JSON.stringify(result);
};

export const movieDetailsTool = tool(movieDetailsHandler, {
  name: 'get_movie_details',
  description:
    'Retrieve in-depth details about a specific movie including synopsis, cast, runtime, release date, rating, and genres. Call this when the user asks what a movie is about, who is in it, or for details on a specific title.',
  schema: z.object({
    movieId: z.string().optional().describe('The ID of the movie if known'),
    title: z.string().optional().describe('The title of the movie to search for'),
  }),
});

export default movieDetailsTool;
