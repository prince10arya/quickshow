import {useState} from "react";
import BlurCircle from "./BlurCircle";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import toast from 'react-hot-toast'
import { useNavigate } from "react-router-dom";

const DateSelect = ({ dateTime, id }) => {
  const navigate = useNavigate();

  const [selected, setSelected] = useState(null)

  const onBookHandler = () => {
    if (!selected)
      return toast("Please select a data")
    navigate(`/movies/${id}/${selected}`)
    scrollTo(0, 0);
  }


  return (
    <div id="date-select" className="pt-30">
      <div className=" flex flex-col md:flex-row items-center justify-between gap-10 relative p-8 bg-primary/10 border-primary/20 rounded-lg">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle top="100px" right="0px" />
        <div className="">
          <p className="text-lg font-semibold">Choose Date</p>
          <div className=" flex items-center gap-6 text-sm mt-5">
            <ChevronLeftIcon width={28} />
            <span className=" grid grid-cols-3 md:flex flex-wrap md:max-w-lg gap-4">
              {Object.keys(dateTime).map((date) => (
                <button
                  key={date}
                  onClick={() => setSelected(date)}
                  className={`flex flex-col items-center justify-center h-14 aspect-square rounded cursor-pointer ${
                    selected === date
                      ? " btn-style rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 bg-primary text-white "
                      : "border border-primary sm:border-gray-300/20"
                  }`}
                >
                  <span className="">{new Date(date).getDate()}</span>
                  <span className="">
                    {new Date(date).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </span>
                </button>
              ))}
            </span>
            <ChevronRightIcon width={28}></ChevronRightIcon>
          </div>
        </div>
        <button
          className=" btn-style px-8 py-2 mt-6  text-white font-bold
            shadow-lg transform transition duration-300 hover:scale-105 rounded-full
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50
            text-xs sm:text-sm"
          onClick={onBookHandler}
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

export default DateSelect;
