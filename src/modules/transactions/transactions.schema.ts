import { z } from 'zod';
import { TransactionType } from '@prisma/client';

export const createTransactionSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be a positive number')
    .multipleOf(0.01, 'Amount cannot have more than 2 decimal places'),
  type: z.nativeEnum(TransactionType, { required_error: 'Type must be INCOME or EXPENSE' }),
  category: z.string().min(1, 'Category is required').max(100),
  date: z.string().datetime({ message: 'Date must be a valid ISO 8601 datetime string' }),
  notes: z.string().max(500).optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();
// .partial() makes every field optional — correct for PATCH semantics

export const transactionQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  type: z.nativeEnum(TransactionType).optional(),
  category: z.string().optional(),
  // Date range filtering — both optional independently
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  // Free-text search across category and notes
  search: z.string().optional(),
  // Sorting
  sortBy: z.enum(['date', 'amount', 'createdAt']).optional().default('date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;