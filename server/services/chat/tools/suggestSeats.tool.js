import { tool } from 'langchain';
import { z } from 'zod';
import { CHAT_CONFIG } from '../config/chat.config.js';
import { getMcpChatTools } from '../agent/mcpClient.js';

export const suggestSeatsHandler = async (input) => {
  const tools = await getMcpChatTools();
  const mcpTool = tools.find((t) => t.name === 'suggest_contiguous_seats');
  if (!mcpTool) {
    return JSON.stringify({ success: false, seats: [], message: 'MCP tool suggest_contiguous_seats not available.' });
  }
  const result = await mcpTool.invoke(input);
  return typeof result === 'string' ? result : result?.text || JSON.stringify(result);
};

export const suggestSeatsTool = tool(suggestSeatsHandler, {
  name: 'suggest_contiguous_seats',
  description:
    'Find and suggest available contiguous seats together for a real showId and number of tickets (1 to 5).',
  schema: z.object({
    showId: z.string().describe('The showId returned from search_upcoming_shows'),
    ticketCount: z
      .number()
      .int()
      .min(1)
      .max(CHAT_CONFIG.MAX_TICKETS)
      .describe('Number of tickets needed (1 to 5)'),
  }),
});

export default suggestSeatsTool;
