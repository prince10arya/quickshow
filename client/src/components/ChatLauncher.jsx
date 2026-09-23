import { lazy, Suspense, useState } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';

const BookingAssistant = lazy(() => import('./chat/BookingAssistant'));

const ChatLauncher = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open AI Movie Concierge"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="group fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2.5 rounded-full border border-rose-300/30 bg-gradient-to-r from-primary to-rose-600 px-5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(248,69,101,0.45)] transition duration-200 hover:scale-105 hover:shadow-[0_14px_34px_rgba(248,69,101,0.55)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:scale-95"
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <MessageSquare className="h-5 w-5 transition group-hover:scale-110" aria-hidden="true" />
          <Sparkles className="absolute -top-1.5 -right-2 h-3.5 w-3.5 text-amber-300 animate-pulse" />
        </span>
        <span className="font-semibold tracking-wide">QuickShow AI</span>
      </button>

      {open && (
        <Suspense fallback={null}>
          <BookingAssistant onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
};

export default ChatLauncher;
