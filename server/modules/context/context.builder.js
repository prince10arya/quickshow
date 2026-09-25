import mongoose from 'mongoose';
import { messageRepository } from '../../repositories/message.repository.js';
import { conversationSummaryRepository } from '../../repositories/conversationSummary.repository.js';
import { bookingSessionRepository } from '../../repositories/bookingSession.repository.js';
import { userPreferenceRepository } from '../../repositories/userPreference.repository.js';
import { memoryRetriever } from '../memory/memory.retriever.js';
import Booking from '../../models/booking.model.js';
import { INTENT_TYPES } from './context.types.js';

export class ContextBuilder {
  constructor({
    messageRepo = messageRepository,
    summaryRepo = conversationSummaryRepository,
    bookingRepo = bookingSessionRepository,
    preferenceRepo = userPreferenceRepository,
    retriever = memoryRetriever,
    bookingModel = Booking,
  } = {}) {
    this.messageRepo = messageRepo;
    this.summaryRepo = summaryRepo;
    this.bookingRepo = bookingRepo;
    this.preferenceRepo = preferenceRepo;
    this.memoryRetriever = retriever;
    this.bookingModel = bookingModel;
  }

  /**
   * Classify user intent for intent-aware memory retrieval (Section 19).
   * @param {string} userMessage
   * @returns {string} INTENT_TYPES enum value
   */
  classifyIntent(userMessage = '') {
    const text = userMessage.toLowerCase();

    if (/\b(book|seat|seats|reserve|hold|ticket|tickets|confirm|pay)\b/.test(text)) {
      return INTENT_TYPES.BOOKING_ACTION;
    }
    if (/\b(recommend|suggest|what to watch|good movie|favorite|prefer)\b/.test(text)) {
      return INTENT_TYPES.RECOMMENDATION;
    }
    if (/\b(past|history|last week|my bookings|previous|watched)\b/.test(text)) {
      return INTENT_TYPES.HISTORY;
    }
    if (/\b(earlier|you mentioned|that one|which movie|before)\b/.test(text)) {
      return INTENT_TYPES.CONVERSATION_REFERENCE;
    }

    return INTENT_TYPES.GENERAL;
  }

  /**
   * Retrieve user past bookings when relevant.
   * @param {Object} params
   * @returns {Promise<Array>}
   */
  async getRelevantBookings({ userId, intent }) {
    if (!userId) return [];
    if (intent !== INTENT_TYPES.HISTORY && intent !== INTENT_TYPES.RECOMMENDATION) {
      return [];
    }

    // Skip if MongoDB is not connected (e.g. unit tests)
    if (mongoose.connection.readyState !== 1) {
      return [];
    }

    try {
      const pastBookings = await this.bookingModel.find({ user: String(userId), isPaid: true })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('show')
        .lean();

      return pastBookings.map((b) => ({
        bookingId: String(b._id),
        movieTitle: b.show?.movie?.title || 'Unknown Movie',
        showTime: b.show?.showDateTime ? new Date(b.show.showDateTime).toLocaleString() : 'Recent Show',
        seats: b.bookedSeates || [],
        amount: b.amount || 0,
        createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : '',
      }));
    } catch (err) {
      console.warn('[ContextBuilder] Past bookings retrieval failed:', err.message);
      return [];
    }
  }

  /**
   * Build complete AgentContext by loading independent contexts concurrently (Section 20).
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.conversationId
   * @param {string} params.userMessage
   * @returns {Promise<import('./context.types.js').AgentContext>}
   */
  async build({ userId, conversationId, userMessage }) {
    // 1. Load primary conversational context in parallel
    const [
      recentMessages,
      summaryDoc,
      bookingState,
      userPreferences,
    ] = await Promise.all([
      this.messageRepo.getRecentMessages(conversationId, { limit: 20 }),
      this.summaryRepo.getSummary(conversationId),
      this.bookingRepo.findActiveByConversation(conversationId),
      userId ? this.preferenceRepo.getUserPreferences(userId) : Promise.resolve([]),
    ]);

    // 2. Classify intent to determine targeted memory lookups
    const intent = this.classifyIntent(userMessage);

    // 3. Load long-term context concurrently based on intent
    const [relevantMemories, recentBookings] = await Promise.all([
      userId
        ? this.memoryRetriever.retrieve({
            userId,
            query: userMessage,
            intent,
            bookingState,
          })
        : Promise.resolve([]),
      this.getRelevantBookings({ userId, intent }),
    ]);

    return {
      recentMessages,
      conversationSummary: summaryDoc?.summary || null,
      bookingState,
      userPreferences,
      relevantMemories,
      recentBookings,
    };
  }
}

export const contextBuilder = new ContextBuilder();
export default contextBuilder;
