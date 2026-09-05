import axios from 'axios';

// Access token lives in memory — not localStorage (XSS-safe)
let _accessToken = null;

export const setAccessToken = (token) => { _accessToken = token; };
export const getAccessToken = () => _accessToken;
export const clearAccessToken = () => { _accessToken = null; };

const api = axios.create({ baseURL: import.meta.env.VITE_BASE_URL, withCredentials: true });

export const authRegister = (name, email, password, image = '') =>
  api.post('/api/auth/register', { name, email, password, image });

export const authLogin = (email, password) =>
  api.post('/api/auth/login', { email, password });

export const authRefresh = () =>
  api.post('/api/auth/refresh');

export const authLogout = () =>
  api.post('/api/auth/logout');

export const authMe = (token) =>
  api.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
