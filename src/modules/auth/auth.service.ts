import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { LoginInput, RegisterInput } from './auth.schema';
import { AuditAction } from '@prisma/client';

export class AuthService {
  // Register is ADMIN-only in routes, but the service itself is role-agnostic.
  // Default role is VIEWER — principle of least privilege.
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw ApiError.conflict('A user with this email already exists');
    }

    // bcrypt with cost factor 12 — slow enough to resist brute force,
    // fast enough for normal usage (~250ms per hash)
    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return user;
  }

  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Use constant-time comparison pattern: always call bcrypt.compare
    // even if user doesn't exist. Prevents timing-based user enumeration.
    const passwordMatch = user
      ? await bcrypt.compare(input.password, user.password)
      : await bcrypt.compare(input.password, '$2b$12$placeholderhashtopreventtiming');

    if (!user || !passwordMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.status === 'INACTIVE') {
      throw ApiError.unauthorized('Account is inactive. Contact an administrator.');
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );

    // Log the login event for the audit trail
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.LOGIN,
        entity: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
      },
    });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async logout(userId: string, ipAddress?: string) {
    // JWTs are stateless — true server-side logout requires a token blocklist (Redis).
    // For this scope, we log the event. In production, add Redis-based token revocation.
    await prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.LOGOUT,
        entity: 'User',
        entityId: userId,
        ipAddress,
      },
    });

    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    });

    if (!user) throw ApiError.notFound('User not found');
    return user;
  }
}