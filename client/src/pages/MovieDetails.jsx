import { HeartIcon, PlayCircleIcon, StarIcon } from "lucide-react";
import BlurCircle from "./../components/BlurCircle";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import timeFormat from "../lib/timeFormat";
import DateSelect from "../components/DateSelect";
import YouMayLike from "../components/YouMayLike";
import Loading from "../components/Loading";
import { useAppContext } from "./../context/AppContext";
import toast from "react-hot-toast";
const MovieDetails = () => {
  const { axios, getToken, user, shows, favoriteMovies, fetchFavouriteMovie } =
    useAppContext();

  const { id } = useParams();
  // Fetch movie details using the id
  const [show, setShow] = useState(null);
  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/shows/${id}`);
      console.log("data", data);
      if (data.success) {
        setShow(data);
      }
    } catch (error) {
      console.error("Error while fetching movie details", error.messager);
    }
  };

  const handleFavourite = async () => {
    try {
      if (!user) return toast.error("Please Login");

      const { data } = await axios.post(
        "/api/user/update-favourite",
        { movieId: id },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );
      console.log("data in favorites", data);
      if (data.success) {
        await fetchFavouriteMovie();
        toast.success(data.message);
      }
    } catch (error) {
      console.error("error fetching favourite", error.message);
    }
  };

  useEffect(() => {
    getShow();
  }, [id]);
  return show ? (
    <>
      <BlurCircle top="60px" right="920px" />
      <div className=" px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
        <div className=" flex gap-8 max-w-6xl mx-auto flex-col md:flex-row ">
          <img
            src={show.movie.poster_path}
            alt={show.movie.title}
            className="max-md:mx-auto rounded-xl h-104 max-w-70 object-cover"
          />
          <div className="relative flex flex-col gap-3">
            <p className="text-primary">ENGLISH</p>
            <h1 className="text-3xl font-semibold max-w-96 text-balance">
              {show.movie.title}
            </h1>
            <div className=" flex items-center gap-2 text-gray-300">
              <StarIcon className=" w-5 h-5 text-primary fill-primary " />
              {show.movie.vote_average.toFixed(1)} User Rating
            </div>
            <p className=" text-gray-400 mt-2 text-sm leading-tight max-w-xl">
              {show.movie.overview}
            </p>
            <p className="">
              {timeFormat(show.movie.runtime)} &#183;{" "}
              {show.movie.genres.map((genre) => genre).join(" | ")} &#183;{" "}
              {show.movie.release_date.split("-")[0]}
            </p>
            <div className=" flex items-center flex-wrap gap-4 mt-4">
              <button className=" flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md cursor-pointer active:scale-95">
                <PlayCircleIcon className="w-5 h-4" />
                Watch Trailer
              </button>
              <a
                href="#date-select"
                className=" px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md   font-medium cursor-pointer active:scale-95"
              >
                Buy Tickets
              </a>
              <button
                className=" hover:scale-110 cursor-pointer transition ease-in-out  duration-200 bg-gray-700 p-2 rounded-full active:scale-95"
                onClick={handleFavourite}
              >
                <HeartIcon
                  className={`w-5 h-5  ${
                    favoriteMovies.find((movie) => movie._id === id)
                      ? "text-primary fill-primary "
                      : "text-primary"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        <p className=" text-xl font-medium mt-20">Cast</p>
        <div className=" overflow-x-auto no-scrollbar mt-8 pb-4">
          <div className=" flex items-center gap-4 w-max px-4">
            {show.movie.casts
              .slice(0, 12)
              .filter(
                (cast) =>
                  cast.primaryImage !== null && cast.primaryImage !== undefined
              )
              .map((cast, index) => (
                <div className="" key={index}>
                  <img
                    src={cast.primaryImage}
                    alt=""
                    className=" rounded-full h-20 md:h-20 aspect-square object-cover"
                  />
                  <p className="text-xs text-gray-300 mt-3">{cast.fullName}</p>
                </div>
              ))}
          </div>
        </div>
        <DateSelect dateTime={show.dateTime} id={id} />

        <div className=" pt-7">
          <YouMayLike shows={shows} />
        </div>
      </div>
    </>
  ) : (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loading />
    </div>
  );
};
export default MovieDetails;
