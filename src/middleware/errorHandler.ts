import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { RequestValidationError } from './validate';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// Global error handler — must be the last middleware registered in app.ts.
// Express identifies it as an error handler via the 4-argument signature.
//
// Two categories of errors:
//   Operational  — ApiError / RequestValidationError: expected, safe to show to client
//   Programmer   — anything else: likely a bug, log it, return a generic message

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Validation errors (from validate middleware)
  if (err instanceof RequestValidationError) {
    res.status(400).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: err.errors,
    });
    return;
  }

  // Operational API errors (thrown with ApiError.xxx() factories)
  if (err instanceof ApiError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
    return;
  }

  // Unexpected / programmer errors — never leak internals in production
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    code: 'INTERNAL_SERVER_ERROR',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}