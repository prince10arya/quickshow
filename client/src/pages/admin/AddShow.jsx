import React, { useEffect, useState } from 'react'
import Title from '../../components/admin/Title'
import Loading from '../../components/Loading';
import { CheckIcon, DeleteIcon, StarIcon } from 'lucide-react';
import { kConverter } from '../../lib/kConverter';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const AddShow = () => {
  const currency = import.meta.env.VITE_CURRENCY;

  const {axios, getToken, user} = useAppContext()

  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [selectedMovies, setSelectedMovies] = useState(null)
  const [dateTimeSelection, setDateTimeSelection] = useState({})
  const [dateTimeInput, setDateTimeInput] = useState("")
  const [showPrice, setShowPrice] = useState("")
  const [addingShow, setAddingShow] = useState(false)

const fetchNowPlayingMovies = async () => {
  try {
    const { data } = await axios.get('/api/shows/nowshowing',{
    headers: {Authorization: `Bearer ${await getToken()}`}
    })

    if(data.success && data.movies)
      console.log("data.movies content before setting state:", data.movies);
      setNowPlayingMovies(data.movies);

  } catch (error) {
    console.log('error in fetching now playing movies', error)

  }
}
const handleDateTimeAdd = () =>{
  if(!dateTimeInput) return;
  const [date, time] = dateTimeInput.split('T');
  if( !date || !time) return;

  setDateTimeSelection((prev) => {
    const times = prev[date] || [];
    if (!times.includes(time)) {
      return { ...prev, [date]: [...times, time] };
    } else {
      return prev;
    }
  });
}
const handleRemoveTime = (date, time) => {
  setDateTimeSelection((prev) => {
    const filteredTimes = prev[date].filter((t) => t !== time);
    if (filteredTimes.length === 0)
    {
      const { [date]: _, ...rest } = prev;
      return rest;
    }
    return { ...prev, [date]: filteredTimes,}
  })
}
const handleSubmit = async () => {
  try {
    setAddingShow(true)
    if(!selectedMovies || Object.keys(dateTimeSelection).length === 0 || !showPrice){
      if(!selectedMovies) return toast.error("Movie not selected");
      if (Object.keys(dateTimeSelection).length === 0)
        return toast.error("Date and Time not selected");
      if (!showPrice) return toast.error("Show Price is not defined");
    }
    const showsInput = Object.entries(dateTimeSelection).map(([date, time]) => ({date, time}))

    const payload = {
      movieId: selectedMovies,
      showsInput,
      showPrice: Number(showPrice)
    }

    const { data } = await axios.post("/api/shows/addshow", payload, {headers:
      {Authorization: `Bearer ${await getToken()}`}
    });
    if(data.success){
      toast.success(data.message);
      setSelectedMovies(null);
      setDateTimeInput({});
      setShowPrice("");
    }
    else toast.error(data.message)


  } catch (error) {
    console.error("Submission error in Adding shows", error.message)
    toast.error("An error occured plz try again.")
  }
  setAddingShow(false);
};
  useEffect(() => {
    if(user){
      fetchNowPlayingMovies();
    }
  }, []);




  return nowPlayingMovies.length > 0 ? (
    <>
      <Title t1="Add" t2="Shows" />
      <p className=" mt-10  text-lg font-medium">Now Playing Movies</p>
      <div className=" overflow-x-auto pb-4">
        <div className=" group flex flex-wrap gap-4 mt-4 w-max">
          {nowPlayingMovies.map((movie) => {
            return (
              <div
                key={movie.id}
                onClick={() => setSelectedMovies(movie.id)}
                className={` relative max-w-40 cursor-pointer group-hover:not-hover:opacity-40  hover:-translate-y-1 transition duration-300`}
              >
                <div className=" relative rounded-lg overflow-hidden">
                  <img
                    src={movie.primaryImage}
                    alt=""
                    className="w-48 h-64 brightness-90 object-cover"
                  />
                  <div className=" text-sm flex items-center justify-between p-2 bg-black/70 w-full absolute bottom-0 left-0">
                    <p className=" flex items-center gap-1 text-gray-400">
                      <StarIcon className=" w-4 h-4 text-primary fill-primary" />
                      {(movie.averageRating || 0).toFixed(1)}
                    </p>
                    <p className=" text-gray-300">
                      {kConverter(movie.numVotes)} Votes
                    </p>
                  </div>
                </div>
                {selectedMovies === movie.id && (
                  <div className=" absolute top-0  w-full h-full bg-black/35">
                    <div className="relative top-2 left-2 flex items-center justify-center bg-primary h-6 w-6 rounded">
                      <CheckIcon
                        className=" w-4 h-4 text-white"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                )}
                <p className="font-medium truncate">{movie.originalTitle}</p>
                <p className=" text-gray-400 text-sm">{movie.releaseDate}</p>
              </div>
            );
          })}
        </div>
      </div>
      {/** Show Price Input */}
      <div className=" mt-8">
        <label htmlFor="price-input" className=" block text-sm font-medium mb-2">
          Show Price
        </label>
        <div className=" inline-flex items-center gap-2 border border-gray-600 px-3 py-2 rounded-md">
          <p className=" text-gray-400 text-sm">
            <span className=" pr-1">{currency}</span>{" "}
            <input
              type="number"
              id='price-input'
              className=" outline-none"
              min={0}
              value={showPrice}
              onChange={(e) => setShowPrice(e.target.value)}
            />
          </p>
        </div>
      </div>
      {/** Data and Time Selection */}
      <div className=" mt-6 ">
        <label htmlFor="date-time" className=" block text-sm font-medium mb-2">
          Select Date and Time
        </label>
        <div className=" inline-flex gap-5 border border-gray-600 p-1 pl-3 rounded-lg">
          <input type="datetime-local" value={dateTimeInput} onChange={(e) => setDateTimeInput(e.target.value)} id="date-time" className=' outline-none rounded-md'/>
          <button className=" bg-primary/80 text-white px-3 py-2 text-sm rounded-lg hover:bg-primary cursor-pointer " onClick={handleDateTimeAdd}>
          Add Time
          </button>
        </div>
      </div>
      { /** Display Selected Time */}
      {
        Object.keys(dateTimeSelection).length > 0 && (
          <div className="mt-6">
            <h2 className=" mb-2">Selected Date-Time</h2>
            <ul className="space-y-3">
              {
                Object.entries(dateTimeSelection).map(([date, times])=>(
                  <li className="">
                    <div className=" font-medium">{date}</div>
                    <div className="flex flex-wrap gap-2 mt-1 text-sm">
                      {times.map((time) => (
                        <div key={time} className=" border border-primary px-2 py-1 flex items-center rounded">
                          <span> {time} </span>
                            <DeleteIcon onClick={ () => handleRemoveTime(date, time)} width={15} className=' ml-2 text-red-500 hover:text-red-700 cursor-pointer' />
                        </div>
                      ))}
                    </div>
                  </li>
                ))
              }
            </ul>
          </div>
        )
      }
      <button onClick={handleSubmit} disabled={addingShow} className=" bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer">
      Add Show</button>
    </>
  ) : (
    <Loading />
  );
}

export default AddShow
