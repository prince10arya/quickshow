import { mongoMemoryVectorStore } from './memory.vectorStore.js';
import { memoryRepository } from '../../repositories/memory.repository.js';
import { INTENT_TYPES } from '../context/context.types.js';

export class MemoryRetriever {
  constructor(vectorStore = mongoMemoryVectorStore, repo = memoryRepository) {
    this.vectorStore = vectorStore;
    this.repo = repo;
  }

  /**
   * Retrieve relevant memories based on intent and query.
   * Section 18 & 19: Intent-aware retrieval with user isolation.
   * Section 39: Failure handling - never throws, gracefully returns empty array.
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.query
   * @param {string} [params.intent=INTENT_TYPES.GENERAL]
   * @param {Object} [params.bookingState]
   * @param {number} [params.limit=5]
   * @returns {Promise<Memory[]>}
   */
  async retrieve({ userId, query, intent = INTENT_TYPES.GENERAL, bookingState = null, limit = 5 }) {
    if (!userId) return [];

    // For pure transactional booking actions ("book 2 seats", "seat G10"), skip semantic memory
    if (intent === INTENT_TYPES.BOOKING_ACTION) {
      return [];
    }

    try {
      // If intent is recommendation or general, retrieve preferences and facts
      if (intent === INTENT_TYPES.RECOMMENDATION) {
        // Extract keywords from query or fetch user preferences/facts
        const keywords = query
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 3);

        if (keywords.length > 0) {
          const matched = await this.repo.searchByKeyword(userId, keywords[0], limit);
          if (matched.length > 0) return matched;
        }

        return this.repo.findByUser(userId, { limit });
      }

      // Default retrieval for general queries
      return this.repo.findByUser(userId, { limit });
    } catch (err) {
      console.warn(`[MemoryRetriever] ⚠️ Memory retrieval failed: ${err.message}. Continuing without memories.`);
      return [];
    }
  }
}

export const memoryRetriever = new MemoryRetriever();
export default memoryRetriever;
