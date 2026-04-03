import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Generic Zod validation middleware.
// Replaces req.body with the parsed+coerced output (e.g. string → Date),
// or calls next() with a structured error payload if validation fails.
//
// Usage: router.post('/', validate(createTransactionSchema), controller.create)

export interface ValidationError {
  field: string;
  message: string;
}

// Extend Error to carry validation field details without unsafe casting
export class RequestValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  isOperational = true;
  errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super('Validation failed');
    this.errors = errors;
  }
}

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: ValidationError[] = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new RequestValidationError(errors));
      } else {
        next(err);
      }
    }
  };
}