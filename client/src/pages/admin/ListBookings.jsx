import { useState, useEffect } from 'react'
import Loading from '../../components/Loading';
import Title from '../../components/admin/Title';
import { useAppContext } from './../../context/AppContext';
import { dateFormat } from './../../lib/dateFormat';

const ListBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY;

  const {axios, getToken, user} = useAppContext()


  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAllBookings = async () => {
    try {
      const {data} = await axios.get('api/admin/all-bookings', {
        headers: {Authorization: `Bearer ${await getToken()}`}
      })
      setBookings(data.bookings)
    } catch (error) {
      console.error("error while getting bookings",error.message)
    }
    setLoading(false);
  }
  useEffect(() => {
   if(user) getAllBookings();

  },[])
  return !loading ? (
    <>
      <Title t1="List" t2="Bookings" />
      <div className=" max-w-4xl mt-6 overflow-x-auto ">
        <table className=" w-full border-collapse rounded-md overflow-hidden text-nowrap">
          <thead>
            <tr className=" bg-primary/20 text-left text-white">
              <th className=" p-2 font-medium pl-5">User Name</th>
              <th className=" p-2 font-medium">Movie Name</th>
              <th className=" p-2 font-medium">Show Time</th>
              <th className=" p-2 font-medium">Seats</th>
              <th className=" p-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className=" text-sm font-light">
            {bookings.map((item, index) => (
              <tr className=" border-b border-primary/10 bg-primary/5 even:bg-primary/10">
                <td className=" p-2 min-w-45 pl-5">
                  {item.user.name}
                </td>
                <td className="p-2">
                  {item.show.movie.title}
                </td>
                <td className=" p-2">
                 { dateFormat(item.show.showDateTime)}
                </td>
                <td className=" p-2" >
                  {Object.keys(item.bookedSeats).map(seat => item.bookedSeats[seat]).join(', ')}
                </td>
                <td className=" p-2">
                  {currency} {Object.keys(item.bookedSeats).length * item.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <Loading />
  );
}

export default ListBookings
