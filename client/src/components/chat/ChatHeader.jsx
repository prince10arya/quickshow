import { RotateCcw, Sparkles, X } from 'lucide-react';

export const ChatHeader = ({ onStartNewChat, onClose }) => {
  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(248,69,101,0.28),_transparent_45%)] px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/20 text-primary shadow-sm shadow-rose-900/30">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h2 id="booking-assistant-title" className="font-semibold text-sm sm:text-base text-white">
              QuickShow Concierge
            </h2>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
          </div>
          <p className="text-xs text-zinc-400">Your live AI movie guide & booking partner</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onStartNewChat}
          aria-label="Start new chat"
          title="Start a new conversation"
          className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition focus-visible:outline-2 focus-visible:outline-primary"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close booking assistant"
          className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition focus-visible:outline-2 focus-visible:outline-primary"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
