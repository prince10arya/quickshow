import { streamAgentExecution } from './agent/streamHandler.js';
import { reserveBudget, settleBudget } from './budget/budget.service.js';
import { CHAT_CONFIG } from './config/chat.config.js';
import { buildVerifiedSummary } from './tools/bookingSummary.tool.js';
import { formatShowDate, formatShowTime, getTodayDateString } from './utils/date.utils.js';
import { areContiguousSeats, findContiguousSeats, getSeatAvailabilityStats } from './utils/seat.utils.js';

export {
  areContiguousSeats,
  buildVerifiedSummary,
  CHAT_CONFIG,
  findContiguousSeats,
  formatShowDate,
  formatShowTime,
  getSeatAvailabilityStats,
  getTodayDateString,
  reserveBudget,
  settleBudget,
};

export const streamBookingAssistant = async ({ message, history = [], onEvent, sessionId, userId }) => {
  return streamAgentExecution({ message, history, onEvent, sessionId, userId });
};

export const runBookingAssistant = async ({ message, history = [], sessionId, userId }) => {
  let finalResult = null;
  const result = await streamAgentExecution({
    message,
    history,
    sessionId,
    userId,
    onEvent: () => {},
  });

  return {
    message: result.message || 'I am happy to help you with movie shows and bookings!',
    status: result.bookingSummary ? 'ready' : 'collecting',
    bookingSummary: result.bookingSummary,
    generativeWidgets: result.generativeWidgets,
  };
};

export default {
  runBookingAssistant,
  streamBookingAssistant,
  findContiguousSeats,
  areContiguousSeats,
  formatShowDate,
  formatShowTime,
};
