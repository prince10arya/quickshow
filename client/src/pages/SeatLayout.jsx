import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Loading from "../components/Loading";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import isoTimeFormat from "../lib/isoTimeFormat";
import BlurCircle from "../components/BlurCircle";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";
import { assets } from './../assets/assets';

const SeatLayout = () => {
  const groupRows = [
    ["A", "B"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
    ["I", "J"],
  ];

  const { id, date } = useParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([])

  const navigate = useNavigate();

  const { axios, getToken, user, }  = useAppContext()


  const getShow = async () => {
    try {
      console.log('id', id)
      const {data} = await axios.get(`/api/shows/${id}`, )
      console.log('data', data)
      if(data.success) setShow(data)
    } catch (error) {
      console.error("Error fetching seat loyout", error.message)

    }
  };
  const getOccupiedSeats = async () => {
    try {
      console.log('selectedTime.showId', selectedTime.showId)
      const {data} = await axios.get(`/api/bookings/seats/${selectedTime.showId}`)
      console.log('data seat occupied', data)
      if(data.success) setOccupiedSeats(data.occupiedSeats)
      else toast.error(data.message)
    } catch (error) {
      console.error("Errror fetching occupied seats", error.message)
    }
  }

  const handleSeatClick = (seatId) => {
    if (!selectedTime) return toast("Please select time first");
    if (!selectedSeats.includes(seatId) && selectedSeats.length > 4)
      return toast("You can only select 5 seats");
    if(occupiedSeats.includes(seatId)) return toast.error('Occupied')
    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    );
  };
  const renderSeats = (row, count = 9) => {
    return (
      <div className="flex gap-2 mt-2" key={row}>
        <div className=" flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: count }, (_, i) => {
            const seatId = `${row}${i + 1}`;
            return (
              <button
                onClick={() => handleSeatClick(seatId)}
                key={seatId}
                className={`h-8 w-8 rounded border border-primary/60 cursor-pointer
                  ${selectedSeats.includes(seatId) && "bg-primary text-white"}
                  ${occupiedSeats.includes(seatId) && "opacity-50"}`}
              >
                {seatId}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const bookTickets = async () => {
    try {
      if(!user) return toast.error("Login to proceed")
      if(!selectedTime || !selectedSeats.length) return toast.error("Select Time and Data First")

      const {data} = await axios.post('/api/bookings/create', {showId: selectedTime.showId, selectedSeats }, {
        headers: {Authorization: `Bearer ${await getToken()}`}
      })
    if(data.success) {
      window.location.href = data.url;
    }
    } catch (error) {
      console.error("Eror in booking", error.message)
    }
  }

  useEffect(() => {
    getShow();
  }, []);

  useEffect(() => {if(selectedTime) getOccupiedSeats()}, [selectedTime])
  return show ? (
    <div className=" flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50">
      <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30">
        <p className=" text-lg font-semibold px-6">Available Timings</p>
        <div className="mt-5 space-y-1">
          {show.dateTime[date].map((item) => (
            <div
              key={item.time}
              onClick={() => setSelectedTime(item)}
              className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${
                selectedTime?.time === item.time
                  ? "bg-primary text-white"
                  : " hover:bg-primary/20"
              }`}
            >
              <ClockIcon className="w-4 h-5" />
              <p className=" text-sm">{isoTimeFormat(item.time)}</p>
            </div>
          ))}
        </div>
      </div>
      {/** Seat Layout */}
      <div className=" relative flex-1 flex flex-col items-center max-md:mt-16">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />
        <h1 className=" text-2xl font-semibold mb-4">Select Your seat</h1>
        <img src={assets.screenImage} alt="screen-image" className="" />
        <p className=" text-gray-400 text-sm mb-6">SCREEN SIDE</p>
        <div className=" flex flex-col items-center mt-10 text-xs text-gray-200">
          <div className=" grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6">
            {groupRows[0].map((row) => renderSeats(row))}
          </div>
          <div className=" grid grid-cols-2 gap-11 text-xs text-gray-200">
            {groupRows.slice(1).map((group, index) => (
              <div className="" key={index}>
                {group.map((row) => renderSeats(row))}
              </div>
            ))}
          </div>
        </div>
        <button className="btn-style flex items-center gap-1 mt-20 px-10 py-3 text-sm font-medium rounded-full active:scale-95" onClick={bookTickets}>
          Proceed to Checkout
          <ArrowRightIcon strokeWidth={3} className="w-4 h-4"/>
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;
