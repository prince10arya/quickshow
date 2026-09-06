import { lazy, Suspense, useState } from 'react';
import { MessageCircle } from 'lucide-react';

const BookingAssistant = lazy(() => import('./BookingAssistant'));

const ChatLauncher = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open booking assistant"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full border border-rose-200/30 bg-[#f84565] px-4 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(248,69,101,0.38)] transition hover:bg-primary-dull focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">Book with chat</span>
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
