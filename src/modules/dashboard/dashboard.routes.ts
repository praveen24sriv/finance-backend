import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/authenticate';
import { anyRole, analystOrAbove } from '../../middleware/authorize';

const router = Router();
const controller = new DashboardController();

// Basic summary — all authenticated users can see this
router.get('/overview',       authenticate, anyRole, controller.getOverview.bind(controller));
router.get('/recent-activity',authenticate, anyRole, controller.getRecentActivity.bind(controller));

// Analytical views — ANALYST and ADMIN only
// VIEWERs see the summary but not the deeper breakdowns
router.get('/categories',      authenticate, analystOrAbove, controller.getCategoryBreakdown.bind(controller));
router.get('/trends/monthly',  authenticate, analystOrAbove, controller.getMonthlyTrends.bind(controller));
router.get('/top-categories',  authenticate, analystOrAbove, controller.getTopCategories.bind(controller));
router.get('/period-comparison', authenticate, analystOrAbove, controller.getPeriodComparison.bind(controller));

export default router;