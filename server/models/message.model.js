import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: false, maxlength: 4000 },
    widgets: { type: [mongoose.Schema.Types.Mixed], default: [] },
    bookingSummary: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
