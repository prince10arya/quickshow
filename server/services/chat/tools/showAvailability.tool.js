import { tool } from 'langchain';
import { z } from 'zod';
import { getMcpChatTools } from '../agent/mcpClient.js';

export const showAvailabilityHandler = async (input) => {
  const tools = await getMcpChatTools();
  const mcpTool = tools.find((t) => t.name === 'check_show_availability');
  if (!mcpTool) {
    return JSON.stringify({ success: false, message: 'MCP tool check_show_availability not available.' });
  }
  const result = await mcpTool.invoke(input);
  return typeof result === 'string' ? result : result?.text || JSON.stringify(result);
};

export const showAvailabilityTool = tool(showAvailabilityHandler, {
  name: 'check_show_availability',
  description:
    'Check real-time seat availability, pricing, and timing for a specific show by its showId.',
  schema: z.object({
    showId: z.string().describe('The ID of the show to inspect'),
  }),
});

export default showAvailabilityTool;
