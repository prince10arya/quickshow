import { Link, useNavigate } from 'react-router-dom';
import { assets } from '../assets/assets';
import { MenuIcon, SearchIcon, TicketPlus, XIcon, LogOut, History as HistoryIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const Navbar = () => {
  const { favoriteMovies, user, logout, navigate: ctxNavigate } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="fixed top-0 left-0 z-50 w-full flex items-center justify-between px-6 md:px-16 lg:px-36 py-5">
      <Link to="/" className="max-md:flex-1">
        <img src={assets.logo} alt="QuickShow" />
      </Link>

      <div
        className={`max-md:absolute max-md:top-0 max-md:left-0 max-md:font-medium max-md:text-lg z-50 flex flex-col md:flex-row items-center py-3 max-md:justify-center gap-8 max-lg:gap-4 max-lg:justify-center max-lg:text-sm max-lg:mx-3 min-md:px-8 max-md:h-screen min-md:rounded-full backdrop-blur bg-black/70 md:bg-white/10 md:border border-gray-300/20 overflow-hidden transition-[width] duration-300 ${
          isOpen ? 'max-md:w-full' : 'max-md:w-0'
        }`}
      >
        <XIcon className="md:hidden absolute top-6 right-6 w-6 h-6 cursor-pointer" onClick={() => setIsOpen(false)} />
        <Link to="/" onClick={() => { scrollTo(0, 0); setIsOpen(false); }}>Home</Link>
        <Link to="/movies" onClick={() => { scrollTo(0, 0); setIsOpen(false); }}>Movies</Link>
        {favoriteMovies.length > 0 && (
          <Link to="/favourites" onClick={() => { scrollTo(0, 0); setIsOpen(false); }}>Favourites</Link>
        )}
        {user && (
          <Link to="/history" onClick={() => { scrollTo(0, 0); setIsOpen(false); }}>History</Link>
        )}
      </div>

      <div className="flex items-center gap-8">
        <SearchIcon className="mask-md:hidden w-6 h-6 cursor-pointer" />

        {!user ? (
          <button
            id="navbar-login-btn"
            onClick={() => navigate('/login')}
            className="px-4 py-1 sm:px-7 sm:py-2 max-lg:mx-3 btn-style max-lg:text-sm rounded-full"
          >
            Login
          </button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              id="navbar-user-avatar"
              onClick={() => setDropdownOpen((p) => !p)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white text-sm font-bold hover:scale-105 transition-transform shadow-lg shadow-violet-600/30"
            >
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                initials
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <button
                  id="navbar-my-bookings"
                  onClick={() => { navigate('/my-bookings'); setDropdownOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <TicketPlus width={15} />
                  My Bookings
                </button>
                <button
                  id="navbar-history"
                  onClick={() => { navigate('/history'); setDropdownOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <HistoryIcon width={15} />
                  Watch History
                </button>
                <button
                  id="navbar-logout-btn"
                  onClick={() => { logout(); setDropdownOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut width={15} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <MenuIcon className="max-md:ml-4 md:hidden w-8 h-8 cursor-pointer" onClick={() => setIsOpen(true)} />
    </div>
  );
};

export default Navbar;
