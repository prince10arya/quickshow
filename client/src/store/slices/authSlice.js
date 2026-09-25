import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import {
  authLogin,
  authLogout,
  authMe,
  authRefresh,
  authRegister,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../../services/auth.service.js';

export const getToken = async () => {
  const current = getAccessToken();
  if (current) return current;
  try {
    const { data } = await authRefresh();
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
};

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
  try {
    const { data: refreshData } = await authRefresh();
    setAccessToken(refreshData.accessToken);
    const { data: meData } = await authMe(refreshData.accessToken);
    return meData.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const loginUser = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const { data } = await authLogin(email, password);
    setAccessToken(data.accessToken);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const registerUser = createAsyncThunk('auth/register', async ({ name, email, password }, { rejectWithValue }) => {
  try {
    const { data } = await authRegister(name, email, password);
    setAccessToken(data.accessToken);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    await authLogout();
  } finally {
    clearAccessToken();
  }
});

export const checkAdmin = createAsyncThunk('auth/checkAdmin', async (_, { rejectWithValue }) => {
  try {
    const token = await getToken();
    if (!token) return false;
    const { data } = await axios.get('/api/admin/is-admin', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return Boolean(data.isAdmin);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

const initialState = {
  user: null,
  isAdmin: false,
  status: 'idle',
  error: null,
  isBootstrapped: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAdmin = action.payload?.role === 'admin';
    },
    setIsAdmin: (state, action) => {
      state.isAdmin = Boolean(action.payload);
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAdmin = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Bootstrap
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAdmin = action.payload?.role === 'admin';
        state.isBootstrapped = true;
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.user = null;
        state.isAdmin = false;
        state.isBootstrapped = true;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.isAdmin = action.payload?.role === 'admin';
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.isAdmin = action.payload?.role === 'admin';
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAdmin = false;
        state.status = 'idle';
      })
      // Check Admin
      .addCase(checkAdmin.fulfilled, (state, action) => {
        state.isAdmin = action.payload;
      })
      .addCase(checkAdmin.rejected, (state) => {
        state.isAdmin = false;
      });
  },
});

export const { setUser, setIsAdmin, clearAuth } = authSlice.actions;
export default authSlice.reducer;
