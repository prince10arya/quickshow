import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getToken } from './authSlice.js';

export const fetchFavorites = createAsyncThunk('favorites/fetchFavorites', async (_, { rejectWithValue }) => {
  try {
    const token = await getToken();
    if (!token) return [];
    const { data } = await axios.get('/api/user/favourites', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data.success) {
      return data.movies;
    }
    toast.error(data.message || 'Failed to fetch favorites');
    return rejectWithValue(data.message);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const toggleFavorite = createAsyncThunk('favorites/toggleFavorite', async (movieId, { dispatch, rejectWithValue }) => {
  try {
    const token = await getToken();
    if (!token) throw new Error('Authentication required');
    const { data } = await axios.post(
      '/api/user/update-favourite',
      { movieId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (data.success) {
      dispatch(fetchFavorites());
      return data.message;
    }
    toast.error(data.message);
    return rejectWithValue(data.message);
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    toast.error(message);
    return rejectWithValue(message);
  }
});

const initialState = {
  favoriteMovies: [],
  status: 'idle',
  error: null,
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    setFavoriteMovies: (state, action) => {
      state.favoriteMovies = action.payload;
    },
    clearFavorites: (state) => {
      state.favoriteMovies = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavorites.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.favoriteMovies = action.payload || [];
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { setFavoriteMovies, clearFavorites } = favoritesSlice.actions;
export default favoritesSlice.reducer;
