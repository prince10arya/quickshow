import { tool } from 'langchain';
import { z } from 'zod';
import { getMcpChatTools } from '../agent/mcpClient.js';

export const listMoviesHandler = async () => {
  const tools = await getMcpChatTools();
  const mcpTool = tools.find((t) => t.name === 'list_all_movies');
  if (!mcpTool) {
    return JSON.stringify({ success: false, message: 'MCP tool list_all_movies not available.', movies: [] });
  }
  const result = await mcpTool.invoke({});
  return typeof result === 'string' ? result : result?.text || JSON.stringify(result);
};

export const listMoviesTool = tool(listMoviesHandler, {
  name: 'list_all_movies',
  description:
    'List all movies currently available or playing at QuickShow. Call this whenever the user asks what movies are playing, asks for movie recommendations, or wants to see the movie catalog.',
  schema: z.object({}),
});

export default listMoviesTool;
