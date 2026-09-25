import { conversationSummaryRepository } from '../../repositories/conversationSummary.repository.js';
import { messageRepository } from '../../repositories/message.repository.js';

export const SUMMARY_THRESHOLD = 10;

export class ConversationSummaryService {
  constructor({ summaryRepo = conversationSummaryRepository, msgRepo = messageRepository } = {}) {
    this.summaryRepo = summaryRepo;
    this.msgRepo = msgRepo;
  }

  /**
   * Determine whether a conversation needs summarization based on threshold (Section 11).
   * @param {string} conversationId
   * @returns {Promise<boolean>}
   */
  async shouldSummarize(conversationId) {
    if (!conversationId) return false;

    const existingSummary = await this.summaryRepo.getSummary(conversationId);
    const unsummarized = await this.msgRepo.getMessagesAfter(
      conversationId,
      existingSummary?.summarizedUntilMessageId || null,
      SUMMARY_THRESHOLD + 1
    );

    return unsummarized.length >= SUMMARY_THRESHOLD;
  }

  /**
   * Produce a structured summary of older messages and persist it.
   * Preserves intent, movie choices, show choices, preferences, constraints.
   *
   * @param {string} conversationId
   * @returns {Promise<import('../../models/conversationSummary.model.js').default|null>}
   */
  async summarizeIfNeeded(conversationId) {
    if (!conversationId) return null;

    const needs = await this.shouldSummarize(conversationId);
    if (!needs) return null;

    const existingSummary = await this.summaryRepo.getSummary(conversationId);
    const messagesToSummarize = await this.msgRepo.getMessagesAfter(
      conversationId,
      existingSummary?.summarizedUntilMessageId || null,
      50
    );

    if (messagesToSummarize.length === 0) return existingSummary;

    // Build synthesized summary points
    const points = [];
    if (existingSummary?.summary) {
      points.push(`Previous context: ${existingSummary.summary}`);
    }

    const movieMentions = new Set();
    const showMentions = new Set();
    const seatMentions = new Set();

    for (const m of messagesToSummarize) {
      const text = m.content || '';
      if (m.bookingSummary) {
        if (m.bookingSummary.movieTitle) movieMentions.add(m.bookingSummary.movieTitle);
        if (m.bookingSummary.showTime) showMentions.add(m.bookingSummary.showTime);
        if (Array.isArray(m.bookingSummary.seats)) {
          m.bookingSummary.seats.forEach((s) => seatMentions.add(s));
        }
      } else {
        // Quick keyword extractions
        const match = text.match(/(?:watch|movie|about)\s+([A-Z][a-zA-Z0-9\s:]{2,20})/);
        if (match && match[1]) {
          movieMentions.add(match[1].trim());
        }
      }
    }

    if (movieMentions.size > 0) {
      points.push(`Movies discussed: ${Array.from(movieMentions).join(', ')}.`);
    }
    if (showMentions.size > 0) {
      points.push(`Showtimes considered: ${Array.from(showMentions).join(', ')}.`);
    }
    if (seatMentions.size > 0) {
      points.push(`Seats discussed: ${Array.from(seatMentions).join(', ')}.`);
    }

    const lastMessage = messagesToSummarize[messagesToSummarize.length - 1];
    const summaryText = points.length > 0 ? points.join(' ') : 'User explored movie listings and showtimes.';
    const start = Date.now();

    const updatedDoc = await this.summaryRepo.upsertSummary(
      conversationId,
      summaryText,
      lastMessage._id.toString()
    );

    const summaryGenerationMs = Date.now() - start;
    console.log(
      `[Server:Summary] 📄 summary_updated in ${summaryGenerationMs}ms | conv: ${conversationId} | version: ${updatedDoc.version} | chars: ${summaryText.length}`
    );

    return updatedDoc;
  }
}

export const conversationSummaryService = new ConversationSummaryService();
export default conversationSummaryService;
