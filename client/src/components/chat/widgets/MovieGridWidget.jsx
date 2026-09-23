import { Calendar, Film, Star } from 'lucide-react';

export const MovieGridWidget = ({ widget, onSelectPrompt }) => {
  const movies = widget?.movies || [];
  if (!movies.length) return null;

  return (
    <div className="mt-3 w-full space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Film className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {widget.genre ? `${widget.genre} Movies` : 'Featured Movies'}
        </span>
        <span className="text-[11px] text-zinc-500">{movies.length} titles</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
        {movies.map((movie) => (
          <div
            key={movie.id}
            className="group relative flex w-40 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 p-2 shadow-lg transition hover:border-primary/50 hover:bg-zinc-900"
          >
            {/* Poster Thumbnail */}
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-800">
              {movie.poster ? (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="grid h-full place-items-center text-zinc-600">
                  <Film className="h-8 w-8" />
                </div>
              )}
              {movie.rating && (
                <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-bold text-amber-300 backdrop-blur-md">
                  <Star className="h-2.5 w-2.5 fill-amber-300 text-amber-300" />
                  {movie.rating}
                </span>
              )}
            </div>

            {/* Movie Info */}
            <div className="mt-2 flex flex-1 flex-col justify-between">
              <div>
                <h4 className="line-clamp-1 text-xs font-semibold text-white group-hover:text-primary">
                  {movie.title}
                </h4>
                {movie.genres?.length > 0 && (
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-400">
                    {movie.genres.join(' • ')}
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-2.5 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => onSelectPrompt(`Show showtimes for ${movie.title}`)}
                  className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary/20 py-1.5 text-[11px] font-semibold text-rose-200 transition hover:bg-primary hover:text-white"
                >
                  <Calendar className="h-3 w-3" />
                  Showtimes
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPrompt(`Tell me more about the movie ${movie.title}`)}
                  className="w-full text-center text-[10px] text-zinc-400 hover:text-white transition py-0.5"
                >
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MovieGridWidget;
