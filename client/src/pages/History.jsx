import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, ClockIcon, TicketIcon, StarIcon, FilmIcon } from 'lucide-react';
import BlurCircle from '../components/BlurCircle';
import Loading from '../components/Loading';
import timeFormat from '../lib/timeFormat';
import { dateFormat } from '../lib/dateFormat';
import { useAppContext } from '../context/AppContext';

const History = () => {
  const { axios, getToken, user } = useAppContext();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get('/api/user/history', {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) setHistory(data.history);
    } catch (error) {
      console.error('Error fetching history', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchHistory();
    else setIsLoading(false);
  }, [user]);

  if (isLoading) return <Loading />;

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh] pb-20">
      <BlurCircle top="100px" right="200px" />
      <BlurCircle bottom="200px" left="100px" />

      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FilmIcon className="w-6 h-6 text-primary" />
          Watch History
        </h1>
        <p className="text-gray-400 text-sm mt-1">Movies you've watched</p>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <FilmIcon className="w-16 h-16 text-gray-700 mb-4" />
          <h2 className="text-xl font-semibold text-gray-400">No watch history yet</h2>
          <p className="text-gray-500 text-sm mt-2 mb-6">Movies you've attended will appear here</p>
          <button
            onClick={() => navigate('/movies')}
            className="px-6 py-2.5 bg-primary hover:bg-primary-dull rounded-full text-sm font-medium transition-colors"
          >
            Browse Movies
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-3xl">
          {history.map((item, i) => {
            const movie = item.show?.movie;
            if (!movie) return null;
            return (
              <div
                key={item._id ?? i}
                onClick={() => navigate(`/movies/${item.show._id}`)}
                className="history-card group flex flex-col sm:flex-row gap-0 bg-white/5 border border-white/8 rounded-2xl overflow-hidden cursor-pointer hover:border-primary/30 hover:bg-white/8 transition-all duration-300"
              >
                {/* Poster */}
                <div className="relative sm:w-44 shrink-0 overflow-hidden">
                  <img
                    src={movie.poster_path}
                    alt={movie.title}
                    className="w-full sm:h-full h-44 object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Watched badge */}
                  <span className="absolute top-2 left-2 bg-black/70 backdrop-blur text-xs text-green-400 border border-green-400/30 px-2 py-0.5 rounded-full font-medium">
                    ✓ Watched
                  </span>
                </div>

                {/* Info */}
                <div className="flex flex-col sm:flex-row flex-1 p-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                      {movie.title}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{movie.overview}</p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-gray-400">
                      {movie.genres?.length > 0 && (
                        <span>{movie.genres.slice(0, 2).join(' · ')}</span>
                      )}
                      {movie.runtime && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {timeFormat(movie.runtime)}
                        </span>
                      )}
                      {movie.vote_average && (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <StarIcon className="w-3 h-3 fill-current" />
                          {movie.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {dateFormat(item.show.showDateTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <TicketIcon className="w-3 h-3" />
                        {item.bookedSeates?.length} seat{item.bookedSeates?.length !== 1 ? 's' : ''} · {item.bookedSeates?.join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                    <span className="text-lg font-bold text-white">
                      {import.meta.env.VITE_CURRENCY}{item.amount}
                    </span>
                    <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                      Paid
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;
