import mongoose from 'mongoose';
import ChatConversation from '../models/chatConversation.model.js';
import { runBookingAssistant, streamBookingAssistant } from '../services/chat/index.js';
import { AppError } from '../errors/appError.js';

const MAX_HISTORY = 14;

const cleanHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => ['user', 'assistant'].includes(item?.role) && typeof item?.content === 'string')
    .slice(-MAX_HISTORY)
    .map((item) => ({ role: item.role, content: item.content }));
};

const respondWithChatError = (res, error, next) => {
  if (error instanceof AppError) {
    return next(error);
  }
  const status = error.code === 'BUDGET_EXCEEDED' ? 429 : error.code === 'ASSISTANT_UNAVAILABLE' ? 503 : 502;
  return res.status(status).json({
    success: false,
    message: error.message || 'Chat service encountered an error.',
    code: error.code || 'CHAT_ERROR',
  });
};

export const streamChatMessage = async (req, res) => {
  const { message, conversationId, guestHistory } = req.body;
  const userId = req.user?.sub || null;
  const userLabel = userId ? `user:${userId.slice(-6)}` : 'guest';
  const preview = typeof message === 'string' ? `"${message.trim().slice(0, 50)}${message.length > 50 ? '...' : ''}"` : 'invalid';

  console.log(`[Server:Chat] 📥 POST /api/chat/stream | ${userLabel} | conv: ${conversationId || 'new'} | msg: ${preview}`);

  if (typeof message !== 'string' || !message.trim() || message.length > 1000) {
    console.warn(`[Server:Chat] ⚠️ Bad message length (${message?.length || 0})`);
    return res.status(400).json({ success: false, message: 'Message must be between 1 and 1000 characters.' });
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const sendSse = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  };

  try {
    let conversation = null;
    let history = cleanHistory(guestHistory);
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

    console.log(`[Server:Chat] ⚙️ Delegating to streamBookingAssistant (history: ${history.length} msgs)`);

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

    console.log(
      `[Server:Chat] 📤 SSE Stream finished for conv: ${returnedConversationId} | chars: ${result.message?.length || 0} | widgets: ${result.generativeWidgets?.length || 0}`
    );

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
    console.error(`[Server:Chat] ❌ Stream error:`, error.message);
    sendSse({
      type: 'error',
      code: error.code || 'CHAT_STREAM_ERROR',
      message: error.message || 'The assistant encountered an issue processing your request.',
    });
    res.write('data: [DONE]\n\n');
    return res.end();
  }
};

export const sendChatMessage = async (req, res, next) => {
  const { message, conversationId, guestHistory } = req.body;
  const userId = req.user?.sub || null;
  const userLabel = userId ? `user:${userId.slice(-6)}` : 'guest';
  const preview = typeof message === 'string' ? `"${message.trim().slice(0, 50)}${message.length > 50 ? '...' : ''}"` : 'invalid';

  console.log(`[Server:Chat] 📥 POST /api/chat/message | ${userLabel} | conv: ${conversationId || 'new'} | msg: ${preview}`);

  if (typeof message !== 'string' || !message.trim() || message.length > 1000)
    return res.status(400).json({ success: false, message: 'Message must be between 1 and 1000 characters.' });

  try {
    let conversation = null;
    let history = cleanHistory(guestHistory);
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

    console.log(`[Server:Chat] 📤 Responding to POST /api/chat/message for conv: ${returnedConversationId}`);

    return res.json({
      success: true,
      conversationId: returnedConversationId,
      ...response,
    });
  } catch (error) {
    console.error(`[Server:Chat] ❌ sendChatMessage error:`, error.message);
    return respondWithChatError(res, error, next);
  }
};

export const getChatConversation = async (req, res, next) => {
  try {
    const userId = req.user?.sub || null;
    const conversationId = req.query?.conversationId;
    const isDbConnected = mongoose.connection.readyState === 1;

    console.log(`[Server:Chat] 🔍 GET /api/chat/conversation | user: ${userId || 'guest'} | conv: ${conversationId || 'default'}`);

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
  } catch (err) {
    return next(err);
  }
};

export const newChatConversation = async (req, res, next) => {
  try {
    const userId = req.user?.sub || null;
    const isDbConnected = mongoose.connection.readyState === 1;

    console.log(`[Server:Chat] 🆕 POST /api/chat/new | user: ${userId || 'guest'}`);

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
  } catch (err) {
    return next(err);
  }
};
