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

    const start = Date.now();
    const queryPreview = query ? `"${query.slice(0, 40)}${query.length > 40 ? '...' : ''}"` : 'empty';

    console.log(
      `[Server:Memory] 🔍 memory_retrieval_started | user: user:${userId.slice(-6)} | intent: ${intent} | query: ${queryPreview}`
    );

    // For pure transactional booking actions ("book 2 seats", "seat G10"), skip semantic memory
    if (intent === INTENT_TYPES.BOOKING_ACTION) {
      console.log(`[Server:Memory] 🧠 memory_retrieval_completed in ${Date.now() - start}ms | skipped (intent: booking_action)`);
      return [];
    }

    try {
      let results = [];

      // If intent is recommendation, prioritize keyword/semantic match
      if (intent === INTENT_TYPES.RECOMMENDATION) {
        const keywords = query
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 3);

        if (keywords.length > 0) {
          results = await this.repo.searchByKeyword(userId, keywords[0], limit);
        }

        if (results.length === 0) {
          results = await this.repo.findByUser(userId, { limit });
        }
      } else {
        // Default retrieval for general queries
        results = await this.repo.findByUser(userId, { limit });
      }

      const memoryRetrievalMs = Date.now() - start;
      console.log(
        `[Server:Memory] 🧠 memory_retrieval_completed in ${memoryRetrievalMs}ms | retrieved: ${results.length} memories`
      );
      return results;
    } catch (err) {
      console.warn(`[Server:Memory] ⚠️ memory_retrieval_failed: ${err.message}. Continuing without memories.`);
      return [];
    }
  }
}

export const memoryRetriever = new MemoryRetriever();
export default memoryRetriever;
