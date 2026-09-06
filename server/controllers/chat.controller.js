import ChatConversation from '../models/chatConversation.model.js';
import { runBookingAssistant } from '../services/chat/chat.service.js';

const MAX_HISTORY = 12;

const cleanHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => ['user', 'assistant'].includes(item?.role) && typeof item?.content === 'string')
    .slice(-MAX_HISTORY)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 1000) }));
};

const respondWithChatError = (res, error) => {
  const status = error.code === 'BUDGET_EXCEEDED' ? 429 : error.code === 'ASSISTANT_UNAVAILABLE' ? 503 : 502;
  return res.status(status).json({ success: false, message: error.message });
};

export const sendChatMessage = async (req, res) => {
  const { message, conversationId, guestHistory } = req.body;
  if (typeof message !== 'string' || !message.trim() || message.length > 1000)
    return res.status(400).json({ success: false, message: 'Message must be between 1 and 1000 characters.' });

  try {
    let conversation = null;
    let history = cleanHistory(guestHistory);
    if (req.user) {
      conversation = conversationId
        ? await ChatConversation.findOne({ _id: conversationId, user: req.user.sub, isActive: true })
        : await ChatConversation.findOne({ user: req.user.sub, isActive: true }).sort({ updatedAt: -1 });
      if (conversationId && !conversation)
        return res.status(404).json({ success: false, message: 'Conversation not found.' });
      history = cleanHistory(conversation?.messages);
    }

    const response = await runBookingAssistant({ message: message.trim(), history });
    if (req.user) {
      if (!conversation) conversation = await ChatConversation.create({ user: req.user.sub });
      conversation.messages.push({ role: 'user', content: message.trim() }, { role: 'assistant', content: response.message });
      conversation.messages = conversation.messages.slice(-MAX_HISTORY);
      conversation.draft = response.bookingSummary;
      await conversation.save();
    }

    return res.json({ success: true, conversationId: conversation?._id || null, ...response });
  } catch (error) {
    return respondWithChatError(res, error);
  }
};

export const getChatConversation = async (req, res) => {
  const conversation = await ChatConversation.findOne({ user: req.user.sub, isActive: true }).sort({ updatedAt: -1 });
  return res.json({ success: true, conversation: conversation || null });
};

export const newChatConversation = async (req, res) => {
  await ChatConversation.updateMany({ user: req.user.sub, isActive: true }, { isActive: false });
  return res.json({ success: true });
};
