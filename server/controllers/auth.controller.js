import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/auth/auth.service.js';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
};

export const register = async (req, res) => {
  try {
    const { name, email, password, image } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'name, email and password required' });

    if (await User.findOne({ email }))
      return res.status(409).json({ success: false, message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, image: image || '' });

    const payload = { sub: user._id.toString(), role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.status(201).json({ success: true, accessToken, user: { _id: user._id, name: user.name, email: user.email, image: user.image, role: user.role } });
  } catch (error) {
    console.error('register error', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'email and password required' });

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const payload = { sub: user._id.toString(), role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.json({ success: true, accessToken, user: { _id: user._id, name: user.name, email: user.email, image: user.image, role: user.role } });
  } catch (error) {
    console.error('login error', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.sub);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const payload = { sub: user._id.toString(), role: user.role };
    const accessToken = signAccessToken(payload);
    const newRefresh = signRefreshToken(payload);

    res.cookie('refreshToken', newRefresh, COOKIE_OPTS);
    res.json({ success: true, accessToken });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

export const logout = (_req, res) => {
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ success: true, message: 'Logged out' });
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
