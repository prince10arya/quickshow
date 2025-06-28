import { ClockIcon, StarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import timeFormat from '../lib/timeFormat';

const MovieCard = ({ movie }) => {
  const navigate = useNavigate();

  const handleMovieClick = () => {
    navigate(`/movies/${movie._id}`);
    window.scrollTo(0, 0);
  };

  return (
    <div
      className="
        flex flex-col justify-between p-3 bg-gray-800 rounded-2xl
    hover:-translate-y-1 transition duration-300
    w-full h-full
    text-white
      "
    >
      {/* Poster */}
      <img
        src={movie.backdrop_path}
        alt={movie.title}
        onClick={handleMovieClick}
        className="
          rounded-lg h-44 sm:h-50 w-full object-cover cursor-pointer
        "
      />

      {/* Title */}
      <p className="font-semibold mt-2 truncate text-base sm:text-lg">
        {movie.title}
      </p>

      {/* Info */}
      <p className="text-sm text-gray-400 mt-1">
        {new Date(movie.release_date).getFullYear()} •{' '}
        {movie.genres?.slice(0, 2).map((genre) => genre.name).join(' | ')}
      </p>
      <p className="text-sm text-gray-400 mt-1 flex flex-row gap-[3px] items-center">
        <ClockIcon className='w-3.5 h-3.5'/>{timeFormat(movie.runtime)}</p>


      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pb-3">
        <button
          onClick={handleMovieClick}
          className="
           btn-style py-2 px-4 text-white font-bold  rounded-full
            shadow-lg transform transition duration-300 hover:scale-105
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50
            text-xs sm:text-sm
          "
        >
          Buy Tickets
        </button>

        <p className="flex items-center gap-1 text-sm text-gray-400 mt-1 pr-1">
          <StarIcon className="w-4 h-4 text-primary fill-current" />
          {movie.vote_average?.toFixed(1)}
        </p>
      </div>
    </div>
  );
};

export default MovieCard;
