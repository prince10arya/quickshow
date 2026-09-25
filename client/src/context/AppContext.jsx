import { createContext, useCallback, useContext, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store/hooks.js';
import {
  bootstrapAuth,
  checkAdmin,
  getToken,
  loginUser,
  logoutUser,
  registerUser,
} from '../store/slices/authSlice.js';
import { fetchShows } from '../store/slices/showsSlice.js';
import { clearFavorites, fetchFavorites } from '../store/slices/favoritesSlice.js';
import {
  selectFavorites,
  selectIsAdmin,
  selectShows,
  selectUser,
} from '../store/index.js';

axios.defaults.baseURL = import.meta.env?.VITE_BASE_URL || '';
axios.defaults.withCredentials = true;

export const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useAppSelector(selectUser);
  const isAdmin = useAppSelector(selectIsAdmin);
  const shows = useAppSelector(selectShows);
  const favoriteMovies = useAppSelector(selectFavorites);

  // ── Auth helpers (delegating to Redux thunks) ──────────────────────────

  const login = async (email, password) => {
    return dispatch(loginUser({ email, password })).unwrap();
  };

  const register = async (name, email, password) => {
    return dispatch(registerUser({ name, email, password })).unwrap();
  };

  const logout = async () => {
    await dispatch(logoutUser());
    dispatch(clearFavorites());
    navigate('/');
  };

  // ── Admin verification ────────────────────────────────────────────────

  const fetchIsAdmin = useCallback(async () => {
    try {
      const result = await dispatch(checkAdmin()).unwrap();
      return result;
    } catch (error) {
      if (location.pathname.startsWith('/admin')) {
        navigate('/');
        toast.error('Not authorized to view this page.');
      }
      return false;
    }
  }, [dispatch, location.pathname, navigate]);

  // ── Data fetchers ─────────────────────────────────────────────────────

  const fetchShowsData = useCallback(async () => {
    dispatch(fetchShows());
  }, [dispatch]);

  const fetchFavouriteMovie = useCallback(async () => {
    dispatch(fetchFavorites());
  }, [dispatch]);

  // ── Bootstrap on mount ────────────────────────────────────────────────

  useEffect(() => {
    dispatch(bootstrapAuth());
    dispatch(fetchShows());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      dispatch(fetchFavorites());
    }
  }, [user, dispatch]);

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
    fetchShows: fetchShowsData,
    login,
    logout,
    register,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
