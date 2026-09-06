import { Calendar, Clock, Ticket } from 'lucide-react';

export const ShowtimesWidget = ({ widget, onSelectPrompt }) => {
  const shows = widget?.shows || [];
  if (!shows.length) return null;

  // Group shows by date label
  const grouped = shows.reduce((acc, show) => {
    const key = show.dateLabel || show.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(show);
    return acc;
  }, {});

  return (
    <div className="mt-3 w-full space-y-3 rounded-2xl border border-white/10 bg-zinc-900/90 p-3.5 shadow-lg">
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs font-semibold text-white">
        <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
        <span>Available Showtimes ({shows.length})</span>
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([dateLabel, dateShows]) => (
          <div key={dateLabel} className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <Calendar className="h-3 w-3 text-zinc-500" />
              <span>{dateLabel}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {dateShows.map((show) => (
                <button
                  key={show.showId}
                  type="button"
                  onClick={() =>
                    onSelectPrompt(
                      `I'd like to book tickets for ${show.title} on ${show.date} at ${show.time}`
                    )
                  }
                  className="group flex flex-col items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5 text-center transition hover:border-primary/60 hover:bg-primary/10"
                >
                  <span className="text-xs font-bold text-white group-hover:text-primary">
                    {show.time}
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <span className="font-semibold text-amber-300">
                      ₹{show.price}
                    </span>
                    <span className="text-[10px] text-zinc-500">•</span>
                    <span className="text-[10px] text-zinc-400">
                      {show.availableSeats} left
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShowtimesWidget;
