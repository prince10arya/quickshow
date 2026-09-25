import Memory from '../../models/memory.model.js';
import { memoryRepository } from '../../repositories/memory.repository.js';

/**
 * @interface MemoryVectorStore
 */
export class MongoMemoryVectorStore {
  constructor(indexName = 'vector_index') {
    this.indexName = indexName;
  }

  /**
   * Search vector memories strictly scoped to a userId.
   * Section 17: Semantic memory must always be scoped to current user.
   * @param {Object} params
   * @param {string} params.userId
   * @param {number[]} params.embedding
   * @param {number} [params.limit=5]
   * @returns {Promise<Memory[]>}
   */
  async search({ userId, embedding, limit = 5 }) {
    if (!userId) return [];
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return memoryRepository.findByUser(userId, { limit });
    }

    try {
      // Atlas Vector Search aggregation pipeline stage
      const pipeline = [
        {
          $vectorSearch: {
            index: this.indexName,
            path: 'embedding',
            queryVector: embedding,
            numCandidates: limit * 10,
            limit,
            filter: {
              userId: String(userId),
            },
          },
        },
      ];

      const results = await Memory.aggregate(pipeline);
      return results;
    } catch (vectorErr) {
      // Graceful fallback when running against local MongoDB or Atlas index is not configured
      console.warn(
        `[MemoryVectorStore] ⚠️ Atlas $vectorSearch unavailable (${vectorErr.message}), falling back to user-scoped repository search.`
      );
      return memoryRepository.findByUser(userId, { limit });
    }
  }
}

export const mongoMemoryVectorStore = new MongoMemoryVectorStore();
export default mongoMemoryVectorStore;
