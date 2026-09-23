import { tool } from 'langchain';
import { z } from 'zod';
import { CHAT_CONFIG } from '../config/chat.config.js';
import { getMcpChatTools } from '../agent/mcpClient.js';

export const buildVerifiedSummary = async ({ showId, ticketCount, seats }) => {
  try {
    const tools = await getMcpChatTools();
    const mcpTool = tools.find((t) => t.name === 'prepare_booking_summary');
    if (!mcpTool) return null;
    const res = await mcpTool.invoke({ showId, ticketCount, seats });
    const text = typeof res === 'string' ? res : res?.text || JSON.stringify(res);
    const parsed = JSON.parse(text);
    return parsed.bookingSummary || null;
  } catch {
    return null;
  }
};

export const bookingSummaryHandler = async (input) => {
  const tools = await getMcpChatTools();
  const mcpTool = tools.find((t) => t.name === 'prepare_booking_summary');
  if (!mcpTool) {
    return JSON.stringify({
      success: false,
      message: 'MCP tool prepare_booking_summary not available.',
    });
  }
  const result = await mcpTool.invoke(input);
  return typeof result === 'string' ? result : result?.text || JSON.stringify(result);
};

export const bookingSummaryTool = tool(bookingSummaryHandler, {
  name: 'prepare_booking_summary',
  description:
    'Prepare the verified booking summary card for checkout once the user has chosen a show, ticket count, and seats. Call this when ready to show the user their booking ticket with checkout button.',
  schema: z.object({
    showId: z.string().describe('The showId being booked'),
    ticketCount: z
      .number()
      .int()
      .min(1)
      .max(CHAT_CONFIG.MAX_TICKETS)
      .describe('Number of tickets'),
    seats: z
      .array(z.string())
      .max(CHAT_CONFIG.MAX_TICKETS)
      .optional()
      .describe('Optional seat IDs e.g. ["A1", "A2"] if specific seats chosen'),
  }),
});

export default bookingSummaryTool;
