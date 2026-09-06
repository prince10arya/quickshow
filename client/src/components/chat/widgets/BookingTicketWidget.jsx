import { Film, MapPin, Sparkles, Ticket } from 'lucide-react';

const formatShowDateTime = (startsAt) => {
  if (!startsAt) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(startsAt));
  } catch {
    return startsAt;
  }
};

export const BookingTicketWidget = ({ summary, user, paying, onProceedToPayment }) => {
  if (!summary) return null;

  return (
    <div className="relative mt-3 overflow-hidden rounded-3xl border border-rose-400/20 bg-gradient-to-b from-[#241a20] via-[#1a141c] to-[#141017] p-4 text-white shadow-2xl shadow-black/80">
      {/* Decorative Ticket Perforation Dots on Sides */}
      <div className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#09090b] border-r border-rose-400/20" />
      <div className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#09090b] border-l border-rose-400/20" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-dashed border-white/15 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/20 text-primary">
            <Ticket className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">QuickShow Pass</h4>
            <p className="text-[11px] text-zinc-400">Verified Booking Draft</p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
          <Sparkles className="h-3 w-3" /> Ready
        </span>
      </div>

      {/* Ticket Details */}
      <div className="py-3">
        <div className="flex gap-3">
          {summary.movie?.poster && (
            <img
              src={summary.movie.poster}
              alt={summary.movie.title}
              className="h-20 w-14 rounded-lg object-cover shadow"
            />
          )}
          <div className="flex-1">
            <h3 className="font-bold text-sm text-white line-clamp-1">
              {summary.movie?.title}
            </h3>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400">
              <MapPin className="h-3 w-3 text-primary" />
              <span>{summary.venue || 'QuickShow Cinema'}</span>
            </div>
            <p className="mt-1 text-xs text-rose-200">
              {formatShowDateTime(summary.show?.startsAt)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/40 px-3 py-2 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Reserved Seats</span>
            <div className="flex gap-1.5 mt-0.5">
              {summary.seats?.map((seat) => (
                <span
                  key={seat}
                  className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-300"
                >
                  {seat}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              {summary.ticketCount} {summary.ticketCount === 1 ? 'Ticket' : 'Tickets'}
            </span>
            <p className="text-sm font-extrabold text-white">
              ₹{summary.amount}
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="border-t border-dashed border-white/15 pt-3">
        <button
          type="button"
          disabled={paying}
          onClick={() => onProceedToPayment(summary)}
          className="w-full rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-lg shadow-rose-900/40 transition hover:bg-primary-dull active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paying ? 'Opening payment gateway…' : user ? 'Proceed to Checkout →' : 'Sign in to Checkout'}
        </button>
      </div>
    </div>
  );
};

export default BookingTicketWidget;
