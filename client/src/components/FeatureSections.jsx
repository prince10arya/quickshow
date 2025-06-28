import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import 'keen-slider/keen-slider.min.css';
import { useKeenSlider } from 'keen-slider/react';
import BlurCircle from "./BlurCircle";
import { dummyShowsData } from "../assets/assets";
import MovieCard from './MovieCard'

const FeatureSections = () => {
  const navigate = useNavigate();
  const [sliderRef] = useKeenSlider({
    slides: {
      perView: 4,
      spacing: 15,
    },
    breakpoints: {
      "(max-width: 1536px)": {
        slides: { perView: 5, spacing: 15 },
      },
      "(max-width: 1280px)": {
        slides: { perView: 3.9, spacing: 12 },
      },
      "(max-width: 1024px)": {
        slides: { perView: 3, spacing: 10 },
      },
      "(max-width: 768px)": {
        slides: { perView: 2, spacing: 8 },
      },
      "(max-width: 500px)": {
        slides: { perView: 1.3, spacing: 6 }, // shows one full card and part of the next
      },
    },
  });

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
      <div className="px-4 sm:px-8 py-8">
      <div ref={sliderRef} className="keen-slider">
        {dummyShowsData.map((movie) => (
          <div key={movie.id} className="keen-slider__slide">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
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
