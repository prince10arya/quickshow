import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import toast from 'react-hot-toast';

export const fetchShows = createAsyncThunk('shows/fetchShows', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axios.get('/api/shows/all');
    if (data.success) {
      return data.show;
    }
    toast.error(data.message || 'Failed to load shows');
    return rejectWithValue(data.message);
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    toast.error(message);
    return rejectWithValue(message);
  }
});

const initialState = {
  shows: [],
  status: 'idle',
  error: null,
};

const showsSlice = createSlice({
  name: 'shows',
  initialState,
  reducers: {
    setShows: (state, action) => {
      state.shows = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchShows.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchShows.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.shows = action.payload || [];
      })
      .addCase(fetchShows.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { setShows } = showsSlice.actions;
export default showsSlice.reducer;
