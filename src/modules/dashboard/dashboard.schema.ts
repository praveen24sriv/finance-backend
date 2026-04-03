import { z } from 'zod';

const isoDatetime = z.string().datetime('Must be a valid ISO datetime');

export const overviewQuerySchema = z.object({
  startDate: isoDatetime.optional(),
  endDate: isoDatetime.optional(),
});

export const categoriesQuerySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  startDate: isoDatetime.optional(),
  endDate: isoDatetime.optional(),
});

export const monthlyTrendsQuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/, 'Year must be a 4-digit number')
    .optional(),
});

export const recentActivityQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/, 'Limit must be numeric').optional(),
});

export const topCategoriesQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/, 'Limit must be numeric').optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
});

export type OverviewQuery = z.infer<typeof overviewQuerySchema>;
export type CategoriesQuery = z.infer<typeof categoriesQuerySchema>;
export type MonthlyTrendsQuery = z.infer<typeof monthlyTrendsQuerySchema>;
export type RecentActivityQuery = z.infer<typeof recentActivityQuerySchema>;
export type TopCategoriesQuery = z.infer<typeof topCategoriesQuerySchema>;
