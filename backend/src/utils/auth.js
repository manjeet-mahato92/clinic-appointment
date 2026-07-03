import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export function signToken(payload) {
  // payload: { id, role, hospitalId? }
  return jwt.sign(payload, SECRET, { expiresIn: '12h' });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
