import ConversationSummary from '../models/conversationSummary.model.js';

export class ConversationSummaryRepository {
  /**
   * Get the current summary for a conversation.
   * @param {string} conversationId
   * @returns {Promise<ConversationSummary|null>}
   */
  async getSummary(conversationId) {
    if (!conversationId) return null;
    return ConversationSummary.findOne({ conversationId: String(conversationId) }).lean();
  }

  /**
   * Upsert conversation summary and advance summarizedUntilMessageId.
   * @param {string} conversationId
   * @param {string} summary
   * @param {string} summarizedUntilMessageId
   * @returns {Promise<ConversationSummary>}
   */
  async upsertSummary(conversationId, summary, summarizedUntilMessageId) {
    if (!conversationId) throw new Error('conversationId is required');

    return ConversationSummary.findOneAndUpdate(
      { conversationId: String(conversationId) },
      {
        $set: {
          summary: summary.slice(0, 2000),
          summarizedUntilMessageId: summarizedUntilMessageId ? String(summarizedUntilMessageId) : null,
          updatedAt: new Date(),
        },
        $inc: { version: 1 },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

export const conversationSummaryRepository = new ConversationSummaryRepository();
export default conversationSummaryRepository;
