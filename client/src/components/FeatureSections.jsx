import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import 'keen-slider/keen-slider.min.css';
import BlurCircle from "./BlurCircle";
import MovieCard from './MovieCard'
import { useAppContext } from './../context/AppContext';

const FeatureSections = () => {

  const {shows} = useAppContext();


  const navigate = useNavigate();


  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden">
      <div className="relative flex items-center justify-between pt-20 pb-10 ">
        <BlurCircle top="0" right="-80px"/>
        <p className=" text-gray-300 font-medium text-lg">Now Showing</p>
        <button
          onClick={() => navigate("/movies")}
          className="group flex items-center gap-2 text-sm text-gray-300 cursor-pointer"
        >
          View All
          <ArrowRight
            className=" group-hover:translate-x-0.5 transition w-4.5 h-4.5
                "
          />
        </button>
      </div>
      <div className="px-4 sm:px-8 py-8 flex flex-row gap-3 flex-wrap w-48 h-48 sm:w-full sm:h-full">
        {shows.map((movie) => (
          <div key={movie.id} className="keen-slider__slide">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-20">
        <button
                className="flex items-center gap-1 px-6 py-3 text-sm btn-style"
                onClick={() => navigate('/movies')}
                >
                    Show More
                    <ArrowRight className=" w-5 h-5"/>
                </button>
      </div>
    </div>
  );
};

export default FeatureSections;
