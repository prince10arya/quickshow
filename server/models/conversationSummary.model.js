import mongoose from 'mongoose';

const conversationSummarySchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, unique: true, index: true },
    summary: { type: String, required: true, maxlength: 2000 },
    summarizedUntilMessageId: { type: String, default: null },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

const ConversationSummary = mongoose.model('ConversationSummary', conversationSummarySchema);

export default ConversationSummary;
