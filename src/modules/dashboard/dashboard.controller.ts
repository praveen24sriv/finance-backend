import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import { ApiResponse } from '../../utils/ApiResponse';
import {
  categoriesQuerySchema,
  monthlyTrendsQuerySchema,
  overviewQuerySchema,
  recentActivityQuerySchema,
  topCategoriesQuerySchema,
} from './dashboard.schema';

const dashboardService = new DashboardService();

export class DashboardController {
  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = overviewQuerySchema.parse(req.query);
      const data = await dashboardService.getOverview(startDate, endDate);
      res.json(ApiResponse.ok('Overview fetched', data));
    } catch (err) { next(err); }
  }

  async getCategoryBreakdown(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, startDate, endDate } = categoriesQuerySchema.parse(req.query);
      const data = await dashboardService.getCategoryBreakdown(
        type,
        startDate,
        endDate
      );
      res.json(ApiResponse.ok('Category breakdown fetched', data));
    } catch (err) { next(err); }
  }

  async getMonthlyTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { year: rawYear } = monthlyTrendsQuerySchema.parse(req.query);
      const year = rawYear ? parseInt(rawYear, 10) : undefined;
      const data = await dashboardService.getMonthlyTrends(year);
      res.json(ApiResponse.ok('Monthly trends fetched', data));
    } catch (err) { next(err); }
  }

  async getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit: rawLimit } = recentActivityQuerySchema.parse(req.query);
      const limit = rawLimit ? parseInt(rawLimit, 10) : 10;
      const data = await dashboardService.getRecentActivity(limit);
      res.json(ApiResponse.ok('Recent activity fetched', data));
    } catch (err) { next(err); }
  }

  async getTopCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit: rawLimit, type = 'EXPENSE' } = topCategoriesQuerySchema.parse(req.query);
      const limit = rawLimit ? parseInt(rawLimit, 10) : 5;
      const data = await dashboardService.getTopCategories(limit, type);
      res.json(ApiResponse.ok('Top categories fetched', data));
    } catch (err) { next(err); }
  }

  async getPeriodComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getPeriodComparison();
      res.json(ApiResponse.ok('Period comparison fetched', data));
    } catch (err) { next(err); }
  }
}