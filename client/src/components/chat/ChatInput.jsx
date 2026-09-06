import { useEffect, useRef } from 'react';
import { Send, Square } from 'lucide-react';

export const ChatInput = ({ input, setInput, onSubmit, onAbort, loading }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <form onSubmit={onSubmit} className="border-t border-white/10 p-3 bg-zinc-950/40">
      <label htmlFor="booking-chat-message" className="sr-only">
        Ask the movie concierge
      </label>
      <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/40 p-2 transition focus-within:border-primary/70">
        <textarea
          id="booking-chat-message"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={1000}
          rows={1}
          placeholder={loading ? 'Concierge is replying…' : 'Ask about movies, genres, or showtimes…'}
          className="max-h-28 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-1.5 text-xs sm:text-sm text-white outline-none placeholder:text-zinc-500"
        />

        {loading ? (
          <button
            type="button"
            onClick={onAbort}
            aria-label="Stop generation"
            title="Stop response"
            className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send message"
            className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white transition hover:bg-primary-dull disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
};

export default ChatInput;
