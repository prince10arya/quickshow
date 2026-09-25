/**
 * @typedef {Object} BookingSummary
 * @property {string} bookingId
 * @property {string} movieTitle
 * @property {string} showTime
 * @property {string[]} seats
 * @property {number} amount
 * @property {string} createdAt
 */

/**
 * @typedef {Object} AgentContext
 * @property {import('../../models/message.model.js').default[]} recentMessages
 * @property {string|null} conversationSummary
 * @property {import('../../models/bookingSession.model.js').default|null} bookingState
 * @property {import('../../models/userPreference.model.js').default[]} userPreferences
 * @property {import('../../models/memory.model.js').default[]} relevantMemories
 * @property {BookingSummary[]} recentBookings
 */

export const INTENT_TYPES = Object.freeze({
  BOOKING_ACTION: 'booking_action',
  RECOMMENDATION: 'recommendation',
  HISTORY: 'history',
  CONVERSATION_REFERENCE: 'conversation_reference',
  GENERAL: 'general',
});
