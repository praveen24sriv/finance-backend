import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

// Role hierarchy: ADMIN > ANALYST > VIEWER
// authorize() is a Higher-Order Function — takes allowed roles, returns middleware.
// The inner function uses early returns via next(err) then explicit return
// to satisfy TypeScript's void return type without falling through.
//
// Usage:  router.post('/', authenticate, authorize(Role.ADMIN), controller.create)

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        ApiError.forbidden(
          `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
        )
      );
      return;
    }

    next();
  };
}

// Convenience aliases — use these in routes for readability
export const adminOnly     = authorize(Role.ADMIN);
export const analystOrAbove = authorize(Role.ANALYST, Role.ADMIN);
export const anyRole        = authorize(Role.VIEWER, Role.ANALYST, Role.ADMIN);