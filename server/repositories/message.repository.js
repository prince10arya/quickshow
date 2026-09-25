import Message from '../models/message.model.js';

export class MessageRepository {
  /**
   * Persist a new message into the messages collection.
   * @param {Object} data - { conversationId, role, content, widgets, bookingSummary }
   * @returns {Promise<Message>}
   */
  async createMessage(data) {
    return Message.create({
      conversationId: String(data.conversationId),
      role: data.role,
      content: data.content || '',
      widgets: Array.isArray(data.widgets) ? data.widgets : [],
      bookingSummary: data.bookingSummary || null,
    });
  }

  /**
   * Retrieve bounded recent messages for a conversation in chronological order.
   * Section 9: find({ conversationId }).sort({ createdAt: -1 }).limit(limit). Reverse result.
   * @param {string} conversationId
   * @param {Object} [options]
   * @param {number} [options.limit=20]
   * @param {number} [options.maxTokens] - For future token-based cutoff
   * @returns {Promise<Message[]>} Chronologically ordered array of messages
   */
  async getRecentMessages(conversationId, options = {}) {
    if (!conversationId) return [];

    const limit = Math.max(1, Math.min(options.limit || 20, 100));

    const messagesDesc = await Message.find({
      conversationId: String(conversationId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Reverse to chronological order (oldest -> newest) for LLM context
    const chronological = messagesDesc.reverse();

    if (typeof options.maxTokens === 'number' && options.maxTokens > 0) {
      // Rough token cutoff heuristic (4 chars per token average)
      let accumulatedChars = 0;
      const maxChars = options.maxTokens * 4;
      const trimmed = [];

      for (let i = chronological.length - 1; i >= 0; i--) {
        const msg = chronological[i];
        const len = (msg.content || '').length;
        if (accumulatedChars + len > maxChars && trimmed.length > 0) {
          break;
        }
        accumulatedChars += len;
        trimmed.unshift(msg);
      }
      return trimmed;
    }

    return chronological;
  }

  /**
   * Get messages created after a specific message ID (for summarization).
   * @param {string} conversationId
   * @param {string|null} afterMessageId
   * @param {number} [limit=50]
   * @returns {Promise<Message[]>}
   */
  async getMessagesAfter(conversationId, afterMessageId = null, limit = 50) {
    if (!conversationId) return [];

    const query = { conversationId: String(conversationId) };
    if (afterMessageId) {
      const refMsg = await Message.findById(afterMessageId);
      if (refMsg) {
        query.createdAt = { $gt: refMsg.createdAt };
      }
    }

    return Message.find(query).sort({ createdAt: 1 }).limit(limit).lean();
  }

  /**
   * Count total messages in a conversation.
   * @param {string} conversationId
   * @returns {Promise<number>}
   */
  async countByConversation(conversationId) {
    if (!conversationId) return 0;
    return Message.countDocuments({ conversationId: String(conversationId) });
  }
}

export const messageRepository = new MessageRepository();
export default messageRepository;
