import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { env } from './config/env';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

import authRoutes         from './modules/auth/auth.routes';
import usersRoutes        from './modules/users/users.routes';
import transactionsRoutes from './modules/transactions/transactions.routes';
import dashboardRoutes    from './modules/dashboard/dashboard.routes';

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());  // Sets secure HTTP headers (XSS, clickjacking, etc.)
app.use(cors({
  origin: env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── General Middleware ───────────────────────────────────────────────────────
app.use(compression());                // Gzip responses
app.use(express.json({ limit: '10kb' })); // Body size limit prevents payload attacks
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);                  // Global rate limit

// ─── Logging ─────────────────────────────────────────────────────────────────
// Morgan for HTTP request logs — only in non-test environments
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
// Simple liveness probe — no auth required, used by Docker/k8s health checks
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`,         authRoutes);
app.use(`${API_PREFIX}/users`,        usersRoutes);
app.use(`${API_PREFIX}/transactions`, transactionsRoutes);
app.use(`${API_PREFIX}/dashboard`,    dashboardRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'NOT_FOUND',
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be last — Express identifies error handlers by their 4-argument signature
app.use(errorHandler);

export default app;