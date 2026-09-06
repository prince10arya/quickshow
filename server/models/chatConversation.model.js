import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 1000 },
  },
  { _id: false, timestamps: true }
);

const chatConversationSchema = new mongoose.Schema(
  {
    user: { type: String, required: false, default: null, index: true },
    messages: { type: [messageSchema], default: [] },
    draft: { type: mongoose.Schema.Types.Mixed, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

chatConversationSchema.index({ user: 1, isActive: 1, updatedAt: -1 });

const ChatConversation = mongoose.model('ChatConversation', chatConversationSchema);

export default ChatConversation;
