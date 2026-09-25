import { userPreferenceRepository } from '../../repositories/userPreference.repository.js';
import { memoryRepository } from '../../repositories/memory.repository.js';
import { MEMORY_TYPE } from '../../models/memory.model.js';

const NOISE_WORDS = new Set([
  'ok',
  'okay',
  'thanks',
  'thank you',
  'yes',
  'no',
  'sure',
  'show me',
  'hi',
  'hello',
  'hey',
  'cool',
  'got it',
  'great',
]);

export class MemoryExtractor {
  constructor({ prefRepo = userPreferenceRepository, memRepo = memoryRepository } = {}) {
    this.prefRepo = prefRepo;
    this.memRepo = memRepo;
  }

  /**
   * Determine if message is conversational filler (Section 29).
   * @param {string} text
   * @returns {boolean}
   */
  isNoise(text) {
    if (!text || typeof text !== 'string') return true;
    const clean = text.trim().toLowerCase().replace(/[!.?]/g, '');
    return clean.length < 3 || NOISE_WORDS.has(clean);
  }

  /**
   * Extract explicit or inferred preferences from a user message.
   * Section 28 & 29: Only store stable, relevant information.
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.conversationId
   * @param {string} params.messageId
   * @param {string} params.text
   * @returns {Promise<Array>} Extracted preference objects
   */
  async extractAndPersist({ userId, conversationId, messageId, text }) {
    if (!userId || !text || this.isNoise(text)) return [];

    console.log(
      `[Server:Memory] 📝 memory_extraction_started | user: user:${userId.slice(-6)} | text: "${text.slice(0, 40)}${text.length > 40 ? '...' : ''}"`
    );

    const lower = text.toLowerCase();
    const extracted = [];

    // 1. Format preferences (e.g., IMAX, 3D, 2D, 4DX)
    const formatMatch = lower.match(/\b(always|prefer|only watch in|like)\s+(imax|3d|4dx|2d|dolby)\b/);
    if (formatMatch) {
      const format = formatMatch[2].toUpperCase();
      const pref = {
        key: 'preferred_format',
        value: format,
        source: 'explicit',
        confidence: 1.0,
      };
      await this.prefRepo.upsertPreference({
        userId,
        ...pref,
      });
      await this.memRepo.create({
        userId,
        conversationId,
        sourceMessageId: messageId,
        type: MEMORY_TYPE.PREFERENCE,
        content: `User prefers ${format} format movies.`,
        source: 'explicit',
        confidence: 1.0,
        importance: 0.9,
      });
      console.log(`[Server:Memory] ✨ memory_created | user: user:${userId.slice(-6)} | key: ${pref.key} | val: ${pref.value} (${pref.source})`);
      extracted.push(pref);
    }

    // 2. Genre preferences
    const genreMatch = lower.match(/\b(love|prefer|favorite genre is|into)\s+(sci-fi|action|comedy|horror|drama|romance|thriller|anime)\b/);
    if (genreMatch) {
      const genre = genreMatch[2];
      const pref = {
        key: 'preferred_genre',
        value: genre,
        source: 'explicit',
        confidence: 1.0,
      };
      await this.prefRepo.upsertPreference({
        userId,
        ...pref,
      });
      await this.memRepo.create({
        userId,
        conversationId,
        sourceMessageId: messageId,
        type: MEMORY_TYPE.INTEREST,
        content: `User prefers ${genre} movies.`,
        source: 'explicit',
        confidence: 1.0,
        importance: 0.8,
      });
      console.log(`[Server:Memory] ✨ memory_created | user: user:${userId.slice(-6)} | key: ${pref.key} | val: ${pref.value} (${pref.source})`);
      extracted.push(pref);
    }

    // 3. Time of day preferences (morning, afternoon, evening, night)
    const timeMatch = lower.match(/\b(prefer|usually watch|like)\s+(morning|afternoon|evening|night)\s+(shows|movies)?\b/);
    if (timeMatch) {
      const time = timeMatch[2];
      const pref = {
        key: 'preferred_time',
        value: time,
        source: 'explicit',
        confidence: 1.0,
      };
      await this.prefRepo.upsertPreference({
        userId,
        ...pref,
      });
      await this.memRepo.create({
        userId,
        conversationId,
        sourceMessageId: messageId,
        type: MEMORY_TYPE.PREFERENCE,
        content: `User prefers ${time} shows.`,
        source: 'explicit',
        confidence: 1.0,
        importance: 0.7,
      });
      console.log(`[Server:Memory] ✨ memory_created | user: user:${userId.slice(-6)} | key: ${pref.key} | val: ${pref.value} (${pref.source})`);
      extracted.push(pref);
    }

    return extracted;
  }
}

export const memoryExtractor = new MemoryExtractor();
export default memoryExtractor;
