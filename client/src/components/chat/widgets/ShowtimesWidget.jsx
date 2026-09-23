import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Film, Star, Ticket } from 'lucide-react';

/**
 * Generative UI Movie Show Card Component
 * Maps MCP search_upcoming_shows output to rich cinema show cards instead of raw markdown tables.
 *
 * @param {{
 *   widget: { shows: Array<Record<string, any>> },
 *   onSelectPrompt: (prompt: string) => void
 * }} props
 */
export const ShowtimesWidget = ({ widget, onSelectPrompt }) => {
  const shows = widget?.shows || [];
  if (!shows.length) return null;

  // Group shows by movie (in case results contain multiple titles)
  const movieGroups = useMemo(() => {
    const map = new Map();

    for (const show of shows) {
      const key = show.movieId || show.title;
      if (!map.has(key)) {
        map.set(key, {
          movieId: show.movieId,
          title: show.title || 'Movie Showtimes',
          poster: show.poster || null,
          genres: show.genres || [],
          rating: show.rating || null,
          runtime: show.runtime || null,
          shows: [],
        });
      }
      map.get(key).shows.push(show);
    }

    return Array.from(map.values());
  }, [shows]);

  return (
    <div className="mt-3 w-full space-y-3">
      {movieGroups.map((movie) => {
        // Group shows by date label for this movie
        const groupedDates = movie.shows.reduce((acc, show) => {
          const key = show.dateLabel || show.date;
          if (!acc[key]) acc[key] = [];
          acc[key].push(show);
          return acc;
        }, {});

        return (
          <div
            key={movie.movieId || movie.title}
            className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 shadow-xl backdrop-blur-md"
          >
            {/* Movie Card Header */}
            <div className="flex gap-3 border-b border-white/10 bg-white/[0.03] p-3 sm:p-3.5">
              {/* Poster Thumbnail */}
              <div className="relative aspect-[2/3] w-14 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-800 shadow-md">
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-zinc-600">
                    <Film className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="flex flex-1 flex-col justify-center min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  {movie.title}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-300">
                  {movie.rating && (
                    <span className="flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 font-bold text-amber-300">
                      <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                      {movie.rating}
                    </span>
                  )}
                  {movie.runtime && (
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Clock className="h-3 w-3 text-zinc-500" />
                      {movie.runtime}
                    </span>
                  )}
                  {movie.genres?.length > 0 && (
                    <span className="text-zinc-400 truncate">
                      • {movie.genres.join(', ')}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[10px] text-zinc-400">
                  Select a showtime slot to choose seats:
                </p>
              </div>
            </div>

            {/* Showtimes Body Grouped by Date */}
            <div className="p-3 sm:p-3.5 space-y-3">
              {Object.entries(groupedDates).map(([dateLabel, dateShows]) => (
                <div key={dateLabel} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    <Calendar className="h-3 w-3 text-primary" aria-hidden="true" />
                    <span>{dateLabel}</span>
                  </div>

                  {/* Showtimes Grid */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {dateShows.map((show) => {
                      const isSoldOut = show.isHouseFull || show.availableSeats === 0;
                      const isLowSeats = show.availableSeats > 0 && show.availableSeats <= 8;

                      return (
                        <motion.button
                          key={show.showId}
                          type="button"
                          whileHover={{ scale: isSoldOut ? 1 : 1.02 }}
                          whileTap={{ scale: isSoldOut ? 1 : 0.98 }}
                          disabled={isSoldOut}
                          onClick={() =>
                            onSelectPrompt(
                              `I want to book 2 tickets for ${show.title} on ${show.date} at ${show.time}`
                            )
                          }
                          className={`group relative flex flex-col justify-between rounded-xl border p-2.5 text-left transition-colors duration-200 ${
                            isSoldOut
                              ? 'border-white/5 bg-zinc-900/40 opacity-40 cursor-not-allowed'
                              : 'border-white/10 bg-white/[0.03] hover:border-primary/60 hover:bg-primary/10 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-white group-hover:text-primary transition-colors">
                              {show.time}
                            </span>
                            <span className="text-xs font-bold text-amber-300">
                              ₹{show.price}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[10px]">
                            <span
                              className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium ${
                                isSoldOut
                                  ? 'bg-zinc-800 text-zinc-400'
                                  : isLowSeats
                                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                              }`}
                            >
                              <Ticket className="h-2.5 w-2.5" aria-hidden="true" />
                              {isSoldOut
                                ? 'Sold out'
                                : isLowSeats
                                  ? `${show.availableSeats} left!`
                                  : `${show.availableSeats} seats`}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ShowtimesWidget;
