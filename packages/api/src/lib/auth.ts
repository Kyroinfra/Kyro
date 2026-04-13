import jwt from 'jsonwebtoken';
import config from '../config';

export interface JWTPayload {
  userId: string;
  orgId: string;
  role: 'owner' | 'admin' | 'member';
}

export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '7d',
  });
}

export function verifyJWT(token: string): JWTPayload {
  return jwt.verify(token, config.jwtSecret) as JWTPayload;
}
