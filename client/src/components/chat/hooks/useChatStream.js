import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { agentEventReducer, INITIAL_AGENT_EVENTS } from '../agent/eventReducer.js';
import { selectActivities, selectCurrentActivity, selectAgentStatus, selectThinkingSteps } from '../agent/activityUtils.js';
import { selectCurrentBookingStep, selectCompletedSteps } from '../agent/bookingProgress.js';

const GUEST_HISTORY_KEY = 'quickshow-guest-chat-history';

const readGuestHistory = () => {
  try {
    const value = JSON.parse(sessionStorage.getItem(GUEST_HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const useChatStream = () => {
  const { axios, getToken, user } = useAppContext();
  const [messages, setMessages] = useState(readGuestHistory);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [error, setError] = useState('');
  const abortControllerRef = useRef(null);

  // Normalized agent event stream
  const [agentEvents, dispatchAgentEvent] = useReducer(agentEventReducer, INITIAL_AGENT_EVENTS);

  // Derived state from the single source of truth (agentEvents)
  const activities = useMemo(() => selectActivities(agentEvents), [agentEvents]);
  const currentActivity = useMemo(() => selectCurrentActivity(agentEvents), [agentEvents]);
  const agentStatus = useMemo(() => selectAgentStatus(agentEvents, loading), [agentEvents, loading]);
  const thinkingSteps = useMemo(() => selectThinkingSteps(agentEvents, loading), [agentEvents, loading]);
  const currentStep = useMemo(() => selectCurrentBookingStep(agentEvents, messages), [agentEvents, messages]);
  const completedSteps = useMemo(() => selectCompletedSteps(agentEvents, messages), [agentEvents, messages]);

  // Sync guest history to session storage
  useEffect(() => {
    if (user) return;
    const cleanToStore = messages
      .slice(-14)
      .map(({ role, content, bookingSummary, widgets }) => ({
        role,
        content,
        bookingSummary,
        widgets,
      }));
    sessionStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(cleanToStore));
  }, [messages, user]);

  // Load existing conversation on mount (or create active conversation ID)
  useEffect(() => {
    let isMounted = true;
    const loadConversation = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get('/api/chat/conversation', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!isMounted) return;

        if (data?.conversation) {
          setConversationId(data.conversation._id);
          const restored = data.conversation.messages || [];
          if (data.conversation.draft && restored.at(-1)?.role === 'assistant') {
            restored[restored.length - 1] = {
              ...restored.at(-1),
              bookingSummary: data.conversation.draft,
            };
          }
          if (restored.length > 0) {
            setMessages(restored);
          }
        } else {
          // Initialize a new conversation ID for this session
          const newRes = await axios.post(
            '/api/chat/new',
            {},
            token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
          );
          if (isMounted && newRes.data?.conversationId) {
            setConversationId(newRes.data.conversationId);
          }
        }
      } catch {
        // Conversation remains usable even if initial load fails
      }
    };

    loadConversation();
    return () => {
      isMounted = false;
    };
  }, [axios, getToken, user]);

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('[Client:Chat] ⏹️ Aborting active stream');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      setActiveTool(null);
      dispatchAgentEvent({
        type: 'AGENT_STATUS',
        payload: { status: 'idle', message: 'Stream stopped' },
      });
    }
  }, []);

  const sendMessage = useCallback(
    async (rawContent) => {
      const content = rawContent?.trim();
      if (!content || loading) return;

      setError('');
      setActiveTool(null);

      const userMsg = { role: 'user', content };
      const currentHistory = [...messages, userMsg];

      // Prepare empty assistant placeholder message for streaming
      const assistantPlaceholder = {
        role: 'assistant',
        content: '',
        widgets: [],
        bookingSummary: null,
        isStreaming: true,
      };

      setMessages([...currentHistory, assistantPlaceholder]);
      setLoading(true);
      dispatchAgentEvent({ type: 'RESET' });

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const token = await getToken();
        console.log('[Client:Chat] 🚀 Dispatching message:', {
          message: content.slice(0, 80),
          conversationId,
          isGuest: !token,
        });

        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const payload = {
          message: content,
          ...(conversationId ? { conversationId } : {}),
          guestHistory: token
            ? undefined
            : messages
                .slice(-14)
                .map(({ role, content: text }) => ({ role, content: text })),
        };

        const baseUrl = import.meta.env.VITE_BASE_URL || '';
        console.log('[Client:Chat] 📡 SSE connection initiated to /api/chat/stream');
        const response = await fetch(`${baseUrl}/api/chat/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let streamedContent = '';
        let tokenCount = 0;
        const accumulatedWidgets = [];
        let finalBookingSummary = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const rawData = trimmed.slice(5).trim();
            if (rawData === '[DONE]') continue;

            try {
              const event = JSON.parse(rawData);

              if (event.type === 'token') {
                if (tokenCount === 0) {
                  console.log('[Client:Chat] 💬 First token received from stream');
                }
                tokenCount++;
                streamedContent += event.token;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: streamedContent,
                    };
                  }
                  return updated;
                });
              } else if (event.type === 'tool_start') {
                console.log(`[Client:Chat] ⚙️ tool_start received: "${event.tool}"`, event.input);
                setActiveTool({ name: event.tool, input: event.input });
                dispatchAgentEvent({
                  type: 'TOOL_START',
                  payload: { toolName: event.tool, input: event.input, timestamp: Date.now() },
                });
              } else if (event.type === 'tool_end') {
                console.log(`[Client:Chat] ⚙️ tool_end received: "${event.tool}"`, {
                  hasWidget: !!event.widget,
                  widgetType: event.widget?.type,
                });
                setActiveTool(null);
                dispatchAgentEvent({
                  type: 'TOOL_SUCCESS',
                  payload: {
                    toolName: event.tool,
                    output: event.output,
                    timestamp: Date.now(),
                  },
                });

                if (event.widget) {
                  accumulatedWidgets.push(event.widget);
                  if (event.widget.type === 'booking_summary') {
                    finalBookingSummary = event.widget.bookingSummary;
                  }
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        widgets: [...accumulatedWidgets],
                        bookingSummary: finalBookingSummary || updated[lastIndex].bookingSummary,
                      };
                    }
                    return updated;
                  });
                }
              } else if (event.type === 'ui') {
                console.log(`[Client:Chat] 🎨 ui event received: ${event.widget?.type}`);
                if (event.widget) {
                  accumulatedWidgets.push(event.widget);
                  if (event.widget.type === 'booking_summary') {
                    finalBookingSummary = event.widget.bookingSummary;
                  }
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        widgets: [...accumulatedWidgets],
                        bookingSummary: finalBookingSummary || updated[lastIndex].bookingSummary,
                      };
                    }
                    return updated;
                  });
                }
              } else if (event.type === 'done') {
                console.log('[Client:Chat] ✅ Stream complete [done]:', {
                  conversationId: event.conversationId,
                  chars: streamedContent.length,
                  tokenCount,
                  widgets: accumulatedWidgets.length,
                  hasBookingSummary: !!event.bookingSummary,
                });
                if (event.conversationId) {
                  setConversationId(event.conversationId);
                }
                if (event.bookingSummary) finalBookingSummary = event.bookingSummary;

                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: streamedContent || event.message || updated[lastIndex].content,
                      bookingSummary: finalBookingSummary,
                      widgets: accumulatedWidgets.length ? accumulatedWidgets : event.generativeWidgets || [],
                      isStreaming: false,
                    };
                  }
                  return updated;
                });
              } else if (event.type === 'error') {
                console.error('[Client:Chat] ❌ Stream error event:', event.message);
                setError(event.message || 'An error occurred during streaming.');
                dispatchAgentEvent({
                  type: 'TOOL_ERROR',
                  payload: {
                    message: event.message,
                    timestamp: Date.now(),
                  },
                });
              }
            } catch (parseErr) {
              console.warn('Could not parse SSE chunk:', rawData, parseErr);
            }
          }
        }

        // Finalize streaming state
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
            updated[lastIndex] = {
              ...updated[lastIndex],
              isStreaming: false,
            };
          }
          return updated;
        });
      } catch (reqErr) {
        if (reqErr.name === 'AbortError') {
          console.log('[Client:Chat] ⏹️ Stream aborted by user');
          return;
        }
        console.error('[Client:Chat] ❌ Stream request failed:', reqErr.message);
        setError(reqErr.message || 'The assistant is currently unavailable.');
        dispatchAgentEvent({
          type: 'TOOL_ERROR',
          payload: {
            message: reqErr.message || 'The assistant is currently unavailable.',
            timestamp: Date.now(),
          },
        });
        // Clean up empty assistant message on failure
        setMessages((prev) => {
          const last = prev.at(-1);
          if (last?.role === 'assistant' && !last.content && !last.widgets?.length) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } finally {
        setLoading(false);
        setActiveTool(null);
        abortControllerRef.current = null;
      }
    },
    [conversationId, getToken, loading, messages]
  );

  const startNewChat = useCallback(async () => {
    console.log('[Client:Chat] 🔄 Starting new chat session');
    abortStream();
    setError('');
    setActiveTool(null);
    dispatchAgentEvent({ type: 'RESET' });
    try {
      const token = await getToken();
      const { data } = await axios.post(
        '/api/chat/new',
        {},
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      sessionStorage.removeItem(GUEST_HISTORY_KEY);
      setMessages([]);
      if (data?.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch {
      setError('Could not start a new chat.');
    }
  }, [abortStream, axios, getToken]);

  return {
    messages,
    loading,
    error,
    activeTool,
    conversationId,
    sendMessage,
    abortStream,
    startNewChat,
    // Agentic state
    agentEvents,
    activities,
    currentActivity,
    agentStatus,
    thinkingSteps,
    currentStep,
    completedSteps,
  };
};

export default useChatStream;
