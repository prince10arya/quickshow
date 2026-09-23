import { BOOKING_STEPS, STEP_METADATA } from './constants.js';
import { TOOL_METADATA } from './toolMetadata.js';

/**
 * Determine the step index in the booking workflow.
 * @param {import('./types').BookingStep} step
 * @returns {number}
 */
export const getStepIndex = (step) => {
  return BOOKING_STEPS.indexOf(step);
};

/**
 * Derive the current active booking step from the agent's event stream and conversation state.
 *
 * @param {import('./types').AgentEvent[]} [events]
 * @param {Array<{ role: string, bookingSummary?: unknown, widgets?: Array<{ type: string }> }>} [messages]
 * @returns {import('./types').BookingStep}
 */
export const selectCurrentBookingStep = (events = [], messages = []) => {
  // 1. First check if any active/recent events exist in the current agent execution
  if (Array.isArray(events) && events.length > 0) {
    // Traverse from most recent event backwards to find the latest relevant tool
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const event = events[i];
      if (event?.toolName && TOOL_METADATA[event.toolName]) {
        return TOOL_METADATA[event.toolName].step;
      }
    }
  }

  // 2. If no recent events (e.g. loaded previous chat history), inspect message widgets/summaries
  if (Array.isArray(messages) && messages.length > 0) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg?.bookingSummary) {
        return 'review';
      }
      if (Array.isArray(msg?.widgets)) {
        if (msg.widgets.some((w) => w?.type === 'booking_summary')) return 'review';
        if (msg.widgets.some((w) => w?.type === 'showtimes')) return 'show';
        if (msg.widgets.some((w) => w?.type === 'movie_grid')) return 'discover';
      }
    }
  }

  // Default starting phase
  return 'discover';
};

/**
 * Derive the list of completed steps up to the current booking phase.
 *
 * @param {import('./types').AgentEvent[]} [events]
 * @param {Array<{ role: string, bookingSummary?: unknown, widgets?: Array<{ type: string }> }>} [messages]
 * @returns {import('./types').BookingStep[]}
 */
export const selectCompletedSteps = (events = [], messages = []) => {
  const currentStep = selectCurrentBookingStep(events, messages);
  const currentIndex = getStepIndex(currentStep);

  // Collect any steps where a tool has succeeded
  const explicitlyCompleted = new Set();

  if (Array.isArray(events)) {
    for (const event of events) {
      if (event.type === 'tool:success' && event.toolName && TOOL_METADATA[event.toolName]) {
        explicitlyCompleted.add(TOOL_METADATA[event.toolName].step);
      }
    }
  }

  // Any step strictly prior to the current phase is also marked completed
  return BOOKING_STEPS.filter((step, index) => {
    if (index < currentIndex) return true;
    if (index === currentIndex && explicitlyCompleted.has(step)) {
      // If at review and booking summary is prepared, review itself is complete
      if (step === 'review') {
        const hasSummary =
          events.some((e) => e.type === 'tool:success' && e.toolName === 'prepare_booking_summary') ||
          messages.some((m) => m.bookingSummary);
        return Boolean(hasSummary);
      }
    }
    return false;
  });
};
