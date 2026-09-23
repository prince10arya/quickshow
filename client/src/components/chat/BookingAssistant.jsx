import { useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import ChatMessageList from './ChatMessageList';
import BookingProgress from './BookingProgress/BookingProgress';
import AgentStatus from './AgentStatus/AgentStatus';
import AgentActivityLog from './AgentActivityLog/AgentActivityLog';
import { useChatStream } from './hooks/useChatStream';

export const BookingAssistant = ({ onClose }) => {
  const { axios, getToken, navigate, user } = useAppContext();
  const {
    messages,
    loading,
    error,
    activeTool,
    sendMessage,
    abortStream,
    startNewChat,
    // Agentic Stepper, Status & Activity Log state
    activities,
    agentStatus,
    currentStep,
    completedSteps,
  } = useChatStream();

  const [input, setInput] = useState('');
  const [paying, setPaying] = useState(false);
  const [actionError, setActionError] = useState('');
  const panelRef = useRef(null);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setActionError('');
    sendMessage(text);
  };

  const handleSelectPrompt = (prompt) => {
    if (loading) return;
    setInput('');
    setActionError('');
    sendMessage(prompt);
  };

  const proceedToPayment = async (summary) => {
    const token = await getToken();
    if (!token) {
      navigate('/login');
      return;
    }
    setPaying(true);
    setActionError('');
    try {
      const { data } = await axios.post(
        '/api/bookings/create',
        { showId: summary.show.id, selectedSeats: summary.seats },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!data.success) throw new Error(data.message || 'Could not create the booking.');
      window.location.href = data.url;
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Those seats are no longer available. Please choose another slot.'
      );
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

  const displayedError = actionError || error;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-2 sm:p-5 flex items-end sm:items-center justify-end" role="presentation">
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-assistant-title"
        onKeyDown={handleKeyDown}
        className="flex h-[94vh] sm:h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#161218] shadow-2xl shadow-black/80"
      >
        {/* Header */}
        <ChatHeader onStartNewChat={startNewChat} onClose={onClose} />

        {/* 1. Stepper / Dynamic Booking Progress Indicator */}
        <BookingProgress currentStep={currentStep} completedSteps={completedSteps} />

        {/* Message Feed */}
        <ChatMessageList
          messages={messages}
          activeTool={activeTool}
          loading={loading}
          user={user}
          paying={paying}
          onProceedToPayment={proceedToPayment}
          onSelectPrompt={handleSelectPrompt}
        />

        {/* 2 & 3. Live Status Loader & Expandable Agent Activity Log */}
        {(loading || activities.length > 0) && (
          <div className="space-y-1.5 border-t border-white/10 bg-zinc-950/70 px-3 py-2 backdrop-blur-md">
            <AgentStatus status={agentStatus.status} label={agentStatus.label} />
            {activities.length > 0 && (
              <AgentActivityLog activities={activities} />
            )}
          </div>
        )}

        {/* Error Alert */}
        {displayedError && (
          <div className="px-4 py-1">
            <p
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
            >
              {displayedError}
            </p>
          </div>
        )}

        {/* Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          onAbort={abortStream}
          loading={loading}
        />
      </section>
    </div>
  );
};

export default BookingAssistant;
