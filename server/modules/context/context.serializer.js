export const CONTEXT_LIMITS = {
  MAX_RECENT_MESSAGES: 20,
  MAX_SUMMARY_CHARS: 1000,
  MAX_MEMORIES: 5,
  MAX_MEMORY_CHARS: 500,
  MAX_BOOKINGS: 3,
};

export class ContextSerializer {
  /**
   * Serialize AgentContext into bounded, sanitized Markdown context for the LLM.
   * Section 21 & 38: Strips DB metadata, enforces context limits, formats cleanly.
   *
   * @param {import('./context.types.js').AgentContext} context
   * @param {string} currentRequest
   * @returns {string}
   */
  serialize(context, currentRequest = '') {
    if (!context) return '';

    const sections = [];

    // 1. Current Booking State
    if (context.bookingState) {
      const b = context.bookingState;
      const bookingLines = [
        '## CURRENT BOOKING SESSION',
        `Status: ${b.status || 'browsing'}`,
      ];
      if (b.movieTitle) bookingLines.push(`Movie: ${b.movieTitle}`);
      if (b.showId) bookingLines.push(`Show ID: ${b.showId}`);
      if (b.theatreId) bookingLines.push(`Theatre: ${b.theatreId}`);
      if (b.seatCount > 0) bookingLines.push(`Seats requested: ${b.seatCount}`);
      if (Array.isArray(b.selectedSeats) && b.selectedSeats.length > 0) {
        bookingLines.push(`Selected seats: ${b.selectedSeats.join(', ')}`);
      }
      sections.push(bookingLines.join('\n'));
    }

    // 2. User Preferences
    if (Array.isArray(context.userPreferences) && context.userPreferences.length > 0) {
      const prefLines = ['## USER PREFERENCES'];
      for (const p of context.userPreferences) {
        const valStr = Array.isArray(p.value) ? p.value.join(', ') : String(p.value);
        prefLines.push(`- ${p.key}: ${valStr} (${p.source})`);
      }
      sections.push(prefLines.join('\n'));
    }

    // 3. Conversation Summary
    if (context.conversationSummary && typeof context.conversationSummary === 'string') {
      const truncated = context.conversationSummary.slice(0, CONTEXT_LIMITS.MAX_SUMMARY_CHARS);
      sections.push(`## CONVERSATION SUMMARY\n${truncated}`);
    }

    // 4. Relevant Long-Term Memory
    if (Array.isArray(context.relevantMemories) && context.relevantMemories.length > 0) {
      const memLines = ['## RELEVANT MEMORY'];
      const sliced = context.relevantMemories.slice(0, CONTEXT_LIMITS.MAX_MEMORIES);
      for (const m of sliced) {
        const content = (m.content || '').slice(0, CONTEXT_LIMITS.MAX_MEMORY_CHARS);
        memLines.push(`- ${content}`);
      }
      sections.push(memLines.join('\n'));
    }

    // 5. Past Relevant Bookings
    if (Array.isArray(context.recentBookings) && context.recentBookings.length > 0) {
      const bLines = ['## PAST BOOKINGS'];
      const slicedBookings = context.recentBookings.slice(0, CONTEXT_LIMITS.MAX_BOOKINGS);
      for (const b of slicedBookings) {
        const seatsStr = Array.isArray(b.seats) ? b.seats.join(', ') : '';
        bLines.push(`- ${b.movieTitle || 'Movie'} (${b.showTime || 'Date'}) - Seats: ${seatsStr}`);
      }
      sections.push(bLines.join('\n'));
    }

    // 6. Recent Conversation
    if (Array.isArray(context.recentMessages) && context.recentMessages.length > 0) {
      const recent = context.recentMessages.slice(-CONTEXT_LIMITS.MAX_RECENT_MESSAGES);
      const msgLines = ['## RECENT CONVERSATION'];
      for (const msg of recent) {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        const content = (msg.content || '').trim();
        if (content) {
          msgLines.push(`${role}: ${content}`);
        }
      }
      sections.push(msgLines.join('\n'));
    }

    // 7. Current Request
    if (currentRequest && typeof currentRequest === 'string') {
      sections.push(`## CURRENT REQUEST\n${currentRequest.trim()}`);
    }

    return sections.join('\n\n');
  }
}

export const contextSerializer = new ContextSerializer();
export default contextSerializer;
