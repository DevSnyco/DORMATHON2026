// server/auth.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.js';

const JWT_SECRET = process.env.IRYS_JWT_SECRET || 'irys-dev-secret-change-me';
const TOKEN_TTL = '12h';

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}
export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Auth middleware: requires Bearer token; attaches req.provider (the tenant)
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const claims = token ? verifyToken(token) : null;
  if (!claims) return res.status(401).json({ error: 'Unauthorized' });
  req.auth = claims;
  next();
}

// Helper used by routes to scope queries to the logged-in provider
export function providerId(req) {
  return req.auth.providerId;
}
