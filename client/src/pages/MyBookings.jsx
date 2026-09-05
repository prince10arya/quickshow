import { useState, useEffect } from "react";
import BlurCircle from "./../components/BlurCircle";
import Loading from "../components/Loading";
import timeFormat from "./../lib/timeFormat";
import { dateFormat } from "../lib/dateFormat";
import { useAppContext } from "../context/AppContext";
import { Link } from "react-router-dom";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";

/** Countdown timer component for pending bookings */
const PaymentTimer = ({ expiresAt, createdAt, onExpire }) => {
  const getRemaining = () => {
    const target = expiresAt
      ? new Date(expiresAt).getTime()
      : new Date(createdAt).getTime() + 5 * 60 * 1000;
    return Math.max(0, Math.floor((target - Date.now()) / 1000));
  };

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    const interval = setInterval(() => {
      const left = getRemaining();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, createdAt]);

  if (remaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
        <AlertCircle className="w-3.5 h-3.5" />
        Payment Expired
      </span>
    );
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining <= 60;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-all ${
        isUrgent
          ? "bg-red-500/15 text-red-400 border-red-500/30 animate-pulse"
          : "bg-amber-500/10 text-amber-300 border-amber-500/30"
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>
        Expires in {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
      </span>
    </span>
  );
};

const MyBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY;
  const { axios, getToken, user } = useAppContext();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expiredMap, setExpiredMap] = useState({});

  const getMyBookings = async () => {
    try {
      const { data } = await axios.get("/api/user/bookings", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) setBookings(data.bookings);
    } catch (error) {
      console.error("Error fetching booking details", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) getMyBookings();
  }, [user]);

  const handleExpire = (bookingId) => {
    setExpiredMap((prev) => ({ ...prev, [bookingId]: true }));
  };

  const isBookingExpired = (item) => {
    if (item.isPaid) return false;
    if (expiredMap[item._id]) return true;
    const target = item.expiresAt
      ? new Date(item.expiresAt).getTime()
      : new Date(item.createdAt).getTime() + 5 * 60 * 1000;
    return target <= Date.now();
  };

  const getPaymentRoute = (item) => {
    if (!item.paymentLink) return `/payment/${item._id}`;
    if (item.paymentLink.includes("/payment/")) {
      return `/payment/${item._id}`;
    }
    return item.paymentLink;
  };

  return !isLoading ? (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">
      <BlurCircle bottom="100px" right="600px" />
      <div>
        <BlurCircle top="100px" left="600px" />
      </div>
      <h1 className="text-lg font-semibold mb-4">My Bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-gray-400 mt-6">No bookings found.</p>
      ) : (
        bookings.map((item, index) => {
          const expired = isBookingExpired(item);
          const paymentTarget = getPaymentRoute(item);
          const isExternal = paymentTarget.startsWith("http") && !paymentTarget.includes("/payment/");

          return (
            <div
              key={item._id || index}
              className="flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 rounded-lg mt-4 p-3 max-w-3xl gap-4"
            >
              {/* Movie info */}
              <div className="flex flex-col md:flex-row gap-2">
                <img
                  src={item.show?.movie?.poster_path}
                  alt={item.show?.movie?.title || "Movie"}
                  className="md:max-w-45 aspect-video h-auto object-cover object-bottom rounded"
                />
                <div className="flex flex-col p-2 justify-between">
                  <div>
                    <p className="text-lg font-semibold">{item.show?.movie?.title}</p>
                    <p className="text-gray-400 text-sm">
                      {timeFormat(item.show?.movie?.runtime)}
                    </p>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">
                    {dateFormat(item.show?.showDateTime)}
                  </p>
                </div>
              </div>

              {/* Status, Price & Action */}
              <div className="flex flex-col md:items-end justify-between p-2 gap-3">
                {/* Badge: Paid / Timer / Expired */}
                <div>
                  {item.isPaid ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                    </span>
                  ) : (
                    <PaymentTimer
                      expiresAt={item.expiresAt}
                      createdAt={item.createdAt}
                      onExpire={() => handleExpire(item._id)}
                    />
                  )}
                </div>

                {/* Amount & Pay action */}
                <div className="flex items-center gap-4">
                  <p className="text-2xl font-semibold">
                    {currency}
                    {item.amount}
                  </p>

                  {!item.isPaid && (
                    expired ? (
                      <span className="text-xs text-red-400/80 italic">Seats released</span>
                    ) : isExternal ? (
                      <a
                        href={paymentTarget}
                        className="bg-primary hover:bg-primary/90 px-4 py-1.5 text-sm rounded-full font-medium cursor-pointer active:scale-95 transition-all text-white"
                      >
                        Pay Now
                      </a>
                    ) : (
                      <Link
                        to={paymentTarget}
                        className="bg-primary hover:bg-primary/90 px-4 py-1.5 text-sm rounded-full font-medium cursor-pointer active:scale-95 transition-all text-white"
                      >
                        Pay Now
                      </Link>
                    )
                  )}
                </div>

                {/* Seat details */}
                <div className="text-sm md:text-right">
                  <p className="flex gap-1 md:justify-end items-center">
                    <span className="text-gray-400">Total Tickets:</span>
                    {item.bookedSeates?.length || 0}
                  </p>
                  <p className="flex gap-1 md:justify-end items-center">
                    <span className="text-gray-400">Seat Number:</span>
                    {item.bookedSeates?.join(", ")}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  ) : (
    <Loading />
  );
};

export default MyBookings;
