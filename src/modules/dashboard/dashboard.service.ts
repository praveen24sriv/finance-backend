import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

export class DashboardService {
  // ─── Overview ────────────────────────────────────────────────────────────────
  // Core summary: total income, total expenses, net balance.
  // Uses Prisma's groupBy to run a single efficient query instead of two.
  async getOverview(startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const totals = await prisma.transaction.groupBy({
      by: ['type'],
      where: { deletedAt: null, ...dateFilter },
      _sum: { amount: true },
      _count: { id: true },
    });

    const income = totals.find((t) => t.type === 'INCOME');
    const expense = totals.find((t) => t.type === 'EXPENSE');

    const totalIncome = Number(income?._sum.amount ?? 0);
    const totalExpenses = Number(expense?._sum.amount ?? 0);

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      transactionCount: (income?._count.id ?? 0) + (expense?._count.id ?? 0),
      incomeCount: income?._count.id ?? 0,
      expenseCount: expense?._count.id ?? 0,
    };
  }

  // ─── Category Breakdown ───────────────────────────────────────────────────────
  // Shows spending/income by category — essential for a finance dashboard.
  // Returns sorted by total descending so the most significant categories come first.
  async getCategoryBreakdown(type?: 'INCOME' | 'EXPENSE', startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const breakdown = await prisma.transaction.groupBy({
      by: ['category', 'type'],
      where: {
        deletedAt: null,
        ...(type && { type }),
        ...dateFilter,
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    return breakdown.map((item) => ({
      category: item.category,
      type: item.type,
      total: Number(item._sum.amount ?? 0),
      count: item._count.id,
    }));
  }

  // ─── Monthly Trends ───────────────────────────────────────────────────────────
  // Groups transactions by month for trend charts.
  // Uses raw SQL for date_trunc — Prisma's groupBy doesn't support date truncation natively.
  // This is a legitimate and common pattern; raw queries are fine when the ORM can't express it.
  async getMonthlyTrends(year?: number) {
    const targetYear = year ?? new Date().getFullYear();

    const result = await prisma.$queryRaw<
      Array<{ month: Date; type: string; total: number; count: bigint }>
    >`
      SELECT
        date_trunc('month', date) AS month,
        type,
        SUM(amount)::float        AS total,
        COUNT(id)                 AS count
      FROM transactions
      WHERE
        EXTRACT(YEAR FROM date) = ${targetYear}
        AND "deletedAt" IS NULL
      GROUP BY date_trunc('month', date), type
      ORDER BY month ASC
    `;

    // Reshape into a structure easy for charting libraries to consume:
    // { month: "2024-01", income: 5000, expenses: 3000, net: 2000 }
    const monthMap = new Map<string, { income: number; expenses: number; count: number }>();

    for (const row of result) {
      const key = row.month.toISOString().slice(0, 7); // "YYYY-MM"
      if (!monthMap.has(key)) {
        monthMap.set(key, { income: 0, expenses: 0, count: 0 });
      }
      const entry = monthMap.get(key)!;
      entry.count += Number(row.count);
      if (row.type === 'INCOME') entry.income += row.total;
      else entry.expenses += row.total;
    }

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses,
      transactionCount: data.count,
    }));
  }

  // ─── Recent Activity ──────────────────────────────────────────────────────────
  // Last N transactions — useful for dashboard activity feed
  async getRecentActivity(limit = 10) {
    const transactions = await prisma.transaction.findMany({
      where: { deletedAt: null },
      orderBy: { date: 'desc' },
      take: Math.min(limit, 50), // Cap at 50 to prevent abuse
      select: {
        id: true,
        amount: true,
        type: true,
        category: true,
        date: true,
        notes: true,
        createdBy: { select: { name: true } },
      },
    });

    return transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
    }));
  }

  // ─── Top Categories ───────────────────────────────────────────────────────────
  // Returns top N expense categories — useful for "biggest spending areas" widget
  async getTopCategories(limit = 5, type: 'INCOME' | 'EXPENSE' = 'EXPENSE') {
    const result = await prisma.transaction.groupBy({
      by: ['category'],
      where: { deletedAt: null, type },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    return result.map((item) => ({
      category: item.category,
      total: Number(item._sum.amount ?? 0),
    }));
  }

  // ─── Period Comparison ────────────────────────────────────────────────────────
  // Compares current month vs previous month — shows growth/decline
  // This is the kind of insight a real dashboard needs
  async getPeriodComparison() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month

    const [current, previous] = await Promise.all([
      this.getOverview(currentMonthStart.toISOString(), now.toISOString()),
      this.getOverview(prevMonthStart.toISOString(), prevMonthEnd.toISOString()),
    ]);

    const safeChange = (curr: number, prev: number) =>
      prev === 0 ? null : parseFloat((((curr - prev) / prev) * 100).toFixed(2));

    return {
      currentMonth: { label: this.monthLabel(now), ...current },
      previousMonth: { label: this.monthLabel(prevMonthStart), ...previous },
      changes: {
        incomeChange: safeChange(current.totalIncome, previous.totalIncome),
        expenseChange: safeChange(current.totalExpenses, previous.totalExpenses),
        netChange: safeChange(current.netBalance, previous.netBalance),
      },
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private buildDateFilter(startDate?: string, endDate?: string): Prisma.TransactionWhereInput {
    if (!startDate && !endDate) return {};
    return {
      date: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    };
  }

  private monthLabel(date: Date): string {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }
}