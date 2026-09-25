import AgentEvent, { AGENT_EVENT_STATUS } from '../models/agentEvent.model.js';

export class AgentEventRepository {
  /**
   * Persist a new agent event.
   * @param {Object} data
   * @returns {Promise<AgentEvent>}
   */
  async createEvent(data) {
    return AgentEvent.create({
      conversationId: String(data.conversationId),
      messageId: data.messageId ? String(data.messageId) : null,
      type: data.type,
      toolName: data.toolName || null,
      status: data.status || AGENT_EVENT_STATUS.PENDING,
      message: data.message || null,
      metadata: data.metadata || {},
      startedAt: data.startedAt || new Date(),
      completedAt: data.completedAt || null,
      durationMs: typeof data.durationMs === 'number' ? data.durationMs : null,
    });
  }

  /**
   * Update an existing event (e.g. marking tool:success or tool:error with duration).
   * @param {string} eventId
   * @param {Object} updates
   * @returns {Promise<AgentEvent|null>}
   */
  async updateEvent(eventId, updates) {
    if (!eventId) return null;
    return AgentEvent.findByIdAndUpdate(
      eventId,
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Find events for a conversation in chronological sequence.
   * @param {string} conversationId
   * @param {number} [limit=50]
   * @returns {Promise<AgentEvent[]>}
   */
  async findByConversation(conversationId, limit = 50) {
    if (!conversationId) return [];
    return AgentEvent.find({ conversationId: String(conversationId) })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
  }
}

export const agentEventRepository = new AgentEventRepository();
export default agentEventRepository;
