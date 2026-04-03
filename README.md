# Finance Dashboard Backend

A production-grade REST API backend for a finance dashboard system, built with **Node.js**, **TypeScript**, **Express**, **PostgreSQL**, and **Prisma ORM**.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack & Decisions](#tech-stack--decisions)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Role-Based Access Control](#role-based-access-control)
- [Design Decisions & Assumptions](#design-decisions--assumptions)
- [Project Structure](#project-structure)

---

## Architecture

```
Request → Router → Middleware (auth, RBAC, validation) → Controller → Service → Prisma ORM → PostgreSQL
```

**Layered architecture** with strict separation of concerns:
- **Routes** — declare endpoints and middleware chains only
- **Controllers** — extract HTTP data, call service, send response
- **Services** — all business logic lives here, framework-agnostic
- **Prisma** — type-safe database access layer

---

## Tech Stack & Decisions

| Choice | Rationale |
|--------|-----------|
| **TypeScript** | Type safety across the full stack; catches bugs at compile time |
| **Express** | Minimal, well-understood, industry-standard — not over-engineered |
| **PostgreSQL** | Relational data fits finance perfectly; ACID compliance matters for money |
| **Prisma ORM** | Type-safe queries, auto-generated migrations, readable schema |
| **Zod** | Runtime validation + TypeScript type inference from a single schema |
| **bcrypt (cost 12)** | Slow enough to resist brute force, fast enough for normal use |
| **JWT** | Stateless auth suitable for this scope |
| **REST over GraphQL** | Known query patterns make GraphQL's flexibility unnecessary here |

---

## Quick Start

### Option 1 — Docker (Recommended)

```bash
git clone <repo-url>
cd finance-backend
cp .env.example .env
# Fill in POSTGRES_PASSWORD, JWT_SECRET, and DATABASE_URL values in .env
docker compose up
```

That's it. Docker will:
1. Start PostgreSQL
2. Run database migrations
3. Seed test users and sample data
4. Start the API on port 3000

### Option 2 — Local Setup

**Prerequisites:** Node.js 20+, PostgreSQL 14+

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set your DATABASE_URL and JWT_SECRET

# Run migrations and generate Prisma client
npm run db:migrate
npm run db:generate

# Seed the database with test data
npm run db:seed

# Start development server
npm run dev
```

### Test Credentials (after seeding)

| Role    | Email                    | Password    | Access |
|---------|--------------------------|-------------|--------|
| Admin   | admin@finance.dev        | Password123 | Full access |
| Analyst | analyst@finance.dev      | Password123 | Read + analytics |
| Viewer  | viewer@finance.dev       | Password123 | Read only |

---

## API Reference

**Base URL:** `http://localhost:3000/api/v1`

All protected routes require: `Authorization: Bearer <token>`

All responses follow this envelope:
```json
{
	"success": true,
	"message": "...",
	"data": {},
	"meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 0 }
}
```

---

### Auth

#### POST /auth/register
Create a new user account (defaults to VIEWER role).
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
	-H "Content-Type: application/json" \
	-d '{ "name": "Jane Doe", "email": "jane@example.com", "password": "Password123" }'
```

#### POST /auth/login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
	-H "Content-Type: application/json" \
	-d '{ "email": "admin@finance.dev", "password": "Password123" }'
```
Response includes `data.token` — use it as your Bearer token.

#### GET /auth/profile `🔒`
Returns the authenticated user's profile.

#### POST /auth/logout `🔒`
Logs the logout event to the audit trail.

---

### Transactions

#### GET /transactions `🔒 All roles`
List transactions with filtering and pagination.

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `type` | `INCOME` \| `EXPENSE` | Filter by type |
| `category` | string | Filter by category (partial match) |
| `startDate` | ISO datetime | Filter from date |
| `endDate` | ISO datetime | Filter to date |
| `search` | string | Search category and notes |
| `sortBy` | `date` \| `amount` \| `createdAt` | Sort field |
| `sortOrder` | `asc` \| `desc` | Sort direction |

```bash
# Get all expenses in January, sorted by amount
curl "http://localhost:3000/api/v1/transactions?type=EXPENSE&startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&sortBy=amount&sortOrder=desc" \
	-H "Authorization: Bearer <token>"
```

#### GET /transactions/:id `🔒 All roles`
```bash
curl http://localhost:3000/api/v1/transactions/<id> \
	-H "Authorization: Bearer <token>"
```

#### POST /transactions `🔒 Admin only`
```bash
curl -X POST http://localhost:3000/api/v1/transactions \
	-H "Authorization: Bearer <admin-token>" \
	-H "Content-Type: application/json" \
	-d '{
		"amount": 5000.00,
		"type": "INCOME",
		"category": "Product Sales",
		"date": "2024-03-15T00:00:00Z",
		"notes": "Q1 product sales batch"
	}'
```

#### PATCH /transactions/:id `🔒 Admin only`
All fields are optional — only send what needs to change.
```bash
curl -X PATCH http://localhost:3000/api/v1/transactions/<id> \
	-H "Authorization: Bearer <admin-token>" \
	-H "Content-Type: application/json" \
	-d '{ "notes": "Updated notes", "amount": 5500.00 }'
```

#### DELETE /transactions/:id `🔒 Admin only`
Soft delete — record is preserved with `deletedAt` timestamp.
```bash
curl -X DELETE http://localhost:3000/api/v1/transactions/<id> \
	-H "Authorization: Bearer <admin-token>"
```

---

### Dashboard

#### GET /dashboard/overview `🔒 All roles`
Total income, expenses, net balance, transaction counts.
```bash
# Optional date range filter
curl "http://localhost:3000/api/v1/dashboard/overview?startDate=2024-01-01T00:00:00Z" \
	-H "Authorization: Bearer <token>"
```

**Response:**
```json
{
	"data": {
		"totalIncome": 85000.00,
		"totalExpenses": 42000.00,
		"netBalance": 43000.00,
		"transactionCount": 48,
		"incomeCount": 18,
		"expenseCount": 30
	}
}
```

#### GET /dashboard/recent-activity `🔒 All roles`
Last N transactions (default 10, max 50).
```bash
curl "http://localhost:3000/api/v1/dashboard/recent-activity?limit=5" \
	-H "Authorization: Bearer <token>"
```

#### GET /dashboard/categories `🔒 Analyst + Admin`
Income/expense totals grouped by category.
```bash
curl "http://localhost:3000/api/v1/dashboard/categories?type=EXPENSE" \
	-H "Authorization: Bearer <analyst-token>"
```

#### GET /dashboard/trends/monthly `🔒 Analyst + Admin`
Monthly income vs expense trend for a given year.
```bash
curl "http://localhost:3000/api/v1/dashboard/trends/monthly?year=2024" \
	-H "Authorization: Bearer <analyst-token>"
```

**Response shape** (ready for chart libraries):
```json
{
	"data": [
		{ "month": "2024-01", "income": 15000, "expenses": 7500, "net": 7500, "transactionCount": 8 },
		{ "month": "2024-02", "income": 18000, "expenses": 9200, "net": 8800, "transactionCount": 11 }
	]
}
```

#### GET /dashboard/top-categories `🔒 Analyst + Admin`
Top N categories by total (default: top 5 expenses).
```bash
curl "http://localhost:3000/api/v1/dashboard/top-categories?limit=5&type=EXPENSE" \
	-H "Authorization: Bearer <analyst-token>"
```

#### GET /dashboard/period-comparison `🔒 Analyst + Admin`
Compares current month vs previous month with percentage changes.
```bash
curl http://localhost:3000/api/v1/dashboard/period-comparison \
	-H "Authorization: Bearer <analyst-token>"
```

---

### Users

#### GET /users `🔒 Admin only`
List all users with filtering.
```bash
curl "http://localhost:3000/api/v1/users?role=VIEWER&status=ACTIVE" \
	-H "Authorization: Bearer <admin-token>"
```

#### PATCH /users/:id `🔒 Admin only`
Update role, name, or status.
```bash
curl -X PATCH http://localhost:3000/api/v1/users/<id> \
	-H "Authorization: Bearer <admin-token>" \
	-H "Content-Type: application/json" \
	-d '{ "role": "ANALYST", "status": "ACTIVE" }'
```

#### DELETE /users/:id `🔒 Admin only`

#### GET /users/:id/audit-logs `🔒 Admin only`
Full action history for any user.

---

## Role-Based Access Control

| Endpoint | VIEWER | ANALYST | ADMIN |
|----------|--------|---------|-------|
| GET /transactions | ✅ | ✅ | ✅ |
| POST/PATCH/DELETE /transactions | ❌ | ❌ | ✅ |
| GET /dashboard/overview | ✅ | ✅ | ✅ |
| GET /dashboard/recent-activity | ✅ | ✅ | ✅ |
| GET /dashboard/categories | ❌ | ✅ | ✅ |
| GET /dashboard/trends/* | ❌ | ✅ | ✅ |
| GET /dashboard/period-comparison | ❌ | ✅ | ✅ |
| All /users/* routes | ❌ | ❌ | ✅ |

---

## Design Decisions & Assumptions

**Soft Deletes on Transactions**
Financial records are never hard-deleted. The `deletedAt` timestamp preserves the audit trail and supports compliance requirements. Soft-deleted records are invisible to all normal queries.

**Audit Logging**
Every mutation (create, update, delete, login, logout) is recorded in the `audit_logs` table with the actor's ID, a before/after snapshot, and the client IP. This is append-only — nothing in audit_logs is ever deleted.

**`Decimal` not `Float` for Money**
Floating-point arithmetic is unsuitable for currency. PostgreSQL's `DECIMAL(12, 2)` and Prisma's `Decimal` type ensure exact arithmetic up to 10 digits before the decimal point.

**JWT without Refresh Tokens**
For this scope, JWTs with a 7-day expiry are used. A production system would add refresh tokens and a Redis-based token blocklist for proper revocation on logout.

**Password Security**
bcrypt with cost factor 12 is used. The login function always calls bcrypt.compare regardless of whether the user exists, preventing timing-based user enumeration attacks.

**Role Assignment**
New users default to VIEWER (principle of least privilege). Only an ADMIN can promote a user to ANALYST or ADMIN.

**Pagination**
All list endpoints are paginated with a maximum of 100 items per page. The response includes `meta.total`, `meta.page`, `meta.limit`, and `meta.totalPages`.

---

## Project Structure

```
src/
├── config/          # Environment validation, DB client
├── middleware/      # Auth, RBAC, validation, error handler, rate limiter
├── modules/
│   ├── auth/        # Login, register, profile
│   ├── users/       # User management (admin)
│   ├── transactions/# Financial record CRUD
│   └── dashboard/   # Analytics and aggregations
├── prisma/          # Schema and seed script
└── utils/           # ApiResponse, ApiError, logger, pagination
```

---

## API Documentation

- OpenAPI spec is available at `docs/openapi.yaml`.
- You can import it into Swagger Editor / Postman for quick API exploration.

---

## Security Notes

- Never commit `.env` or any real secret values.
- `docker-compose.yml` reads credentials from environment variables only.
- Rotate `JWT_SECRET` and DB passwords before deploying.

---

## Troubleshooting

- If `npm run dev` fails with `package.json not found`, run it from project root:
	- `cd finance-backend`
- If `/health` is not reachable, verify server is running and port is free:
	- `lsof -i :3000`
- If Docker fails with `Cannot connect to the Docker daemon`, start Docker Desktop first.

---

## Submission Checklist

- [x] Layered architecture (routes → controllers → services)
- [x] RBAC enforced at middleware level
- [x] Input validation + global error handling
- [x] Prisma schema + migrations included
- [x] Seed data and demo credentials
- [x] Docker + local setup documented
- [x] OpenAPI spec (`docs/openapi.yaml`)
- [x] Secrets externalized via `.env`
