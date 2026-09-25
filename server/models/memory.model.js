import mongoose from 'mongoose';

export const MEMORY_TYPE = Object.freeze({
  PREFERENCE: 'preference',
  FACT: 'fact',
  INTEREST: 'interest',
  EPISODE: 'episode',
  CONVERSATION_INSIGHT: 'conversation_insight',
});

const memorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    conversationId: { type: String, default: null },
    type: {
      type: String,
      enum: Object.values(MEMORY_TYPE),
      default: MEMORY_TYPE.PREFERENCE,
    },
    content: { type: String, required: true },
    source: {
      type: String,
      enum: ['explicit', 'inferred', 'system'],
      default: 'explicit',
    },
    sourceMessageId: { type: String, default: null },
    confidence: { type: Number, default: 1.0, min: 0, max: 1 },
    importance: { type: Number, default: 0.5, min: 0, max: 1 },
    embedding: { type: [Number], default: undefined },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

memorySchema.index({ userId: 1, type: 1 });
memorySchema.index({ userId: 1, createdAt: -1 });

const Memory = mongoose.model('Memory', memorySchema);

export default Memory;
