import mongoose from 'mongoose';

export const AGENT_EVENT_TYPE = Object.freeze({
  TOOL_START: 'tool:start',
  TOOL_SUCCESS: 'tool:success',
  TOOL_ERROR: 'tool:error',
  AGENT_STATUS: 'agent:status',
});

export const AGENT_EVENT_STATUS = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
});

const agentEventSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true },
    messageId: { type: String, default: null },
    type: {
      type: String,
      enum: Object.values(AGENT_EVENT_TYPE),
      required: true,
    },
    toolName: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(AGENT_EVENT_STATUS),
      default: AGENT_EVENT_STATUS.PENDING,
    },
    message: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null },
  },
  { timestamps: true }
);

agentEventSchema.index({ conversationId: 1, createdAt: 1 });

const AgentEvent = mongoose.model('AgentEvent', agentEventSchema);

export default AgentEvent;
