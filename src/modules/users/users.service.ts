import { Prisma, AuditAction } from '@prisma/client';
import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { paginate, buildPaginationMeta } from '../../utils/pagination';
import { CreateUserInput, UpdateUserInput, UserQueryInput } from './users.schema';
import bcrypt from 'bcryptjs';

// Fields we're safe to return for any user — password is always excluded
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export class UsersService {
  async create(input: CreateUserInput, actorId: string) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw ApiError.conflict('A user with this email already exists');
    }

    const password = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password,
        role: input.role,
        status: input.status,
      },
      select: safeUserSelect,
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.CREATE,
        entity: 'User',
        entityId: user.id,
        metadata: {
          created: {
            ...user,
            password: undefined,
          },
        },
      },
    });

    return user;
  }

  async findAll(query: UserQueryInput) {
    const { skip, take, page, limit } = paginate(query);

    // Build the filter dynamically — only add conditions for provided params
    const where: Prisma.UserWhereInput = {
      ...(query.role && { role: query.role }),
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    // Run count and data queries in parallel — no reason to wait for one before the other
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, select: safeUserSelect, skip, take, orderBy: { createdAt: 'desc' } }),
    ]);

    return { users, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, select: safeUserSelect });
    if (!user) throw ApiError.notFound(`User with id "${id}" not found`);
    return user;
  }

  async update(id: string, input: UpdateUserInput, actorId: string) {
    // Check user exists before updating
    const existing = await prisma.user.findUnique({ where: { id }, select: safeUserSelect });
    if (!existing) throw ApiError.notFound(`User with id "${id}" not found`);

    // Prevent an admin from accidentally deactivating themselves
    if (id === actorId && input.status === 'INACTIVE') {
      throw ApiError.badRequest('You cannot deactivate your own account');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: input,
      select: safeUserSelect,
    });

    // Audit log: store the before/after snapshot for traceability
    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.UPDATE,
        entity: 'User',
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

  async delete(id: string, actorId: string) {
    if (id === actorId) {
      throw ApiError.badRequest('You cannot delete your own account');
    }

    const existing = await prisma.user.findUnique({ where: { id }, select: safeUserSelect });
    if (!existing) throw ApiError.notFound(`User with id "${id}" not found`);

    // Hard delete of user. Transactions are preserved via createdById foreign key.
    // In a real system you'd soft-delete or anonymize instead.
    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.DELETE,
        entity: 'User',
        entityId: id,
        metadata: { deletedUser: existing },
      },
    });

    return { message: 'User deleted successfully' };
  }

  async getAuditLogs(userId: string, query: { page?: string; limit?: string }) {
    // Verify user exists first
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw ApiError.notFound(`User with id "${userId}" not found`);

    const { skip, take, page, limit } = paginate(query);
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where: { userId } }),
      prisma.auditLog.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, action: true, entity: true,
          entityId: true, ipAddress: true, createdAt: true,
        },
      }),
    ]);

    return { logs, meta: buildPaginationMeta(total, page, limit) };
  }
}