import mongoose from 'mongoose';
import ChatConversation from '../models/chatConversation.model.js';
import { runBookingAssistant, streamBookingAssistant } from '../services/chat/index.js';

const MAX_HISTORY = 14;

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

export const streamChatMessage = async (req, res) => {
  const { message, conversationId, guestHistory } = req.body;
  if (typeof message !== 'string' || !message.trim() || message.length > 1000) {
    return res.status(400).json({ success: false, message: 'Message must be between 1 and 1000 characters.' });
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendSse = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  };

  try {
    let conversation = null;
    let history = cleanHistory(guestHistory);
    const userId = req.user?.sub || null;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      if (conversationId && mongoose.isValidObjectId(conversationId)) {
        conversation = await ChatConversation.findOne({
          _id: conversationId,
          isActive: true,
          ...(userId ? { user: userId } : {}),
        });
      } else if (userId) {
        conversation = await ChatConversation.findOne({ user: userId, isActive: true }).sort({ updatedAt: -1 });
      }

      if (conversation) {
        history = cleanHistory(conversation.messages);
      }
    }

    const result = await streamBookingAssistant({
      message: message.trim(),
      history,
      onEvent: (event) => {
        sendSse(event);
      },
    });

    // Persist conversation to MongoDB
    let returnedConversationId = conversation?._id?.toString() || conversationId || null;

    if (isDbConnected) {
      if (!conversation) {
        conversation = await ChatConversation.create({
          user: userId,
          messages: [],
        });
      }

      conversation.messages.push(
        { role: 'user', content: message.trim() },
        { role: 'assistant', content: result.message }
      );
      conversation.messages = conversation.messages.slice(-MAX_HISTORY);
      conversation.draft = result.bookingSummary || null;
      await conversation.save();

      returnedConversationId = conversation._id.toString();
    } else if (!returnedConversationId) {
      returnedConversationId = new mongoose.Types.ObjectId().toString();
    }

    sendSse({
      type: 'done',
      conversationId: returnedConversationId,
      message: result.message,
      bookingSummary: result.bookingSummary || null,
      generativeWidgets: result.generativeWidgets || [],
    });

    res.write('data: [DONE]\n\n');
    return res.end();
  } catch (error) {
    console.error('Chat stream error:', error);
    sendSse({
      type: 'error',
      message: error.message || 'The assistant encountered an issue processing your request.',
    });
    res.write('data: [DONE]\n\n');
    return res.end();
  }
};

export const sendChatMessage = async (req, res) => {
  const { message, conversationId, guestHistory } = req.body;
  if (typeof message !== 'string' || !message.trim() || message.length > 1000)
    return res.status(400).json({ success: false, message: 'Message must be between 1 and 1000 characters.' });

  try {
    let conversation = null;
    let history = cleanHistory(guestHistory);
    const userId = req.user?.sub || null;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      if (conversationId && mongoose.isValidObjectId(conversationId)) {
        conversation = await ChatConversation.findOne({
          _id: conversationId,
          isActive: true,
          ...(userId ? { user: userId } : {}),
        });
      } else if (userId) {
        conversation = await ChatConversation.findOne({ user: userId, isActive: true }).sort({ updatedAt: -1 });
      }

      if (conversation) {
        history = cleanHistory(conversation.messages);
      }
    }

    const response = await runBookingAssistant({ message: message.trim(), history });
    let returnedConversationId = conversation?._id?.toString() || conversationId || null;

    if (isDbConnected) {
      if (!conversation) {
        conversation = await ChatConversation.create({
          user: userId,
          messages: [],
        });
      }

      conversation.messages.push(
        { role: 'user', content: message.trim() },
        { role: 'assistant', content: response.message }
      );
      conversation.messages = conversation.messages.slice(-MAX_HISTORY);
      conversation.draft = response.bookingSummary;
      await conversation.save();

      returnedConversationId = conversation._id.toString();
    } else if (!returnedConversationId) {
      returnedConversationId = new mongoose.Types.ObjectId().toString();
    }

    return res.json({
      success: true,
      conversationId: returnedConversationId,
      ...response,
    });
  } catch (error) {
    return respondWithChatError(res, error);
  }
};

export const getChatConversation = async (req, res) => {
  const userId = req.user?.sub || null;
  const conversationId = req.query?.conversationId;
  const isDbConnected = mongoose.connection.readyState === 1;

  if (!isDbConnected) {
    return res.json({ success: true, conversation: null });
  }

  let conversation = null;
  if (conversationId && mongoose.isValidObjectId(conversationId)) {
    conversation = await ChatConversation.findOne({ _id: conversationId, isActive: true });
  } else if (userId) {
    conversation = await ChatConversation.findOne({ user: userId, isActive: true }).sort({ updatedAt: -1 });
  }

  return res.json({ success: true, conversation: conversation || null });
};

export const newChatConversation = async (req, res) => {
  const userId = req.user?.sub || null;
  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    if (userId) {
      await ChatConversation.updateMany({ user: userId, isActive: true }, { isActive: false });
    }
    const newConv = await ChatConversation.create({
      user: userId,
      messages: [],
      isActive: true,
    });
    return res.json({ success: true, conversationId: newConv._id.toString() });
  }

  // Fallback unique ID if DB is connecting
  return res.json({ success: true, conversationId: new mongoose.Types.ObjectId().toString() });
};
