import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { Role, UserStatus } from '@prisma/client';

// Extend Express Request to carry the authenticated user.
// Declared globally so every downstream middleware/controller gets the type.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

// Verifies the Bearer token and attaches the user to req.user.
// Uses next(err) + return pattern to satisfy TypeScript void return type.
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      next(ApiError.unauthorized('Missing or malformed authorization header'));
      return;
    }

    const token = authHeader.split(' ')[1];

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      next(ApiError.unauthorized('Invalid or expired token'));
      return;
    }

    // Verify the user still exists and is active.
    // Catches the case where a token is valid but the user was deactivated after issuance.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!user) {
      next(ApiError.unauthorized('User no longer exists'));
      return;
    }

    if (user.status === UserStatus.INACTIVE) {
      next(ApiError.unauthorized('Account is inactive'));
      return;
    }

    req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}