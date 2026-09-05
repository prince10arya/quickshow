import { verifyAccessToken } from '../services/auth/auth.service.js';

/**
 * Attach req.user from JWT. Rejects if no valid token.
 */
export const protect = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Authentication required' });

    const token = header.slice(7);
    req.user = verifyAccessToken(token); // { sub, role, iat, exp, iss }
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Requires admin role. Must be used after protect.
 */
export const protectAdmin = [
  protect,
  (req, res, next) => {
    if (req.user?.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Admin access required' });
    next();
  },
];

// isAdmin response helper used by admin routes
export const isAdmin = (_req, res) => res.json({ success: true, isAdmin: true });
