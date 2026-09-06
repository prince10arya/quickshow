import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Send, Sparkles, Ticket, X } from 'lucide-react';

import { useAppContext } from '../context/AppContext';

const GUEST_HISTORY_KEY = 'quickshow-guest-chat-history';

const readGuestHistory = () => {
  try {
    const value = JSON.parse(sessionStorage.getItem(GUEST_HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const formatShow = (startsAt) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(startsAt));

const BookingAssistant = ({ onClose }) => {
  const { axios, getToken, navigate, user } = useAppContext();
  const [messages, setMessages] = useState(readGuestHistory);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (user) return;
    sessionStorage.setItem(
      GUEST_HISTORY_KEY,
      JSON.stringify(messages.map(({ role, content }) => ({ role, content })).slice(-12))
    );
  }, [messages, user]);

  useEffect(() => {
    const loadConversation = async () => {
      if (!user) return;
      const token = await getToken();
      if (!token) return;
      try {
        const { data } = await axios.get('/api/chat/conversation', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const conversation = data.conversation;
        if (!conversation) return;
        setConversationId(conversation._id);
        const restored = conversation.messages || [];
        if (conversation.draft && restored.at(-1)?.role === 'assistant') {
          restored[restored.length - 1] = { ...restored.at(-1), bookingSummary: conversation.draft };
        }
        setMessages(restored);
      } catch {
        // Chat remains usable without restored history.
      }
    };
    loadConversation();
  }, [axios, getToken, user]);

  const submit = async (event) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    const userMessage = { role: 'user', content };
    const nextMessages = [...messages, userMessage].slice(-12);
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const token = await getToken();
      const { data } = await axios.post(
        '/api/chat/messages',
        {
          message: content,
          conversationId,
          guestHistory: token ? undefined : messages.map(({ role, content: text }) => ({ role, content: text })).slice(-12),
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      setConversationId(data.conversationId || null);
      setMessages([...nextMessages, { role: 'assistant', content: data.message, bookingSummary: data.bookingSummary }].slice(-12));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The assistant is unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    setError('');
    try {
      const token = await getToken();
      if (token) await axios.post('/api/chat/new', {}, { headers: { Authorization: `Bearer ${token}` } });
      sessionStorage.removeItem(GUEST_HISTORY_KEY);
      setMessages([]);
      setConversationId(null);
    } catch {
      setError('Could not start a new chat.');
    }
  };

  const proceedToPayment = async (summary) => {
    const token = await getToken();
    if (!token) {
      navigate('/login');
      return;
    }
    setPaying(true);
    setError('');
    try {
      const { data } = await axios.post(
        '/api/bookings/create',
        { showId: summary.show.id, selectedSeats: summary.seats },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!data.success) throw new Error(data.message || 'Could not create the booking.');
      window.location.href = data.url;
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Those seats are no longer available.');
      setPaying(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') return onClose();
    if (event.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll('button, textarea, [href]');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 p-3 sm:p-5" role="presentation">
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-assistant-title"
        onKeyDown={handleKeyDown}
        className="ml-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#17131a] shadow-2xl shadow-black/60"
      >
        <header className="flex items-center justify-between border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(248,69,101,0.28),_transparent_45%)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/20 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="booking-assistant-title" className="font-semibold text-white">QuickShow concierge</h2>
              <p className="text-xs text-zinc-400">Find a show, then choose payment.</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={startNewChat} aria-label="Start a new chat" className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-primary">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={onClose} aria-label="Close booking assistant" className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-primary">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
          {!messages.length && (
            <div className="max-w-xs rounded-2xl rounded-tl-sm border border-primary/20 bg-primary/10 p-4 text-sm leading-6 text-zinc-200">
              Tell me the movie, date, time, and number of tickets. For example: “Book 2 tickets for Interstellar tomorrow evening.”
            </div>
          )}
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'ml-auto max-w-[84%]' : 'max-w-[88%]'}>
              <p className={`rounded-2xl p-3 text-sm leading-6 ${message.role === 'user' ? 'rounded-tr-sm bg-primary text-white' : 'rounded-tl-sm bg-white/7 text-zinc-200'}`}>
                {message.content}
              </p>
              {message.bookingSummary && (
                <div className="mt-2 rounded-2xl border border-amber-200/15 bg-amber-100/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-100"><Ticket className="h-4 w-4" aria-hidden="true" /> Booking summary</div>
                  <dl className="mt-3 space-y-2 text-sm text-zinc-300">
                    <div className="flex justify-between gap-4"><dt>Movie</dt><dd className="text-right text-white">{message.bookingSummary.movie.title}</dd></div>
                    <div className="flex justify-between gap-4"><dt>QuickShow</dt><dd className="text-right">{formatShow(message.bookingSummary.show.startsAt)}</dd></div>
                    <div className="flex justify-between gap-4"><dt>Seats</dt><dd className="text-right">{message.bookingSummary.seats.join(', ')}</dd></div>
                    <div className="flex justify-between gap-4"><dt>{message.bookingSummary.ticketCount} tickets</dt><dd className="text-right font-semibold text-white">{import.meta.env.VITE_CURRENCY}{message.bookingSummary.amount}</dd></div>
                  </dl>
                  <button type="button" disabled={paying} onClick={() => proceedToPayment(message.bookingSummary)} className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dull disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    {paying ? 'Opening payment…' : user ? 'Proceed to payment' : 'Sign in to book'}
                  </button>
                </div>
              )}
            </div>
          ))}
          {loading && <p className="text-sm text-zinc-400">Checking current shows…</p>}
          {error && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        </div>

        <form onSubmit={submit} className="border-t border-white/10 p-3">
          <label htmlFor="booking-chat-message" className="sr-only">Ask the booking assistant</label>
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/25 p-2 focus-within:border-primary/70">
            <textarea id="booking-chat-message" ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} maxLength="1000" rows="2" placeholder="Ask about movies and showtimes" className="min-h-11 flex-1 resize-none bg-transparent px-2 py-1 text-sm text-white outline-none placeholder:text-zinc-500" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send message" className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white transition hover:bg-primary-dull disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default BookingAssistant;
