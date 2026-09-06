import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';

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
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      setActiveTool(null);
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

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const token = await getToken();
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
                setActiveTool({ name: event.tool, input: event.input });
              } else if (event.type === 'tool_end') {
                setActiveTool(null);
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
                setError(event.message || 'An error occurred during streaming.');
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
        if (reqErr.name === 'AbortError') return;
        setError(reqErr.message || 'The assistant is currently unavailable.');
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
    abortStream();
    setError('');
    setActiveTool(null);
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
  };
};
