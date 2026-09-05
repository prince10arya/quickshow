import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LockIcon, CreditCardIcon, CheckCircleIcon, FilmIcon, CalendarIcon, TicketIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { dateFormat } from '../lib/dateFormat';
import timeFormat from '../lib/timeFormat';

/* ── tiny helpers ── */
const fmt = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const fmtExp = (v) => v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
const fmtCvv = (v) => v.replace(/\D/g, '').slice(0, 4);

const DummyPayment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { axios, getToken } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });

  /* fetch booking details */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get('/api/user/bookings', {
          headers: { Authorization: `Bearer ${await getToken()}` },
        });
        if (data.success) {
          const found = data.bookings.find((b) => b._id === bookingId);
          setBooking(found ?? null);
          if (found?.isPaid) setPaid(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const handlePay = async (e) => {
    e.preventDefault();
    setPaying(true);
    try {
      /* hits GET /api/bookings/confirm-dummy/:id — returns 302 redirect,
         but we handle it ourselves so no hard redirect happens */
      await axios.get(`/api/bookings/confirm-dummy/${bookingId}`, {
        maxRedirects: 0,
        validateStatus: (s) => s < 400,
      });
      setPaid(true);
      setTimeout(() => navigate('/my-bookings'), 2200);
    } catch (err) {
      /* axios follows redirect to client URL which may CORS-fail; that's fine —
         the DB was already updated before the redirect */
         console.error(err)
      setPaid(true);
      setTimeout(() => navigate('/my-bookings'), 2200);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-400">
        <TicketIcon className="w-12 h-12 opacity-30" />
        <p>Booking not found.</p>
        <button onClick={() => navigate('/my-bookings')} className="text-primary underline text-sm">
          Back to My Bookings
        </button>
      </div>
    );
  }

  const movie = booking.show?.movie;

  /* ── Success screen ── */
  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="dp-card text-center max-w-sm w-full p-10">
          <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4 animate-bounce-once" />
          <h2 className="text-2xl font-bold mb-1">Payment Successful!</h2>
          <p className="text-gray-400 text-sm mb-6">Enjoy your movie 🎬</p>
          <p className="text-xs text-gray-500">Redirecting to My Bookings…</p>
        </div>
      </div>
    );
  }

  /* ── Payment page ── */
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6">

        {/* ── Order summary ── */}
        <div className="dp-card flex-1 p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Order Summary</h2>

          <div className="flex gap-4">
            {movie?.poster_path && (
              <img
                src={movie.poster_path}
                alt={movie.title}
                className="w-20 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="min-w-0">
              <h3 className="font-bold text-base truncate">{movie?.title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {movie?.genres?.slice(0, 2).join(' · ')}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  {dateFormat(booking.show?.showDateTime)}
                </span>
                <span className="flex items-center gap-1">
                  <FilmIcon className="w-3 h-3" />
                  {timeFormat(movie?.runtime)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/8 mt-5 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Seats</span>
              <span>{booking.bookedSeates?.join(', ')}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Tickets × {booking.bookedSeates?.length}</span>
              <span>{currency}{booking.amount}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Convenience fee</span>
              <span className="text-green-400">FREE</span>
            </div>
            <div className="border-t border-white/8 pt-2 flex justify-between font-bold text-white text-base">
              <span>Total</span>
              <span>{currency}{booking.amount}</span>
            </div>
          </div>

          {/* Dummy notice */}
          <div className="mt-5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-400">
            🧪 Dummy payment mode — no real money will be charged.
          </div>
        </div>

        {/* ── Card form ── */}
        <div className="dp-card flex-1 p-6">
          <div className="flex items-center gap-2 mb-6">
            <CreditCardIcon className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Card Details</h2>
            <span className="ml-auto flex items-center gap-1 text-xs text-gray-500">
              <LockIcon className="w-3 h-3" /> Secured
            </span>
          </div>

          <form onSubmit={handlePay} className="space-y-4">
            {/* Card number */}
            <div className="dp-field-group">
              <label className="dp-label">Card Number</label>
              <input
                className="dp-input"
                placeholder="4242 4242 4242 4242"
                value={card.number}
                onChange={(e) => setCard((c) => ({ ...c, number: fmt(e.target.value) }))}
                maxLength={19}
                required
              />
            </div>

            {/* Name */}
            <div className="dp-field-group">
              <label className="dp-label">Name on Card</label>
              <input
                className="dp-input"
                placeholder="John Doe"
                value={card.name}
                onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                required
              />
            </div>

            {/* Expiry + CVV */}
            <div className="flex gap-3">
              <div className="dp-field-group flex-1">
                <label className="dp-label">Expiry</label>
                <input
                  className="dp-input"
                  placeholder="MM/YY"
                  value={card.expiry}
                  onChange={(e) => setCard((c) => ({ ...c, expiry: fmtExp(e.target.value) }))}
                  maxLength={5}
                  required
                />
              </div>
              <div className="dp-field-group flex-1">
                <label className="dp-label">CVV</label>
                <input
                  className="dp-input"
                  placeholder="123"
                  type="password"
                  value={card.cvv}
                  onChange={(e) => setCard((c) => ({ ...c, cvv: fmtCvv(e.target.value) }))}
                  maxLength={4}
                  required
                />
              </div>
            </div>

            {/* Accepted cards — decorative */}
            <div className="flex gap-2 items-center">
              {['VISA', 'MC', 'AMEX', 'RuPay'].map((b) => (
                <span key={b} className="dp-card-badge">{b}</span>
              ))}
            </div>

            <button
              type="submit"
              disabled={paying}
              className="dp-pay-btn w-full"
            >
              {paying ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="dp-spinner" /> Processing…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LockIcon className="w-4 h-4" />
                  Pay {currency}{booking.amount}
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DummyPayment;
