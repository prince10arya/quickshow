import BlurCircle from "../components/BlurCircle";
import MovieCard from "../components/MovieCard";
import { useAppContext } from "../context/AppContext";

const Movies = () => {
  const {shows} = useAppContext();

  return shows.length > 0 ? (
    <>
      <BlurCircle top="100px" right="1220px" />
      <BlurCircle top="800px" right="50px" />
    <div className="relative my-30 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      {/* Background Blur Circle */}
      <h1 className="text-lg font-medium my-4">Now Showing</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
        {shows.map((movie) => (
          <MovieCard movie={movie} key={movie.id} />
        ))}
      </div>
    </div>
    </>
  ) : (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-lg font-bold text-center">No Movies Available</h1>
    </div>
  );
};

export default Movies;
