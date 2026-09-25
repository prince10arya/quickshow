import UserPreference from '../models/userPreference.model.js';

export class UserPreferenceRepository {
  /**
   * Get all preferences for a user.
   * @param {string} userId
   * @returns {Promise<UserPreference[]>}
   */
  async getUserPreferences(userId) {
    if (!userId) return [];
    return UserPreference.find({ userId: String(userId) }).lean();
  }

  /**
   * Get a specific preference key for a user.
   * @param {string} userId
   * @param {string} key
   * @returns {Promise<UserPreference|null>}
   */
  async getPreference(userId, key) {
    if (!userId || !key) return null;
    return UserPreference.findOne({ userId: String(userId), key: String(key) }).lean();
  }

  /**
   * Upsert a user preference respecting the rule:
   * "Explicit user statements should take precedence over inferred preferences."
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.key
   * @param {any} params.value
   * @param {'explicit'|'inferred'|'system'} [params.source='explicit']
   * @param {number} [params.confidence=1.0]
   * @returns {Promise<UserPreference|null>}
   */
  async upsertPreference({ userId, key, value, source = 'explicit', confidence = 1.0 }) {
    if (!userId || !key) return null;

    const existing = await UserPreference.findOne({
      userId: String(userId),
      key: String(key),
    });

    if (existing) {
      // If existing is explicit and incoming is inferred, preserve explicit preference
      if (existing.source === 'explicit' && source === 'inferred') {
        return existing;
      }

      existing.value = value;
      existing.source = source;
      existing.confidence = confidence;
      existing.updatedAt = new Date();
      return existing.save();
    }

    // Insert new preference
    return UserPreference.create({
      userId: String(userId),
      key: String(key),
      value,
      source,
      confidence,
    });
  }

  /**
   * Remove a user preference.
   * @param {string} userId
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async deletePreference(userId, key) {
    if (!userId || !key) return false;
    const res = await UserPreference.deleteOne({ userId: String(userId), key: String(key) });
    return res.deletedCount > 0;
  }
}

export const userPreferenceRepository = new UserPreferenceRepository();
export default userPreferenceRepository;
