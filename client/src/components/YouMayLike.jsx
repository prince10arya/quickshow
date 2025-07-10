import { useNavigate } from "react-router-dom";
import MovieCard from "./MovieCard"

const YouMayLike = ( { shows }) => {

  const navigate = useNavigate();
  return (
    <>
      <p className=" mb-5 font-semibold text-lg">You may like</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6 ">
        {shows.slice(0, 4).map((movie, index) => (
          <MovieCard key={index} movie={movie} />
        ))}
      </div>
      <div className=" flex justify-center mt-20">
        <button
          className="btn-style px-10 py-3 rounded-full"
          onClick={() => {
            navigate("/movies");
            scrollTo(0, 0);
          }}
        >
          Show More
        </button>
      </div>
    </>
  );
}

export default YouMayLike
