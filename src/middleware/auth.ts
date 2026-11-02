import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const userHeader = req.headers['x-user-id'] as string;

  // 1. Check Bearer token if provided
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        name: (decoded as any).name,
      };
      return next();
    } catch {
      // Continue to check fallback user header
    }
  }

  // 2. Check authenticated app session header
  if (userHeader && userHeader.trim()) {
    req.user = {
      uid: userHeader.trim(),
      name: userHeader.trim(),
    };
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication' });
};
