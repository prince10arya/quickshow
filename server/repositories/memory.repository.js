import Memory from '../models/memory.model.js';

export class MemoryRepository {
  /**
   * Create a memory record strictly tied to userId.
   * @param {Object} data
   * @returns {Promise<Memory>}
   */
  async create(data) {
    if (!data.userId) {
      throw new Error('userId is strictly required for memory creation');
    }

    return Memory.create({
      userId: String(data.userId),
      conversationId: data.conversationId ? String(data.conversationId) : null,
      type: data.type || 'preference',
      content: data.content,
      source: data.source || 'explicit',
      sourceMessageId: data.sourceMessageId ? String(data.sourceMessageId) : null,
      confidence: typeof data.confidence === 'number' ? data.confidence : 1.0,
      importance: typeof data.importance === 'number' ? data.importance : 0.5,
      embedding: Array.isArray(data.embedding) ? data.embedding : undefined,
      metadata: data.metadata || {},
    });
  }

  /**
   * Find memories strictly scoped to a userId.
   * @param {string} userId
   * @param {Object} [options]
   * @param {string} [options.type]
   * @param {number} [options.limit=10]
   * @param {number} [options.minConfidence=0.5]
   * @returns {Promise<Memory[]>}
   */
  async findByUser(userId, options = {}) {
    if (!userId) return [];

    const query = {
      userId: String(userId),
      confidence: { $gte: options.minConfidence ?? 0.5 },
    };

    if (options.type) {
      query.type = options.type;
    }

    const limit = Math.max(1, Math.min(options.limit || 10, 50));

    return Memory.find(query).sort({ importance: -1, createdAt: -1 }).limit(limit).lean();
  }

  /**
   * Keyword/regex search fallback strictly scoped to userId.
   * @param {string} userId
   * @param {string} keyword
   * @param {number} [limit=5]
   * @returns {Promise<Memory[]>}
   */
  async searchByKeyword(userId, keyword, limit = 5) {
    if (!userId || !keyword) return [];

    const safeRegex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    return Memory.find({
      userId: String(userId),
      content: safeRegex,
    })
      .sort({ importance: -1, createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Delete memory strictly scoped to userId.
   * @param {string} memoryId
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async delete(memoryId, userId) {
    if (!memoryId || !userId) return false;
    const res = await Memory.deleteOne({ _id: memoryId, userId: String(userId) });
    return res.deletedCount > 0;
  }
}

export const memoryRepository = new MemoryRepository();
export default memoryRepository;
