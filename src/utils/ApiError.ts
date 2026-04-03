// Custom error class that carries an HTTP status code and machine-readable code.
// Throwing an ApiError anywhere in the app bubbles up to the global
// error handler which formats it into the standard error envelope.
//
// Usage:  throw new ApiError(404, 'Transaction not found', 'NOT_FOUND')

export class ApiError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean; // Distinguishes expected errors from unexpected bugs

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || HttpStatus[statusCode] || 'INTERNAL_ERROR';
    this.isOperational = true;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  // Convenience factories for common cases
  static badRequest(message: string, code?: string): ApiError {
    return new ApiError(400, message, code || 'BAD_REQUEST');
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message, 'CONFLICT');
  }
}

const HttpStatus: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
};