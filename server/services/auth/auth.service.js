import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export const signAccessToken = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer: 'quickshow',
  });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
    issuer: 'quickshow',
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'], issuer: 'quickshow' });

export const verifyRefreshToken = (token) =>
  jwt.verify(token, REFRESH_SECRET, { algorithms: ['HS256'], issuer: 'quickshow' });
