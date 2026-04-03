import { Prisma, AuditAction } from '@prisma/client';
import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { paginate, buildPaginationMeta } from '../../utils/pagination';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionQueryInput,
} from './transactions.schema';

// Fields returned for every transaction — consistent shape across all endpoints
const transactionSelect = {
  id: true,
  amount: true,
  type: true,
  category: true,
  date: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TransactionSelect;

export class TransactionsService {
  async findAll(query: TransactionQueryInput) {
    const { skip, take, page, limit } = paginate(query);

    // Soft-deleted records are excluded by default — consumers never see them
    const where: Prisma.TransactionWhereInput = {
      deletedAt: null,
      ...(query.type && { type: query.type }),
      ...(query.category && { category: { contains: query.category, mode: 'insensitive' } }),
      ...(query.search && {
        OR: [
          { category: { contains: query.search, mode: 'insensitive' } },
          { notes: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      // Date range: startDate and endDate are independently optional
      ...((query.startDate || query.endDate) && {
        date: {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          ...(query.endDate && { lte: new Date(query.endDate) }),
        },
      }),
    };

    const orderBy: Prisma.TransactionOrderByWithRelationInput = {
      [query.sortBy ?? 'date']: query.sortOrder ?? 'desc',
    };

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({ where, select: transactionSelect, skip, take, orderBy }),
    ]);

    return { transactions, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    const transaction = await prisma.transaction.findFirst({
      where: { id, deletedAt: null },
      select: transactionSelect,
    });

    if (!transaction) throw ApiError.notFound(`Transaction with id "${id}" not found`);
    return transaction;
  }

  async create(input: CreateTransactionInput, userId: string) {
    const transaction = await prisma.transaction.create({
      data: {
        amount: new Prisma.Decimal(input.amount),
        type: input.type,
        category: input.category,
        date: new Date(input.date),
        notes: input.notes,
        createdById: userId,
      },
      select: transactionSelect,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CREATE,
        entity: 'Transaction',
        entityId: transaction.id,
        metadata: { created: input },
      },
    });

    return transaction;
  }

  async update(id: string, input: UpdateTransactionInput, userId: string) {
    const existing = await prisma.transaction.findFirst({
      where: { id, deletedAt: null },
      select: transactionSelect,
    });

    if (!existing) throw ApiError.notFound(`Transaction with id "${id}" not found`);

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(input.amount !== undefined && { amount: new Prisma.Decimal(input.amount) }),
        ...(input.type && { type: input.type }),
        ...(input.category && { category: input.category }),
        ...(input.date && { date: new Date(input.date) }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
      select: transactionSelect,
    });

    // Store before/after for full audit traceability
    await prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE,
        entity: 'Transaction',
        entityId: id,
        metadata: {
          before: existing,
          after: updated,
          changes: input,
        },
      },
    });

    return updated;
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.transaction.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) throw ApiError.notFound(`Transaction with id "${id}" not found`);

    // Soft delete — set deletedAt timestamp instead of removing the row.
    // Financial records must be preserved for compliance and audit purposes.
    await prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.DELETE,
        entity: 'Transaction',
        entityId: id,
        metadata: { softDeleted: true, deletedAt: new Date() },
      },
    });

    return { message: 'Transaction deleted successfully' };
  }
}