import { createSlice } from '@reduxjs/toolkit';

const CHAT_MESSAGES_KEY = 'quickshow-session-chat-messages';
const CHAT_CONV_ID_KEY = 'quickshow-session-chat-conversation-id';
const LEGACY_GUEST_KEY = 'quickshow-guest-chat-history';

const safeGetItem = (key) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key, value) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore quota/security errors
  }
};

const safeRemoveItem = (key) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
};

export const loadInitialChatMessages = () => {
  const stored = safeGetItem(CHAT_MESSAGES_KEY) || safeGetItem(LEGACY_GUEST_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const loadInitialConversationId = () => {
  return safeGetItem(CHAT_CONV_ID_KEY) || null;
};

const syncMessagesToStorage = (messages) => {
  const serializable = messages.slice(-14).map((msg) => ({
    role: msg.role,
    content: msg.content || '',
    widgets: Array.isArray(msg.widgets) ? msg.widgets : [],
    bookingSummary: msg.bookingSummary || null,
  }));
  const json = JSON.stringify(serializable);
  safeSetItem(CHAT_MESSAGES_KEY, json);
  safeSetItem(LEGACY_GUEST_KEY, json);
};

const initialState = {
  messages: loadInitialChatMessages(),
  conversationId: loadInitialConversationId(),
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChatMessages: (state, action) => {
      state.messages = Array.isArray(action.payload) ? action.payload : [];
      syncMessagesToStorage(state.messages);
    },
    addChatMessage: (state, action) => {
      if (action.payload) {
        state.messages.push(action.payload);
        if (state.messages.length > 20) {
          state.messages = state.messages.slice(-20);
        }
        syncMessagesToStorage(state.messages);
      }
    },
    updateLastChatMessage: (state, action) => {
      const lastIndex = state.messages.length - 1;
      if (lastIndex >= 0 && action.payload) {
        state.messages[lastIndex] = {
          ...state.messages[lastIndex],
          ...action.payload,
        };
        syncMessagesToStorage(state.messages);
      }
    },
    setChatConversationId: (state, action) => {
      state.conversationId = action.payload || null;
      if (state.conversationId) {
        safeSetItem(CHAT_CONV_ID_KEY, state.conversationId);
      } else {
        safeRemoveItem(CHAT_CONV_ID_KEY);
      }
    },
    resetChat: (state) => {
      state.messages = [];
      state.conversationId = null;
      safeRemoveItem(CHAT_MESSAGES_KEY);
      safeRemoveItem(CHAT_CONV_ID_KEY);
      safeRemoveItem(LEGACY_GUEST_KEY);
    },
  },
});

export const {
  setChatMessages,
  addChatMessage,
  updateLastChatMessage,
  setChatConversationId,
  resetChat,
} = chatSlice.actions;

export const selectChatMessages = (state) => state.chat.messages;
export const selectChatConversationId = (state) => state.chat.conversationId;

export default chatSlice.reducer;
