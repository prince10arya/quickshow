import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  authLogin,
  authLogout,
  authMe,
  authRefresh,
  authRegister,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../services/auth.service.js';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;
axios.defaults.withCredentials = true;

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shows, setShows] = useState([]);
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  // ── Auth helpers ──────────────────────────────────────────────────────────

  const login = async (email, password) => {
    const { data } = await authLogin(email, password);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setIsAdmin(data.user.role === 'admin');
  };

  const register = async (name, email, password) => {
    const { data } = await authRegister(name, email, password);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setIsAdmin(data.user.role === 'admin');
  };

  const logout = async () => {
    await authLogout();
    clearAccessToken();
    setUser(null);
    setIsAdmin(false);
    setFavoriteMovies([]);
    navigate('/');
  };

  // Returns a valid access token, refreshing silently if needed
  const getToken = useCallback(async () => {
    const current = getAccessToken();
    if (current) return current;
    try {
      const { data } = await authRefresh();
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      return null;
    }
  }, []);

  // ── Data fetchers ─────────────────────────────────────────────────────────

  const fetchIsAdmin = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const { data } = await axios.get('/api/admin/is-admin', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsAdmin(data.isAdmin);
    } catch (error) {
      setIsAdmin(false);
      if (error.response?.status === 401 || error.response?.status === 403) {
        if (location.pathname.startsWith('/admin')) {
          navigate('/');
          toast.error('Not authorized to view this page.');
        }
      }
    }
  }, [getToken, location.pathname, navigate]);

  const fetchShows = async () => {
    try {
      const { data } = await axios.get('/api/shows/all');
      data.success ? setShows(data.show) : toast.error(data.message);
    } catch (error) {
      console.error('fetchShows error', error);
    }
  };

  const fetchFavouriteMovie = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const { data } = await axios.get('/api/user/favourites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      data.success ? setFavoriteMovies(data.movies) : toast.error(data.message);
    } catch (error) {
      console.error('fetchFavouriteMovie error', error);
    }
  }, [getToken]);

  // ── Bootstrap: try silent refresh on mount ───────────────────────────────

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data: refreshData } = await authRefresh();
        setAccessToken(refreshData.accessToken);
        const { data: meData } = await authMe(refreshData.accessToken);
        setUser(meData.user);
        setIsAdmin(meData.user.role === 'admin');
      } catch {
        // No valid refresh token — user not logged in, that's fine
      }
    };
    bootstrap();
    fetchShows();
  }, []);

  useEffect(() => {
    if (user) {
      fetchFavouriteMovie();
    }
  }, [user, fetchFavouriteMovie]);

  const value = {
    axios,
    user,
    getToken,
    navigate,
    isAdmin,
    shows,
    favoriteMovies,
    fetchFavouriteMovie,
    fetchIsAdmin,
    login,
    logout,
    register,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
