# Gym Management Web Application — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure, premium-feeling MERN web app that lets gym staff log in, manage members and their membership packages, see expired and soon-to-expire memberships, and record monthly expenses.

**Architecture:** A two-package npm workspace. `server/` is an Express 5 + Mongoose REST API talking to MongoDB Atlas, organised by feature (routes → controller → service → model) with all membership date math isolated in pure, unit-tested functions. `client/` is a React 19 + Vite SPA using TanStack Query for server state, React Hook Form + Zod for forms, and a Tailwind v4 + shadcn/ui + Framer Motion design system for the interactive UI. The client never computes membership status — the API returns a computed `status` and `daysRemaining` on every member so the two halves can never disagree.

**Tech Stack:** Node 20 · Express 5 · Mongoose 8 · MongoDB Atlas · JWT (jsonwebtoken) + bcryptjs · Zod · date-fns · Vitest + Supertest + mongodb-memory-server · React 19 · Vite 6 · React Router 7 · TanStack Query 5 · React Hook Form · Tailwind CSS v4 · shadcn/ui · Framer Motion · Recharts · Sonner · Vitest + React Testing Library + MSW

---

## How to read this plan

Work top to bottom. Every task is self-contained: it names the exact files, gives the complete code, gives the exact command to run, and ends in a commit. Do not skip the "run the test and watch it fail" steps — they are what proves the test is actually testing something.

Six phases, each ending in software you can run and demo:

| Phase | Outcome |
|---|---|
| 0 — Foundation | Repo, both workspaces boot, Atlas connected, models + seed data exist |
| 1 — Auth API | Login, forgot password, reset password, protected-route middleware |
| 2 — Domain + API | Membership date logic, packages, members, expiry, action-required, expenses, dashboard |
| 3 — Client foundation | Design system, auth context, protected routing, app shell, shared UI kit |
| 4 — Screens | Every screen in SRS §7 wired to the API |
| 5 — Polish | Responsive passes, accessibility, error boundaries, README, seeded demo accounts |

---

## Decisions made before writing this plan

The SRS deliberately left several things open. These are the decisions this plan implements. Each one is safe to change — the relevant task says where.

| # | Open question in SRS | Decision | Where it lives |
|---|---|---|---|
| D1 | §1 "final authentication method shall be confirmed" | Email + password, bcrypt hashed, stateless JWT (7-day expiry) in `localStorage`. No refresh tokens — single-tenant internal tool. | Task 8 |
| D2 | §1 password policy | Minimum 8 characters, at least one letter and one number. Defined once in `shared/validation`. | Task 6 |
| D3 | §1 password-reset mechanism | Server generates a random token, stores only its SHA-256 hash with a 30-minute expiry, and returns the reset link in the API response in development. Email delivery is a documented seam (`sendResetEmail`) with a console-logging implementation. | Task 11 |
| D4 | §2.3 "price to be configured" | `packages` collection, editable from a Settings screen. Placeholder prices in the seed. | Tasks 5, 15, 34 |
| D5 | §2.3.3 "start date assigned according to the agreed business rule" | Defaults to today, but the Add Member form exposes an editable Start Date so staff can backdate a walk-in. | Task 29 |
| D6 | §2.3.4 end-date calculation | `endDate = addMonths(startDate, durationMonths) - 1 day`. A 1-month membership starting 1 Jan ends 31 Jan — exactly one month of access. A member is active while `today <= endDate`. | Task 12 |
| D7 | §3.2 says both "exclude members whose packages are still active" **and** "display members whose packages have already been renewed" — these contradict each other | Read as a typo. Expiry lists members whose **current** membership has ended. Renewing rolls the membership forward, so a renewed member leaves the list automatically. | Task 16 |
| D8 | §3.3 "renewal action, if implemented" | Implemented. `POST /api/members/:id/renew` archives the current period into `history[]` and starts a new one. New start date = the day after the old end date if renewed early, otherwise today. | Task 17 |
| D9 | §2.3 price changes vs. existing members | The member document snapshots `packageName`, `packagePrice` and `durationMonths` at purchase time. Editing a price in Settings never rewrites history. | Task 5 |
| D10 | §6.3 "prevent duplicate records" | A case-insensitive unique index on member `email`, and a unique index on `phone`. Both are optional fields; the index is sparse so blanks don't collide. | Task 5 |

> **Flag for the client:** D6 and D8 are business rules, not technical choices. Confirm both before the demo — they are one-line changes in `server/src/lib/membership.js` if the gym works differently.

---

## Security note — read before Task 2

The MongoDB Atlas URI for this project was shared in plaintext chat:

```
mongodb+srv://dev:<password>@node-setup.jmnbj.mongodb.net/gym_project
```

Treat that password as compromised.

1. It goes in `server/.env` only. `server/.env` is gitignored from the first commit (Task 1) — verify with `git check-ignore server/.env` before your first `git add`.
2. Rotate the Atlas password before this app handles real member data, and restrict the Atlas Network Access list to known IPs.
3. Never paste the URI into a commit message, a README, a screenshot, or a test file. Tests use an in-memory MongoDB, never Atlas.

---

## File structure

Split by feature, not by technical layer — the files that change together live together. Each file has one job.

```
GYM_Project/
├─ package.json                      npm workspaces root; dev script runs both apps
├─ .gitignore
├─ README.md                         setup, scripts, env vars, demo credentials
├─ docs/superpowers/plans/           this plan
│
├─ server/
│  ├─ package.json
│  ├─ .env                           SECRET — gitignored
│  ├─ .env.example                   committed template, no real values
│  ├─ vitest.config.js
│  ├─ src/
│  │  ├─ index.js                    process entry: connect DB, listen
│  │  ├─ app.js                      builds the Express app (no listen — testable)
│  │  ├─ config/
│  │  │  ├─ env.js                   reads + validates process.env, fails loud
│  │  │  └─ db.js                    mongoose connect/disconnect
│  │  ├─ lib/
│  │  │  ├─ membership.js            PURE date + status math. No DB, no Express.
│  │  │  ├─ dates.js                 UTC-midnight helpers
│  │  │  ├─ ApiError.js              typed HTTP error
│  │  │  ├─ asyncHandler.js          async route wrapper
│  │  │  └─ token.js                 random reset token + SHA-256 hashing
│  │  ├─ middleware/
│  │  │  ├─ requireAuth.js           verifies JWT, attaches req.user
│  │  │  ├─ validate.js              Zod body/query validation
│  │  │  └─ errorHandler.js          single place that formats every error
│  │  ├─ models/
│  │  │  ├─ User.js
│  │  │  ├─ Package.js
│  │  │  ├─ Member.js
│  │  │  └─ Expense.js
│  │  ├─ features/
│  │  │  ├─ auth/       auth.routes.js · auth.controller.js · auth.service.js · auth.schema.js · email.js
│  │  │  ├─ packages/   packages.routes.js · packages.controller.js · packages.schema.js
│  │  │  ├─ members/    members.routes.js · members.controller.js · members.service.js · members.query.js · members.schema.js
│  │  │  ├─ expenses/   expenses.routes.js · expenses.controller.js · expenses.schema.js
│  │  │  └─ dashboard/  dashboard.routes.js · dashboard.controller.js
│  │  └─ seed/
│  │     ├─ seed.js                  idempotent: packages + demo users
│  │     └─ seedDemoData.js          optional sample members + expenses
│  └─ tests/
│     ├─ setup.js                    spins up mongodb-memory-server per run
│     ├─ helpers/                    buildApp, authHeader, factories
│     ├─ unit/                       membership.test.js, dates.test.js, token.test.js
│     └─ api/                        auth · packages · members · expiry · actionRequired · expenses · dashboard
│
└─ client/
   ├─ package.json
   ├─ vite.config.js
   ├─ vitest.config.js
   ├─ index.html
   ├─ components.json                shadcn/ui config
   ├─ .env                           VITE_API_URL — gitignored
   ├─ .env.example
   └─ src/
      ├─ main.jsx                    providers: Query, Router, Theme, Toaster
      ├─ App.jsx                     route table
      ├─ index.css                   Tailwind v4 @theme design tokens
      ├─ lib/
      │  ├─ api.js                   axios instance, token header, 401 handling
      │  ├─ utils.js                 cn() helper
      │  ├─ format.js                currency, date, initials
      │  └─ constants.js             status labels, gender options
      ├─ components/
      │  ├─ ui/                      shadcn primitives (generated)
      │  ├─ layout/                  AppShell · Sidebar · Topbar · ThemeToggle
      │  └─ shared/                  DataTable · PageHeader · StatCard · StatusBadge
      │                              EmptyState · TableSkeleton · ConfirmDialog
      │                              FormField · MonthPicker · ErrorBoundary
      ├─ features/
      │  ├─ auth/       AuthContext.jsx · ProtectedRoute.jsx · useAuth.js
      │  │              LoginPage.jsx · ForgotPasswordPage.jsx · ResetPasswordPage.jsx
      │  ├─ members/    useMembers.js · MembersPage.jsx · MemberFormDrawer.jsx
      │  │              MemberDetailPage.jsx · RenewDialog.jsx · memberColumns.jsx
      │  ├─ expiry/     ExpiryPage.jsx
      │  ├─ actionRequired/ ActionRequiredPage.jsx
      │  ├─ expenses/   useExpenses.js · ExpensesPage.jsx · ExpenseFormDialog.jsx
      │  ├─ dashboard/  useDashboard.js · DashboardPage.jsx
      │  └─ settings/   SettingsPage.jsx · PackageSettingsTable.jsx
      └─ test/
         ├─ setup.js
         ├─ server.js                MSW handlers
         └─ renderWithProviders.jsx
```

---

## Conventions every task follows

- **Modules:** ESM everywhere (`"type": "module"` in both package.json files). `import`, never `require`.
- **Layering (server):** a route file only wires paths to controllers; a controller only parses input and shapes the response; a service holds business logic; `lib/` holds pure functions. Never query Mongoose from a controller when a service exists for that feature.
- **Errors:** throw `new ApiError(status, message)`. `errorHandler.js` is the only place that formats an error response. Never `res.status(500).json(...)` inside a controller.
- **Validation:** one Zod schema per endpoint in `*.schema.js`, applied by the `validate` middleware. Never validate by hand in a controller.
- **Dates:** every date is stored as UTC midnight. Always build them with the helpers in `lib/dates.js` — `new Date('2026-01-01')` and `new Date(2026, 0, 1)` disagree across timezones and that difference is exactly how off-by-one-day membership bugs happen.
- **Money:** prices and expense amounts are stored as whole rupees (`Number`). No floats-of-cents arithmetic anywhere.
- **Tests:** red → green → commit. Unit tests for pure logic, Supertest for HTTP contracts, React Testing Library for screens. Query by role and label, never by CSS class.
- **Commits:** Conventional Commits (`feat:`, `test:`, `fix:`, `chore:`, `docs:`). Commit at the end of every task — that is the rollback point.

---

# Phase 0 — Foundation

Goal: `npm run dev` starts both apps, the API answers `/api/health`, Atlas is connected, and the database has packages and a login account.

---

### Task 1: Repository scaffold and npm workspaces

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.editorconfig`

- [ ] **Step 1: Initialise the git repository**

The folder currently holds only the SRS PDF and this plan. Run from the project root:

```bash
cd /home/oncofit/Desktop/mywebsite/GYM_Project
git init -b main
```

Expected: `Initialized empty Git repository in .../GYM_Project/.git/`

- [ ] **Step 2: Create `.gitignore` before anything else**

Secrets must never reach a commit, so this file comes first.

```gitignore
# dependencies
node_modules/

# secrets — never commit
.env
.env.*
!.env.example

# build output
dist/
build/
*.tsbuildinfo

# logs
npm-debug.log*
yarn-error.log*
*.log

# test output
coverage/

# editors / OS
.DS_Store
.idea/
.vscode/*
!.vscode/extensions.json
```

- [ ] **Step 3: Verify the ignore rules actually work**

```bash
mkdir -p server && touch server/.env
git check-ignore -v server/.env
```

Expected: a line naming `.gitignore` and the `.env` pattern, e.g. `.gitignore:6:.env	server/.env`.
If it prints nothing, the file is NOT ignored — stop and fix `.gitignore` before continuing.

- [ ] **Step 4: Create the workspace root `package.json`**

```json
{
  "name": "gym-management",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Gym Management Web Application — member, membership and expense management",
  "workspaces": ["server", "client"],
  "engines": {
    "node": ">=20.19"
  },
  "scripts": {
    "dev": "concurrently -n api,web -c cyan,magenta \"npm:dev:server\" \"npm:dev:client\"",
    "dev:server": "npm run dev --workspace server",
    "dev:client": "npm run dev --workspace client",
    "build": "npm run build --workspace client",
    "test": "npm run test --workspace server && npm run test --workspace client",
    "seed": "npm run seed --workspace server"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 5: Create `.editorconfig`**

Keeps formatting consistent for whoever picks this up next.

```ini
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 6: Install the root dev dependency**

```bash
npm install
```

Expected: `concurrently` installs and `node_modules/` appears. A warning about empty `server`/`client` workspaces is normal at this point.

- [ ] **Step 7: Commit**

```bash
rm -f server/.env && rmdir server 2>/dev/null || true
git add .gitignore .editorconfig package.json package-lock.json
git commit -m "chore: initialise npm workspace repository"
```

---

### Task 2: Server workspace and testable Express app

Building `app.js` separately from `index.js` is what makes the whole API testable — Supertest can mount the app without ever opening a TCP port.

**Files:**
- Create: `server/package.json`
- Create: `server/vitest.config.js`
- Create: `server/src/app.js`
- Create: `server/src/lib/ApiError.js`
- Create: `server/src/lib/asyncHandler.js`
- Create: `server/src/middleware/errorHandler.js`
- Test: `server/tests/api/health.test.js`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "seed": "node src/seed/seed.js",
    "seed:demo": "node src/seed/seedDemoData.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "date-fns": "^4.1.0",
    "dotenv": "^16.4.7",
    "express": "^5.0.1",
    "express-rate-limit": "^7.4.1",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.9.0",
    "morgan": "^1.10.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "mongodb-memory-server": "^10.1.2",
    "supertest": "^7.0.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Install the server dependencies**

```bash
npm install --workspace server
```

Expected: completes without `ERR!`. `mongodb-memory-server` downloads a MongoDB binary on first use, which can take a minute — that happens later, on the first test run.

- [ ] **Step 3: Write the failing test**

Create `server/tests/api/health.test.js`:

```js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('GET /api/health', () => {
  it('reports that the API is up', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('returns a 404 envelope for an unknown route', async () => {
    const response = await request(createApp()).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toMatch(/not found/i);
  });
});
```

- [ ] **Step 4: Create `server/vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Mongoose models are global singletons, so parallel test files would
    // fight over the same connection. One process keeps tests deterministic.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    setupFiles: ['./tests/setup.js'],
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
```

- [ ] **Step 5: Create a placeholder `server/tests/setup.js`**

Task 4 fills this in with the in-memory database. For now it must exist so Vitest can start.

```js
// Replaced in Task 4 with the in-memory MongoDB lifecycle.
export {};
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
npm test --workspace server
```

Expected: FAIL — `Failed to load url ../../src/app.js` or `Cannot find module`. The app does not exist yet.

- [ ] **Step 7: Create `server/src/lib/ApiError.js`**

```js
/**
 * An error that carries an HTTP status code.
 *
 * Throw this anywhere in a controller or service; `errorHandler` turns it
 * into a JSON response. Anything else that reaches the handler is treated
 * as an unexpected 500 and its message is hidden from the client.
 */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message Message safe to show the user
   * @param {object} [details] Optional field-level details, e.g. Zod issues
   */
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Invalid email or password') {
    return new ApiError(401, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }
}
```

- [ ] **Step 8: Create `server/src/lib/asyncHandler.js`**

```js
/**
 * Wraps an async route handler so a rejected promise reaches Express's
 * error pipeline instead of hanging the request.
 *
 * Usage: router.get('/', asyncHandler(controller.list));
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
```

- [ ] **Step 9: Create `server/src/middleware/errorHandler.js`**

```js
import { ApiError } from '../lib/ApiError.js';

/** 404 handler — mounted after every route. */
export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * The only place in the server that formats an error response.
 *
 * Every error leaves as: { error: { message, details? } }
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity
export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  // Mongoose duplicate key — surface which field collided.
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'value';
    return res.status(409).json({
      error: { message: `A record with that ${field} already exists` },
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: { message: err.message } });
  }

  // Malformed ObjectId in a URL parameter.
  if (err.name === 'CastError') {
    return res.status(400).json({ error: { message: `Invalid ${err.path}` } });
  }

  console.error('[unhandled]', err);
  return res.status(500).json({ error: { message: 'Something went wrong' } });
};
```

- [ ] **Step 10: Create `server/src/app.js`**

```js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express app without starting a server.
 *
 * Keeping `listen` out of this file is what lets Supertest mount the real
 * app in tests. `src/index.js` is the only place that opens a port.
 */
export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Feature routers are mounted here as they are built (Tasks 8, 15, 17, 18, 19).

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
```

- [ ] **Step 11: Run the test to verify it passes**

```bash
npm test --workspace server
```

Expected: PASS — `2 passed`.

- [ ] **Step 12: Commit**

```bash
git add server/package.json server/vitest.config.js server/src server/tests package.json package-lock.json
git commit -m "feat(server): add testable express app with health endpoint and error handling"
```

---

### Task 3: Environment config and Atlas connection

**Files:**
- Create: `server/src/config/env.js`
- Create: `server/src/config/db.js`
- Create: `server/src/index.js`
- Create: `server/.env`
- Create: `server/.env.example`
- Test: `server/tests/unit/env.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/env.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readEnv } from '../../src/config/env.js';

const valid = {
  NODE_ENV: 'development',
  PORT: '4000',
  MONGODB_URI: 'mongodb://localhost:27017/gym_project',
  JWT_SECRET: 'a-secret-that-is-at-least-32-characters-long',
  CLIENT_URL: 'http://localhost:5173',
};

describe('readEnv', () => {
  it('returns typed config when every variable is present', () => {
    const config = readEnv(valid);

    expect(config.port).toBe(4000);
    expect(config.mongodbUri).toBe('mongodb://localhost:27017/gym_project');
    expect(config.jwtSecret).toHaveLength(44);
    expect(config.clientUrl).toBe('http://localhost:5173');
  });

  it('falls back to port 4000 when PORT is absent', () => {
    const { PORT, ...withoutPort } = valid;
    expect(readEnv(withoutPort).port).toBe(4000);
  });

  it('throws a named-variable message when MONGODB_URI is missing', () => {
    const { MONGODB_URI, ...withoutUri } = valid;
    expect(() => readEnv(withoutUri)).toThrow(/MONGODB_URI/);
  });

  it('rejects a JWT secret short enough to brute force', () => {
    expect(() => readEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/unit/env.test.js --workspace server
```

Run it from inside `server/` if the workspace flag is awkward: `cd server && npx vitest run tests/unit/env.test.js`.

Expected: FAIL — cannot resolve `../../src/config/env.js`.

- [ ] **Step 3: Create `server/src/config/env.js`**

```js
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
});

/**
 * Validates a raw environment object and returns typed config.
 *
 * Exported separately from `env` so tests can exercise it without touching
 * the real process environment.
 */
export const readEnv = (source) => {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    mongodbUri: parsed.data.MONGODB_URI,
    jwtSecret: parsed.data.JWT_SECRET,
    jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
    clientUrl: parsed.data.CLIENT_URL,
    resetTokenTtlMinutes: parsed.data.RESET_TOKEN_TTL_MINUTES,
    isProduction: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',
  };
};

/**
 * Lazily-read config singleton.
 *
 * Lazy because importing this module during tests must not require a real
 * MONGODB_URI — tests import `readEnv` directly.
 */
let cached = null;
export const env = () => {
  if (!cached) cached = readEnv(process.env);
  return cached;
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/unit/env.test.js && cd ..
```

Expected: PASS — `4 passed`.

- [ ] **Step 5: Create `server/.env.example` (committed — placeholders only)**

```bash
NODE_ENV=development
PORT=4000

# MongoDB Atlas connection string. Ask the project owner for the real value.
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/gym_project

# Generate with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d

CLIENT_URL=http://localhost:5173
RESET_TOKEN_TTL_MINUTES=30
```

- [ ] **Step 6: Create `server/.env` with the real values**

Generate a secret first — do not invent one by hand:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Then create `server/.env`, pasting that output as `JWT_SECRET`:

```bash
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb+srv://dev:<ATLAS_PASSWORD>@node-setup.jmnbj.mongodb.net/gym_project?retryWrites=true&w=majority
JWT_SECRET=<paste the generated string here>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
RESET_TOKEN_TTL_MINUTES=30
```

- [ ] **Step 7: Confirm the real `.env` is ignored**

```bash
git status --porcelain server/
```

Expected: `server/.env` does **not** appear. If it does, stop and fix `.gitignore`.

- [ ] **Step 8: Create `server/src/config/db.js`**

```js
import mongoose from 'mongoose';

/**
 * Opens the shared Mongoose connection.
 *
 * `strictQuery` keeps unknown query fields from silently matching everything,
 * which is a quiet source of "why is this returning all members" bugs.
 */
export const connectDatabase = async (uri) => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  await mongoose.disconnect();
};
```

- [ ] **Step 9: Create `server/src/index.js`**

```js
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';

const start = async () => {
  const config = env();

  try {
    await connectDatabase(config.mongodbUri);
    console.log('[db] connected');
  } catch (error) {
    console.error('[db] connection failed:', error.message);
    process.exit(1);
  }

  createApp().listen(config.port, () => {
    console.log(`[api] listening on http://localhost:${config.port}`);
  });
};

start();
```

- [ ] **Step 10: Tighten the CORS origin in `server/src/app.js`**

> **Plan amendment (added after the Task 2 code review).** Task 2 shipped
> `cors({ origin: true, credentials: true })`, which reflects *any* calling
> origin while allowing credentials. That is safe in this architecture today —
> dev goes through the Vite proxy and production serves the built client from
> the same origin, so the real client never makes a cross-origin call, and auth
> is a bearer JWT rather than a cookie. It stops being safe the moment anyone
> adds a cookie-based feature. `CLIENT_URL` now exists, so pin it.

Add `env` to the imports in `server/src/app.js`:

```js
import { env } from './config/env.js';
```

Replace the `cors(...)` line with:

```js
  // Only the app's own origin may call the API with credentials. Tests and
  // same-origin production requests send no Origin header and are unaffected.
  app.use(
    cors({
      origin: process.env.NODE_ENV === 'test' ? true : env().clientUrl,
      credentials: true,
    }),
  );
```

Run the existing tests to confirm nothing broke:

```bash
cd server && npx vitest run tests/api/health.test.js
```

Expected: PASS — the health tests still pass, because Supertest issues
same-origin requests with no `Origin` header.


- [ ] **Step 11: Verify the server really reaches Atlas**

In one terminal:

```bash
npm run dev:server
```

Expected: `[db] connected` then `[api] listening on http://localhost:4000`.

If it prints `connection failed`, the cause is almost always Atlas Network Access — add your current IP in the Atlas dashboard under Network Access.

In a second terminal:

```bash
curl -s http://localhost:4000/api/health
```

Expected: `{"status":"ok","timestamp":"..."}`

Stop the server with `Ctrl+C`.

- [ ] **Step 12: Commit**

```bash
git add server/src/config server/src/index.js server/src/app.js server/.env.example server/tests/unit/env.test.js
git commit -m "feat(server): add validated env config, atlas connection and scoped cors"
```

---

### Task 4: Test database harness

Tests must never touch Atlas. This harness gives every test run a throwaway in-memory MongoDB and a clean slate between tests.

**Files:**
- Modify: `server/tests/setup.js` (replace the placeholder)
- Test: `server/tests/unit/setup.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/setup.test.js`:

```js
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

describe('test database harness', () => {
  it('is connected to an in-memory mongodb, never to atlas', () => {
    // 1 === connected
    expect(mongoose.connection.readyState).toBe(1);
    expect(mongoose.connection.host).toMatch(/127\.0\.0\.1|localhost/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/unit/setup.test.js
```

Expected: FAIL — `expected 0 to be 1`. Nothing has connected yet.

- [ ] **Step 3: Replace `server/tests/setup.js`**

```js
import { beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set before any application module reads the environment.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-definitely-long-enough-32';
process.env.CLIENT_URL = 'http://localhost:5173';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI);
});

// A clean database between tests means test order can never matter.
afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/unit/setup.test.js
```

Expected: PASS. The first run downloads a MongoDB binary (~100 MB) and may take a minute; later runs are fast.

- [ ] **Step 5: Run the whole suite to confirm nothing regressed**

```bash
npm test --workspace server
```

Expected: PASS — all files green.

- [ ] **Step 6: Commit**

```bash
git add server/tests
git commit -m "test(server): add in-memory mongodb harness with per-test cleanup"
```

---

### Task 5: Mongoose models

Four collections. The one design decision worth understanding: a `Member` **snapshots** the package name, price and duration it was sold at. Changing a price in Settings later must never rewrite what an existing member was charged (decision D9).

**Files:**
- Create: `server/src/models/User.js`
- Create: `server/src/models/Package.js`
- Create: `server/src/models/Member.js`
- Create: `server/src/models/Expense.js`
- Test: `server/tests/unit/models.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/models.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { User } from '../../src/models/User.js';
import { Package } from '../../src/models/Package.js';
import { Member } from '../../src/models/Member.js';
import { Expense } from '../../src/models/Expense.js';

describe('User model', () => {
  it('lowercases and trims the email', async () => {
    const user = await User.create({
      name: 'Gym Admin',
      email: '  Admin@Gym.COM ',
      passwordHash: 'hashed',
    });

    expect(user.email).toBe('admin@gym.com');
  });

  it('never exposes the password hash or reset token in JSON', async () => {
    const user = await User.create({
      name: 'Gym Admin',
      email: 'admin@gym.com',
      passwordHash: 'hashed',
      resetTokenHash: 'secret-hash',
    });

    const json = user.toJSON();
    expect(json.passwordHash).toBeUndefined();
    expect(json.resetTokenHash).toBeUndefined();
    expect(json.id).toBe(user._id.toString());
    expect(json.email).toBe('admin@gym.com');
  });

  it('rejects a duplicate email', async () => {
    await User.create({ name: 'A', email: 'dup@gym.com', passwordHash: 'x' });
    await User.init();

    await expect(
      User.create({ name: 'B', email: 'dup@gym.com', passwordHash: 'y' }),
    ).rejects.toThrow();
  });
});

describe('Package model', () => {
  it('requires a non-negative price', async () => {
    await expect(
      Package.create({ name: '1 Month', durationMonths: 1, price: -1 }),
    ).rejects.toThrow(/price/i);
  });

  it('defaults to active', async () => {
    const pkg = await Package.create({ name: '1 Month', durationMonths: 1, price: 1500 });
    expect(pkg.isActive).toBe(true);
  });
});

describe('Member model', () => {
  const basePackage = { name: '3 Months', durationMonths: 3, price: 4000 };

  const buildMember = (overrides = {}) => ({
    name: 'Ravi Kumar',
    phone: '9876543210',
    email: 'ravi@example.com',
    gender: 'male',
    packageName: basePackage.name,
    packagePrice: basePackage.price,
    durationMonths: basePackage.durationMonths,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-03-31T00:00:00.000Z'),
    ...overrides,
  });

  it('stores a member with a snapshotted package', async () => {
    const pkg = await Package.create(basePackage);
    const member = await Member.create(buildMember({ package: pkg._id }));

    expect(member.packagePrice).toBe(4000);
    expect(member.durationMonths).toBe(3);
    expect(member.history).toHaveLength(0);
  });

  it('rejects an unsupported gender', async () => {
    await expect(Member.create(buildMember({ gender: 'unknown' }))).rejects.toThrow(/gender/i);
  });

  it('rejects an end date before the start date', async () => {
    await expect(
      Member.create(
        buildMember({
          startDate: new Date('2026-03-01T00:00:00.000Z'),
          endDate: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ),
    ).rejects.toThrow(/end date/i);
  });

  it('rejects a duplicate email regardless of casing', async () => {
    const pkg = await Package.create(basePackage);
    await Member.create(buildMember({ package: pkg._id }));
    await Member.init();

    await expect(
      Member.create(buildMember({ package: pkg._id, name: 'Other', phone: '9000000000' })),
    ).rejects.toThrow();
  });

  it('allows many members with no email at all', async () => {
    const pkg = await Package.create(basePackage);
    await Member.init();
    await Member.create(buildMember({ package: pkg._id, email: undefined, phone: '9000000001' }));
    await Member.create(
      buildMember({ package: pkg._id, email: undefined, phone: '9000000002', name: 'Second' }),
    );

    expect(await Member.countDocuments()).toBe(2);
  });
});

describe('Expense model', () => {
  it('requires a positive amount', async () => {
    await expect(
      Expense.create({ date: new Date(), description: 'Dumbbells', amount: 0 }),
    ).rejects.toThrow(/amount/i);
  });

  it('trims the description', async () => {
    const expense = await Expense.create({
      date: new Date('2026-02-10T00:00:00.000Z'),
      description: '  New treadmill  ',
      amount: 45000,
    });

    expect(expense.description).toBe('New treadmill');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/unit/models.test.js
```

Expected: FAIL — cannot resolve `../../src/models/User.js`.

- [ ] **Step 3: Create `server/src/models/User.js`**

```js
import mongoose from 'mongoose';

/**
 * A staff account that can sign in to the app.
 *
 * `passwordHash` and the reset-token fields are `select: false`, so an
 * accidental `User.find()` in a controller can never leak them.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'staff'], default: 'admin' },
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.passwordHash;
    delete ret.resetTokenHash;
    delete ret.resetTokenExpiresAt;
    return ret;
  },
});

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
```

- [ ] **Step 4: Create `server/src/models/Package.js`**

```js
import mongoose from 'mongoose';

/**
 * A membership package the gym sells.
 *
 * Prices live here rather than in code so staff can change them from the
 * Settings screen without a deploy (SRS §6.3).
 */
const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    durationMonths: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: [0, 'Package price cannot be negative'] },
    isActive: { type: Boolean, default: true },
    /** Controls display order on the Settings screen and in the package dropdown. */
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

packageSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

export const Package = mongoose.models.Package ?? mongoose.model('Package', packageSchema);
```

- [ ] **Step 5: Create `server/src/models/Member.js`**

```js
import mongoose from 'mongoose';

/** One completed membership period, archived when a member renews. */
const membershipPeriodSchema = new mongoose.Schema(
  {
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    packageName: { type: String, required: true },
    packagePrice: { type: Number, required: true, min: 0 },
    durationMonths: { type: Number, required: true, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { _id: false },
);

/**
 * A gym member and their CURRENT membership period.
 *
 * The package fields are snapshots taken when the membership was sold — a
 * later price change in Settings must not rewrite what this member paid.
 * Previous periods move into `history` on renewal.
 */
const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    gender: {
      type: String,
      required: true,
      enum: {
        values: ['male', 'female', 'other'],
        message: 'Gender must be male, female or other',
      },
    },

    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    packageName: { type: String, required: true },
    packagePrice: { type: Number, required: true, min: 0 },
    durationMonths: { type: Number, required: true, min: 1 },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true, index: true },

    history: { type: [membershipPeriodSchema], default: [] },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

memberSchema.path('endDate').validate(function validateEndDate(value) {
  return !this.startDate || value >= this.startDate;
}, 'End date must be on or after the start date');

// Sparse + unique: duplicates are blocked, but blanks never collide (D10).
memberSchema.index({ email: 1 }, { unique: true, sparse: true });
memberSchema.index({ phone: 1 }, { unique: true, sparse: true });
// Supports the expiry and action-required queries, which sort by end date.
memberSchema.index({ endDate: 1, durationMonths: 1 });

memberSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

export const Member = mongoose.models.Member ?? mongoose.model('Member', memberSchema);
```

> **Note on empty strings:** an empty-string email would defeat the sparse index by colliding with other empty strings. The create/update service in Task 17 converts `''` to `undefined` before saving. That is why the "many members with no email" test passes `undefined`, not `''`.

- [ ] **Step 6: Create `server/src/models/Expense.js`**

```js
import mongoose from 'mongoose';

/** A gym running cost, recorded against a date so it can be filtered by month. */
const expenseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be greater than zero'],
    },
  },
  { timestamps: true },
);

expenseSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

export const Expense = mongoose.models.Expense ?? mongoose.model('Expense', expenseSchema);
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/unit/models.test.js
```

Expected: PASS — `12 passed`.

- [ ] **Step 8: Commit**

```bash
git add server/src/models server/tests/unit/models.test.js
git commit -m "feat(server): add user, package, member and expense models"
```

---

### Task 6: Password policy and hashing

Decision D2 lives here, in one place, so the login form, the reset form and the seed script can never disagree about what a valid password is.

**Files:**
- Create: `server/src/lib/password.js`
- Test: `server/tests/unit/password.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/password.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, passwordSchema } from '../../src/lib/password.js';

describe('passwordSchema', () => {
  it('accepts a password with letters and numbers at the minimum length', () => {
    expect(passwordSchema.safeParse('gympass1').success).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = passwordSchema.safeParse('gym1');
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/8 characters/);
  });

  it('rejects a password with no number', () => {
    const result = passwordSchema.safeParse('gympassword');
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/letter and one number/);
  });

  it('rejects a password with no letter', () => {
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
  });
});

describe('hashPassword / verifyPassword', () => {
  it('produces a hash that does not contain the original password', async () => {
    const hash = await hashPassword('gympass1');

    expect(hash).not.toBe('gympass1');
    expect(hash).not.toContain('gympass1');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verifies the correct password', async () => {
    const hash = await hashPassword('gympass1');
    expect(await verifyPassword('gympass1', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('gympass1');
    expect(await verifyPassword('wrongpass1', hash)).toBe(false);
  });

  it('returns false rather than throwing when the stored hash is missing', async () => {
    expect(await verifyPassword('gympass1', undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/unit/password.test.js
```

Expected: FAIL — cannot resolve `../../src/lib/password.js`.

- [ ] **Step 3: Create `server/src/lib/password.js`**

```js
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const SALT_ROUNDS = 10;

/**
 * The single definition of the password policy (decision D2).
 *
 * Reused by the reset-password endpoint, the seed script and — mirrored in
 * `client/src/features/auth` — the reset form, so the rules can never drift.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value),
    'Password must contain at least one letter and one number',
  );

export const hashPassword = (plainText) => bcrypt.hash(plainText, SALT_ROUNDS);

/**
 * Compares a plaintext password against a stored hash.
 *
 * Returns false (never throws) for a missing hash, so a login attempt for a
 * half-created account behaves like any other failed login.
 */
export const verifyPassword = async (plainText, hash) => {
  if (!hash) return false;
  return bcrypt.compare(plainText, hash);
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/unit/password.test.js
```

Expected: PASS — `8 passed`.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/password.js server/tests/unit/password.test.js
git commit -m "feat(server): add password policy and bcrypt hashing helpers"
```

---

### Task 7: Seed script

Idempotent on purpose — running it twice must not create duplicate packages or reset a password someone has already changed.

**Files:**
- Create: `server/src/seed/seed.js`
- Test: `server/tests/unit/seed.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/seed.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { seedPackages, seedUsers, DEFAULT_PACKAGES } from '../../src/seed/seed.js';
import { Package } from '../../src/models/Package.js';
import { User } from '../../src/models/User.js';
import { verifyPassword } from '../../src/lib/password.js';

describe('seedPackages', () => {
  it('creates the four packages from the SRS', async () => {
    await seedPackages();

    const packages = await Package.find().sort({ sortOrder: 1 });
    expect(packages.map((p) => p.name)).toEqual([
      '1 Month',
      '3 Months',
      '6 Months',
      '12 Months',
    ]);
    expect(packages.map((p) => p.durationMonths)).toEqual([1, 3, 6, 12]);
  });

  it('is idempotent — running twice does not duplicate', async () => {
    await seedPackages();
    await seedPackages();

    expect(await Package.countDocuments()).toBe(DEFAULT_PACKAGES.length);
  });

  it('does not overwrite a price an admin has already changed', async () => {
    await seedPackages();
    await Package.updateOne({ name: '1 Month' }, { price: 9999 });

    await seedPackages();

    const onemonth = await Package.findOne({ name: '1 Month' });
    expect(onemonth.price).toBe(9999);
  });
});

describe('seedUsers', () => {
  it('creates the demo accounts with usable hashed passwords', async () => {
    const created = await seedUsers();

    expect(created).toHaveLength(2);

    const admin = await User.findOne({ email: 'admin@gym.com' }).select('+passwordHash');
    expect(admin.name).toBe('Gym Admin');
    expect(admin.passwordHash).not.toContain('Admin@123');
    expect(await verifyPassword('Admin@123', admin.passwordHash)).toBe(true);
  });

  it('is idempotent and leaves an existing password untouched', async () => {
    await seedUsers();
    await User.updateOne({ email: 'admin@gym.com' }, { passwordHash: 'already-changed' });

    const created = await seedUsers();

    expect(created).toHaveLength(0);
    const admin = await User.findOne({ email: 'admin@gym.com' }).select('+passwordHash');
    expect(admin.passwordHash).toBe('already-changed');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/unit/seed.test.js
```

Expected: FAIL — cannot resolve `../../src/seed/seed.js`.

- [ ] **Step 3: Create `server/src/seed/seed.js`**

```js
import { Package } from '../models/Package.js';
import { User } from '../models/User.js';
import { hashPassword } from '../lib/password.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';

/**
 * Placeholder prices (decision D4). The client confirms the real figures and
 * edits them from Settings — no code change needed.
 */
export const DEFAULT_PACKAGES = [
  { name: '1 Month', durationMonths: 1, price: 1500, sortOrder: 1 },
  { name: '3 Months', durationMonths: 3, price: 4000, sortOrder: 2 },
  { name: '6 Months', durationMonths: 6, price: 7500, sortOrder: 3 },
  { name: '12 Months', durationMonths: 12, price: 14000, sortOrder: 4 },
];

/** Static accounts for testing and the client demo (SRS §1.3). */
export const DEMO_USERS = [
  { name: 'Gym Admin', email: 'admin@gym.com', password: 'Admin@123', role: 'admin' },
  { name: 'Front Desk', email: 'staff@gym.com', password: 'Staff@123', role: 'staff' },
];

/**
 * Inserts any missing packages.
 *
 * Deliberately does NOT update existing rows — an admin's edited price must
 * survive a re-seed.
 */
export const seedPackages = async () => {
  const created = [];

  for (const definition of DEFAULT_PACKAGES) {
    const existing = await Package.findOne({ name: definition.name });
    if (existing) continue;
    created.push(await Package.create(definition));
  }

  return created;
};

/** Inserts any missing demo accounts, never touching an existing password. */
export const seedUsers = async () => {
  const created = [];

  for (const definition of DEMO_USERS) {
    const existing = await User.findOne({ email: definition.email });
    if (existing) continue;

    created.push(
      await User.create({
        name: definition.name,
        email: definition.email,
        role: definition.role,
        passwordHash: await hashPassword(definition.password),
      }),
    );
  }

  return created;
};

/** CLI entry point: `npm run seed`. */
const runFromCli = async () => {
  const config = env();
  await connectDatabase(config.mongodbUri);

  const packages = await seedPackages();
  const users = await seedUsers();

  console.log(`[seed] packages created: ${packages.length}`);
  console.log(`[seed] users created: ${users.length}`);

  if (users.length > 0) {
    console.log('[seed] demo credentials:');
    for (const user of DEMO_USERS) {
      console.log(`  ${user.email} / ${user.password}`);
    }
    console.log('[seed] change these before the app handles real data.');
  }

  await disconnectDatabase();
};

// Only run when executed directly, never when imported by a test.
if (process.argv[1]?.endsWith('seed.js')) {
  runFromCli().catch((error) => {
    console.error('[seed] failed:', error);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/unit/seed.test.js
```

Expected: PASS — `5 passed`.

- [ ] **Step 5: Seed the real Atlas database**

```bash
npm run seed
```

Expected:

```
[seed] packages created: 4
[seed] users created: 2
[seed] demo credentials:
  admin@gym.com / Admin@123
  staff@gym.com / Staff@123
```

- [ ] **Step 6: Confirm re-running is safe**

```bash
npm run seed
```

Expected: `packages created: 0` and `users created: 0`.

- [ ] **Step 7: Commit**

```bash
git add server/src/seed server/tests/unit/seed.test.js
git commit -m "feat(server): add idempotent seed for packages and demo accounts"
```

**Phase 0 complete.** The API boots, Atlas is connected, and the database holds four packages and two accounts.

---

# Phase 1 — Authentication API

Implements SRS §1: login, forgot password, reset password, and the guard that keeps unauthenticated users out of every other module (§6.4).

---

### Task 8: Validation middleware and the login endpoint

**Files:**
- Create: `server/src/middleware/validate.js`
- Create: `server/src/features/auth/auth.schema.js`
- Create: `server/src/features/auth/auth.service.js`
- Create: `server/src/features/auth/auth.controller.js`
- Create: `server/src/features/auth/auth.routes.js`
- Modify: `server/src/app.js`
- Test: `server/tests/api/auth.login.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/api/auth.login.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { hashPassword } from '../../src/lib/password.js';

const app = createApp();

beforeEach(async () => {
  await User.create({
    name: 'Gym Admin',
    email: 'admin@gym.com',
    passwordHash: await hashPassword('Admin@123'),
    role: 'admin',
  });
});

describe('POST /api/auth/login', () => {
  it('returns a signed token and the user for correct credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gym.com', password: 'Admin@123' });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: 'admin@gym.com',
      name: 'Gym Admin',
      role: 'admin',
    });
    expect(response.body.user.passwordHash).toBeUndefined();

    const payload = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(payload.sub).toBe(response.body.user.id);
  });

  it('accepts the email in any casing or with stray whitespace', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '  Admin@Gym.com ', password: 'Admin@123' });

    expect(response.status).toBe(200);
  });

  it('rejects a wrong password with 401 and a generic message', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gym.com', password: 'WrongPass1' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid email or password');
  });

  it('gives the same generic message for an unknown email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@gym.com', password: 'Admin@123' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid email or password');
  });

  it('returns 400 with field details when the email is malformed', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'Admin@123' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.email).toMatch(/valid email/i);
  });

  it('returns 400 when the password is missing', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'admin@gym.com' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.password).toBeDefined();
  });
});
```

> **Why the same message for both failure cases:** a different message for "unknown email" would let anyone enumerate which addresses have accounts.

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/api/auth.login.test.js
```

Expected: FAIL — every request returns 404 because no auth router is mounted.

- [ ] **Step 3: Create `server/src/middleware/validate.js`**

```js
import { ApiError } from '../lib/ApiError.js';

/**
 * Validates one part of the request against a Zod schema and REPLACES it
 * with the parsed result, so controllers always receive coerced, trimmed data.
 *
 * Usage: router.post('/login', validate(loginSchema), controller.login)
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    // Flatten to { fieldName: firstMessage } — the shape the client forms expect.
    const details = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.') || source;
      if (!details[field]) details[field] = issue.message;
    }
    return next(ApiError.badRequest('Please correct the highlighted fields', details));
  }

  // Express 5 makes req.query a getter, so assign to a parallel property.
  if (source === 'query') {
    req.validatedQuery = result.data;
  } else {
    req[source] = result.data;
  }

  return next();
};
```

- [ ] **Step 4: Create `server/src/features/auth/auth.schema.js`**

```js
import { z } from 'zod';
import { passwordSchema } from '../../lib/password.js';

const emailField = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address');

export const loginSchema = z.object({
  email: emailField,
  // Deliberately NOT passwordSchema: an old account may predate the policy,
  // and telling a login attempt about policy rules leaks information.
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: 'Reset token is required' }).min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

- [ ] **Step 5: Create `server/src/features/auth/auth.service.js`**

```js
import jwt from 'jsonwebtoken';
import { User } from '../../models/User.js';
import { ApiError } from '../../lib/ApiError.js';
import { verifyPassword } from '../../lib/password.js';
import { env } from '../../config/env.js';

export const signToken = (user) => {
  const config = env();
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

/**
 * Verifies credentials and returns { user, token }.
 *
 * Throws the same 401 for an unknown email and a wrong password so the
 * endpoint cannot be used to discover which addresses have accounts.
 */
export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw ApiError.unauthorized();
  }

  return { user: user.toJSON(), token: signToken(user) };
};
```

- [ ] **Step 6: Create `server/src/features/auth/auth.controller.js`**

```js
import * as authService from './auth.service.js';

export const login = async (req, res) => {
  const { user, token } = await authService.login(req.body);
  res.json({ user, token });
};
```

- [ ] **Step 7: Create `server/src/features/auth/auth.routes.js`**

```js
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { loginSchema } from './auth.schema.js';
import * as authController from './auth.controller.js';

/** Blunt brute-force brake on the credential endpoints. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Rate limiting would make the test suite flaky and proves nothing here.
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: { message: 'Too many attempts. Please try again in 15 minutes.' } },
});

export const authRouter = Router();

authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login),
);
```

- [ ] **Step 8: Mount the router in `server/src/app.js`**

Replace this line:

```js
  // Feature routers are mounted here as they are built (Tasks 8, 15, 17, 18, 19).
```

with:

```js
  app.use('/api/auth', authRouter);
  // Feature routers are mounted here as they are built (Tasks 15, 17, 18, 19).
```

and add this import alongside the others at the top of the file:

```js
import { authRouter } from './features/auth/auth.routes.js';
```

- [ ] **Step 9: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/api/auth.login.test.js
```

Expected: PASS — `6 passed`.

- [ ] **Step 10: Commit**

```bash
git add server/src/middleware/validate.js server/src/features/auth server/src/app.js server/tests/api/auth.login.test.js
git commit -m "feat(server): add login endpoint with zod validation and jwt issuance"
```

---

### Task 9: Route protection and the current-user endpoint

SRS §6.4: unauthenticated users must not reach any module.

**Files:**
- Create: `server/src/middleware/requireAuth.js`
- Modify: `server/src/features/auth/auth.controller.js`
- Modify: `server/src/features/auth/auth.routes.js`
- Test: `server/tests/api/auth.me.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/api/auth.me.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { hashPassword } from '../../src/lib/password.js';

const app = createApp();
let token;
let user;

beforeEach(async () => {
  user = await User.create({
    name: 'Gym Admin',
    email: 'admin@gym.com',
    passwordHash: await hashPassword('Admin@123'),
  });

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@gym.com', password: 'Admin@123' });

  token = response.body.token;
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user for a valid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('admin@gym.com');
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a request with no Authorization header', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.message).toMatch(/sign in/i);
  });

  it('rejects a malformed Authorization header', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', token);

    expect(response.status).toBe(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign({ sub: user.id }, 'a-different-secret-that-is-long-enough');

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${forged}`);

    expect(response.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '-1s' });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expired}`);

    expect(response.status).toBe(401);
    expect(response.body.error.message).toMatch(/expired/i);
  });

  it('rejects a valid token whose user has since been deleted', async () => {
    await User.deleteOne({ _id: user._id });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/api/auth.me.test.js
```

Expected: FAIL — `/api/auth/me` returns 404.

- [ ] **Step 3: Create `server/src/middleware/requireAuth.js`**

```js
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../lib/ApiError.js';
import { env } from '../config/env.js';

/**
 * Guards every protected route (SRS §6.4).
 *
 * Re-reads the user on each request rather than trusting the token payload,
 * so a deleted or disabled account stops working immediately instead of at
 * token expiry.
 */
export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Please sign in to continue'));
  }

  let payload;
  try {
    payload = jwt.verify(token, env().jwtSecret);
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Your session has expired. Please sign in again.'
        : 'Please sign in to continue';
    return next(new ApiError(401, message));
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return next(new ApiError(401, 'Please sign in to continue'));
  }

  req.user = user;
  return next();
};
```

- [ ] **Step 4: Add the controller**

Append to `server/src/features/auth/auth.controller.js`:

```js
export const me = async (req, res) => {
  res.json({ user: req.user.toJSON() });
};
```

- [ ] **Step 5: Add the route**

Append to `server/src/features/auth/auth.routes.js`:

```js
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
```

and add the import at the top:

```js
import { requireAuth } from '../../middleware/requireAuth.js';
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/api/auth.me.test.js
```

Expected: PASS — `6 passed`.

- [ ] **Step 7: Commit**

```bash
git add server/src/middleware/requireAuth.js server/src/features/auth server/tests/api/auth.me.test.js
git commit -m "feat(server): add jwt auth middleware and current-user endpoint"
```

---

### Task 10: Reset-token utilities and the email seam

Only the **hash** of a reset token is stored. A leaked database dump therefore cannot be used to reset anyone's password.

**Files:**
- Create: `server/src/lib/token.js`
- Create: `server/src/features/auth/email.js`
- Test: `server/tests/unit/token.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/token.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createResetToken, hashToken } from '../../src/lib/token.js';

describe('createResetToken', () => {
  it('returns a long url-safe token plus its hash', () => {
    const { token, tokenHash } = createResetToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).not.toBe(token);
  });

  it('never repeats a token', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => createResetToken().token));
    expect(tokens.size).toBe(200);
  });

  it('hashes deterministically so a presented token can be looked up', () => {
    const { token, tokenHash } = createResetToken();
    expect(hashToken(token)).toBe(tokenHash);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/unit/token.test.js
```

Expected: FAIL — cannot resolve `../../src/lib/token.js`.

- [ ] **Step 3: Create `server/src/lib/token.js`**

```js
import crypto from 'node:crypto';

/**
 * Hashes a reset token for storage and lookup.
 *
 * SHA-256 rather than bcrypt: the token is already 256 bits of randomness,
 * so it needs no key-stretching, and lookup must be a single indexed query.
 */
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Generates a password-reset token.
 *
 * Only `tokenHash` is stored. `token` goes to the user and is never persisted.
 */
export const createResetToken = () => {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/unit/token.test.js
```

Expected: PASS — `3 passed`.

- [ ] **Step 5: Create `server/src/features/auth/email.js`**

```js
import { env } from '../../config/env.js';

/**
 * Delivers the password-reset link.
 *
 * This is the seam where a real provider goes (SendGrid, Resend, SMTP).
 * Until then it logs to the console, which is enough for internal staff
 * accounts and the client demo. Swapping the body of this function is the
 * only change needed to send real email.
 */
export const sendResetEmail = async ({ to, resetUrl }) => {
  console.log('─'.repeat(72));
  console.log('[email] Password reset requested');
  console.log(`[email] To:   ${to}`);
  console.log(`[email] Link: ${resetUrl}`);
  console.log(`[email] Expires in ${env().resetTokenTtlMinutes} minutes.`);
  console.log('─'.repeat(72));

  return { delivered: true };
};
```

- [ ] **Step 6: Commit**

```bash
git add server/src/lib/token.js server/src/features/auth/email.js server/tests/unit/token.test.js
git commit -m "feat(server): add hashed reset tokens and email delivery seam"
```

---

### Task 11: Forgot password and reset password endpoints

**Files:**
- Modify: `server/src/features/auth/auth.service.js`
- Modify: `server/src/features/auth/auth.controller.js`
- Modify: `server/src/features/auth/auth.routes.js`
- Test: `server/tests/api/auth.reset.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/api/auth.reset.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { hashPassword } from '../../src/lib/password.js';
import { hashToken } from '../../src/lib/token.js';

const app = createApp();

beforeEach(async () => {
  await User.create({
    name: 'Gym Admin',
    email: 'admin@gym.com',
    passwordHash: await hashPassword('Admin@123'),
  });
});

const requestReset = () =>
  request(app).post('/api/auth/forgot-password').send({ email: 'admin@gym.com' });

describe('POST /api/auth/forgot-password', () => {
  it('confirms the request and stores only the token hash', async () => {
    const response = await requestReset();

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/reset link/i);

    const user = await User.findOne({ email: 'admin@gym.com' }).select(
      '+resetTokenHash +resetTokenExpiresAt',
    );
    expect(user.resetTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(user.resetTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());

    // The raw token must never be what is stored.
    expect(user.resetTokenHash).not.toBe(response.body.resetToken);
    expect(hashToken(response.body.resetToken)).toBe(user.resetTokenHash);
  });

  it('gives the same confirmation for an unregistered email', async () => {
    const known = await requestReset();
    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@gym.com' });

    expect(unknown.status).toBe(200);
    expect(unknown.body.message).toBe(known.body.message);
    expect(unknown.body.resetToken).toBeUndefined();
  });

  it('rejects a malformed email', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nope' });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('sets the new password and lets the user sign in with it', async () => {
    const { body } = await requestReset();

    const reset = await request(app).post('/api/auth/reset-password').send({
      token: body.resetToken,
      password: 'BrandNew1',
      confirmPassword: 'BrandNew1',
    });

    expect(reset.status).toBe(200);
    expect(reset.body.message).toMatch(/updated/i);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gym.com', password: 'BrandNew1' });
    expect(newLogin.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gym.com', password: 'Admin@123' });
    expect(oldLogin.status).toBe(401);
  });

  it('invalidates the token after a successful reset', async () => {
    const { body } = await requestReset();
    const payload = {
      token: body.resetToken,
      password: 'BrandNew1',
      confirmPassword: 'BrandNew1',
    };

    await request(app).post('/api/auth/reset-password').send(payload);
    const second = await request(app).post('/api/auth/reset-password').send(payload);

    expect(second.status).toBe(400);
    expect(second.body.error.message).toMatch(/invalid or has expired/i);
  });

  it('rejects an expired token', async () => {
    const { body } = await requestReset();
    await User.updateOne(
      { email: 'admin@gym.com' },
      { resetTokenExpiresAt: new Date(Date.now() - 1000) },
    );

    const response = await request(app).post('/api/auth/reset-password').send({
      token: body.resetToken,
      password: 'BrandNew1',
      confirmPassword: 'BrandNew1',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/invalid or has expired/i);
  });

  it('rejects an unknown token', async () => {
    const response = await request(app).post('/api/auth/reset-password').send({
      token: 'totally-made-up-token',
      password: 'BrandNew1',
      confirmPassword: 'BrandNew1',
    });

    expect(response.status).toBe(400);
  });

  it('rejects a password that fails the policy', async () => {
    const { body } = await requestReset();

    const response = await request(app).post('/api/auth/reset-password').send({
      token: body.resetToken,
      password: 'short',
      confirmPassword: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details.password).toMatch(/8 characters/);
  });

  it('rejects mismatched confirmation', async () => {
    const { body } = await requestReset();

    const response = await request(app).post('/api/auth/reset-password').send({
      token: body.resetToken,
      password: 'BrandNew1',
      confirmPassword: 'Different1',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details.confirmPassword).toMatch(/do not match/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/api/auth.reset.test.js
```

Expected: FAIL — both endpoints 404.

- [ ] **Step 3: Extend `server/src/features/auth/auth.service.js`**

Add these imports at the top:

```js
import { User } from '../../models/User.js';
import { ApiError } from '../../lib/ApiError.js';
import { verifyPassword, hashPassword } from '../../lib/password.js';
import { createResetToken, hashToken } from '../../lib/token.js';
import { sendResetEmail } from './email.js';
```

(The `verifyPassword` import already exists — extend it to include `hashPassword` rather than adding a second import line.)

Then append:

```js
/** Identical response for every email, so the endpoint cannot enumerate accounts. */
const GENERIC_RESET_MESSAGE =
  'If that email is registered, a password reset link has been sent.';

/**
 * Issues a password-reset token.
 *
 * In development the raw token comes back in the response so the flow can be
 * completed without an email provider. In production it is only emailed.
 */
export const requestPasswordReset = async ({ email }) => {
  const config = env();
  const user = await User.findOne({ email });

  if (!user) {
    // Same shape, same timing budget, no token — nothing is revealed.
    return { message: GENERIC_RESET_MESSAGE };
  }

  const { token, tokenHash } = createResetToken();

  user.resetTokenHash = tokenHash;
  user.resetTokenExpiresAt = new Date(Date.now() + config.resetTokenTtlMinutes * 60 * 1000);
  await user.save();

  const resetUrl = `${config.clientUrl}/reset-password?token=${token}`;
  await sendResetEmail({ to: user.email, resetUrl });

  return {
    message: GENERIC_RESET_MESSAGE,
    ...(config.isProduction ? {} : { resetToken: token, resetUrl }),
  };
};

/**
 * Consumes a reset token and sets a new password.
 *
 * The token is single-use: it is cleared on success, so a link that has been
 * used (or has expired) cannot be replayed.
 */
export const resetPassword = async ({ token, password }) => {
  const user = await User.findOne({
    resetTokenHash: hashToken(token),
    resetTokenExpiresAt: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpiresAt');

  if (!user) {
    throw ApiError.badRequest('This reset link is invalid or has expired');
  }

  user.passwordHash = await hashPassword(password);
  user.resetTokenHash = undefined;
  user.resetTokenExpiresAt = undefined;
  await user.save();

  return { message: 'Your password has been updated. You can now sign in.' };
};
```

- [ ] **Step 4: Extend `server/src/features/auth/auth.controller.js`**

Append:

```js
export const forgotPassword = async (req, res) => {
  res.json(await authService.requestPasswordReset(req.body));
};

export const resetPassword = async (req, res) => {
  res.json(await authService.resetPassword(req.body));
};
```

- [ ] **Step 5: Extend `server/src/features/auth/auth.routes.js`**

Add to the schema import:

```js
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema.js';
```

Append the routes:

```js
authRouter.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);

authRouter.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/api/auth.reset.test.js
```

Expected: PASS — `9 passed`.

- [ ] **Step 7: Run the whole server suite**

```bash
npm test --workspace server
```

Expected: PASS — every file green.

- [ ] **Step 8: Commit**

```bash
git add server/src/features/auth server/tests/api/auth.reset.test.js
git commit -m "feat(server): add forgot-password and reset-password endpoints"
```

**Phase 1 complete.** SRS §1 is fully implemented and tested on the API side.

---

# Phase 2 — Domain logic and REST API

Everything the SRS calls a "business rule" lives in this phase. The date math in Task 12 is pure — no database, no Express — because it is the part most likely to be wrong and the part cheapest to test exhaustively.

---

### Task 12: UTC date helpers and membership math

**Why UTC everywhere:** `addMonths` from date-fns reads `getFullYear()`/`getMonth()`, which are *local*. Given a date stored as UTC midnight, that returns the previous day in any timezone behind UTC — and a membership that silently ends a day early is exactly the bug nobody notices until a member complains. These helpers do all arithmetic in UTC, so the result is identical on a developer laptop in Asia/Kolkata and a server in UTC.

**Files:**
- Create: `server/src/lib/dates.js`
- Create: `server/src/lib/membership.js`
- Test: `server/tests/unit/dates.test.js`
- Test: `server/tests/unit/membership.test.js`

- [ ] **Step 1: Write the failing date-helper test**

Create `server/tests/unit/dates.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  toUtcMidnight,
  addDaysUtc,
  addMonthsUtc,
  differenceInDaysUtc,
  monthRangeUtc,
  toIsoDate,
} from '../../src/lib/dates.js';

describe('toUtcMidnight', () => {
  it('strips the time from an ISO date string', () => {
    expect(toIsoDate(toUtcMidnight('2026-03-15'))).toBe('2026-03-15');
  });

  it('strips the time from a timestamp', () => {
    expect(toIsoDate(toUtcMidnight('2026-03-15T18:45:12.000Z'))).toBe('2026-03-15');
  });

  it('throws on an unparseable value rather than returning Invalid Date', () => {
    expect(() => toUtcMidnight('not-a-date')).toThrow(/invalid date/i);
  });
});

describe('addDaysUtc', () => {
  it('adds days', () => {
    expect(toIsoDate(addDaysUtc('2026-03-15', 10))).toBe('2026-03-25');
  });

  it('subtracts with a negative count', () => {
    expect(toIsoDate(addDaysUtc('2026-03-01', -1))).toBe('2026-02-28');
  });

  it('crosses a year boundary', () => {
    expect(toIsoDate(addDaysUtc('2026-12-30', 5))).toBe('2027-01-04');
  });
});

describe('addMonthsUtc', () => {
  it('adds whole months', () => {
    expect(toIsoDate(addMonthsUtc('2026-01-15', 3))).toBe('2026-04-15');
  });

  it('crosses a year boundary', () => {
    expect(toIsoDate(addMonthsUtc('2026-06-10', 12))).toBe('2027-06-10');
  });

  it('clamps to the last day when the target month is shorter', () => {
    // 31 Jan + 1 month has no 31 Feb — clamp rather than roll into March.
    expect(toIsoDate(addMonthsUtc('2026-01-31', 1))).toBe('2026-02-28');
  });

  it('clamps correctly in a leap year', () => {
    expect(toIsoDate(addMonthsUtc('2028-01-31', 1))).toBe('2028-02-29');
  });
});

describe('differenceInDaysUtc', () => {
  it('counts whole days between two dates', () => {
    expect(differenceInDaysUtc('2026-03-20', '2026-03-15')).toBe(5);
  });

  it('returns a negative count when the first date is earlier', () => {
    expect(differenceInDaysUtc('2026-03-10', '2026-03-15')).toBe(-5);
  });

  it('returns zero for the same day regardless of time of day', () => {
    expect(differenceInDaysUtc('2026-03-15T23:59:00Z', '2026-03-15T00:01:00Z')).toBe(0);
  });
});

describe('monthRangeUtc', () => {
  it('returns a half-open range covering the month', () => {
    const { start, end } = monthRangeUtc('2026-02');

    expect(toIsoDate(start)).toBe('2026-02-01');
    expect(toIsoDate(end)).toBe('2026-03-01');
  });

  it('handles December rolling into the next year', () => {
    const { start, end } = monthRangeUtc('2026-12');

    expect(toIsoDate(start)).toBe('2026-12-01');
    expect(toIsoDate(end)).toBe('2027-01-01');
  });

  it('rejects a malformed month', () => {
    expect(() => monthRangeUtc('2026-13')).toThrow(/YYYY-MM/);
    expect(() => monthRangeUtc('Feb 2026')).toThrow(/YYYY-MM/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/unit/dates.test.js
```

Expected: FAIL — cannot resolve `../../src/lib/dates.js`.

- [ ] **Step 3: Create `server/src/lib/dates.js`**

```js
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Normalises any date-ish value to midnight UTC.
 *
 * Every date in this application passes through here before it is stored,
 * compared or returned, so a "day" always means the same 24 hours no matter
 * where the code runs.
 *
 * @param {Date|string|number} value
 * @returns {Date}
 */
export const toUtcMidnight = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid date: ${String(value)}`);
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
};

/** Midnight UTC on the current day. */
export const todayUtc = () => toUtcMidnight(new Date());

/** `YYYY-MM-DD` — the form used in URLs, form inputs and test assertions. */
export const toIsoDate = (value) => toUtcMidnight(value).toISOString().slice(0, 10);

/** UTC has no daylight saving, so plain millisecond arithmetic is exact. */
export const addDaysUtc = (value, days) =>
  new Date(toUtcMidnight(value).getTime() + days * MS_PER_DAY);

/**
 * Adds calendar months, clamping to the last valid day of the target month.
 *
 * 31 Jan + 1 month is 28 Feb, not 3 Mar — the naive result would silently
 * extend a membership past the month the member paid for.
 */
export const addMonthsUtc = (value, months) => {
  const date = toUtcMidnight(value);
  const targetMonthIndex = date.getUTCMonth() + months;

  const result = new Date(
    Date.UTC(date.getUTCFullYear(), targetMonthIndex, date.getUTCDate()),
  );

  const expectedMonth = ((targetMonthIndex % 12) + 12) % 12;
  if (result.getUTCMonth() !== expectedMonth) {
    // Overflowed into the following month — step back to the last valid day.
    result.setUTCDate(0);
  }

  return result;
};

/** Whole days from `to` to `from`; positive when `from` is later. */
export const differenceInDaysUtc = (from, to) =>
  Math.round((toUtcMidnight(from).getTime() - toUtcMidnight(to).getTime()) / MS_PER_DAY);

/**
 * Half-open `[start, end)` range for a `YYYY-MM` month.
 *
 * Half-open rather than inclusive so a Mongo query is `$gte: start, $lt: end`
 * and no expense recorded late on the last day of the month can slip out.
 */
export const monthRangeUtc = (month) => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(month));

  if (!match) {
    throw new TypeError(`Month must be in YYYY-MM format, received: ${String(month)}`);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/unit/dates.test.js
```

Expected: PASS — `16 passed`.

- [ ] **Step 5: Write the failing membership test**

Create `server/tests/unit/membership.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  MEMBERSHIP_STATUS,
  reminderDaysFor,
  calculateEndDate,
  daysUntilExpiry,
  getMembershipStatus,
  nextRenewalStartDate,
} from '../../src/lib/membership.js';
import { toIsoDate } from '../../src/lib/dates.js';

const TODAY = '2026-03-15';

describe('reminderDaysFor', () => {
  // SRS §4.2
  it('warns 2 days before expiry for a 1-month package', () => {
    expect(reminderDaysFor(1)).toBe(2);
  });

  it('warns 5 days before expiry for 3, 6 and 12-month packages', () => {
    expect(reminderDaysFor(3)).toBe(5);
    expect(reminderDaysFor(6)).toBe(5);
    expect(reminderDaysFor(12)).toBe(5);
  });

  it('falls back to 5 days for a duration the gym adds later', () => {
    expect(reminderDaysFor(24)).toBe(5);
  });
});

describe('calculateEndDate', () => {
  // Decision D6: end date is the LAST day of access.
  it('ends a 1-month package on the last day of that month', () => {
    expect(toIsoDate(calculateEndDate('2026-01-01', 1))).toBe('2026-01-31');
  });

  it('ends a 3-month package one day before the 3-month anniversary', () => {
    expect(toIsoDate(calculateEndDate('2026-01-01', 3))).toBe('2026-03-31');
  });

  it('handles a 6-month package', () => {
    expect(toIsoDate(calculateEndDate('2026-01-15', 6))).toBe('2026-07-14');
  });

  it('handles a 12-month package across a year boundary', () => {
    expect(toIsoDate(calculateEndDate('2026-06-10', 12))).toBe('2027-06-09');
  });

  it('clamps a month-end start date rather than overflowing', () => {
    // 31 Jan + 1 month clamps to 28 Feb, minus a day is 27 Feb.
    // Documented behaviour — see the note in the plan under decision D6.
    expect(toIsoDate(calculateEndDate('2026-01-31', 1))).toBe('2026-02-27');
  });
});

describe('daysUntilExpiry', () => {
  it('counts the days left', () => {
    expect(daysUntilExpiry('2026-03-20', TODAY)).toBe(5);
  });

  it('returns 0 on the final day of the membership', () => {
    expect(daysUntilExpiry(TODAY, TODAY)).toBe(0);
  });

  it('returns a negative number once expired', () => {
    expect(daysUntilExpiry('2026-03-10', TODAY)).toBe(-5);
  });
});

describe('getMembershipStatus', () => {
  const statusOf = (endDate, durationMonths) =>
    getMembershipStatus({ endDate, durationMonths }, TODAY);

  it('is active when expiry is far away', () => {
    expect(statusOf('2026-06-30', 3)).toBe(MEMBERSHIP_STATUS.ACTIVE);
  });

  it('is expired the day after the end date', () => {
    expect(statusOf('2026-03-14', 3)).toBe(MEMBERSHIP_STATUS.EXPIRED);
  });

  it('is still expiring-soon, not expired, on the final day', () => {
    expect(statusOf(TODAY, 3)).toBe(MEMBERSHIP_STATUS.EXPIRING_SOON);
  });

  // SRS §4.4 worked example.
  it('flags a 3-month package expiring in exactly 5 days', () => {
    expect(statusOf('2026-03-20', 3)).toBe(MEMBERSHIP_STATUS.EXPIRING_SOON);
  });

  it('does not flag a 3-month package expiring in 6 days', () => {
    expect(statusOf('2026-03-21', 3)).toBe(MEMBERSHIP_STATUS.ACTIVE);
  });

  it('flags a 1-month package expiring in exactly 2 days', () => {
    expect(statusOf('2026-03-17', 1)).toBe(MEMBERSHIP_STATUS.EXPIRING_SOON);
  });

  it('does not flag a 1-month package expiring in 3 days', () => {
    expect(statusOf('2026-03-18', 1)).toBe(MEMBERSHIP_STATUS.ACTIVE);
  });

  it('uses the 5-day window for a 12-month package', () => {
    expect(statusOf('2026-03-20', 12)).toBe(MEMBERSHIP_STATUS.EXPIRING_SOON);
    expect(statusOf('2026-03-21', 12)).toBe(MEMBERSHIP_STATUS.ACTIVE);
  });
});

describe('nextRenewalStartDate', () => {
  // Decision D8.
  it('starts the day after the old end date when renewing early', () => {
    expect(toIsoDate(nextRenewalStartDate('2026-03-20', TODAY))).toBe('2026-03-21');
  });

  it('starts the day after when renewing on the final day', () => {
    expect(toIsoDate(nextRenewalStartDate(TODAY, TODAY))).toBe('2026-03-16');
  });

  it('starts today when renewing after a lapse, not backdated', () => {
    expect(toIsoDate(nextRenewalStartDate('2026-01-31', TODAY))).toBe(TODAY);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/unit/membership.test.js
```

Expected: FAIL — cannot resolve `../../src/lib/membership.js`.

- [ ] **Step 7: Create `server/src/lib/membership.js`**

```js
import {
  addDaysUtc,
  addMonthsUtc,
  differenceInDaysUtc,
  todayUtc,
  toUtcMidnight,
} from './dates.js';

/**
 * Every membership is in exactly one of these states.
 *
 * - ACTIVE        → shown in Members only
 * - EXPIRING_SOON → also shown in Action Required (SRS §4)
 * - EXPIRED       → also shown in Expiry (SRS §3)
 */
export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  EXPIRING_SOON: 'expiring-soon',
  EXPIRED: 'expired',
};

/** Reminder thresholds from SRS §4.2. Anything not listed uses the default. */
export const REMINDER_DAYS_BY_DURATION = { 1: 2 };
export const DEFAULT_REMINDER_DAYS = 5;

/** How many days before expiry a membership of this length starts warning. */
export const reminderDaysFor = (durationMonths) =>
  REMINDER_DAYS_BY_DURATION[durationMonths] ?? DEFAULT_REMINDER_DAYS;

/**
 * The last day the membership is valid (decision D6).
 *
 * A 1-month membership starting 1 Jan ends 31 Jan — one full month of access,
 * not a month and a day.
 */
export const calculateEndDate = (startDate, durationMonths) =>
  addDaysUtc(addMonthsUtc(startDate, durationMonths), -1);

/** Days left; 0 on the final day, negative once expired. */
export const daysUntilExpiry = (endDate, today = todayUtc()) =>
  differenceInDaysUtc(endDate, today);

/**
 * Classifies a membership. This is the single source of truth for status —
 * the client displays what this returns and never recomputes it.
 *
 * @param {{ endDate: Date|string, durationMonths: number }} membership
 * @param {Date|string} [today]
 */
export const getMembershipStatus = ({ endDate, durationMonths }, today = todayUtc()) => {
  const remaining = daysUntilExpiry(endDate, today);

  if (remaining < 0) return MEMBERSHIP_STATUS.EXPIRED;
  if (remaining <= reminderDaysFor(durationMonths)) return MEMBERSHIP_STATUS.EXPIRING_SOON;
  return MEMBERSHIP_STATUS.ACTIVE;
};

/**
 * Where a renewal's new period begins (decision D8).
 *
 * Renewing early continues from the existing end date, so the member is not
 * cheated out of days already paid for. Renewing after a lapse starts today,
 * so the gym is not giving away the lapsed period.
 */
export const nextRenewalStartDate = (currentEndDate, today = todayUtc()) => {
  const remaining = daysUntilExpiry(currentEndDate, today);
  return remaining >= 0 ? addDaysUtc(currentEndDate, 1) : toUtcMidnight(today);
};
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/unit/membership.test.js
```

Expected: PASS — `22 passed`.

- [ ] **Step 9: Commit**

```bash
git add server/src/lib/dates.js server/src/lib/membership.js server/tests/unit/dates.test.js server/tests/unit/membership.test.js
git commit -m "feat(server): add utc date helpers and membership status logic"
```

---

### Task 13: Test factories and an authenticated-request helper

Every API test from here on needs a signed-in user and some members. Writing that inline each time is how test files rot.

**Files:**
- Create: `server/tests/helpers/factories.js`
- Create: `server/tests/helpers/auth.js`

- [ ] **Step 1: Create `server/tests/helpers/factories.js`**

```js
import { Package } from '../../src/models/Package.js';
import { Member } from '../../src/models/Member.js';
import { Expense } from '../../src/models/Expense.js';
import { User } from '../../src/models/User.js';
import { hashPassword } from '../../src/lib/password.js';
import { calculateEndDate } from '../../src/lib/membership.js';
import { toUtcMidnight, addDaysUtc, addMonthsUtc } from '../../src/lib/dates.js';

let sequence = 0;
const nextId = () => ++sequence;

export const createUser = async (overrides = {}) => {
  const n = nextId();
  return User.create({
    name: `User ${n}`,
    email: `user${n}@gym.com`,
    passwordHash: await hashPassword('Test@123'),
    role: 'admin',
    ...overrides,
  });
};

export const createPackage = (overrides = {}) => {
  const n = nextId();
  return Package.create({
    name: `Package ${n}`,
    durationMonths: 3,
    price: 4000,
    sortOrder: n,
    ...overrides,
  });
};

/**
 * Creates a member, deriving whichever membership date the test did not pin.
 *
 * A test that only sets `endDate` (to make a member expired, say) gets a
 * start date worked backwards from it — otherwise a fixed default start date
 * would be later than the end date and trip the model's ordering validator.
 */
export const createMember = async (overrides = {}) => {
  const n = nextId();
  const {
    package: packageDoc = await createPackage(),
    startDate,
    endDate,
    ...rest
  } = overrides;

  const durationMonths = rest.durationMonths ?? packageDoc.durationMonths;

  let resolvedStart;
  if (startDate) {
    resolvedStart = toUtcMidnight(startDate);
  } else if (endDate) {
    // Inverse of calculateEndDate.
    resolvedStart = addDaysUtc(addMonthsUtc(endDate, -durationMonths), 1);
  } else {
    resolvedStart = toUtcMidnight('2026-01-01');
  }

  const resolvedEnd = endDate
    ? toUtcMidnight(endDate)
    : calculateEndDate(resolvedStart, durationMonths);

  return Member.create({
    name: `Member ${n}`,
    phone: `90000000${String(n).padStart(2, '0')}`,
    email: `member${n}@example.com`,
    gender: 'male',
    package: packageDoc._id,
    packageName: packageDoc.name,
    packagePrice: packageDoc.price,
    durationMonths,
    startDate: resolvedStart,
    endDate: resolvedEnd,
    ...rest,
  });
};

export const createExpense = (overrides = {}) => {
  const n = nextId();
  return Expense.create({
    date: toUtcMidnight('2026-02-10'),
    description: `Expense ${n}`,
    amount: 1000,
    ...overrides,
  });
};
```

- [ ] **Step 2: Create `server/tests/helpers/auth.js`**

```js
import { signToken } from '../../src/features/auth/auth.service.js';
import { createUser } from './factories.js';

/**
 * Creates a user and returns the header to authenticate as them.
 *
 * Usage:
 *   const { header } = await authenticate();
 *   await request(app).get('/api/members').set(header);
 */
export const authenticate = async (overrides = {}) => {
  const user = await createUser(overrides);
  const token = signToken(user);

  return { user, token, header: { Authorization: `Bearer ${token}` } };
};
```

- [ ] **Step 3: Verify the helpers load**

Nothing imports them yet, so just confirm the suite is still green:

```bash
npm test --workspace server
```

Expected: PASS — all files green.

- [ ] **Step 4: Commit**

```bash
git add server/tests/helpers
git commit -m "test(server): add model factories and authenticated-request helper"
```

---

### Task 14: Member response serializer

The client must never compute membership status — that would be a second implementation of Task 12's rules, free to drift. Every member leaves the API already carrying `status` and `daysRemaining`.

**Files:**
- Create: `server/src/features/members/members.serializer.js`
- Test: `server/tests/unit/members.serializer.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/members.serializer.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { toMemberResponse } from '../../src/features/members/members.serializer.js';
import { createMember } from '../helpers/factories.js';

const TODAY = '2026-03-15';

describe('toMemberResponse', () => {
  it('adds status and daysRemaining to the member document', async () => {
    const member = await createMember({ startDate: '2026-01-01', durationMonths: 3 });

    const result = toMemberResponse(member, TODAY);

    // Starts 2026-01-01 for 3 months, so it ends 2026-03-31 — still active on 2026-03-15.
    expect(result.status).toBe('active');
    expect(result.daysRemaining).toBe(16);
  });

  it('reports an active membership with days remaining', async () => {
    const member = await createMember({ startDate: '2026-03-01', durationMonths: 3 });

    const result = toMemberResponse(member, TODAY);

    expect(result.status).toBe('active');
    expect(result.daysRemaining).toBe(77); // ends 2026-05-31
  });

  it('exposes id and hides the mongo internals', async () => {
    const member = await createMember();

    const result = toMemberResponse(member, TODAY);

    expect(result.id).toBe(member._id.toString());
    expect(result._id).toBeUndefined();
    expect(result.__v).toBeUndefined();
  });

  it('formats the dates as YYYY-MM-DD strings the client can render directly', async () => {
    const member = await createMember({ startDate: '2026-03-01', durationMonths: 3 });

    const result = toMemberResponse(member, TODAY);

    expect(result.startDate).toBe('2026-03-01');
    expect(result.endDate).toBe('2026-05-31');
  });

  it('maps a list of members', async () => {
    await createMember({ startDate: '2026-03-01' });
    await createMember({ startDate: '2026-03-01' });

    const { toMemberListResponse } = await import(
      '../../src/features/members/members.serializer.js'
    );
    const { Member } = await import('../../src/models/Member.js');

    const result = toMemberListResponse(await Member.find(), TODAY);

    expect(result).toHaveLength(2);
    expect(result.every((m) => m.status === 'active')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/unit/members.serializer.test.js
```

Expected: FAIL — cannot resolve `members.serializer.js`.

- [ ] **Step 3: Create `server/src/features/members/members.serializer.js`**

```js
import { getMembershipStatus, daysUntilExpiry } from '../../lib/membership.js';
import { toIsoDate, todayUtc } from '../../lib/dates.js';

/**
 * Shapes a Member document for the API.
 *
 * Status and days-remaining are computed here, once, so the client can render
 * badges without knowing any of the business rules.
 *
 * @param {import('mongoose').Document} member
 * @param {Date|string} [today] Injectable for deterministic tests
 */
export const toMemberResponse = (member, today = todayUtc()) => {
  const json = member.toJSON();

  return {
    ...json,
    startDate: toIsoDate(json.startDate),
    endDate: toIsoDate(json.endDate),
    history: (json.history ?? []).map((period) => ({
      ...period,
      startDate: toIsoDate(period.startDate),
      endDate: toIsoDate(period.endDate),
    })),
    status: getMembershipStatus(
      { endDate: json.endDate, durationMonths: json.durationMonths },
      today,
    ),
    daysRemaining: daysUntilExpiry(json.endDate, today),
  };
};

export const toMemberListResponse = (members, today = todayUtc()) =>
  members.map((member) => toMemberResponse(member, today));
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/unit/members.serializer.test.js
```

Expected: PASS — `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add server/src/features/members server/tests/unit/members.serializer.test.js
git commit -m "feat(server): add member serializer that computes membership status"
```

---

### Task 15: Packages API

Backs the package dropdown on the member form and the Settings screen (decision D4).

**Files:**
- Create: `server/src/features/packages/packages.schema.js`
- Create: `server/src/features/packages/packages.controller.js`
- Create: `server/src/features/packages/packages.routes.js`
- Modify: `server/src/app.js`
- Test: `server/tests/api/packages.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/api/packages.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createPackage, createMember } from '../helpers/factories.js';

const app = createApp();
let header;

beforeEach(async () => {
  ({ header } = await authenticate());
});

describe('GET /api/packages', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/api/packages');
    expect(response.status).toBe(401);
  });

  it('returns packages in sort order', async () => {
    await createPackage({ name: '3 Months', durationMonths: 3, price: 4000, sortOrder: 2 });
    await createPackage({ name: '1 Month', durationMonths: 1, price: 1500, sortOrder: 1 });

    const response = await request(app).get('/api/packages').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.map((p) => p.name)).toEqual(['1 Month', '3 Months']);
    expect(response.body.data[0]).toMatchObject({ durationMonths: 1, price: 1500 });
    expect(response.body.data[0].id).toBeDefined();
  });

  it('hides inactive packages unless asked for them', async () => {
    await createPackage({ name: 'Retired', isActive: false });
    await createPackage({ name: 'Current', isActive: true });

    const active = await request(app).get('/api/packages').set(header);
    expect(active.body.data.map((p) => p.name)).toEqual(['Current']);

    const all = await request(app).get('/api/packages?includeInactive=true').set(header);
    expect(all.body.data).toHaveLength(2);
  });
});

describe('PATCH /api/packages/:id', () => {
  it('updates the price', async () => {
    const pkg = await createPackage({ price: 1500 });

    const response = await request(app)
      .patch(`/api/packages/${pkg.id}`)
      .set(header)
      .send({ price: 1800 });

    expect(response.status).toBe(200);
    expect(response.body.data.price).toBe(1800);
  });

  it('can deactivate a package', async () => {
    const pkg = await createPackage();

    const response = await request(app)
      .patch(`/api/packages/${pkg.id}`)
      .set(header)
      .send({ isActive: false });

    expect(response.body.data.isActive).toBe(false);
  });

  it('never rewrites what an existing member was charged', async () => {
    const pkg = await createPackage({ price: 1500, durationMonths: 1 });
    const member = await createMember({ package: pkg });

    await request(app).patch(`/api/packages/${pkg.id}`).set(header).send({ price: 9999 });

    const { Member } = await import('../../src/models/Member.js');
    const reloaded = await Member.findById(member.id);
    expect(reloaded.packagePrice).toBe(1500);
  });

  it('rejects a negative price', async () => {
    const pkg = await createPackage();

    const response = await request(app)
      .patch(`/api/packages/${pkg.id}`)
      .set(header)
      .send({ price: -5 });

    expect(response.status).toBe(400);
    expect(response.body.error.details.price).toBeDefined();
  });

  it('rejects an empty update', async () => {
    const pkg = await createPackage();

    const response = await request(app).patch(`/api/packages/${pkg.id}`).set(header).send({});

    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app)
      .patch('/api/packages/64b7f0f0f0f0f0f0f0f0f0f0')
      .set(header)
      .send({ price: 100 });

    expect(response.status).toBe(404);
  });

  it('requires authentication', async () => {
    const pkg = await createPackage();
    const response = await request(app).patch(`/api/packages/${pkg.id}`).send({ price: 100 });
    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/api/packages.test.js
```

Expected: FAIL — routes return 404.

- [ ] **Step 3: Create `server/src/features/packages/packages.schema.js`**

```js
import { z } from 'zod';

export const listPackagesQuerySchema = z.object({
  /** Settings shows retired packages; the member form must not. */
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const updatePackageSchema = z
  .object({
    price: z.coerce.number().int('Price must be a whole number').min(0, 'Price cannot be negative').optional(),
    isActive: z.boolean().optional(),
    durationMonths: z.coerce.number().int().min(1, 'Duration must be at least 1 month').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });
```

- [ ] **Step 4: Create `server/src/features/packages/packages.controller.js`**

```js
import { Package } from '../../models/Package.js';
import { ApiError } from '../../lib/ApiError.js';

export const list = async (req, res) => {
  const { includeInactive } = req.validatedQuery ?? {};
  const filter = includeInactive ? {} : { isActive: true };

  const packages = await Package.find(filter).sort({ sortOrder: 1, durationMonths: 1 });

  res.json({ data: packages.map((pkg) => pkg.toJSON()) });
};

/**
 * Updates a package definition.
 *
 * Deliberately does NOT touch existing members — each member snapshots the
 * price it was sold at (decision D9).
 */
export const update = async (req, res) => {
  const updated = await Package.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updated) throw ApiError.notFound('Package not found');

  res.json({ data: updated.toJSON() });
};
```

- [ ] **Step 5: Create `server/src/features/packages/packages.routes.js`**

```js
import { Router } from 'express';

import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { listPackagesQuerySchema, updatePackageSchema } from './packages.schema.js';
import * as packagesController from './packages.controller.js';

export const packagesRouter = Router();

// Every package route is behind authentication (SRS §6.4).
packagesRouter.use(requireAuth);

packagesRouter.get(
  '/',
  validate(listPackagesQuerySchema, 'query'),
  asyncHandler(packagesController.list),
);

packagesRouter.patch(
  '/:id',
  validate(updatePackageSchema),
  asyncHandler(packagesController.update),
);
```

- [ ] **Step 6: Mount it in `server/src/app.js`**

Add the import:

```js
import { packagesRouter } from './features/packages/packages.routes.js';
```

and the mount, directly after the auth router:

```js
  app.use('/api/packages', packagesRouter);
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/api/packages.test.js
```

Expected: PASS — `10 passed`.

- [ ] **Step 8: Commit**

```bash
git add server/src/features/packages server/src/app.js server/tests/api/packages.test.js
git commit -m "feat(server): add packages listing and price update endpoints"
```

---

### Task 16: Member query builder

The Expiry module (SRS §3) and the Action Required module (SRS §4) are the **same member list with a different filter**. Building both filters from the one set of thresholds in Task 12 is what stops them from ever disagreeing about who is expiring.

**Files:**
- Create: `server/src/features/members/members.query.js`
- Test: `server/tests/unit/members.query.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/members.query.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { buildMemberFilter, buildSearchFilter } from '../../src/features/members/members.query.js';
import { Member } from '../../src/models/Member.js';
import { createMember, createPackage } from '../helpers/factories.js';

const TODAY = '2026-03-15';

/** Creates a member whose membership ends exactly `days` from TODAY. */
const memberEndingIn = async (days, durationMonths) => {
  const pkg = await createPackage({ durationMonths, name: `P${durationMonths}-${days}` });
  const endDate = new Date(Date.UTC(2026, 2, 15 + days));

  return createMember({
    package: pkg,
    durationMonths,
    startDate: '2026-01-01',
    endDate,
  });
};

describe('buildSearchFilter', () => {
  it('returns an empty filter for blank input', () => {
    expect(buildSearchFilter('')).toEqual({});
    expect(buildSearchFilter('   ')).toEqual({});
    expect(buildSearchFilter(undefined)).toEqual({});
  });

  it('matches name, phone or email case-insensitively', async () => {
    await createMember({ name: 'Priya Sharma', email: 'priya@example.com', phone: '9811111111' });
    await createMember({ name: 'Rahul Verma', email: 'rahul@example.com', phone: '9822222222' });

    expect(await Member.countDocuments(buildSearchFilter('priya'))).toBe(1);
    expect(await Member.countDocuments(buildSearchFilter('PRIYA'))).toBe(1);
    expect(await Member.countDocuments(buildSearchFilter('9822'))).toBe(1);
    expect(await Member.countDocuments(buildSearchFilter('example.com'))).toBe(2);
  });

  it('treats regex characters as literal text', async () => {
    await createMember({ name: 'Priya Sharma' });

    // Without escaping, '.*' would match every member.
    expect(await Member.countDocuments(buildSearchFilter('.*'))).toBe(0);
  });
});

describe('buildMemberFilter — status', () => {
  beforeEach(async () => {
    await memberEndingIn(-1, 3); // expired yesterday
    await memberEndingIn(0, 3); // last day
    await memberEndingIn(5, 3); // 3-month, exactly at its 5-day threshold
    await memberEndingIn(6, 3); // 3-month, one day outside
    await memberEndingIn(2, 1); // 1-month, exactly at its 2-day threshold
    await memberEndingIn(3, 1); // 1-month, one day outside
  });

  const namesMatching = async (status) => {
    const members = await Member.find(buildMemberFilter({ status, today: TODAY })).sort({
      endDate: 1,
    });
    return members.map((m) => m.durationMonths + '/' + m.endDate.toISOString().slice(0, 10));
  };

  it('expired = end date already passed', async () => {
    expect(await namesMatching('expired')).toEqual(['3/2026-03-14']);
  });

  it('expiring-soon respects the per-package threshold', async () => {
    // Qualifying: the 3-month ending today, the 1-month ending in 2 days (its
    // threshold), and the 3-month ending in 5 days (its threshold).
    // Excluded: the 1-month ending in 3 days and the 3-month ending in 6 days.
    expect(await namesMatching('expiring-soon')).toEqual([
      '3/2026-03-15',
      '1/2026-03-17',
      '3/2026-03-20',
    ]);
  });

  it('active excludes both expired and expiring-soon members', async () => {
    const active = await Member.find(buildMemberFilter({ status: 'active', today: TODAY }));
    expect(active).toHaveLength(2);
  });

  it('no status returns every member', async () => {
    expect(await Member.countDocuments(buildMemberFilter({ today: TODAY }))).toBe(6);
  });

  it('every member falls into exactly one status bucket', async () => {
    const counts = await Promise.all(
      ['expired', 'expiring-soon', 'active'].map((status) =>
        Member.countDocuments(buildMemberFilter({ status, today: TODAY })),
      ),
    );

    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(6);
  });
});

describe('buildMemberFilter — combining filters', () => {
  it('ANDs search with status instead of letting the $or clauses collide', async () => {
    const pkg = await createPackage({ durationMonths: 3 });
    await createMember({
      name: 'Expiring Anita',
      package: pkg,
      durationMonths: 3,
      startDate: '2026-01-01',
      endDate: new Date(Date.UTC(2026, 2, 17)),
    });
    await createMember({
      name: 'Active Anita',
      package: pkg,
      durationMonths: 3,
      startDate: '2026-01-01',
      endDate: new Date(Date.UTC(2026, 5, 30)),
    });

    const filter = buildMemberFilter({ search: 'Anita', status: 'expiring-soon', today: TODAY });
    const found = await Member.find(filter);

    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('Expiring Anita');
  });

  it('filters by package', async () => {
    const premium = await createPackage({ name: 'Premium' });
    const basic = await createPackage({ name: 'Basic' });
    await createMember({ package: premium });
    await createMember({ package: basic });

    const filter = buildMemberFilter({ packageId: premium.id, today: TODAY });
    expect(await Member.countDocuments(filter)).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/unit/members.query.test.js
```

Expected: FAIL — cannot resolve `members.query.js`.

- [ ] **Step 3: Create `server/src/features/members/members.query.js`**

```js
import {
  MEMBERSHIP_STATUS,
  REMINDER_DAYS_BY_DURATION,
  DEFAULT_REMINDER_DAYS,
} from '../../lib/membership.js';
import { addDaysUtc, todayUtc, toUtcMidnight } from '../../lib/dates.js';

/** Makes user input safe to drop into a RegExp — otherwise '.*' matches everyone. */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The reminder thresholds expressed as Mongo-matchable groups.
 *
 * Derived from REMINDER_DAYS_BY_DURATION rather than hard-coded, so adding a
 * new threshold in `membership.js` automatically changes these queries too.
 */
const reminderGroups = () => {
  const specialDurations = Object.keys(REMINDER_DAYS_BY_DURATION).map(Number);

  return [
    ...specialDurations.map((duration) => ({
      match: { durationMonths: duration },
      windowDays: REMINDER_DAYS_BY_DURATION[duration],
    })),
    {
      match: { durationMonths: { $nin: specialDurations } },
      windowDays: DEFAULT_REMINDER_DAYS,
    },
  ];
};

export const buildSearchFilter = (search) => {
  const term = search?.trim();
  if (!term) return {};

  const pattern = new RegExp(escapeRegex(term), 'i');
  return { $or: [{ name: pattern }, { phone: pattern }, { email: pattern }] };
};

/**
 * Translates a membership status into a Mongo filter.
 *
 * The three statuses partition the member set exactly — every member matches
 * one and only one of them.
 */
export const buildStatusFilter = (status, today = todayUtc()) => {
  const start = toUtcMidnight(today);

  switch (status) {
    // SRS §3: end date has passed.
    case MEMBERSHIP_STATUS.EXPIRED:
      return { endDate: { $lt: start } };

    // SRS §4: still valid, but within the package's reminder window.
    case MEMBERSHIP_STATUS.EXPIRING_SOON:
      return {
        $or: reminderGroups().map(({ match, windowDays }) => ({
          ...match,
          endDate: { $gte: start, $lte: addDaysUtc(start, windowDays) },
        })),
      };

    // Valid and beyond the reminder window.
    case MEMBERSHIP_STATUS.ACTIVE:
      return {
        $or: reminderGroups().map(({ match, windowDays }) => ({
          ...match,
          endDate: { $gt: addDaysUtc(start, windowDays) },
        })),
      };

    default:
      return {};
  }
};

/**
 * Combines the member list filters.
 *
 * Search and status each produce a top-level `$or`. Merging them into one
 * object would let the second overwrite the first, silently widening the
 * result — so they are combined under `$and` instead.
 */
export const buildMemberFilter = ({ search, status, packageId, today } = {}) => {
  const clauses = [
    buildSearchFilter(search),
    buildStatusFilter(status, today),
    packageId ? { package: packageId } : {},
  ].filter((clause) => Object.keys(clause).length > 0);

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/unit/members.query.test.js
```

Expected: PASS — `8 passed`.

- [ ] **Step 5: Commit**

```bash
git add server/src/features/members/members.query.js server/tests/unit/members.query.test.js
git commit -m "feat(server): add member search, status and package query builders"
```

---

### Task 17: Members API — list, view, create, edit and renew

Implements SRS §2 in full, plus the listing endpoints the Expiry (§3) and Action Required (§4) screens consume. Two commits: CRUD first, then renewal.

**Files:**
- Create: `server/src/features/members/members.schema.js`
- Create: `server/src/features/members/members.service.js`
- Create: `server/src/features/members/members.controller.js`
- Create: `server/src/features/members/members.routes.js`
- Modify: `server/src/app.js`
- Test: `server/tests/api/members.test.js`
- Test: `server/tests/api/members.renew.test.js`

- [ ] **Step 1: Write the failing CRUD test**

Create `server/tests/api/members.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createPackage, createMember } from '../helpers/factories.js';
import { Member } from '../../src/models/Member.js';

const app = createApp();
let header;
let threeMonth;

beforeEach(async () => {
  ({ header } = await authenticate());
  threeMonth = await createPackage({ name: '3 Months', durationMonths: 3, price: 4000 });
});

describe('POST /api/members', () => {
  const validBody = () => ({
    name: 'Priya Sharma',
    phone: '9811111111',
    email: 'priya@example.com',
    gender: 'female',
    packageId: threeMonth.id,
    startDate: '2026-01-10',
  });

  it('creates a member and derives price and end date from the package', async () => {
    const response = await request(app).post('/api/members').set(header).send(validBody());

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: 'Priya Sharma',
      gender: 'female',
      packageName: '3 Months',
      packagePrice: 4000, // SRS §2.3.1 — never entered by the user
      durationMonths: 3,
      startDate: '2026-01-10',
      endDate: '2026-04-09', // SRS §2.3.4
    });
    expect(response.body.data.id).toBeDefined();
  });

  it('ignores a price sent by the client', async () => {
    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), price: 1, packagePrice: 1 });

    expect(response.body.data.packagePrice).toBe(4000);
  });

  it('defaults the start date to today when omitted', async () => {
    const { startDate, ...withoutStart } = validBody();

    const response = await request(app).post('/api/members').set(header).send(withoutStart);

    expect(response.status).toBe(201);
    expect(response.body.data.startDate).toBe(new Date().toISOString().slice(0, 10));
  });

  it('lowercases the email', async () => {
    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), email: 'PRIYA@Example.COM' });

    expect(response.body.data.email).toBe('priya@example.com');
  });

  it('stores a blank email as absent so other blanks do not collide', async () => {
    await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), email: '', phone: '9800000001' });

    const second = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), name: 'Other', email: '', phone: '9800000002' });

    expect(second.status).toBe(201);
    expect(second.body.data.email).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/members').set(header).send(validBody());

    const duplicate = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), name: 'Someone Else', phone: '9899999999' });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.message).toMatch(/already exists/i);
  });

  // SRS §2.3.5 — mandatory field validation
  it('rejects a missing name', async () => {
    const { name, ...body } = validBody();
    const response = await request(app).post('/api/members').set(header).send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.details.name).toBeDefined();
  });

  it('rejects an invalid email format', async () => {
    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.email).toMatch(/valid email/i);
  });

  it('rejects an invalid phone format', async () => {
    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), phone: 'call me' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.phone).toBeDefined();
  });

  it('rejects a missing package', async () => {
    const { packageId, ...body } = validBody();
    const response = await request(app).post('/api/members').set(header).send(body);

    expect(response.status).toBe(400);
  });

  it('rejects an unknown package id with 404', async () => {
    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), packageId: '64b7f0f0f0f0f0f0f0f0f0f0' });

    expect(response.status).toBe(404);
  });

  it('rejects a retired package', async () => {
    const retired = await createPackage({ name: 'Retired', isActive: false });

    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), packageId: retired.id });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/no longer available/i);
  });

  it('requires authentication', async () => {
    const response = await request(app).post('/api/members').send(validBody());
    expect(response.status).toBe(401);
  });
});

describe('GET /api/members', () => {
  it('returns the newest members first (SRS §2.1)', async () => {
    await createMember({ name: 'First', package: threeMonth });
    await createMember({ name: 'Second', package: threeMonth });

    const response = await request(app).get('/api/members').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.map((m) => m.name)).toEqual(['Second', 'First']);
  });

  it('includes the computed status and days remaining on every row', async () => {
    await createMember({ package: threeMonth, startDate: '2026-01-01' });

    const response = await request(app).get('/api/members').set(header);

    expect(response.body.data[0].status).toMatch(/active|expiring-soon|expired/);
    expect(typeof response.body.data[0].daysRemaining).toBe('number');
  });

  it('paginates', async () => {
    for (let i = 0; i < 25; i += 1) {
      await createMember({ package: threeMonth });
    }

    const page1 = await request(app).get('/api/members?page=1&limit=10').set(header);
    const page3 = await request(app).get('/api/members?page=3&limit=10').set(header);

    expect(page1.body.data).toHaveLength(10);
    expect(page3.body.data).toHaveLength(5);
    expect(page1.body.pagination).toEqual({ page: 1, limit: 10, total: 25, totalPages: 3 });
  });

  it('searches by name', async () => {
    await createMember({ name: 'Priya Sharma', package: threeMonth });
    await createMember({ name: 'Rahul Verma', package: threeMonth });

    const response = await request(app).get('/api/members?search=priya').set(header);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Priya Sharma');
  });

  it('filters to expired members for the Expiry module', async () => {
    await createMember({
      name: 'Lapsed',
      package: threeMonth,
      endDate: new Date(Date.UTC(2000, 0, 1)),
    });
    await createMember({
      name: 'Current',
      package: threeMonth,
      endDate: new Date(Date.UTC(2099, 0, 1)),
    });

    const response = await request(app).get('/api/members?status=expired').set(header);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Lapsed');
    expect(response.body.data[0].status).toBe('expired');
  });

  it('rejects an unsupported status value', async () => {
    const response = await request(app).get('/api/members?status=nonsense').set(header);
    expect(response.status).toBe(400);
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/members');
    expect(response.status).toBe(401);
  });
});

describe('GET /api/members/:id', () => {
  it('returns the full member record (SRS §2.4)', async () => {
    const member = await createMember({ name: 'Priya Sharma', package: threeMonth });

    const response = await request(app).get(`/api/members/${member.id}`).set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Priya Sharma');
    expect(response.body.data.history).toEqual([]);
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app)
      .get('/api/members/64b7f0f0f0f0f0f0f0f0f0f0')
      .set(header);

    expect(response.status).toBe(404);
  });

  it('returns 400 for a malformed id rather than a 500', async () => {
    const response = await request(app).get('/api/members/not-an-id').set(header);
    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/members/:id', () => {
  it('updates contact details without touching the membership dates', async () => {
    const member = await createMember({ package: threeMonth, startDate: '2026-01-10' });

    const response = await request(app)
      .patch(`/api/members/${member.id}`)
      .set(header)
      .send({ name: 'Priya S.', phone: '9877777777' });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Priya S.');
    expect(response.body.data.startDate).toBe('2026-01-10');
    expect(response.body.data.endDate).toBe('2026-04-09');
  });

  it('recalculates the end date when the package changes (SRS §2.4)', async () => {
    const member = await createMember({ package: threeMonth, startDate: '2026-01-10' });
    const oneMonth = await createPackage({ name: '1 Month', durationMonths: 1, price: 1500 });

    const response = await request(app)
      .patch(`/api/members/${member.id}`)
      .set(header)
      .send({ packageId: oneMonth.id });

    expect(response.body.data).toMatchObject({
      packageName: '1 Month',
      packagePrice: 1500,
      durationMonths: 1,
      startDate: '2026-01-10',
      endDate: '2026-02-09',
    });
  });

  it('recalculates the end date when the start date changes', async () => {
    const member = await createMember({ package: threeMonth, startDate: '2026-01-10' });

    const response = await request(app)
      .patch(`/api/members/${member.id}`)
      .set(header)
      .send({ startDate: '2026-02-01' });

    expect(response.body.data.endDate).toBe('2026-04-30');
  });

  it('rejects an empty update', async () => {
    const member = await createMember({ package: threeMonth });

    const response = await request(app).patch(`/api/members/${member.id}`).set(header).send({});

    expect(response.status).toBe(400);
  });

  it('rejects a duplicate email with 409', async () => {
    await createMember({ email: 'taken@example.com', package: threeMonth });
    const member = await createMember({ package: threeMonth });

    const response = await request(app)
      .patch(`/api/members/${member.id}`)
      .set(header)
      .send({ email: 'taken@example.com' });

    expect(response.status).toBe(409);
  });

  it('does not create a second document', async () => {
    const member = await createMember({ package: threeMonth });

    await request(app).patch(`/api/members/${member.id}`).set(header).send({ name: 'Renamed' });

    expect(await Member.countDocuments()).toBe(1);
  });

  it('requires authentication', async () => {
    const member = await createMember({ package: threeMonth });
    const response = await request(app).patch(`/api/members/${member.id}`).send({ name: 'X' });
    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/api/members.test.js
```

Expected: FAIL — every request 404s.

- [ ] **Step 3: Create `server/src/features/members/members.schema.js`**

```js
import { z } from 'zod';
import { MEMBERSHIP_STATUS } from '../../lib/membership.js';

const objectId = (message) => z.string().regex(/^[0-9a-fA-F]{24}$/, message);

/** Digits, spaces, dashes, parentheses and an optional leading +. */
const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s()-]{6,19}$/, 'Enter a valid phone number');

/** An empty string from an untouched optional input means "no value". */
const optionalText = (schema) =>
  z
    .union([z.literal(''), schema])
    .optional()
    .transform((value) => (value === '' ? undefined : value));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const emailField = z.string().trim().toLowerCase().email('Enter a valid email address');

export const createMemberSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name must be 80 characters or fewer'),
    phone: optionalText(phoneField),
    email: optionalText(emailField),
    gender: z.enum(['male', 'female', 'other'], {
      errorMap: () => ({ message: 'Select a gender' }),
    }),
    packageId: objectId('Select a package'),
    startDate: isoDate.optional(),
    notes: optionalText(z.string().trim().max(500, 'Notes must be 500 characters or fewer')),
  })
  // Price is never accepted from the client — it comes from the package (SRS §2.3.2).
  .strip();

export const updateMemberSchema = createMemberSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const renewMemberSchema = z.object({
  /** Omit to renew onto the same package. */
  packageId: objectId('Select a package').optional(),
});

export const listMembersQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(MEMBERSHIP_STATUS).optional(),
  packageId: objectId('Invalid package filter').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['newest', 'oldest', 'name', 'endDate']).default('newest'),
});

export const memberIdParamsSchema = z.object({
  id: objectId('Invalid member id'),
});
```

- [ ] **Step 4: Create `server/src/features/members/members.service.js`**

```js
import { Member } from '../../models/Member.js';
import { Package } from '../../models/Package.js';
import { ApiError } from '../../lib/ApiError.js';
import { calculateEndDate } from '../../lib/membership.js';
import { toUtcMidnight, todayUtc } from '../../lib/dates.js';
import { buildMemberFilter } from './members.query.js';

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  endDate: { endDate: 1 },
};

/** Loads a package for sale, rejecting unknown or retired ones. */
const loadSellablePackage = async (packageId) => {
  const pkg = await Package.findById(packageId);
  if (!pkg) throw ApiError.notFound('Package not found');
  if (!pkg.isActive) throw ApiError.badRequest('That package is no longer available');
  return pkg;
};

/** The package fields copied onto a membership at purchase time (decision D9). */
const snapshotOf = (pkg) => ({
  package: pkg._id,
  packageName: pkg.name,
  packagePrice: pkg.price,
  durationMonths: pkg.durationMonths,
});

export const listMembers = async ({ search, status, packageId, page, limit, sort }) => {
  const filter = buildMemberFilter({ search, status, packageId });

  const [members, total] = await Promise.all([
    Member.find(filter)
      .sort(SORT_OPTIONS[sort] ?? SORT_OPTIONS.newest)
      .skip((page - 1) * limit)
      .limit(limit),
    Member.countDocuments(filter),
  ]);

  return {
    members,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

export const getMember = async (id) => {
  const member = await Member.findById(id);
  if (!member) throw ApiError.notFound('Member not found');
  return member;
};

/**
 * Registers a new member (SRS §2.2).
 *
 * The price and end date are always derived — never taken from the request —
 * so the client cannot sell a membership at the wrong price.
 */
export const createMember = async ({ packageId, startDate, ...details }) => {
  const pkg = await loadSellablePackage(packageId);
  const start = startDate ? toUtcMidnight(startDate) : todayUtc();

  return Member.create({
    ...details,
    ...snapshotOf(pkg),
    startDate: start,
    endDate: calculateEndDate(start, pkg.durationMonths),
  });
};

/**
 * Edits a member (SRS §2.4).
 *
 * Changing the package or the start date re-derives the end date; editing
 * only contact details leaves the membership period exactly as it was.
 */
export const updateMember = async (id, { packageId, startDate, ...details }) => {
  const member = await getMember(id);

  Object.assign(member, details);

  if (packageId && packageId !== member.package.toString()) {
    Object.assign(member, snapshotOf(await loadSellablePackage(packageId)));
  }

  if (startDate) {
    member.startDate = toUtcMidnight(startDate);
  }

  if (packageId || startDate) {
    member.endDate = calculateEndDate(member.startDate, member.durationMonths);
  }

  await member.save();
  return member;
};

// `renewMember` is added in Step 12, after its test is written and failing.
```

- [ ] **Step 5: Create `server/src/features/members/members.controller.js`**

```js
import * as membersService from './members.service.js';
import { toMemberResponse, toMemberListResponse } from './members.serializer.js';

export const list = async (req, res) => {
  const { members, pagination } = await membersService.listMembers(req.validatedQuery);
  res.json({ data: toMemberListResponse(members), pagination });
};

export const get = async (req, res) => {
  const member = await membersService.getMember(req.params.id);
  res.json({ data: toMemberResponse(member) });
};

export const create = async (req, res) => {
  const member = await membersService.createMember(req.body);
  res.status(201).json({ data: toMemberResponse(member) });
};

export const update = async (req, res) => {
  const member = await membersService.updateMember(req.params.id, req.body);
  res.json({ data: toMemberResponse(member) });
};

export const renew = async (req, res) => {
  const member = await membersService.renewMember(req.params.id, req.body);
  res.json({ data: toMemberResponse(member) });
};
```

- [ ] **Step 6: Create `server/src/features/members/members.routes.js`**

```js
import { Router } from 'express';

import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import {
  createMemberSchema,
  updateMemberSchema,
  renewMemberSchema,
  listMembersQuerySchema,
  memberIdParamsSchema,
} from './members.schema.js';
import * as membersController from './members.controller.js';

export const membersRouter = Router();

membersRouter.use(requireAuth);

membersRouter.get(
  '/',
  validate(listMembersQuerySchema, 'query'),
  asyncHandler(membersController.list),
);

membersRouter.post('/', validate(createMemberSchema), asyncHandler(membersController.create));

membersRouter.get(
  '/:id',
  validate(memberIdParamsSchema, 'params'),
  asyncHandler(membersController.get),
);

membersRouter.patch(
  '/:id',
  validate(memberIdParamsSchema, 'params'),
  validate(updateMemberSchema),
  asyncHandler(membersController.update),
);

membersRouter.post(
  '/:id/renew',
  validate(memberIdParamsSchema, 'params'),
  validate(renewMemberSchema),
  asyncHandler(membersController.renew),
);
```

- [ ] **Step 7: Mount it in `server/src/app.js`**

Add the import:

```js
import { membersRouter } from './features/members/members.routes.js';
```

and the mount, after the packages router:

```js
  app.use('/api/members', membersRouter);
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/api/members.test.js
```

Expected: PASS — `27 passed`.

- [ ] **Step 9: Commit the CRUD half**

```bash
git add server/src/features/members server/src/app.js server/tests/api/members.test.js
git commit -m "feat(server): add member listing, creation, view and edit endpoints"
```

- [ ] **Step 10: Write the failing renewal test**

Create `server/tests/api/members.renew.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createPackage, createMember } from '../helpers/factories.js';
import { toIsoDate, addDaysUtc, todayUtc } from '../../src/lib/dates.js';

const app = createApp();
let header;
let threeMonth;

beforeEach(async () => {
  ({ header } = await authenticate());
  threeMonth = await createPackage({ name: '3 Months', durationMonths: 3, price: 4000 });
});

describe('POST /api/members/:id/renew', () => {
  it('continues from the old end date when renewing early', async () => {
    const endDate = addDaysUtc(todayUtc(), 3);
    const member = await createMember({ package: threeMonth, durationMonths: 3, endDate });

    const response = await request(app)
      .post(`/api/members/${member.id}/renew`)
      .set(header)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data.startDate).toBe(toIsoDate(addDaysUtc(endDate, 1)));
    expect(response.body.data.status).toBe('active');
  });

  it('starts today when renewing after the membership lapsed', async () => {
    const member = await createMember({
      package: threeMonth,
      durationMonths: 3,
      endDate: new Date(Date.UTC(2000, 0, 1)),
    });

    const response = await request(app)
      .post(`/api/members/${member.id}/renew`)
      .set(header)
      .send({});

    expect(response.body.data.startDate).toBe(toIsoDate(todayUtc()));
  });

  it('archives the previous period into history', async () => {
    const member = await createMember({
      package: threeMonth,
      durationMonths: 3,
      startDate: '2026-01-01',
      endDate: new Date(Date.UTC(2026, 2, 31)),
    });

    const response = await request(app)
      .post(`/api/members/${member.id}/renew`)
      .set(header)
      .send({});

    expect(response.body.data.history).toHaveLength(1);
    expect(response.body.data.history[0]).toMatchObject({
      packageName: '3 Months',
      packagePrice: 4000,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
    });
  });

  it('can renew onto a different package', async () => {
    const twelveMonth = await createPackage({
      name: '12 Months',
      durationMonths: 12,
      price: 14000,
    });
    const member = await createMember({ package: threeMonth, durationMonths: 3 });

    const response = await request(app)
      .post(`/api/members/${member.id}/renew`)
      .set(header)
      .send({ packageId: twelveMonth.id });

    expect(response.body.data).toMatchObject({
      packageName: '12 Months',
      packagePrice: 14000,
      durationMonths: 12,
    });
  });

  // Decision D7: a renewed member must leave the Expiry list.
  it('removes the member from the expired list', async () => {
    const member = await createMember({
      package: threeMonth,
      durationMonths: 3,
      endDate: new Date(Date.UTC(2000, 0, 1)),
    });

    const before = await request(app).get('/api/members?status=expired').set(header);
    expect(before.body.data).toHaveLength(1);

    await request(app).post(`/api/members/${member.id}/renew`).set(header).send({});

    const after = await request(app).get('/api/members?status=expired').set(header);
    expect(after.body.data).toHaveLength(0);
  });

  it('keeps the historical price when the package price has since changed', async () => {
    const member = await createMember({ package: threeMonth, durationMonths: 3 });
    await request(app).patch(`/api/packages/${threeMonth.id}`).set(header).send({ price: 5500 });

    const response = await request(app)
      .post(`/api/members/${member.id}/renew`)
      .set(header)
      .send({});

    expect(response.body.data.packagePrice).toBe(5500); // new period, new price
    expect(response.body.data.history[0].packagePrice).toBe(4000); // old period untouched
  });

  it('returns 404 for an unknown member', async () => {
    const response = await request(app)
      .post('/api/members/64b7f0f0f0f0f0f0f0f0f0f0/renew')
      .set(header)
      .send({});

    expect(response.status).toBe(404);
  });

  it('requires authentication', async () => {
    const member = await createMember({ package: threeMonth });
    const response = await request(app).post(`/api/members/${member.id}/renew`).send({});
    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 11: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/api/members.renew.test.js
```

Expected: FAIL — `membersService.renewMember is not a function`. The route and
controller exist, but the service function does not.

- [ ] **Step 12: Add `renewMember` to `server/src/features/members/members.service.js`**

Extend the membership import to include the renewal helper:

```js
import { calculateEndDate, nextRenewalStartDate } from '../../lib/membership.js';
```

Then replace the `// \`renewMember\` is added in Step 12...` placeholder comment with:

```js
/**
 * Renews a membership (decision D8, SRS §3.3).
 *
 * Archives the period that is ending into `history` and starts a new one, so
 * the member drops out of the Expiry list and the gym keeps a purchase record.
 */
export const renewMember = async (id, { packageId } = {}) => {
  const member = await getMember(id);
  const pkg = await loadSellablePackage(packageId ?? member.package.toString());

  member.history.push({
    package: member.package,
    packageName: member.packageName,
    packagePrice: member.packagePrice,
    durationMonths: member.durationMonths,
    startDate: member.startDate,
    endDate: member.endDate,
  });

  const start = nextRenewalStartDate(member.endDate);

  Object.assign(member, snapshotOf(pkg));
  member.startDate = start;
  member.endDate = calculateEndDate(start, pkg.durationMonths);

  await member.save();
  return member;
};
```

- [ ] **Step 13: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/api/members.renew.test.js
```

Expected: PASS — `8 passed`.

- [ ] **Step 14: Commit**

```bash
git add server/src/features/members/members.service.js server/tests/api/members.renew.test.js
git commit -m "feat(server): add membership renewal endpoint"
```

---

### Task 18: Expenses API

Implements SRS §5, including the month filter (§5.5) and its empty state.

**Files:**
- Create: `server/src/features/expenses/expenses.schema.js`
- Create: `server/src/features/expenses/expenses.controller.js`
- Create: `server/src/features/expenses/expenses.routes.js`
- Modify: `server/src/app.js`
- Test: `server/tests/api/expenses.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/api/expenses.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createExpense } from '../helpers/factories.js';
import { toUtcMidnight } from '../../src/lib/dates.js';

const app = createApp();
let header;

beforeEach(async () => {
  ({ header } = await authenticate());
});

describe('POST /api/expenses', () => {
  const validBody = () => ({
    date: '2026-02-10',
    description: 'Treadmill servicing',
    amount: 4500,
  });

  it('records an expense', async () => {
    const response = await request(app).post('/api/expenses').set(header).send(validBody());

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      date: '2026-02-10',
      description: 'Treadmill servicing',
      amount: 4500,
    });
    expect(response.body.data.id).toBeDefined();
  });

  it('trims the description', async () => {
    const response = await request(app)
      .post('/api/expenses')
      .set(header)
      .send({ ...validBody(), description: '  Dumbbell set  ' });

    expect(response.body.data.description).toBe('Dumbbell set');
  });

  it('rejects a zero or negative amount (SRS §6.2)', async () => {
    for (const amount of [0, -100]) {
      const response = await request(app)
        .post('/api/expenses')
        .set(header)
        .send({ ...validBody(), amount });

      expect(response.status).toBe(400);
      expect(response.body.error.details.amount).toBeDefined();
    }
  });

  it('rejects a non-numeric amount', async () => {
    const response = await request(app)
      .post('/api/expenses')
      .set(header)
      .send({ ...validBody(), amount: 'lots' });

    expect(response.status).toBe(400);
  });

  it('rejects a missing description', async () => {
    const { description, ...body } = validBody();
    const response = await request(app).post('/api/expenses').set(header).send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.details.description).toBeDefined();
  });

  it('rejects a malformed date', async () => {
    const response = await request(app)
      .post('/api/expenses')
      .set(header)
      .send({ ...validBody(), date: '10/02/2026' });

    expect(response.status).toBe(400);
  });

  it('requires authentication', async () => {
    const response = await request(app).post('/api/expenses').send(validBody());
    expect(response.status).toBe(401);
  });
});

describe('GET /api/expenses', () => {
  beforeEach(async () => {
    await createExpense({ date: toUtcMidnight('2026-01-31'), description: 'Jan last', amount: 100 });
    await createExpense({ date: toUtcMidnight('2026-02-01'), description: 'Feb first', amount: 200 });
    await createExpense({ date: toUtcMidnight('2026-02-28'), description: 'Feb last', amount: 300 });
    await createExpense({ date: toUtcMidnight('2026-03-01'), description: 'Mar first', amount: 400 });
  });

  it('returns every expense, newest first, when no month is given', async () => {
    const response = await request(app).get('/api/expenses').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.map((e) => e.description)).toEqual([
      'Mar first',
      'Feb last',
      'Feb first',
      'Jan last',
    ]);
  });

  // SRS §5.5 — the month filter must not leak the neighbouring months.
  it('filters to a single month inclusive of its first and last day', async () => {
    const response = await request(app).get('/api/expenses?month=2026-02').set(header);

    expect(response.body.data.map((e) => e.description)).toEqual(['Feb last', 'Feb first']);
  });

  it('returns the month total so the UI does not have to add up a page', async () => {
    const response = await request(app).get('/api/expenses?month=2026-02').set(header);

    expect(response.body.summary).toEqual({ total: 500, count: 2 });
  });

  it('returns an empty list and a zero total for a month with no expenses', async () => {
    const response = await request(app).get('/api/expenses?month=2026-07').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.summary).toEqual({ total: 0, count: 0 });
  });

  it('rejects a malformed month', async () => {
    const response = await request(app).get('/api/expenses?month=February').set(header);

    expect(response.status).toBe(400);
    expect(response.body.error.details.month).toMatch(/YYYY-MM/);
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/expenses');
    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/expenses/:id', () => {
  it('updates an expense', async () => {
    const expense = await createExpense({ amount: 1000 });

    const response = await request(app)
      .patch(`/api/expenses/${expense.id}`)
      .set(header)
      .send({ amount: 1250, description: 'Corrected amount' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ amount: 1250, description: 'Corrected amount' });
  });

  it('rejects an empty update', async () => {
    const expense = await createExpense();
    const response = await request(app).patch(`/api/expenses/${expense.id}`).set(header).send({});

    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app)
      .patch('/api/expenses/64b7f0f0f0f0f0f0f0f0f0f0')
      .set(header)
      .send({ amount: 10 });

    expect(response.status).toBe(404);
  });
});

describe('GET /api/expenses/:id', () => {
  it('returns one expense', async () => {
    const expense = await createExpense({ description: 'Water cooler' });

    const response = await request(app).get(`/api/expenses/${expense.id}`).set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.description).toBe('Water cooler');
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app)
      .get('/api/expenses/64b7f0f0f0f0f0f0f0f0f0f0')
      .set(header);

    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/api/expenses.test.js
```

Expected: FAIL — every request 404s.

- [ ] **Step 3: Create `server/src/features/expenses/expenses.schema.js`**

```js
import { z } from 'zod';

const objectId = (message) => z.string().regex(/^[0-9a-fA-F]{24}$/, message);

const isoDate = z
  .string({ required_error: 'Date is required' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const createExpenseSchema = z.object({
  date: isoDate,
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(2, 'Description must be at least 2 characters')
    .max(200, 'Description must be 200 characters or fewer'),
  amount: z.coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .int('Amount must be a whole number')
    .min(1, 'Amount must be greater than zero'),
});

export const updateExpenseSchema = createExpenseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listExpensesQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
    .optional(),
});

export const expenseIdParamsSchema = z.object({
  id: objectId('Invalid expense id'),
});
```

- [ ] **Step 4: Create `server/src/features/expenses/expenses.controller.js`**

```js
import { Expense } from '../../models/Expense.js';
import { ApiError } from '../../lib/ApiError.js';
import { monthRangeUtc, toUtcMidnight, toIsoDate } from '../../lib/dates.js';

/** Dates leave the API as YYYY-MM-DD so the client can render them directly. */
const toExpenseResponse = (expense) => ({
  ...expense.toJSON(),
  date: toIsoDate(expense.date),
});

export const list = async (req, res) => {
  const { month } = req.validatedQuery ?? {};

  // Half-open range: everything on the last day of the month is included.
  const filter = month
    ? (({ start, end }) => ({ date: { $gte: start, $lt: end } }))(monthRangeUtc(month))
    : {};

  const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });

  res.json({
    data: expenses.map(toExpenseResponse),
    // Computed server-side so a paginated or filtered view always shows the
    // true total, not just the total of the rows on screen.
    summary: {
      total: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      count: expenses.length,
    },
  });
};

export const get = async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw ApiError.notFound('Expense not found');

  res.json({ data: toExpenseResponse(expense) });
};

export const create = async (req, res) => {
  const expense = await Expense.create({ ...req.body, date: toUtcMidnight(req.body.date) });

  res.status(201).json({ data: toExpenseResponse(expense) });
};

export const update = async (req, res) => {
  const changes = { ...req.body };
  if (changes.date) changes.date = toUtcMidnight(changes.date);

  const expense = await Expense.findByIdAndUpdate(req.params.id, changes, {
    new: true,
    runValidators: true,
  });

  if (!expense) throw ApiError.notFound('Expense not found');

  res.json({ data: toExpenseResponse(expense) });
};
```

- [ ] **Step 5: Create `server/src/features/expenses/expenses.routes.js`**

```js
import { Router } from 'express';

import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
  expenseIdParamsSchema,
} from './expenses.schema.js';
import * as expensesController from './expenses.controller.js';

export const expensesRouter = Router();

expensesRouter.use(requireAuth);

expensesRouter.get(
  '/',
  validate(listExpensesQuerySchema, 'query'),
  asyncHandler(expensesController.list),
);

expensesRouter.post('/', validate(createExpenseSchema), asyncHandler(expensesController.create));

expensesRouter.get(
  '/:id',
  validate(expenseIdParamsSchema, 'params'),
  asyncHandler(expensesController.get),
);

expensesRouter.patch(
  '/:id',
  validate(expenseIdParamsSchema, 'params'),
  validate(updateExpenseSchema),
  asyncHandler(expensesController.update),
);
```

- [ ] **Step 6: Mount it in `server/src/app.js`**

Add the import:

```js
import { expensesRouter } from './features/expenses/expenses.routes.js';
```

and the mount:

```js
  app.use('/api/expenses', expensesRouter);
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/api/expenses.test.js
```

Expected: PASS — `17 passed`.

- [ ] **Step 8: Commit**

```bash
git add server/src/features/expenses server/src/app.js server/tests/api/expenses.test.js
git commit -m "feat(server): add expense endpoints with month filtering and totals"
```

---

### Task 19: Dashboard summary API

SRS §7 lists a Dashboard but does not specify its contents. This gives it the numbers the other four modules already track, so it is a real landing page rather than a blank screen.

**Files:**
- Create: `server/src/features/dashboard/dashboard.controller.js`
- Create: `server/src/features/dashboard/dashboard.routes.js`
- Modify: `server/src/app.js`
- Test: `server/tests/api/dashboard.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/tests/api/dashboard.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createMember, createPackage, createExpense } from '../helpers/factories.js';
import { todayUtc, addDaysUtc, toIsoDate } from '../../src/lib/dates.js';

const app = createApp();
let header;

beforeEach(async () => {
  ({ header } = await authenticate());
});

describe('GET /api/dashboard/summary', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/api/dashboard/summary');
    expect(response.status).toBe(401);
  });

  it('counts members by status', async () => {
    const threeMonth = await createPackage({ durationMonths: 3 });

    await createMember({ package: threeMonth, durationMonths: 3, endDate: addDaysUtc(todayUtc(), 90) });
    await createMember({ package: threeMonth, durationMonths: 3, endDate: addDaysUtc(todayUtc(), 3) });
    await createMember({ package: threeMonth, durationMonths: 3, endDate: addDaysUtc(todayUtc(), -1) });
    await createMember({ package: threeMonth, durationMonths: 3, endDate: addDaysUtc(todayUtc(), -40) });

    const response = await request(app).get('/api/dashboard/summary').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.members).toEqual({
      total: 4,
      active: 1,
      expiringSoon: 1,
      expired: 2,
    });
  });

  it('totals this month expenses', async () => {
    const thisMonth = toIsoDate(todayUtc()).slice(0, 7);

    await createExpense({ date: new Date(`${thisMonth}-01T00:00:00.000Z`), amount: 1200 });
    await createExpense({ date: new Date(`${thisMonth}-02T00:00:00.000Z`), amount: 800 });
    await createExpense({ date: new Date('2000-01-15T00:00:00.000Z'), amount: 999999 });

    const response = await request(app).get('/api/dashboard/summary').set(header);

    expect(response.body.data.expenses).toEqual({ month: thisMonth, total: 2000, count: 2 });
  });

  it('totals revenue from memberships that started this month', async () => {
    const pkg = await createPackage({ durationMonths: 3, price: 4000 });

    await createMember({ package: pkg, durationMonths: 3, startDate: toIsoDate(todayUtc()) });
    await createMember({ package: pkg, durationMonths: 3, startDate: '2000-01-01' });

    const response = await request(app).get('/api/dashboard/summary').set(header);

    expect(response.body.data.revenue.monthToDate).toBe(4000);
  });

  it('returns the six most recent members for the activity panel', async () => {
    const pkg = await createPackage();
    for (let i = 0; i < 8; i += 1) {
      await createMember({ name: `Member ${i}`, package: pkg });
    }

    const response = await request(app).get('/api/dashboard/summary').set(header);

    expect(response.body.data.recentMembers).toHaveLength(6);
    expect(response.body.data.recentMembers[0].name).toBe('Member 7');
    expect(response.body.data.recentMembers[0].status).toBeDefined();
  });

  it('returns a six-month expense trend, oldest first, with zero-filled gaps', async () => {
    const response = await request(app).get('/api/dashboard/summary').set(header);

    const { expenseTrend } = response.body.data;
    expect(expenseTrend).toHaveLength(6);
    expect(expenseTrend.every((point) => /^\d{4}-\d{2}$/.test(point.month))).toBe(true);
    expect(expenseTrend.every((point) => typeof point.total === 'number')).toBe(true);
    expect(expenseTrend[5].month).toBe(toIsoDate(todayUtc()).slice(0, 7));
  });

  it('returns zeroes on an empty database rather than failing', async () => {
    const response = await request(app).get('/api/dashboard/summary').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.members).toEqual({
      total: 0,
      active: 0,
      expiringSoon: 0,
      expired: 0,
    });
    expect(response.body.data.expenses.total).toBe(0);
    expect(response.body.data.revenue.monthToDate).toBe(0);
    expect(response.body.data.recentMembers).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/api/dashboard.test.js
```

Expected: FAIL — `/api/dashboard/summary` 404s.

- [ ] **Step 3: Create `server/src/features/dashboard/dashboard.controller.js`**

```js
import { Member } from '../../models/Member.js';
import { Expense } from '../../models/Expense.js';
import { MEMBERSHIP_STATUS } from '../../lib/membership.js';
import { buildStatusFilter } from '../members/members.query.js';
import { toMemberListResponse } from '../members/members.serializer.js';
import { monthRangeUtc, todayUtc, toIsoDate, addMonthsUtc } from '../../lib/dates.js';

const RECENT_MEMBER_COUNT = 6;
const TREND_MONTHS = 6;

/** `YYYY-MM` for a date. */
const monthKey = (date) => toIsoDate(date).slice(0, 7);

/** The last `TREND_MONTHS` month keys, oldest first, ending with this month. */
const recentMonthKeys = (today) =>
  Array.from({ length: TREND_MONTHS }, (_, index) =>
    monthKey(addMonthsUtc(today, index - (TREND_MONTHS - 1))),
  );

const sumAmounts = (docs) => docs.reduce((total, doc) => total + doc.amount, 0);

export const summary = async (req, res) => {
  const today = todayUtc();
  const thisMonth = monthKey(today);
  const { start: monthStart, end: monthEnd } = monthRangeUtc(thisMonth);

  const [total, active, expiringSoon, expired] = await Promise.all([
    Member.countDocuments(),
    Member.countDocuments(buildStatusFilter(MEMBERSHIP_STATUS.ACTIVE, today)),
    Member.countDocuments(buildStatusFilter(MEMBERSHIP_STATUS.EXPIRING_SOON, today)),
    Member.countDocuments(buildStatusFilter(MEMBERSHIP_STATUS.EXPIRED, today)),
  ]);

  const [monthExpenses, monthMemberships, recentMembers, trendRows] = await Promise.all([
    Expense.find({ date: { $gte: monthStart, $lt: monthEnd } }),
    Member.find({ startDate: { $gte: monthStart, $lt: monthEnd } }).select('packagePrice'),
    Member.find().sort({ createdAt: -1 }).limit(RECENT_MEMBER_COUNT),
    Expense.aggregate([
      { $match: { date: { $gte: monthRangeUtc(recentMonthKeys(today)[0]).start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  // Zero-fill so the chart always draws six bars, including quiet months.
  const totalsByMonth = new Map(trendRows.map((row) => [row._id, row.total]));
  const expenseTrend = recentMonthKeys(today).map((month) => ({
    month,
    total: totalsByMonth.get(month) ?? 0,
  }));

  res.json({
    data: {
      members: { total, active, expiringSoon, expired },
      expenses: {
        month: thisMonth,
        total: sumAmounts(monthExpenses),
        count: monthExpenses.length,
      },
      revenue: {
        month: thisMonth,
        // Memberships SOLD this month. Historical renewals are not counted —
        // see the note under this task if the gym wants recognised revenue.
        monthToDate: monthMemberships.reduce((sum, m) => sum + m.packagePrice, 0),
      },
      recentMembers: toMemberListResponse(recentMembers, today),
      expenseTrend,
    },
  });
};
```

> **Revenue caveat worth telling the client:** `revenue.monthToDate` counts memberships whose **current** period started this month. A renewal moves the previous period into `history`, so it still counts — but a membership sold this month and renewed again in the same month would count once, not twice. If the gym needs true recognised revenue, that is a reporting feature with its own spec, not a dashboard tile.

- [ ] **Step 4: Create `server/src/features/dashboard/dashboard.routes.js`**

```js
import { Router } from 'express';

import { requireAuth } from '../../middleware/requireAuth.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import * as dashboardController from './dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get('/summary', asyncHandler(dashboardController.summary));
```

- [ ] **Step 5: Mount it in `server/src/app.js`**

Add the import:

```js
import { dashboardRouter } from './features/dashboard/dashboard.routes.js';
```

and the mount, replacing the remaining placeholder comment:

```js
  app.use('/api/dashboard', dashboardRouter);
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd server && npx vitest run tests/api/dashboard.test.js
```

Expected: PASS — `7 passed`.

- [ ] **Step 7: Run the whole server suite**

```bash
npm test --workspace server
```

Expected: PASS — every file green. This is the full API contract; do not start Phase 3 until it is.

- [ ] **Step 8: Commit**

```bash
git add server/src/features/dashboard server/src/app.js server/tests/api/dashboard.test.js
git commit -m "feat(server): add dashboard summary endpoint"
```

**Phase 2 complete.** The whole API contract exists and is tested. Everything from here is the interface.

---

# Phase 3 — Client foundation

Goal: a signed-in user lands on an app shell with working navigation and a theme toggle, and every protected route redirects an anonymous visitor to the login page.

---

### Task 20: Client workspace — Vite, React and Tailwind v4

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/vitest.config.js`
- Create: `client/index.html`
- Create: `client/jsconfig.json`
- Create: `client/.env`, `client/.env.example`
- Create: `client/src/main.jsx`, `client/src/App.jsx`, `client/src/index.css`
- Create: `client/src/test/setup.js`

- [ ] **Step 1: Create `client/package.json`**

```json
{
  "name": "client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-slot": "^1.1.1",
    "@tanstack/react-query": "^5.62.0",
    "axios": "^1.7.9",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^11.15.0",
    "lucide-react": "^0.469.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.2",
    "react-router-dom": "^7.1.1",
    "recharts": "^2.15.0",
    "sonner": "^1.7.1",
    "tailwind-merge": "^2.6.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "msw": "^2.7.0",
    "tailwindcss": "^4.0.0",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Install**

```bash
npm install --workspace client
```

Expected: completes without `ERR!`.

- [ ] **Step 3: Create `client/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Lets every import read `@/features/...` instead of '../../../features/...'
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: {
    port: 5173,
    // The client calls '/api/...' in both dev and production, so no base URL
    // juggling and no CORS surprises during development.
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
```

- [ ] **Step 4: Create `client/vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
});
```

- [ ] **Step 5: Create `client/jsconfig.json`**

Gives editors the same `@/` alias so autocomplete works.

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022"
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create `client/index.html`**

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark light" />
    <title>Gym Management</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `client/.env` and `client/.env.example`**

Both files, same contents — there is nothing secret in them:

```bash
VITE_API_URL=/api
```

- [ ] **Step 8: Create `client/src/test/setup.js`**

```js
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// Radix UI measures elements that jsdom does not implement.
beforeAll(() => {
  window.matchMedia ??= vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  Element.prototype.scrollIntoView ??= vi.fn();
  Element.prototype.hasPointerCapture ??= vi.fn();
  Element.prototype.releasePointerCapture ??= vi.fn();
});
```

- [ ] **Step 9: Create a minimal `client/src/index.css`, `App.jsx` and `main.jsx`**

Task 21 replaces `index.css` with the real design tokens. This is just enough to boot.

`client/src/index.css`:

```css
@import 'tailwindcss';
```

`client/src/App.jsx`:

```jsx
export default function App() {
  return <h1 className="p-8 text-2xl font-semibold">Gym Management</h1>;
}
```

`client/src/main.jsx`:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 10: Verify both apps run together**

```bash
npm run dev
```

Expected: the `api` stream prints `[db] connected` and `[api] listening on http://localhost:4000`; the `web` stream prints a Vite URL on port 5173. Open http://localhost:5173 and confirm the heading renders with Tailwind spacing applied.

Stop with `Ctrl+C`.

- [ ] **Step 11: Commit**

```bash
git add client package.json package-lock.json
git commit -m "feat(client): scaffold vite react workspace with tailwind v4"
```

---

### Task 21: Design tokens and shadcn/ui primitives

This is where "premium" is decided. The palette is defined once as CSS variables; every component reads them, so a brand change later is one file.

**Files:**
- Modify: `client/src/index.css`
- Create: `client/components.json`
- Create: `client/src/lib/utils.js`
- Create: `client/src/components/ui/*` (generated)

- [ ] **Step 1: Create `client/src/lib/utils.js`**

```js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names, letting a later Tailwind class win over an earlier one.
 *
 * `cn('p-2', 'p-4')` → 'p-4'. Plain template strings would keep both and let
 * CSS source order decide, which is how "why won't this override" happens.
 */
export const cn = (...inputs) => twMerge(clsx(inputs));
```

- [ ] **Step 2: Replace `client/src/index.css` with the design system**

```css
@import 'tailwindcss';

/* Dark mode is driven by a class on <html>, toggled by ThemeToggle (Task 23). */
@custom-variant dark (&:where(.dark, .dark *));

/*
 * Light theme. Every colour in the app comes from one of these tokens —
 * never a raw hex value in a component. Swapping the brand means editing
 * --primary here and in the .dark block, and nothing else.
 */
:root {
  --radius: 0.75rem;

  --background: oklch(0.99 0.002 250);
  --foreground: oklch(0.21 0.02 255);

  --card: oklch(1 0 0);
  --card-foreground: var(--foreground);

  --popover: oklch(1 0 0);
  --popover-foreground: var(--foreground);

  --primary: oklch(0.58 0.19 265);
  --primary-foreground: oklch(0.99 0.002 250);

  --secondary: oklch(0.96 0.008 255);
  --secondary-foreground: oklch(0.28 0.02 255);

  --muted: oklch(0.96 0.008 255);
  --muted-foreground: oklch(0.53 0.015 255);

  --accent: oklch(0.95 0.02 265);
  --accent-foreground: oklch(0.28 0.03 265);

  --destructive: oklch(0.58 0.21 25);
  --destructive-foreground: oklch(0.99 0.002 250);

  --success: oklch(0.62 0.16 155);
  --success-foreground: oklch(0.99 0.002 250);

  --warning: oklch(0.72 0.16 70);
  --warning-foreground: oklch(0.21 0.02 255);

  --border: oklch(0.91 0.01 255);
  --input: oklch(0.91 0.01 255);
  --ring: oklch(0.58 0.19 265);

  --chart-1: oklch(0.58 0.19 265);
  --chart-2: oklch(0.62 0.16 155);
  --chart-3: oklch(0.72 0.16 70);
  --chart-4: oklch(0.58 0.21 25);
  --chart-5: oklch(0.6 0.13 305);

  --sidebar: oklch(0.98 0.004 255);
  --sidebar-foreground: var(--foreground);
  --sidebar-border: oklch(0.91 0.01 255);
}

.dark {
  --background: oklch(0.17 0.015 260);
  --foreground: oklch(0.96 0.005 255);

  --card: oklch(0.21 0.018 260);
  --card-foreground: var(--foreground);

  --popover: oklch(0.21 0.018 260);
  --popover-foreground: var(--foreground);

  --primary: oklch(0.68 0.17 265);
  --primary-foreground: oklch(0.17 0.015 260);

  --secondary: oklch(0.27 0.02 260);
  --secondary-foreground: oklch(0.96 0.005 255);

  --muted: oklch(0.27 0.02 260);
  --muted-foreground: oklch(0.68 0.015 260);

  --accent: oklch(0.3 0.04 265);
  --accent-foreground: oklch(0.96 0.005 255);

  --destructive: oklch(0.65 0.2 25);
  --destructive-foreground: oklch(0.99 0.002 250);

  --success: oklch(0.7 0.15 155);
  --success-foreground: oklch(0.17 0.015 260);

  --warning: oklch(0.78 0.15 70);
  --warning-foreground: oklch(0.17 0.015 260);

  --border: oklch(0.3 0.02 260);
  --input: oklch(0.3 0.02 260);
  --ring: oklch(0.68 0.17 265);

  --chart-1: oklch(0.68 0.17 265);
  --chart-2: oklch(0.7 0.15 155);
  --chart-3: oklch(0.78 0.15 70);
  --chart-4: oklch(0.65 0.2 25);
  --chart-5: oklch(0.7 0.13 305);

  --sidebar: oklch(0.19 0.017 260);
  --sidebar-foreground: var(--foreground);
  --sidebar-border: oklch(0.28 0.02 260);
}

/* Exposes the tokens above as Tailwind utilities: bg-card, text-muted-foreground, … */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-border: var(--sidebar-border);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    border-color: var(--border);
  }

  body {
    background-color: var(--background);
    color: var(--foreground);
    font-feature-settings: 'rlig' 1, 'calt' 1;
    -webkit-font-smoothing: antialiased;
  }

  /* A visible, consistent focus ring everywhere — keyboard users included. */
  :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }

  /* Respect a reduced-motion preference: animation is polish, never function. */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
}

@layer utilities {
  /* The subtle depth that makes cards read as "premium" rather than flat boxes. */
  .elevated {
    box-shadow:
      0 1px 2px -1px rgb(0 0 0 / 0.08),
      0 4px 16px -4px rgb(0 0 0 / 0.08);
  }

  .dark .elevated {
    box-shadow:
      0 1px 2px -1px rgb(0 0 0 / 0.4),
      0 8px 24px -8px rgb(0 0 0 / 0.5);
  }
}
```

- [ ] **Step 3: Create `client/components.json`**

Tells the shadcn CLI where to put generated components.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": false,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 4: Generate the primitives**

Run from inside `client/`:

```bash
cd client && npx shadcn@latest add button input label select dialog sheet card table badge dropdown-menu skeleton separator avatar tabs sonner --yes --overwrite
```

Expected: files appear under `client/src/components/ui/`. Confirm:

```bash
ls client/src/components/ui/
```

Expected: `avatar.jsx  badge.jsx  button.jsx  card.jsx  dialog.jsx  dropdown-menu.jsx  input.jsx  label.jsx  select.jsx  separator.jsx  sheet.jsx  skeleton.jsx  sonner.jsx  table.jsx  tabs.jsx`

If the CLI cannot detect the setup, it will ask for the CSS file and alias — answer `src/index.css` and `@/components`, matching `components.json` above.

- [ ] **Step 5: Verify the theme renders in both modes**

Temporarily replace `client/src/App.jsx`:

```jsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function App() {
  return (
    <div className="min-h-screen bg-background p-10">
      <Card className="elevated max-w-sm">
        <CardHeader>
          <CardTitle>Theme check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Muted body copy.</p>
          <Button onClick={() => document.documentElement.classList.toggle('dark')}>
            Toggle theme
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

```bash
npm run dev:client
```

Open http://localhost:5173, click **Toggle theme**, and confirm both themes are legible — card, border, muted text and button all change. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add client/src/index.css client/components.json client/src/lib/utils.js client/src/components/ui client/src/App.jsx package-lock.json
git commit -m "feat(client): add design tokens and shadcn ui primitives"
```

---

### Task 22: API client, auth context and protected routes

**Files:**
- Create: `client/src/lib/api.js`
- Create: `client/src/features/auth/AuthContext.jsx`
- Create: `client/src/features/auth/useAuth.js`
- Create: `client/src/features/auth/ProtectedRoute.jsx`
- Create: `client/src/test/renderWithProviders.jsx`
- Modify: `client/src/main.jsx`, `client/src/App.jsx`
- Test: `client/src/features/auth/ProtectedRoute.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/features/auth/ProtectedRoute.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { ProtectedRoute } from './ProtectedRoute';
import { api, TOKEN_STORAGE_KEY } from '@/lib/api';

const Protected = () => <h1>Member list</h1>;
const Login = () => <h1>Sign in</h1>;

const renderApp = (initialPath) =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/members" element={<Protected />} />
      </Route>
    </Routes>,
    { initialEntries: [initialPath] },
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('redirects to the login page when there is no token', async () => {
    renderApp('/members');

    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(screen.queryByText('Member list')).not.toBeInTheDocument();
  });

  it('renders the protected page when the stored token is valid', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { user: { id: '1', name: 'Gym Admin', email: 'admin@gym.com' } },
    });

    renderApp('/members');

    expect(await screen.findByText('Member list')).toBeInTheDocument();
  });

  it('redirects and clears the token when the stored token is rejected', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'stale-token');
    vi.spyOn(api, 'get').mockRejectedValue({ response: { status: 401 } });

    renderApp('/members');

    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });

  it('shows a loading state while the session is being checked', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
    vi.spyOn(api, 'get').mockImplementation(() => new Promise(() => {}));

    renderApp('/members');

    expect(await screen.findByRole('status', { name: /checking/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/features/auth/ProtectedRoute.test.jsx
```

Expected: FAIL — cannot resolve `@/lib/api`.

- [ ] **Step 3: Create `client/src/lib/api.js`**

```js
import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'gym.auth.token';

export const getStoredToken = () => window.localStorage.getItem(TOKEN_STORAGE_KEY);
export const setStoredToken = (token) => window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
export const clearStoredToken = () => window.localStorage.removeItem(TOKEN_STORAGE_KEY);

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Read the token per request rather than at module load, so signing in takes
// effect immediately without a page reload.
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Turns any axios failure into a plain Error with a message worth showing.
 *
 * Every screen can then do `toast.error(getErrorMessage(error))` without
 * knowing anything about axios or the API envelope.
 */
export const getErrorMessage = (error) => {
  if (error?.response?.data?.error?.message) return error.response.data.error.message;
  if (error?.response?.status === 401) return 'Your session has expired. Please sign in again.';
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection.';
  return error?.message ?? 'Something went wrong';
};

/** Field-level messages from a 400, keyed by field name — `{}` when there are none. */
export const getFieldErrors = (error) => error?.response?.data?.error?.details ?? {};
```

- [ ] **Step 4: Create `client/src/features/auth/AuthContext.jsx`**

```jsx
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { api, getStoredToken, setStoredToken, clearStoredToken } from '@/lib/api';

export const AuthContext = createContext(null);

/**
 * Holds the signed-in user for the whole app.
 *
 * On mount it revalidates any stored token against `/auth/me`, so a token that
 * has expired or whose account was deleted fails on load rather than on the
 * first action the user takes.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    if (!getStoredToken()) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    api
      .get('/auth/me')
      .then(({ data }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        clearStoredToken();
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password });
    setStoredToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: Boolean(user), login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

- [ ] **Step 5: Create `client/src/features/auth/useAuth.js`**

```js
import { useContext } from 'react';
import { AuthContext } from './AuthContext.jsx';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }

  return context;
};
```

- [ ] **Step 6: Create `client/src/features/auth/ProtectedRoute.jsx`**

```jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from './useAuth';

/**
 * Gate for every authenticated route (SRS §6.4).
 *
 * Remembers where the user was heading so they land there after signing in,
 * instead of always being dumped on the dashboard.
 */
export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Checking your session"
        className="flex min-h-screen items-center justify-center bg-background"
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
```

- [ ] **Step 7: Create `client/src/test/renderWithProviders.jsx`**

```jsx
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/features/auth/AuthContext.jsx';

/**
 * Renders a component inside the same providers the real app uses.
 *
 * Retries are off so a deliberately-failing request fails immediately rather
 * than making the test wait through three attempts.
 */
export const renderWithProviders = (ui, { initialEntries = ['/'] } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <AuthProvider>{ui}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
};
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd client && npx vitest run src/features/auth/ProtectedRoute.test.jsx
```

Expected: PASS — `4 passed`.

- [ ] **Step 9: Wire the providers in `client/src/main.jsx`**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App.jsx';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import { Toaster } from './components/ui/sonner.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Fresh enough for a back-office tool; avoids a refetch on every focus.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster richColors closeButton position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 10: Commit**

```bash
git add client/src/lib/api.js client/src/features/auth client/src/test client/src/main.jsx
git commit -m "feat(client): add api client, auth context and protected routing"
```

---

### Task 23: App shell — sidebar, topbar and theme toggle

The navigation from SRS §7, with the animated active indicator that carries most of the "premium" feel.

**Files:**
- Create: `client/src/lib/constants.js`
- Create: `client/src/components/layout/ThemeToggle.jsx`
- Create: `client/src/components/layout/Sidebar.jsx`
- Create: `client/src/components/layout/Topbar.jsx`
- Create: `client/src/components/layout/AppShell.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/components/layout/AppShell.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/components/layout/AppShell.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { AppShell } from './AppShell';
import { api, TOKEN_STORAGE_KEY } from '@/lib/api';

const renderShell = (path = '/members') =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<h1>Sign in</h1>} />
      <Route element={<AppShell />}>
        <Route path="/members" element={<h1>Members</h1>} />
        <Route path="/expenses" element={<h1>Expenses</h1>} />
      </Route>
    </Routes>,
    { initialEntries: [path] },
  );

beforeEach(() => {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { user: { id: '1', name: 'Gym Admin', email: 'admin@gym.com', role: 'admin' } },
  });
});

describe('AppShell', () => {
  it('renders every navigation destination from SRS §7', async () => {
    renderShell();
    const nav = await screen.findByRole('navigation', { name: /main/i });

    for (const label of [
      'Dashboard',
      'Members',
      'Expiry',
      'Action Required',
      'Expenses',
      'Settings',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }

    expect(nav).toBeInTheDocument();
  });

  it('marks the current page as the active link', async () => {
    renderShell('/members');

    const membersLink = await screen.findByRole('link', { name: 'Members' });
    expect(membersLink).toHaveAttribute('aria-current', 'page');

    expect(screen.getByRole('link', { name: 'Expenses' })).not.toHaveAttribute('aria-current');
  });

  it('renders the page content in the outlet', async () => {
    renderShell('/expenses');
    expect(await screen.findByRole('heading', { name: 'Expenses' })).toBeInTheDocument();
  });

  it('shows the signed-in user', async () => {
    renderShell();
    expect(await screen.findByText('Gym Admin')).toBeInTheDocument();
  });

  it('signs the user out and returns them to the login page', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(await screen.findByRole('button', { name: /account menu/i }));
    await user.click(await screen.findByRole('menuitem', { name: /sign out/i }));

    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('toggles the theme and remembers the choice', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(await screen.findByRole('button', { name: /switch to light theme/i }));

    expect(document.documentElement).not.toHaveClass('dark');
    expect(window.localStorage.getItem('gym.theme')).toBe('light');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/components/layout/AppShell.test.jsx
```

Expected: FAIL — cannot resolve `./AppShell`.

- [ ] **Step 3: Create `client/src/lib/constants.js`**

```js
import {
  LayoutDashboard,
  Users,
  CalendarX2,
  BellRing,
  Receipt,
  Settings,
} from 'lucide-react';

/** The navigation structure from SRS §7. One list drives the whole sidebar. */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/expiry', label: 'Expiry', icon: CalendarX2 },
  { to: '/action-required', label: 'Action Required', icon: BellRing },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/** Presentation for each membership status returned by the API. */
export const STATUS_META = {
  active: { label: 'Active', className: 'bg-success/15 text-success border-success/30' },
  'expiring-soon': {
    label: 'Expiring soon',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  expired: {
    label: 'Expired',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
};

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const THEME_STORAGE_KEY = 'gym.theme';
```

- [ ] **Step 4: Create `client/src/components/layout/ThemeToggle.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { THEME_STORAGE_KEY } from '@/lib/constants';

const readInitialTheme = () =>
  window.localStorage.getItem(THEME_STORAGE_KEY) ??
  (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

export const ThemeToggle = () => {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
};
```

- [ ] **Step 5: Create `client/src/components/layout/Sidebar.jsx`**

```jsx
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';

import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/lib/constants';

/**
 * Primary navigation.
 *
 * The active indicator is a single shared element with a `layoutId`, so
 * Framer Motion slides it between items instead of cross-fading two
 * backgrounds — that continuity is what reads as polish.
 */
export const Sidebar = ({ onNavigate }) => (
  <div className="flex h-full flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4">
    <div className="flex items-center gap-2.5 px-2 pt-2">
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Dumbbell className="size-5" />
      </span>
      <span className="text-base font-semibold tracking-tight">Gym Manager</span>
    </div>

    <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-primary"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <Icon className="relative size-4 shrink-0" />
              <span className="relative">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  </div>
);
```

> **Do not pass `aria-current` to `NavLink` yourself.** React Router sets `aria-current="page"` on the active link automatically; passing your own value overrides it and breaks both the accessibility affordance and the second test.

- [ ] **Step 6: Create `client/src/components/layout/Topbar.jsx`**

```jsx
import { LogOut, Menu, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/features/auth/useAuth';

export const Topbar = ({ onOpenNav }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open navigation"
        onClick={onOpenNav}
      >
        <Menu className="size-5" />
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2" aria-label="Account menu">
              <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground">
                <User className="size-4" />
              </span>
              <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout}>
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
```

- [ ] **Step 7: Create `client/src/components/layout/AppShell.jsx`**

```jsx
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * The frame every authenticated page renders inside.
 *
 * The sidebar is fixed on desktop and a slide-over sheet on mobile, so the
 * same navigation works at both sizes without a second implementation.
 */
export const AppShell = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 md:block">
        <Sidebar />
      </aside>

      <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setIsNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="md:pl-64">
        <Topbar onOpenNav={() => setIsNavOpen(true)} />

        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
          {/* Keyed on pathname so each page fades in on navigation. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd client && npx vitest run src/components/layout/AppShell.test.jsx
```

Expected: PASS — `6 passed`.

- [ ] **Step 9: Commit**

```bash
git add client/src/lib/constants.js client/src/components/layout
git commit -m "feat(client): add app shell with animated sidebar, topbar and theme toggle"
```

---

### Task 24: Shared UI kit

Five screens show a table of records with a title, an action button, a loading state and an empty state. Building those pieces once here is what keeps Phase 4 short.

**Files:**
- Create: `client/src/lib/format.js`
- Create: `client/src/components/shared/PageHeader.jsx`
- Create: `client/src/components/shared/StatusBadge.jsx`
- Create: `client/src/components/shared/EmptyState.jsx`
- Create: `client/src/components/shared/TableSkeleton.jsx`
- Create: `client/src/components/shared/DataTable.jsx`
- Create: `client/src/components/shared/StatCard.jsx`
- Create: `client/src/components/shared/ConfirmDialog.jsx`
- Test: `client/src/components/shared/DataTable.test.jsx`
- Test: `client/src/lib/format.test.js`

- [ ] **Step 1: Write the failing formatting test**

Create `client/src/lib/format.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDaysRemaining } from './format';

describe('formatCurrency', () => {
  it('formats whole rupees with no decimal noise', () => {
    expect(formatCurrency(4000)).toBe('₹4,000');
    expect(formatCurrency(1500)).toBe('₹1,500');
    expect(formatCurrency(0)).toBe('₹0');
  });

  it('renders a dash for a missing value instead of NaN', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
  });
});

describe('formatDate', () => {
  it('formats an API date string for display', () => {
    expect(formatDate('2026-03-15')).toBe('15 Mar 2026');
  });

  it('renders a dash for a missing value', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
  });
});

describe('formatDaysRemaining', () => {
  it('describes an active membership', () => {
    expect(formatDaysRemaining(12)).toBe('12 days left');
    expect(formatDaysRemaining(1)).toBe('1 day left');
  });

  it('describes the final day', () => {
    expect(formatDaysRemaining(0)).toBe('Expires today');
  });

  it('describes an expired membership', () => {
    expect(formatDaysRemaining(-1)).toBe('Expired 1 day ago');
    expect(formatDaysRemaining(-14)).toBe('Expired 14 days ago');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/lib/format.test.js
```

Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 3: Create `client/src/lib/format.js`**

```js
import { format, parseISO } from 'date-fns';

const EMPTY = '—';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Whole rupees. Change the locale and currency here to relocalise the app. */
export const formatCurrency = (amount) =>
  amount === null || amount === undefined || Number.isNaN(Number(amount))
    ? EMPTY
    : currencyFormatter.format(amount);

/** API dates arrive as `YYYY-MM-DD`; display them unambiguously. */
export const formatDate = (value) => {
  if (!value) return EMPTY;
  return format(typeof value === 'string' ? parseISO(value) : value, 'd MMM yyyy');
};

/** Human phrasing for the number the API already computed. */
export const formatDaysRemaining = (days) => {
  if (days === null || days === undefined) return EMPTY;
  if (days === 0) return 'Expires today';
  if (days < 0) {
    const elapsed = Math.abs(days);
    return `Expired ${elapsed} ${elapsed === 1 ? 'day' : 'days'} ago`;
  }
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
};

export const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd client && npx vitest run src/lib/format.test.js
```

Expected: PASS — `7 passed`.

- [ ] **Step 5: Write the failing DataTable test**

Create `client/src/components/shared/DataTable.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DataTable } from './DataTable';

const columns = [
  { key: 'srNo', header: 'Sr. No.', cell: (row, index) => index + 1 },
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'package', header: 'Package', cell: (row) => row.packageName },
];

const rows = [
  { id: '1', name: 'Priya Sharma', packageName: '3 Months' },
  { id: '2', name: 'Rahul Verma', packageName: '1 Month' },
];

describe('DataTable', () => {
  it('renders a header cell per column', () => {
    render(<DataTable columns={columns} rows={rows} />);

    expect(screen.getByRole('columnheader', { name: 'Sr. No.' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Package' })).toBeInTheDocument();
  });

  it('renders a row per record with a 1-based serial number', () => {
    render(<DataTable columns={columns} rows={rows} />);

    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('Rahul Verma')).toBeInTheDocument();
    // 2 data rows + 1 header row
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('offsets the serial number by the current page', () => {
    render(<DataTable columns={columns} rows={rows} startIndex={20} />);

    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
  });

  it('shows the skeleton while loading, not the empty state', () => {
    render(<DataTable columns={columns} rows={[]} isLoading emptyState={<p>No members</p>} />);

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText('No members')).not.toBeInTheDocument();
  });

  it('shows the empty state when there is nothing to display', () => {
    render(<DataTable columns={columns} rows={[]} emptyState={<p>No members</p>} />);

    expect(screen.getByText('No members')).toBeInTheDocument();
  });

  it('calls onRowClick with the record', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();

    render(<DataTable columns={columns} rows={rows} onRowClick={onRowClick} />);
    await user.click(screen.getByText('Priya Sharma'));

    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('paginates when given pagination and a handler', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DataTable
        columns={columns}
        rows={rows}
        pagination={{ page: 2, limit: 10, total: 25, totalPages: 3 }}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole('button', { name: /previous page/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('disables previous on the first page and next on the last', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        pagination={{ page: 1, limit: 10, total: 5, totalPages: 1 }}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
cd client && npx vitest run src/components/shared/DataTable.test.jsx
```

Expected: FAIL — cannot resolve `./DataTable`.

- [ ] **Step 7: Create `client/src/components/shared/TableSkeleton.jsx`**

```jsx
import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder rows that keep the layout stable while data loads. */
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div role="status" aria-label="Loading records" className="space-y-3 p-4">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4">
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <Skeleton key={columnIndex} className="h-5 flex-1" />
        ))}
      </div>
    ))}
  </div>
);
```

- [ ] **Step 8: Create `client/src/components/shared/DataTable.jsx`**

```jsx
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from './TableSkeleton';
import { cn } from '@/lib/utils';

/**
 * The one table used by every listing screen.
 *
 * @param {object} props
 * @param {{key: string, header: string, cell: (row, index) => React.ReactNode, className?: string}[]} props.columns
 * @param {object[]} props.rows
 * @param {boolean} [props.isLoading]
 * @param {React.ReactNode} [props.emptyState] Shown only when not loading and there are no rows
 * @param {number} [props.startIndex] Row offset, so serial numbers continue across pages
 * @param {(row) => void} [props.onRowClick]
 * @param {{page:number,limit:number,total:number,totalPages:number}} [props.pagination]
 * @param {(page:number) => void} [props.onPageChange]
 */
export const DataTable = ({
  columns,
  rows,
  isLoading = false,
  emptyState = null,
  startIndex = 0,
  onRowClick,
  pagination,
  onPageChange,
}) => {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card elevated">
        <TableSkeleton columns={columns.length} />
      </div>
    );
  }

  if (rows.length === 0 && emptyState) {
    return <div className="rounded-xl border bg-card elevated">{emptyState}</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card elevated">
      {/* Horizontal scroll lives here so the page body never scrolls sideways. */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn('whitespace-nowrap text-xs uppercase tracking-wide', column.className)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row, index) => (
              <motion.tr
                key={row.id ?? index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.2) }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b transition-colors last:border-0 hover:bg-muted/50',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn('py-3', column.className)}>
                    {column.cell(row, startIndex + index)}
                  </TableCell>
                ))}
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} record
            {pagination.total === 1 ? '' : 's'}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Next page"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 9: Run the test to verify it passes**

```bash
cd client && npx vitest run src/components/shared/DataTable.test.jsx
```

Expected: PASS — `8 passed`.

- [ ] **Step 10: Create the remaining shared components**

`client/src/components/shared/PageHeader.jsx`:

```jsx
export const PageHeader = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
```

`client/src/components/shared/StatusBadge.jsx`:

```jsx
import { Badge } from '@/components/ui/badge';
import { STATUS_META } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** Renders the status the API computed. Never derives it from dates. */
export const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status];
  if (!meta) return null;

  return (
    <Badge variant="outline" className={cn('font-medium', meta.className)}>
      {meta.label}
    </Badge>
  );
};
```

`client/src/components/shared/EmptyState.jsx`:

```jsx
import { Inbox } from 'lucide-react';

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }) => (
  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
    <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
      <Icon className="size-6" />
    </span>
    <div className="space-y-1">
      <p className="font-medium">{title}</p>
      {description && (
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    {action}
  </div>
);
```

`client/src/components/shared/StatCard.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Counts from 0 to `value` — the small flourish that makes a dashboard feel alive. */
const useCountUp = (value, durationMs = 700) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (typeof value !== 'number') return undefined;

    const prefersReducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) {
      setDisplay(value);
      return undefined;
    }

    let frame;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / durationMs, 1);
      // Ease-out cubic: fast start, gentle settle.
      setDisplay(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return display;
};

export const StatCard = ({ label, value, icon: Icon, tone = 'default', format, delay = 0 }) => {
  const counted = useCountUp(typeof value === 'number' ? value : 0);
  const shown = format ? format(counted) : counted;

  const tones = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="elevated">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{shown}</p>
          </div>
          {Icon && (
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', tones[tone])}>
              <Icon className="size-5" />
            </span>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
```

`client/src/components/shared/ConfirmDialog.jsx`:

```jsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  isPending = false,
  onConfirm,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isPending}>
          {isPending ? 'Working…' : confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
```

- [ ] **Step 11: Run the client suite**

```bash
npm test --workspace client
```

Expected: PASS — all files green.

- [ ] **Step 12: Commit**

```bash
git add client/src/lib/format.js client/src/lib/format.test.js client/src/components/shared
git commit -m "feat(client): add shared ui kit — table, stat card, badges and empty states"
```

**Phase 3 complete.**

---

# Phase 4 — Screens

Every screen in SRS §7, wired to the Phase 2 API. Each task follows the same shape: a data hook, the screen, a test.

---

### Task 25: Login page

**Files:**
- Create: `client/src/components/shared/FormField.jsx`
- Create: `client/src/features/auth/LoginPage.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/features/auth/LoginPage.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/features/auth/LoginPage.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { LoginPage } from './LoginPage';
import { api, TOKEN_STORAGE_KEY } from '@/lib/api';

const renderLogin = () =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<h1>Dashboard</h1>} />
      <Route path="/forgot-password" element={<h1>Forgot password</h1>} />
    </Routes>,
    { initialEntries: ['/login'] },
  );

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('LoginPage', () => {
  it('renders the fields from SRS §1.2', () => {
    renderLogin();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('validates before calling the API', async () => {
    const post = vi.spyOn(api, 'post');
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('signs in and redirects to the dashboard', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { token: 'jwt-token', user: { id: '1', name: 'Gym Admin', email: 'admin@gym.com' } },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'admin@gym.com');
    await user.type(screen.getByLabelText(/password/i), 'Admin@123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('jwt-token');
    });
  });

  it('shows the server message when credentials are rejected', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 401, data: { error: { message: 'Invalid email or password' } } },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'admin@gym.com');
    await user.type(screen.getByLabelText(/password/i), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('disables the button while signing in', async () => {
    vi.spyOn(api, 'post').mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'admin@gym.com');
    await user.type(screen.getByLabelText(/password/i), 'Admin@123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/features/auth/LoginPage.test.jsx
```

Expected: FAIL — cannot resolve `./LoginPage`.

- [ ] **Step 3: Create `client/src/components/shared/FormField.jsx`**

```jsx
import { useId } from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Label + control + error message, wired together for screen readers.
 *
 * `children` is a render prop receiving the generated id and aria props, so
 * it works with an Input, a Select, a textarea — anything.
 */
export const FormField = ({ label, error, hint, required, className, children }) => {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>

      {children({
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': error ? errorId : undefined,
      })}

      {error ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Create `client/src/features/auth/LoginPage.jsx`**

```jsx
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Dumbbell, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { useAuth } from './useAuth';
import { getErrorMessage } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      await login(values);
      // Return them to wherever ProtectedRoute intercepted them.
      navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      {/* Soft radial wash — depth without a heavy background image. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--color-primary)/12%,transparent)]"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <Card className="elevated">
          <CardHeader className="space-y-3 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Dumbbell className="size-6" />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to manage your gym</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {formError && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {formError}
                </p>
              )}

              <FormField label="Email" required error={errors.email?.message}>
                {(field) => (
                  <Input
                    {...field}
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="admin@gym.com"
                  />
                )}
              </FormField>

              <FormField label="Password" required error={errors.password?.message}>
                {(field) => (
                  <Input
                    {...field}
                    {...register('password')}
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                )}
              </FormField>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>

              <p className="text-center text-sm">
                <Link
                  to="/forgot-password"
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
```

> **`{...field}` before `{...register(...)}` matters.** `register` returns the `ref`, `name`, `onChange` and `onBlur` React Hook Form needs; spreading it last keeps those from being overwritten by the FormField props.

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd client && npx vitest run src/features/auth/LoginPage.test.jsx
```

Expected: PASS — `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/shared/FormField.jsx client/src/features/auth/LoginPage.jsx client/src/features/auth/LoginPage.test.jsx
git commit -m "feat(client): add login page"
```

---

### Task 26: Forgot password, reset password, and the route table

**Files:**
- Create: `client/src/features/auth/ForgotPasswordPage.jsx`
- Create: `client/src/features/auth/ResetPasswordPage.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/features/auth/ResetPasswordPage.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/features/auth/ResetPasswordPage.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { ResetPasswordPage } from './ResetPasswordPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { api } from '@/lib/api';

const renderReset = (search = '?token=reset-token') =>
  renderWithProviders(
    <Routes>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/login" element={<h1>Sign in</h1>} />
    </Routes>,
    { initialEntries: [`/reset-password${search}`] },
  );

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ForgotPasswordPage', () => {
  it('confirms the request without revealing whether the email exists', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { message: 'If that email is registered, a password reset link has been sent.' },
    });
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>,
      { initialEntries: ['/forgot-password'] },
    );

    await user.type(screen.getByLabelText(/email/i), 'admin@gym.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/if that email is registered/i);
  });
});

describe('ResetPasswordPage', () => {
  it('enforces the password policy before calling the API', async () => {
    const post = vi.spyOn(api, 'post');
    const user = userEvent.setup();
    renderReset();

    await user.type(screen.getByLabelText(/^new password/i), 'short');
    await user.type(screen.getByLabelText(/confirm/i), 'short');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects a mismatched confirmation', async () => {
    const user = userEvent.setup();
    renderReset();

    await user.type(screen.getByLabelText(/^new password/i), 'BrandNew1');
    await user.type(screen.getByLabelText(/confirm/i), 'Different1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
  });

  it('submits the token from the URL and sends the user to sign in', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { message: 'Updated' } });
    const user = userEvent.setup();
    renderReset();

    await user.type(screen.getByLabelText(/^new password/i), 'BrandNew1');
    await user.type(screen.getByLabelText(/confirm/i), 'BrandNew1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(post).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'reset-token',
      password: 'BrandNew1',
      confirmPassword: 'BrandNew1',
    });
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('explains a missing token instead of showing an unusable form', () => {
    renderReset('');

    expect(screen.getByRole('alert')).toHaveTextContent(/reset link is invalid/i);
    expect(screen.queryByLabelText(/^new password/i)).not.toBeInTheDocument();
  });

  it('surfaces an expired-token error from the server', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { data: { error: { message: 'This reset link is invalid or has expired' } } },
    });
    const user = userEvent.setup();
    renderReset();

    await user.type(screen.getByLabelText(/^new password/i), 'BrandNew1');
    await user.type(screen.getByLabelText(/confirm/i), 'BrandNew1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/features/auth/ResetPasswordPage.test.jsx
```

Expected: FAIL — cannot resolve `./ResetPasswordPage`.

- [ ] **Step 3: Create `client/src/features/auth/ForgotPasswordPage.jsx`**

```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { api, getErrorMessage } from '@/lib/api';

const schema = z.object({ email: z.string().email('Enter a valid email address') });

export const ForgotPasswordPage = () => {
  const [confirmation, setConfirmation] = useState(null);
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const { data } = await api.post('/auth/forgot-password', values);
      setConfirmation(data.message);

      // In development the API returns the link directly, so the flow can be
      // completed without an email provider configured.
      if (data.resetUrl) console.info('[dev] reset link:', data.resetUrl);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="elevated w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your registered email and we will send you a reset link.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {confirmation ? (
            <div
              role="status"
              className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 px-3 py-3 text-sm text-success"
            >
              <MailCheck className="mt-0.5 size-4 shrink-0" />
              <p>{confirmation}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}

              <FormField label="Email" required error={errors.email?.message}>
                {(field) => (
                  <Input {...field} {...register('email')} type="email" autoComplete="email" />
                )}
              </FormField>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 4: Create `client/src/features/auth/ResetPasswordPage.jsx`**

```jsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { api, getErrorMessage } from '@/lib/api';

/** Mirrors the server policy in `server/src/lib/password.js` (decision D2). */
const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine(
        (value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value),
        'Password must contain at least one letter and one number',
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      await api.post('/auth/reset-password', { token, ...values });
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="elevated w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            Must be at least 8 characters and include a letter and a number.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!token ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive"
            >
              This reset link is invalid. Request a new one from the Forgot password page.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}

              <FormField label="New password" required error={errors.password?.message}>
                {(field) => (
                  <Input
                    {...field}
                    {...register('password')}
                    type="password"
                    autoComplete="new-password"
                  />
                )}
              </FormField>

              <FormField
                label="Confirm new password"
                required
                error={errors.confirmPassword?.message}
              >
                {(field) => (
                  <Input
                    {...field}
                    {...register('confirmPassword')}
                    type="password"
                    autoComplete="new-password"
                  />
                )}
              </FormField>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Update password
              </Button>
            </form>
          )}

          <Link
            to="/login"
            className="block text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 5: Create the route table in `client/src/App.jsx`**

Replace the whole file. Each later task adds one line here.

```jsx
import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Everything below requires a session (SRS §6.4) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          {/* Task 27 adds /dashboard */}
          {/* Task 28 adds /members */}
          {/* Task 30 adds /members/:id */}
          {/* Task 31 adds /expiry */}
          {/* Task 32 adds /action-required */}
          {/* Task 33 adds /expenses */}
          {/* Task 34 adds /settings */}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd client && npx vitest run src/features/auth/ResetPasswordPage.test.jsx
```

Expected: PASS — `6 passed`.

- [ ] **Step 7: Verify the whole reset flow against the real API**

```bash
npm run dev
```

1. Open http://localhost:5173 — you are redirected to `/login`.
2. Sign in with `admin@gym.com` / `Admin@123`. You reach `/dashboard` (blank for now — Task 27).
3. Sign out, click **Forgot password?**, submit `admin@gym.com`.
4. Copy the reset link the `api` terminal logged, open it, set a new password, and sign in with it.
5. Re-seed your own password back if you want: change it again through the same flow.

- [ ] **Step 8: Commit**

```bash
git add client/src/features/auth client/src/App.jsx
git commit -m "feat(client): add forgot-password and reset-password pages with route table"
```

---

### Task 27: Dashboard page

**Files:**
- Create: `client/src/features/dashboard/useDashboard.js`
- Create: `client/src/features/dashboard/DashboardPage.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/features/dashboard/DashboardPage.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/features/dashboard/DashboardPage.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { DashboardPage } from './DashboardPage';
import { api } from '@/lib/api';

const summary = {
  members: { total: 128, active: 96, expiringSoon: 12, expired: 20 },
  expenses: { month: '2026-03', total: 24500, count: 7 },
  revenue: { month: '2026-03', monthToDate: 86000 },
  recentMembers: [
    {
      id: '1',
      name: 'Priya Sharma',
      packageName: '3 Months',
      endDate: '2026-06-30',
      status: 'active',
      daysRemaining: 107,
    },
  ],
  expenseTrend: [
    { month: '2025-10', total: 1000 },
    { month: '2025-11', total: 2000 },
    { month: '2025-12', total: 1500 },
    { month: '2026-01', total: 3000 },
    { month: '2026-02', total: 2500 },
    { month: '2026-03', total: 24500 },
  ],
};

const renderDashboard = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/action-required" element={<h1>Action Required</h1>} />
    </Routes>,
  );

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('DashboardPage', () => {
  it('shows skeletons while loading', () => {
    vi.spyOn(api, 'get').mockImplementation(() => new Promise(() => {}));
    renderDashboard();

    expect(screen.getAllByRole('status', { name: /loading/i }).length).toBeGreaterThan(0);
  });

  it('renders a tile per member status', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: summary } });
    renderDashboard();

    expect(await screen.findByText('Total members')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Expiring soon')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows the month expense and revenue totals as currency', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: summary } });
    renderDashboard();

    expect(await screen.findByText('₹24,500')).toBeInTheDocument();
    expect(screen.getByText('₹86,000')).toBeInTheDocument();
  });

  it('lists the recent members', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: summary } });
    renderDashboard();

    expect(await screen.findByText('Priya Sharma')).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({ code: 'ERR_NETWORK' });
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the server/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/features/dashboard/DashboardPage.test.jsx
```

Expected: FAIL — cannot resolve `./DashboardPage`.

- [ ] **Step 3: Create `client/src/features/dashboard/useDashboard.js`**

```js
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const dashboardKeys = { summary: ['dashboard', 'summary'] };

export const useDashboardSummary = () =>
  useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: async () => {
      const { data } = await api.get('/dashboard/summary');
      return data.data;
    },
  });
```

- [ ] **Step 4: Create `client/src/features/dashboard/DashboardPage.jsx`**

```jsx
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BellRing, CalendarX2, Receipt, TrendingUp, UserCheck, Users } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDashboardSummary } from './useDashboard';
import { formatCurrency, formatDate, initialsOf } from '@/lib/format';
import { getErrorMessage } from '@/lib/api';

const LoadingTiles = () => (
  <div role="status" aria-label="Loading dashboard" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <Skeleton key={index} className="h-[104px] rounded-xl" />
    ))}
  </div>
);

export const DashboardPage = () => {
  const { data, isLoading, isError, error } = useDashboardSummary();

  if (isError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {getErrorMessage(error)}
        </p>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <LoadingTiles />
      </>
    );
  }

  const { members, expenses, revenue, recentMembers, expenseTrend } = data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Today's snapshot of memberships and spending."
        actions={
          members.expiringSoon > 0 && (
            <Button asChild variant="outline">
              <Link to="/action-required">
                <BellRing className="mr-2 size-4" />
                {members.expiringSoon} need follow-up
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total members" value={members.total} icon={Users} delay={0} />
        <StatCard
          label="Active"
          value={members.active}
          icon={UserCheck}
          tone="success"
          delay={0.05}
        />
        <StatCard
          label="Expiring soon"
          value={members.expiringSoon}
          icon={BellRing}
          tone="warning"
          delay={0.1}
        />
        <StatCard
          label="Expired"
          value={members.expired}
          icon={CalendarX2}
          tone="destructive"
          delay={0.15}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          label={`Revenue this month`}
          value={revenue.monthToDate}
          icon={TrendingUp}
          tone="success"
          format={formatCurrency}
          delay={0.2}
        />
        <StatCard
          label={`Expenses this month (${expenses.count})`}
          value={expenses.total}
          icon={Receipt}
          format={formatCurrency}
          delay={0.25}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="elevated lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Expenses, last 6 months</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseTrend} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-muted-foreground)"
                  tickFormatter={(month) => month.slice(5)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-muted-foreground)"
                  width={64}
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  cursor={{ fill: 'var(--color-muted)' }}
                  contentStyle={{
                    background: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-popover-foreground)',
                  }}
                  formatter={(value) => [formatCurrency(value), 'Total']}
                />
                <Bar dataKey="total" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="elevated lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recently added</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentMembers.length === 0 ? (
              <EmptyState icon={Users} title="No members yet" description="Add your first member to see them here." />
            ) : (
              <ul className="divide-y">
                {recentMembers.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 px-6 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {initialsOf(member.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.packageName} · until {formatDate(member.endDate)}
                      </p>
                    </div>
                    <StatusBadge status={member.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};
```

- [ ] **Step 5: Add the route in `client/src/App.jsx`**

Add the import and replace the `{/* Task 27 adds /dashboard */}` comment:

```jsx
import { DashboardPage } from '@/features/dashboard/DashboardPage';
```

```jsx
          <Route path="/dashboard" element={<DashboardPage />} />
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd client && npx vitest run src/features/dashboard/DashboardPage.test.jsx
```

Expected: PASS — `5 passed`.

- [ ] **Step 7: Commit**

```bash
git add client/src/features/dashboard client/src/App.jsx
git commit -m "feat(client): add dashboard with stat tiles, expense trend and recent members"
```

---

### Task 28: Members listing page

Implements SRS §2.1 — title, Add New Member button, and the exact table columns from the spec.

**Files:**
- Create: `client/src/features/members/useMembers.js`
- Create: `client/src/features/members/memberColumns.jsx`
- Create: `client/src/features/members/MembersPage.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/features/members/MembersPage.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/features/members/MembersPage.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { MembersPage } from './MembersPage';
import { api } from '@/lib/api';

const member = (overrides = {}) => ({
  id: '1',
  name: 'Priya Sharma',
  phone: '9811111111',
  email: 'priya@example.com',
  gender: 'female',
  packageName: '3 Months',
  packagePrice: 4000,
  durationMonths: 3,
  startDate: '2026-01-10',
  endDate: '2026-04-09',
  status: 'active',
  daysRemaining: 25,
  ...overrides,
});

const listResponse = (data = [member()]) => ({
  data: { data, pagination: { page: 1, limit: 20, total: data.length, totalPages: 1 } },
});

const renderMembers = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<MembersPage />} />
      <Route path="/members/:id" element={<h1>Member detail</h1>} />
    </Routes>,
  );

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockImplementation((url) => {
    if (url.startsWith('/packages')) {
      return Promise.resolve({
        data: { data: [{ id: 'p1', name: '3 Months', durationMonths: 3, price: 4000 }] },
      });
    }
    return Promise.resolve(listResponse());
  });
});

describe('MembersPage', () => {
  it('renders the title and Add New Member button (SRS §2.1)', async () => {
    renderMembers();

    expect(await screen.findByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add new member/i })).toBeInTheDocument();
  });

  it('renders exactly the columns the SRS specifies', async () => {
    renderMembers();

    for (const header of ['Sr. No.', 'Name', 'Package', 'Start Date', 'End Date', 'Action']) {
      expect(await screen.findByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  it('renders a member row with formatted dates', async () => {
    renderMembers();

    expect(await screen.findByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('10 Jan 2026')).toBeInTheDocument();
    expect(screen.getByText('9 Apr 2026')).toBeInTheDocument();
  });

  it('debounces the search into the request', async () => {
    const user = userEvent.setup();
    renderMembers();

    await screen.findByText('Priya Sharma');
    await user.type(screen.getByRole('searchbox', { name: /search members/i }), 'priya');

    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=priya'));
      },
      { timeout: 2000 },
    );
  });

  it('navigates to the member detail page from the View action', async () => {
    const user = userEvent.setup();
    renderMembers();

    await user.click(await screen.findByRole('button', { name: /view priya sharma/i }));

    expect(await screen.findByRole('heading', { name: 'Member detail' })).toBeInTheDocument();
  });

  it('shows an empty state with a call to action', async () => {
    api.get.mockImplementation((url) =>
      url.startsWith('/packages')
        ? Promise.resolve({ data: { data: [] } })
        : Promise.resolve(listResponse([])),
    );

    renderMembers();

    expect(await screen.findByText(/no members yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/features/members/MembersPage.test.jsx
```

Expected: FAIL — cannot resolve `./MembersPage`.

- [ ] **Step 3: Create `client/src/features/members/useMembers.js`**

```js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, getErrorMessage } from '@/lib/api';

export const memberKeys = {
  all: ['members'],
  list: (params) => ['members', 'list', params],
  detail: (id) => ['members', 'detail', id],
};

/** Drops empty values so the URL stays readable and the cache key stays stable. */
const toQueryString = (params) => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }

  return search.toString();
};

export const useMembers = (params = {}) =>
  useQuery({
    queryKey: memberKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get(`/members?${toQueryString(params)}`);
      return data;
    },
    // Keeps the previous page on screen while the next one loads, so the
    // table does not collapse to a skeleton on every keystroke.
    placeholderData: (previous) => previous,
  });

export const useMember = (id) =>
  useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/members/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });

export const usePackages = ({ includeInactive = false } = {}) =>
  useQuery({
    queryKey: ['packages', { includeInactive }],
    queryFn: async () => {
      const { data } = await api.get(`/packages?includeInactive=${includeInactive}`);
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

/** Every member mutation invalidates the same keys, so lists and tiles refresh. */
const invalidateMemberData = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: memberKeys.all });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
};

export const useSaveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data } = id
        ? await api.patch(`/members/${id}`, values)
        : await api.post('/members', values);
      return data.data;
    },
    onSuccess: (member, variables) => {
      invalidateMemberData(queryClient);
      toast.success(variables.id ? 'Member updated' : `${member.name} added`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};

export const useRenewMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, packageId }) => {
      const { data } = await api.post(`/members/${id}/renew`, packageId ? { packageId } : {});
      return data.data;
    },
    onSuccess: (member) => {
      invalidateMemberData(queryClient);
      toast.success(`${member.name} renewed until ${member.endDate}`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
```

- [ ] **Step 4: Create `client/src/features/members/memberColumns.jsx`**

```jsx
import { Eye, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatDaysRemaining } from '@/lib/format';

/**
 * The columns from SRS §2.1, shared by Members, Expiry and Action Required
 * so the three listings stay visually identical.
 *
 * @param {object} handlers
 * @param {(member) => void} handlers.onView
 * @param {(member) => void} [handlers.onEdit] Omitted on the read-only listings
 */
export const buildMemberColumns = ({ onView, onEdit }) => [
  {
    key: 'srNo',
    header: 'Sr. No.',
    className: 'w-16 text-muted-foreground tabular-nums',
    cell: (_row, index) => index + 1,
  },
  {
    key: 'name',
    header: 'Name',
    cell: (member) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{member.name}</p>
        {member.phone && <p className="truncate text-xs text-muted-foreground">{member.phone}</p>}
      </div>
    ),
  },
  {
    key: 'package',
    header: 'Package',
    cell: (member) => <span className="whitespace-nowrap">{member.packageName}</span>,
  },
  {
    key: 'startDate',
    header: 'Start Date',
    className: 'whitespace-nowrap',
    cell: (member) => formatDate(member.startDate),
  },
  {
    key: 'endDate',
    header: 'End Date',
    className: 'whitespace-nowrap',
    cell: (member) => (
      <div>
        <p>{formatDate(member.endDate)}</p>
        <p className="text-xs text-muted-foreground">
          {formatDaysRemaining(member.daysRemaining)}
        </p>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    cell: (member) => <StatusBadge status={member.status} />,
  },
  {
    key: 'action',
    header: 'Action',
    className: 'text-right',
    cell: (member) => (
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`View ${member.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onView(member);
          }}
        >
          <Eye className="size-4" />
        </Button>

        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${member.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(member);
            }}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
    ),
  },
];
```

- [ ] **Step 5: Create `client/src/features/members/MembersPage.jsx`**

```jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMembers } from './useMembers';
import { buildMemberColumns } from './memberColumns';
import { MemberFormDrawer } from './MemberFormDrawer';

const PAGE_SIZE = 20;
const ALL_STATUSES = 'all';

export const MembersPage = () => {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL_STATUSES);
  const [page, setPage] = useState(1);
  const [editingMember, setEditingMember] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Debounce so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useMembers({
    search,
    status: status === ALL_STATUSES ? undefined : status,
    page,
    limit: PAGE_SIZE,
  });

  const columns = useMemo(
    () =>
      buildMemberColumns({
        onView: (member) => navigate(`/members/${member.id}`),
        onEdit: (member) => {
          setEditingMember(member);
          setIsFormOpen(true);
        },
      }),
    [navigate],
  );

  const openAddForm = () => {
    setEditingMember(null);
    setIsFormOpen(true);
  };

  const rows = data?.data ?? [];
  const isFiltered = Boolean(search) || status !== ALL_STATUSES;

  return (
    <>
      <PageHeader
        title="Members"
        description="Everyone registered at the gym."
        actions={
          <Button onClick={openAddForm}>
            <Plus className="mr-2 size-4" />
            Add New Member
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search members"
            placeholder="Search by name, phone or email…"
            className="pl-9"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring-soon">Expiring soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        startIndex={(page - 1) * PAGE_SIZE}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={(member) => navigate(`/members/${member.id}`)}
        emptyState={
          <EmptyState
            icon={Users}
            title={isFiltered ? 'No members match those filters' : 'No members yet'}
            description={
              isFiltered
                ? 'Try a different search term or clear the status filter.'
                : 'Add your first member to get started.'
            }
            action={
              !isFiltered && (
                <Button onClick={openAddForm}>
                  <Plus className="mr-2 size-4" />
                  Add New Member
                </Button>
              )
            }
          />
        }
      />

      <MemberFormDrawer open={isFormOpen} onOpenChange={setIsFormOpen} member={editingMember} />
    </>
  );
};
```

- [ ] **Step 6: Add the route in `client/src/App.jsx`**

```jsx
import { MembersPage } from '@/features/members/MembersPage';
```

```jsx
          <Route path="/members" element={<MembersPage />} />
```

- [ ] **Step 7: Run the test**

`MemberFormDrawer` does not exist yet, so this still fails on that import. Build it in Task 29, then run:

```bash
cd client && npx vitest run src/features/members/MembersPage.test.jsx
```

Expected right now: FAIL — cannot resolve `./MemberFormDrawer`. That is the cue to move to Task 29; the two files are one unit of work.

- [ ] **Step 8: Commit the work in progress**

```bash
git add client/src/features/members client/src/App.jsx
git commit -m "feat(client): add members listing page with search, filter and pagination"
```

---

### Task 29: Add / Edit member drawer

Implements SRS §2.2 and §2.4. The price field is read-only and driven by the package selection (SRS §2.3.1–2.3.2); the start date is editable (decision D5).

**Files:**
- Create: `client/src/features/members/MemberFormDrawer.jsx`
- Test: `client/src/features/members/MemberFormDrawer.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/features/members/MemberFormDrawer.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/renderWithProviders';
import { MemberFormDrawer } from './MemberFormDrawer';
import { api } from '@/lib/api';

const packages = [
  { id: 'p1', name: '1 Month', durationMonths: 1, price: 1500 },
  { id: 'p3', name: '3 Months', durationMonths: 3, price: 4000 },
];

const renderDrawer = (props = {}) =>
  renderWithProviders(
    <MemberFormDrawer open onOpenChange={() => {}} member={null} {...props} />,
  );

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: packages } });
});

describe('MemberFormDrawer — add', () => {
  it('renders every field from SRS §2.2', async () => {
    renderDrawer();

    expect(await screen.findByRole('heading', { name: /add new member/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/package/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
  });

  it('keeps the price read-only so it cannot be typed over (SRS §2.3.2)', async () => {
    renderDrawer();
    expect(await screen.findByLabelText(/price/i)).toHaveAttribute('readonly');
  });

  it('fills the price automatically when a package is chosen (SRS §2.3.1)', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(await screen.findByLabelText(/package/i));
    await user.click(await screen.findByRole('option', { name: /3 months/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/price/i)).toHaveValue('₹4,000');
    });
  });

  it('previews the end date the membership will get', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.clear(screen.getByLabelText(/start date/i));
    await user.type(screen.getByLabelText(/start date/i), '2026-01-10');
    await user.click(await screen.findByLabelText(/package/i));
    await user.click(await screen.findByRole('option', { name: /3 months/i }));

    expect(await screen.findByText(/9 Apr 2026/)).toBeInTheDocument();
  });

  it('blocks submission until the mandatory fields are filled (SRS §2.3.5)', async () => {
    const post = vi.spyOn(api, 'post');
    const user = userEvent.setup();
    renderDrawer();

    await user.click(await screen.findByRole('button', { name: /^save$/i }));

    expect(await screen.findByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects a malformed email (SRS §6.2)', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.type(await screen.findByLabelText(/email/i), 'nope');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it('posts packageId and never a price', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { data: { id: 'm1', name: 'Priya Sharma' } } });
    const user = userEvent.setup();
    renderDrawer();

    await user.type(await screen.findByLabelText(/name/i), 'Priya Sharma');
    await user.type(screen.getByLabelText(/phone number/i), '9811111111');
    await user.click(screen.getByLabelText(/gender/i));
    await user.click(await screen.findByRole('option', { name: /female/i }));
    await user.click(screen.getByLabelText(/package/i));
    await user.click(await screen.findByRole('option', { name: /3 months/i }));
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());

    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/members');
    expect(body).toMatchObject({ name: 'Priya Sharma', gender: 'female', packageId: 'p3' });
    expect(body.price).toBeUndefined();
    expect(body.packagePrice).toBeUndefined();
  });
});

describe('MemberFormDrawer — edit', () => {
  const existing = {
    id: 'm1',
    name: 'Priya Sharma',
    phone: '9811111111',
    email: 'priya@example.com',
    gender: 'female',
    package: 'p3',
    packageName: '3 Months',
    packagePrice: 4000,
    startDate: '2026-01-10',
    endDate: '2026-04-09',
  };

  it('pre-fills the form from the member', async () => {
    renderDrawer({ member: existing });

    expect(await screen.findByRole('heading', { name: /edit member/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toHaveValue('Priya Sharma');
    expect(screen.getByLabelText(/email/i)).toHaveValue('priya@example.com');
    expect(screen.getByLabelText(/start date/i)).toHaveValue('2026-01-10');
  });

  it('PATCHes the existing member instead of creating a new one', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { data: existing } });
    const user = userEvent.setup();
    renderDrawer({ member: existing });

    await user.clear(await screen.findByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'Priya S.');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][0]).toBe('/members/m1');
  });

  it('shows a server field error against the right input', async () => {
    vi.spyOn(api, 'patch').mockRejectedValue({
      response: {
        status: 409,
        data: { error: { message: 'A record with that email already exists' } },
      },
    });
    const user = userEvent.setup();
    renderDrawer({ member: existing });

    await user.click(await screen.findByRole('button', { name: /^save$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/features/members/MemberFormDrawer.test.jsx
```

Expected: FAIL — cannot resolve `./MemberFormDrawer`.

- [ ] **Step 3: Create `client/src/features/members/MemberFormDrawer.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarClock, Loader2 } from 'lucide-react';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/shared/FormField';
import { usePackages, useSaveMember } from './useMembers';
import { GENDER_OPTIONS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';
import { getErrorMessage, getFieldErrors } from '@/lib/api';

/** Mirrors `server/src/features/members/members.schema.js`. */
const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s()-]{6,19}$/, 'Enter a valid phone number')
    .or(z.literal('')),
  email: z.string().trim().email('Enter a valid email address').or(z.literal('')),
  gender: z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Select a gender' }) }),
  packageId: z.string().min(1, 'Select a package'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a start date'),
});

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * The end date preview shown under the package field.
 *
 * Mirrors `calculateEndDate` on the server (decision D6). It is a PREVIEW
 * only — the value actually stored is always the one the API computes.
 */
const previewEndDate = (startDate, durationMonths) => {
  if (!startDate || !durationMonths) return null;

  const [year, month, day] = startDate.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + durationMonths, day));
  if (target.getUTCDate() !== day) target.setUTCDate(0); // clamp short months
  target.setUTCDate(target.getUTCDate() - 1);

  return target.toISOString().slice(0, 10);
};

const toDefaults = (member) => ({
  name: member?.name ?? '',
  phone: member?.phone ?? '',
  email: member?.email ?? '',
  gender: member?.gender ?? '',
  packageId: member?.package ?? '',
  startDate: member?.startDate ?? todayIso(),
});

export const MemberFormDrawer = ({ open, onOpenChange, member }) => {
  const isEdit = Boolean(member?.id);
  const { data: packages = [] } = usePackages();
  const saveMember = useSaveMember();
  const [formError, setFormError] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toDefaults(member) });

  // Reset whenever the drawer opens for a different member.
  useEffect(() => {
    if (open) {
      reset(toDefaults(member));
      setFormError(null);
    }
  }, [open, member, reset]);

  const selectedPackageId = watch('packageId');
  const startDate = watch('startDate');
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId);
  const endDatePreview = previewEndDate(startDate, selectedPackage?.durationMonths);

  const onSubmit = async (values) => {
    setFormError(null);

    try {
      await saveMember.mutateAsync({
        id: member?.id,
        name: values.name,
        phone: values.phone,
        email: values.email,
        gender: values.gender,
        packageId: values.packageId,
        startDate: values.startDate,
      });
      onOpenChange(false);
    } catch (error) {
      // Attach server field errors to the inputs they belong to.
      const fieldErrors = getFieldErrors(error);
      const fields = Object.keys(fieldErrors);

      for (const field of fields) {
        setError(field, { type: 'server', message: fieldErrors[field] });
      }

      if (fields.length === 0) setFormError(getErrorMessage(error));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit member' : 'Add new member'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the details. Changing the package or start date recalculates the end date.'
              : 'The price and end date are set automatically from the package.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-6" noValidate>
          {formError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          )}

          <FormField label="Name" required error={errors.name?.message}>
            {(field) => <Input {...field} {...register('name')} placeholder="Full name" />}
          </FormField>

          <FormField label="Phone number" error={errors.phone?.message}>
            {(field) => (
              <Input {...field} {...register('phone')} type="tel" placeholder="9876543210" />
            )}
          </FormField>

          <FormField label="Email" error={errors.email?.message}>
            {(field) => (
              <Input
                {...field}
                {...register('email')}
                type="email"
                placeholder="member@example.com"
              />
            )}
          </FormField>

          <FormField label="Gender" required error={errors.gender?.message}>
            {(field) => (
              <Controller
                control={control}
                name="gender"
                render={({ field: control }) => (
                  <Select value={control.value} onValueChange={control.onChange}>
                    <SelectTrigger {...field}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          <FormField label="Package" required error={errors.packageId?.message}>
            {(field) => (
              <Controller
                control={control}
                name="packageId"
                render={({ field: control }) => (
                  <Select value={control.value} onValueChange={control.onChange}>
                    <SelectTrigger {...field}>
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} — {formatCurrency(pkg.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          <FormField
            label="Price"
            hint="Set automatically from the selected package."
            error={undefined}
          >
            {(field) => (
              <Input
                {...field}
                readOnly
                tabIndex={-1}
                className="bg-muted font-medium tabular-nums"
                value={selectedPackage ? formatCurrency(selectedPackage.price) : ''}
                placeholder="—"
              />
            )}
          </FormField>

          <FormField
            label="Start date"
            required
            error={errors.startDate?.message}
            hint={
              endDatePreview
                ? undefined
                : 'Defaults to today. Backdate it for a member who joined earlier.'
            }
          >
            {(field) => <Input {...field} {...register('startDate')} type="date" />}
          </FormField>

          {endDatePreview && (
            <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
              <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
              Membership will end on&nbsp;
              <span className="font-medium">{formatDate(endDatePreview)}</span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMember.isPending}>
              {saveMember.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
```

- [ ] **Step 4: Run both member tests to verify they pass**

```bash
cd client && npx vitest run src/features/members
```

Expected: PASS — `MemberFormDrawer.test.jsx` `10 passed` and `MembersPage.test.jsx` `6 passed`.

- [ ] **Step 5: Commit**

```bash
git add client/src/features/members
git commit -m "feat(client): add member add/edit drawer with automatic pricing"
```

---

### Task 30: Member detail page and renewal

Implements SRS §2.4 (view) and §3.3 (renewal action).

**Files:**
- Create: `client/src/features/members/RenewDialog.jsx`
- Create: `client/src/features/members/MemberDetailPage.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/features/members/MemberDetailPage.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/features/members/MemberDetailPage.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { MemberDetailPage } from './MemberDetailPage';
import { api } from '@/lib/api';

const member = {
  id: 'm1',
  name: 'Priya Sharma',
  phone: '9811111111',
  email: 'priya@example.com',
  gender: 'female',
  package: 'p3',
  packageName: '3 Months',
  packagePrice: 4000,
  durationMonths: 3,
  startDate: '2026-01-10',
  endDate: '2026-04-09',
  status: 'expiring-soon',
  daysRemaining: 3,
  history: [
    {
      packageName: '1 Month',
      packagePrice: 1500,
      durationMonths: 1,
      startDate: '2025-12-01',
      endDate: '2025-12-31',
    },
  ],
};

const renderDetail = () =>
  renderWithProviders(
    <Routes>
      <Route path="/members/:id" element={<MemberDetailPage />} />
      <Route path="/members" element={<h1>Members list</h1>} />
    </Routes>,
    { initialEntries: ['/members/m1'] },
  );

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockImplementation((url) =>
    url.startsWith('/packages')
      ? Promise.resolve({
          data: { data: [{ id: 'p3', name: '3 Months', durationMonths: 3, price: 4000 }] },
        })
      : Promise.resolve({ data: { data: member } }),
  );
});

describe('MemberDetailPage', () => {
  it('shows the complete member record (SRS §2.4)', async () => {
    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Priya Sharma' })).toBeInTheDocument();
    expect(screen.getByText('9811111111')).toBeInTheDocument();
    expect(screen.getByText('priya@example.com')).toBeInTheDocument();
    expect(screen.getByText('3 Months')).toBeInTheDocument();
    expect(screen.getByText('₹4,000')).toBeInTheDocument();
    expect(screen.getByText('10 Jan 2026')).toBeInTheDocument();
    expect(screen.getByText('9 Apr 2026')).toBeInTheDocument();
  });

  it('shows the computed status and days remaining', async () => {
    renderDetail();

    expect(await screen.findByText('Expiring soon')).toBeInTheDocument();
    expect(screen.getByText('3 days left')).toBeInTheDocument();
  });

  it('lists previous membership periods', async () => {
    renderDetail();

    expect(await screen.findByText(/membership history/i)).toBeInTheDocument();
    expect(screen.getByText('1 Month')).toBeInTheDocument();
    expect(screen.getByText('₹1,500')).toBeInTheDocument();
  });

  it('renews the membership', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { data: { ...member, endDate: '2026-07-09' } } });
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole('button', { name: /renew/i }));
    await user.click(await screen.findByRole('button', { name: /confirm renewal/i }));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/members/m1/renew', {}));
  });

  it('shows a not-found message for a missing member', async () => {
    api.get.mockImplementation((url) =>
      url.startsWith('/packages')
        ? Promise.resolve({ data: { data: [] } })
        : Promise.reject({ response: { status: 404, data: { error: { message: 'Member not found' } } } }),
    );

    renderDetail();

    expect(await screen.findByRole('alert')).toHaveTextContent(/member not found/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/features/members/MemberDetailPage.test.jsx
```

Expected: FAIL — cannot resolve `./MemberDetailPage`.

- [ ] **Step 3: Create `client/src/features/members/RenewDialog.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/shared/FormField';
import { usePackages, useRenewMember } from './useMembers';
import { formatCurrency, formatDate } from '@/lib/format';

export const RenewDialog = ({ open, onOpenChange, member }) => {
  const { data: packages = [] } = usePackages();
  const renewMember = useRenewMember();
  const [packageId, setPackageId] = useState(member?.package ?? '');

  useEffect(() => {
    if (open) setPackageId(member?.package ?? '');
  }, [open, member]);

  const onConfirm = async () => {
    await renewMember.mutateAsync({ id: member.id, packageId: packageId || undefined });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew membership</DialogTitle>
          <DialogDescription>
            The current period ({formatDate(member?.startDate)} – {formatDate(member?.endDate)})
            moves into this member&apos;s history and a new one begins.
          </DialogDescription>
        </DialogHeader>

        <FormField label="Package">
          {(field) => (
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger {...field}>
                <SelectValue placeholder="Select package" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} — {formatCurrency(pkg.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={renewMember.isPending}>
            {renewMember.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirm renewal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 4: Create `client/src/features/members/MemberDetailPage.jsx`**

```jsx
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, RefreshCw } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useMember } from './useMembers';
import { MemberFormDrawer } from './MemberFormDrawer';
import { RenewDialog } from './RenewDialog';
import { formatCurrency, formatDate, formatDaysRemaining } from '@/lib/format';
import { getErrorMessage } from '@/lib/api';

const DetailRow = ({ label, children }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="text-sm font-medium">{children}</dd>
  </div>
);

export const MemberDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: member, isLoading, isError, error } = useMember(id);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);

  if (isError) {
    return (
      <>
        <PageHeader title="Member" />
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {getErrorMessage(error)}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/members')}>
          <ArrowLeft className="mr-2 size-4" />
          Back to members
        </Button>
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <Link
        to="/members"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to members
      </Link>

      <PageHeader
        title={member.name}
        description={`${member.packageName} · ${formatDaysRemaining(member.daysRemaining)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </Button>
            <Button onClick={() => setIsRenewOpen(true)}>
              <RefreshCw className="mr-2 size-4" />
              Renew
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="elevated">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Current membership</CardTitle>
            <StatusBadge status={member.status} />
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <DetailRow label="Package">{member.packageName}</DetailRow>
              <DetailRow label="Price">{formatCurrency(member.packagePrice)}</DetailRow>
              <DetailRow label="Duration">{member.durationMonths} months</DetailRow>
              <DetailRow label="Start date">{formatDate(member.startDate)}</DetailRow>
              <DetailRow label="End date">{formatDate(member.endDate)}</DetailRow>
              <DetailRow label="Remaining">{formatDaysRemaining(member.daysRemaining)}</DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Card className="elevated">
          <CardHeader>
            <CardTitle className="text-base">Contact details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <DetailRow label="Phone">{member.phone || '—'}</DetailRow>
              <DetailRow label="Email">{member.email || '—'}</DetailRow>
              <DetailRow label="Gender">
                <span className="capitalize">{member.gender}</span>
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Card className="elevated lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Membership history</CardTitle>
          </CardHeader>
          <CardContent>
            {member.history.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No previous memberships. Renewals will be recorded here.
              </p>
            ) : (
              <ul className="space-y-3">
                {member.history
                  .slice()
                  .reverse()
                  .map((period, index) => (
                    <li key={`${period.startDate}-${index}`}>
                      {index > 0 && <Separator className="mb-3" />}
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{period.packageName}</span>
                        <span className="text-sm tabular-nums">
                          {formatCurrency(period.packagePrice)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(period.startDate)} – {formatDate(period.endDate)}
                      </p>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <MemberFormDrawer open={isEditOpen} onOpenChange={setIsEditOpen} member={member} />
      <RenewDialog open={isRenewOpen} onOpenChange={setIsRenewOpen} member={member} />
    </>
  );
};
```

- [ ] **Step 5: Add the route in `client/src/App.jsx`**

```jsx
import { MemberDetailPage } from '@/features/members/MemberDetailPage';
```

```jsx
          <Route path="/members/:id" element={<MemberDetailPage />} />
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd client && npx vitest run src/features/members/MemberDetailPage.test.jsx
```

Expected: PASS — `5 passed`.

- [ ] **Step 7: Commit**

```bash
git add client/src/features/members client/src/App.jsx
git commit -m "feat(client): add member detail page with history and renewal"
```

---

### Task 31: Expiry page

SRS §3. A thin wrapper over the same listing, filtered to `status=expired`.

**Files:**
- Create: `client/src/components/shared/MemberListingPage.jsx`
- Create: `client/src/features/expiry/ExpiryPage.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/features/expiry/ExpiryPage.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/features/expiry/ExpiryPage.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { ExpiryPage } from './ExpiryPage';
import { api } from '@/lib/api';

const expired = {
  id: 'm1',
  name: 'Lapsed Member',
  packageName: '1 Month',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  status: 'expired',
  daysRemaining: -43,
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { data: [expired], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
  });
});

const renderExpiry = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<ExpiryPage />} />
      <Route path="/members/:id" element={<h1>Member detail</h1>} />
    </Routes>,
  );

describe('ExpiryPage', () => {
  it('requests only expired members (SRS §3.2)', async () => {
    renderExpiry();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('status=expired'));
    });
  });

  it('renders the columns from SRS §3.3', async () => {
    renderExpiry();

    for (const header of ['Sr. No.', 'Name', 'Package', 'Start Date', 'End Date', 'Action']) {
      expect(await screen.findByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  it('shows the expired member and how long ago it lapsed', async () => {
    renderExpiry();

    expect(await screen.findByText('Lapsed Member')).toBeInTheDocument();
    expect(screen.getByText('Expired 43 days ago')).toBeInTheDocument();
  });

  it('shows a positive empty state when nothing has expired', async () => {
    api.get.mockResolvedValue({
      data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } },
    });

    renderExpiry();

    expect(await screen.findByText(/no expired memberships/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/features/expiry/ExpiryPage.test.jsx
```

Expected: FAIL — cannot resolve `./ExpiryPage`.

- [ ] **Step 3: Create `client/src/components/shared/MemberListingPage.jsx`**

```jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from './PageHeader';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { useMembers } from '@/features/members/useMembers';
import { buildMemberColumns } from '@/features/members/memberColumns';

const PAGE_SIZE = 20;

/**
 * A read-only member listing filtered to one status.
 *
 * Shared by Expiry (SRS §3) and Action Required (SRS §4) so the two screens
 * cannot drift apart in layout or behaviour.
 */
export const MemberListingPage = ({ title, description, status, sort = 'endDate', emptyState }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMembers({ status, sort, page, limit: PAGE_SIZE });

  const columns = useMemo(
    () => buildMemberColumns({ onView: (member) => navigate(`/members/${member.id}`) }),
    [navigate],
  );

  return (
    <>
      <PageHeader title={title} description={description} />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        isLoading={isLoading}
        startIndex={(page - 1) * PAGE_SIZE}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={(member) => navigate(`/members/${member.id}`)}
        emptyState={<EmptyState {...emptyState} />}
      />
    </>
  );
};
```

- [ ] **Step 4: Create `client/src/features/expiry/ExpiryPage.jsx`**

```jsx
import { CalendarCheck2 } from 'lucide-react';

import { MemberListingPage } from '@/components/shared/MemberListingPage';

export const ExpiryPage = () => (
  <MemberListingPage
    title="Expiry"
    description="Memberships that have ended and not been renewed."
    status="expired"
    emptyState={{
      icon: CalendarCheck2,
      title: 'No expired memberships',
      description: 'Everyone currently on the books has an active membership.',
    }}
  />
);
```

- [ ] **Step 5: Add the route in `client/src/App.jsx`**

```jsx
import { ExpiryPage } from '@/features/expiry/ExpiryPage';
```

```jsx
          <Route path="/expiry" element={<ExpiryPage />} />
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd client && npx vitest run src/features/expiry/ExpiryPage.test.jsx
```

Expected: PASS — `4 passed`.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/shared/MemberListingPage.jsx client/src/features/expiry client/src/App.jsx
git commit -m "feat(client): add expiry page"
```

---

### Task 32: Action Required page

SRS §4. Same listing, filtered to `status=expiring-soon`.

**Files:**
- Create: `client/src/features/actionRequired/ActionRequiredPage.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/features/actionRequired/ActionRequiredPage.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/features/actionRequired/ActionRequiredPage.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders } from '@/test/renderWithProviders';
import { ActionRequiredPage } from './ActionRequiredPage';
import { api } from '@/lib/api';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      data: [
        {
          id: 'm1',
          name: 'Renewing Soon',
          packageName: '3 Months',
          startDate: '2026-01-01',
          endDate: '2026-03-31',
          status: 'expiring-soon',
          daysRemaining: 5,
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    },
  });
});

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<ActionRequiredPage />} />
      <Route path="/members/:id" element={<h1>Member detail</h1>} />
    </Routes>,
  );

describe('ActionRequiredPage', () => {
  it('requests only members inside the reminder window (SRS §4.3)', async () => {
    renderPage();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('status=expiring-soon'));
    });
  });

  it('shows the member and the days remaining', async () => {
    renderPage();

    expect(await screen.findByText('Renewing Soon')).toBeInTheDocument();
    expect(screen.getByText('5 days left')).toBeInTheDocument();
    expect(screen.getByText('Expiring soon')).toBeInTheDocument();
  });

  it('shows an empty state when nobody needs following up', async () => {
    api.get.mockResolvedValue({
      data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } },
    });

    renderPage();

    expect(await screen.findByText(/nothing needs follow-up/i)).toBeInTheDocument();
  });

  it('explains the reminder thresholds so staff know why the list is what it is', async () => {
    renderPage();

    expect(await screen.findByText(/2 days.*1-month/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/features/actionRequired/ActionRequiredPage.test.jsx
```

Expected: FAIL — cannot resolve `./ActionRequiredPage`.

- [ ] **Step 3: Create `client/src/features/actionRequired/ActionRequiredPage.jsx`**

```jsx
import { PartyPopper } from 'lucide-react';

import { MemberListingPage } from '@/components/shared/MemberListingPage';

export const ActionRequiredPage = () => (
  <MemberListingPage
    title="Action Required"
    description="Memberships approaching expiry — 2 days ahead for 1-month packages, 5 days for 3, 6 and 12-month packages."
    status="expiring-soon"
    emptyState={{
      icon: PartyPopper,
      title: 'Nothing needs follow-up',
      description: 'No memberships are inside their reminder window right now.',
    }}
  />
);
```

- [ ] **Step 4: Add the route in `client/src/App.jsx`**

```jsx
import { ActionRequiredPage } from '@/features/actionRequired/ActionRequiredPage';
```

```jsx
          <Route path="/action-required" element={<ActionRequiredPage />} />
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd client && npx vitest run src/features/actionRequired/ActionRequiredPage.test.jsx
```

Expected: PASS — `4 passed`.

- [ ] **Step 6: Commit**

```bash
git add client/src/features/actionRequired client/src/App.jsx
git commit -m "feat(client): add action required page"
```

---

### Task 33: Expenses page with month filter

Implements SRS §5 end to end.

**Files:**
- Create: `client/src/components/shared/MonthPicker.jsx`
- Create: `client/src/features/expenses/useExpenses.js`
- Create: `client/src/features/expenses/ExpenseFormDialog.jsx`
- Create: `client/src/features/expenses/ExpensesPage.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/features/expenses/ExpensesPage.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/features/expenses/ExpensesPage.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/renderWithProviders';
import { ExpensesPage } from './ExpensesPage';
import { api } from '@/lib/api';

const expenses = [
  { id: 'e1', date: '2026-02-28', description: 'Treadmill servicing', amount: 4500 },
  { id: 'e2', date: '2026-02-01', description: 'Electricity bill', amount: 8200 },
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { data: expenses, summary: { total: 12700, count: 2 } },
  });
});

describe('ExpensesPage', () => {
  it('renders the title, Add Expense button and month filter (SRS §5.2)', async () => {
    renderWithProviders(<ExpensesPage />);

    expect(await screen.findByRole('heading', { name: 'Expenses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by month/i)).toBeInTheDocument();
  });

  it('renders the columns from SRS §5.4', async () => {
    renderWithProviders(<ExpensesPage />);

    for (const header of ['Sr. No.', 'Date', 'Description', 'Amount', 'Action']) {
      expect(await screen.findByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  it('shows the rows and the month total', async () => {
    renderWithProviders(<ExpensesPage />);

    expect(await screen.findByText('Treadmill servicing')).toBeInTheDocument();
    expect(screen.getByText('₹4,500')).toBeInTheDocument();
    expect(screen.getByText('₹12,700')).toBeInTheDocument();
  });

  it('defaults the filter to the current month', async () => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    renderWithProviders(<ExpensesPage />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/expenses?month=${thisMonth}`);
    });
  });

  it('refetches when the month changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExpensesPage />);

    await screen.findByText('Treadmill servicing');
    await user.clear(screen.getByLabelText(/filter by month/i));
    await user.type(screen.getByLabelText(/filter by month/i), '2026-02');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/expenses?month=2026-02');
    });
  });

  it('shows the empty-state message for a month with no expenses (SRS §5.5)', async () => {
    api.get.mockResolvedValue({ data: { data: [], summary: { total: 0, count: 0 } } });

    renderWithProviders(<ExpensesPage />);

    expect(await screen.findByText(/no expenses recorded/i)).toBeInTheDocument();
  });

  it('validates the add form before calling the API', async () => {
    const post = vi.spyOn(api, 'post');
    const user = userEvent.setup();
    renderWithProviders(<ExpensesPage />);

    await user.click(await screen.findByRole('button', { name: /add expense/i }));
    await user.click(await screen.findByRole('button', { name: /^save$/i }));

    expect(await screen.findByText(/description must be at least 2 characters/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('records a new expense', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { data: { id: 'e3', date: '2026-02-15', description: 'Mats', amount: 3000 } } });
    const user = userEvent.setup();
    renderWithProviders(<ExpensesPage />);

    await user.click(await screen.findByRole('button', { name: /add expense/i }));
    await user.type(await screen.findByLabelText(/description/i), 'Mats');
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '3000');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1]).toMatchObject({ description: 'Mats', amount: 3000 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/features/expenses/ExpensesPage.test.jsx
```

Expected: FAIL — cannot resolve `./ExpensesPage`.

- [ ] **Step 3: Create `client/src/components/shared/MonthPicker.jsx`**

```jsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Native month input — no dependency, and the OS picker is already familiar. */
export const MonthPicker = ({ id = 'month-filter', label = 'Filter by month', value, onChange }) => (
  <div className="flex items-center gap-2">
    <Label htmlFor={id} className="whitespace-nowrap text-sm text-muted-foreground">
      {label}
    </Label>
    <Input
      id={id}
      type="month"
      className="w-[170px]"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);
```

- [ ] **Step 4: Create `client/src/features/expenses/useExpenses.js`**

```js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, getErrorMessage } from '@/lib/api';

export const expenseKeys = {
  all: ['expenses'],
  list: (month) => ['expenses', 'list', month],
};

export const useExpenses = (month) =>
  useQuery({
    queryKey: expenseKeys.list(month),
    queryFn: async () => {
      const { data } = await api.get(month ? `/expenses?month=${month}` : '/expenses');
      return data;
    },
    placeholderData: (previous) => previous,
  });

export const useSaveExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data } = id
        ? await api.patch(`/expenses/${id}`, values)
        : await api.post('/expenses', values);
      return data.data;
    },
    onSuccess: (_expense, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(variables.id ? 'Expense updated' : 'Expense recorded');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
```

- [ ] **Step 5: Create `client/src/features/expenses/ExpenseFormDialog.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField';
import { useSaveExpense } from './useExpenses';
import { getErrorMessage, getFieldErrors } from '@/lib/api';

/** Mirrors `server/src/features/expenses/expenses.schema.js`. */
const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a date'),
  description: z
    .string()
    .trim()
    .min(2, 'Description must be at least 2 characters')
    .max(200, 'Description must be 200 characters or fewer'),
  amount: z.coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .int('Amount must be a whole number')
    .min(1, 'Amount must be greater than zero'),
});

const todayIso = () => new Date().toISOString().slice(0, 10);

const toDefaults = (expense) => ({
  date: expense?.date ?? todayIso(),
  description: expense?.description ?? '',
  amount: expense?.amount ?? '',
});

export const ExpenseFormDialog = ({ open, onOpenChange, expense }) => {
  const isEdit = Boolean(expense?.id);
  const saveExpense = useSaveExpense();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toDefaults(expense) });

  useEffect(() => {
    if (open) {
      reset(toDefaults(expense));
      setFormError(null);
    }
  }, [open, expense, reset]);

  const onSubmit = async (values) => {
    setFormError(null);

    try {
      await saveExpense.mutateAsync({ id: expense?.id, ...values });
      onOpenChange(false);
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      const fields = Object.keys(fieldErrors);

      for (const field of fields) {
        setError(field, { type: 'server', message: fieldErrors[field] });
      }

      if (fields.length === 0) setFormError(getErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit expense' : 'Add expense'}</DialogTitle>
          <DialogDescription>Record a gym running cost.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {formError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {formError}
            </p>
          )}

          <FormField label="Date" required error={errors.date?.message}>
            {(field) => <Input {...field} {...register('date')} type="date" />}
          </FormField>

          <FormField label="Description" required error={errors.description?.message}>
            {(field) => (
              <Input {...field} {...register('description')} placeholder="Electricity bill" />
            )}
          </FormField>

          <FormField label="Amount" required error={errors.amount?.message}>
            {(field) => (
              <Input
                {...field}
                {...register('amount')}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="0"
              />
            )}
          </FormField>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveExpense.isPending}>
              {saveExpense.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 6: Create `client/src/features/expenses/ExpensesPage.jsx`**

```jsx
import { useMemo, useState } from 'react';
import { Pencil, Plus, Receipt } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { MonthPicker } from '@/components/shared/MonthPicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useExpenses } from './useExpenses';
import { ExpenseFormDialog } from './ExpenseFormDialog';
import { formatCurrency, formatDate } from '@/lib/format';

const currentMonth = () => new Date().toISOString().slice(0, 7);

export const ExpensesPage = () => {
  const [month, setMonth] = useState(currentMonth);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, isLoading } = useExpenses(month);

  const columns = useMemo(
    () => [
      {
        key: 'srNo',
        header: 'Sr. No.',
        className: 'w-16 text-muted-foreground tabular-nums',
        cell: (_row, index) => index + 1,
      },
      {
        key: 'date',
        header: 'Date',
        className: 'whitespace-nowrap',
        cell: (expense) => formatDate(expense.date),
      },
      {
        key: 'description',
        header: 'Description',
        cell: (expense) => <span className="font-medium">{expense.description}</span>,
      },
      {
        key: 'amount',
        header: 'Amount',
        className: 'text-right tabular-nums',
        cell: (expense) => formatCurrency(expense.amount),
      },
      {
        key: 'action',
        header: 'Action',
        className: 'text-right',
        cell: (expense) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${expense.description}`}
            onClick={() => {
              setEditingExpense(expense);
              setIsFormOpen(true);
            }}
          >
            <Pencil className="size-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  const openAddForm = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };

  const summary = data?.summary ?? { total: 0, count: 0 };

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Gym running costs, filtered by month."
        actions={
          <Button onClick={openAddForm}>
            <Plus className="mr-2 size-4" />
            Add Expense
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MonthPicker value={month} onChange={setMonth} />

        <Card className="elevated">
          <CardContent className="flex items-baseline gap-3 px-4 py-2.5">
            <span className="text-sm text-muted-foreground">
              {summary.count} expense{summary.count === 1 ? '' : 's'}
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {formatCurrency(summary.total)}
            </span>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="No expenses recorded for this month"
            description="Pick a different month, or add the first expense for this one."
            action={
              <Button onClick={openAddForm}>
                <Plus className="mr-2 size-4" />
                Add Expense
              </Button>
            }
          />
        }
      />

      <ExpenseFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        expense={editingExpense}
      />
    </>
  );
};
```

- [ ] **Step 7: Add the route in `client/src/App.jsx`**

```jsx
import { ExpensesPage } from '@/features/expenses/ExpensesPage';
```

```jsx
          <Route path="/expenses" element={<ExpensesPage />} />
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd client && npx vitest run src/features/expenses/ExpensesPage.test.jsx
```

Expected: PASS — `8 passed`.

- [ ] **Step 9: Commit**

```bash
git add client/src/components/shared/MonthPicker.jsx client/src/features/expenses client/src/App.jsx
git commit -m "feat(client): add expenses page with month filter and totals"
```

---

### Task 34: Settings — package prices

Closes decision D4: the client can set the real prices themselves (SRS §6.3).

**Files:**
- Create: `client/src/features/settings/SettingsPage.jsx`
- Create: `client/src/features/settings/PackageSettingsTable.jsx`
- Modify: `client/src/App.jsx`
- Test: `client/src/features/settings/SettingsPage.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/features/settings/SettingsPage.test.jsx`:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/renderWithProviders';
import { SettingsPage } from './SettingsPage';
import { api } from '@/lib/api';

const packages = [
  { id: 'p1', name: '1 Month', durationMonths: 1, price: 1500, isActive: true },
  { id: 'p3', name: '3 Months', durationMonths: 3, price: 4000, isActive: true },
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: packages } });
});

describe('SettingsPage', () => {
  it('lists every package with its duration and price', async () => {
    renderWithProviders(<SettingsPage />);

    expect(await screen.findByText('1 Month')).toBeInTheDocument();
    expect(screen.getByText('3 Months')).toBeInTheDocument();
    expect(screen.getByLabelText('Price for 1 Month')).toHaveValue(1500);
  });

  it('includes retired packages so they can be brought back', async () => {
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/packages?includeInactive=true');
    });
  });

  it('saves an edited price', async () => {
    const patch = vi
      .spyOn(api, 'patch')
      .mockResolvedValue({ data: { data: { ...packages[0], price: 1800 } } });
    const user = userEvent.setup();

    renderWithProviders(<SettingsPage />);

    const input = await screen.findByLabelText('Price for 1 Month');
    await user.clear(input);
    await user.type(input, '1800');
    await user.click(screen.getByRole('button', { name: /save 1 month/i }));

    await waitFor(() => {
      expect(patch).toHaveBeenCalledWith('/packages/p1', { price: 1800 });
    });
  });

  it('rejects a negative price without calling the API', async () => {
    const patch = vi.spyOn(api, 'patch');
    const user = userEvent.setup();

    renderWithProviders(<SettingsPage />);

    const input = await screen.findByLabelText('Price for 1 Month');
    await user.clear(input);
    await user.type(input, '-5');
    await user.click(screen.getByRole('button', { name: /save 1 month/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot be negative/i);
    expect(patch).not.toHaveBeenCalled();
  });

  it('explains that price changes do not affect existing members', async () => {
    renderWithProviders(<SettingsPage />);

    expect(
      await screen.findByText(/existing members keep the price they were charged/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/features/settings/SettingsPage.test.jsx
```

Expected: FAIL — cannot resolve `./SettingsPage`.

- [ ] **Step 3: Create `client/src/features/settings/PackageSettingsTable.jsx`**

```jsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePackages } from '@/features/members/useMembers';
import { api, getErrorMessage } from '@/lib/api';
import { TableSkeleton } from '@/components/shared/TableSkeleton';

const PackageRow = ({ pkg }) => {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(pkg.price);
  const [error, setError] = useState(null);

  const updatePrice = useMutation({
    mutationFn: async (value) => {
      const { data } = await api.patch(`/packages/${pkg.id}`, { price: value });
      return data.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success(`${updated.name} price updated`);
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const onSave = () => {
    const value = Number(price);

    // Validate before the request so an obvious mistake never leaves the page.
    if (!Number.isInteger(value)) {
      setError('Price must be a whole number');
      return;
    }
    if (value < 0) {
      setError('Price cannot be negative');
      return;
    }

    setError(null);
    updatePrice.mutate(value);
  };

  const isDirty = Number(price) !== pkg.price;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-4 last:border-0">
      <div className="min-w-[140px] flex-1">
        <p className="font-medium">{pkg.name}</p>
        <p className="text-xs text-muted-foreground">
          {pkg.durationMonths} month{pkg.durationMonths === 1 ? '' : 's'}
        </p>
      </div>

      {!pkg.isActive && <Badge variant="outline">Retired</Badge>}

      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          className="w-32 tabular-nums"
          aria-label={`Price for ${pkg.name}`}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />

        <Button
          size="sm"
          variant={isDirty ? 'default' : 'outline'}
          aria-label={`Save ${pkg.name}`}
          disabled={updatePrice.isPending}
          onClick={onSave}
        >
          {updatePrice.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
        </Button>
      </div>

      {error && (
        <p role="alert" className="w-full text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export const PackageSettingsTable = () => {
  const { data: packages = [], isLoading } = usePackages({ includeInactive: true });

  if (isLoading) return <TableSkeleton rows={4} columns={3} />;

  return (
    <div>
      {packages.map((pkg) => (
        <PackageRow key={pkg.id} pkg={pkg} />
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Create `client/src/features/settings/SettingsPage.jsx`**

```jsx
import { Info } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageSettingsTable } from './PackageSettingsTable';

export const SettingsPage = () => (
  <>
    <PageHeader
      title="Settings"
      description="Configure membership packages without a developer."
    />

    <Card className="elevated max-w-3xl">
      <CardHeader>
        <CardTitle className="text-base">Membership packages</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <p className="flex items-start gap-2 border-b bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          Changing a price only affects memberships sold from now on — existing members keep the
          price they were charged.
        </p>

        <PackageSettingsTable />
      </CardContent>
    </Card>
  </>
);
```

- [ ] **Step 5: Add the route in `client/src/App.jsx`**

```jsx
import { SettingsPage } from '@/features/settings/SettingsPage';
```

```jsx
          <Route path="/settings" element={<SettingsPage />} />
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd client && npx vitest run src/features/settings/SettingsPage.test.jsx
```

Expected: PASS — `5 passed`.

- [ ] **Step 7: Commit**

```bash
git add client/src/features/settings client/src/App.jsx
git commit -m "feat(client): add settings page for configurable package prices"
```

**Phase 4 complete.** Every screen in SRS §7 exists and works.

---

# Phase 5 — Polish and handover

---

### Task 35: Error boundary, 404 page and network failures

**Files:**
- Create: `client/src/components/shared/ErrorBoundary.jsx`
- Create: `client/src/components/shared/NotFoundPage.jsx`
- Modify: `client/src/App.jsx`, `client/src/main.jsx`, `client/src/lib/api.js`
- Test: `client/src/components/shared/ErrorBoundary.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/components/shared/ErrorBoundary.test.jsx`:

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ErrorBoundary } from './ErrorBoundary';

const Boom = () => {
  throw new Error('Kaboom');
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('shows a recovery message instead of a blank page when a child throws', () => {
    // React logs the error; silence it so the test output stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd client && npx vitest run src/components/shared/ErrorBoundary.test.jsx
```

Expected: FAIL — cannot resolve `./ErrorBoundary`.

- [ ] **Step 3: Create `client/src/components/shared/ErrorBoundary.jsx`**

```jsx
import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Catches render-time crashes so a component bug shows a recovery screen
 * rather than a white page.
 *
 * Must be a class — React has no hook equivalent for error boundaries.
 */
export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div role="alert" className="max-w-md space-y-4 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </span>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The page hit an unexpected error. Reloading usually fixes it.
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>Reload the page</Button>
        </div>
      </div>
    );
  }
}
```

- [ ] **Step 4: Create `client/src/components/shared/NotFoundPage.jsx`**

```jsx
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';

export const NotFoundPage = () => (
  <div className="grid min-h-[60vh] place-items-center">
    <div className="max-w-md space-y-4 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-6" />
      </span>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          That page does not exist. It may have been moved or renamed.
        </p>
      </div>
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  </div>
);
```

- [ ] **Step 5: Handle a global 401 in `client/src/lib/api.js`**

Append to the file, after the request interceptor:

```js
/**
 * A rejected token anywhere in the app means the session is over.
 *
 * Clearing storage and hard-navigating to /login avoids a cascade of failed
 * requests and a half-rendered authenticated shell.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error?.config?.url?.startsWith('/auth/');

    if (error?.response?.status === 401 && !isAuthEndpoint && getStoredToken()) {
      clearStoredToken();
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);
```

- [ ] **Step 6: Wire both into the app**

In `client/src/main.jsx`, wrap the tree:

```jsx
import { ErrorBoundary } from './components/shared/ErrorBoundary.jsx';
```

```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster richColors closeButton position="top-right" />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
```

In `client/src/App.jsx`, replace the catch-all route so a signed-in user sees the 404 page inside the shell rather than being bounced to login:

```jsx
import { NotFoundPage } from '@/components/shared/NotFoundPage';
```

Add inside the `AppShell` route group:

```jsx
          <Route path="*" element={<NotFoundPage />} />
```

and change the outermost catch-all to:

```jsx
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
```

- [ ] **Step 7: Run the client suite**

```bash
npm test --workspace client
```

Expected: PASS — all files green.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/shared client/src/lib/api.js client/src/main.jsx client/src/App.jsx
git commit -m "feat(client): add error boundary, 404 page and global 401 handling"
```

---

### Task 36: Responsive and accessibility pass

Manual, but specific. SRS §6.1 requires desktop and mobile.

- [ ] **Step 1: Seed demo data so the screens have something to show**

Create `server/src/seed/seedDemoData.js`:

```js
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { Package } from '../models/Package.js';
import { Member } from '../models/Member.js';
import { Expense } from '../models/Expense.js';
import { calculateEndDate } from '../lib/membership.js';
import { addDaysUtc, addMonthsUtc, todayUtc, toIsoDate } from '../lib/dates.js';
import { seedPackages } from './seed.js';

const NAMES = [
  'Priya Sharma', 'Rahul Verma', 'Anita Desai', 'Vikram Singh', 'Meera Nair',
  'Arjun Patel', 'Kavya Reddy', 'Sanjay Gupta', 'Divya Menon', 'Rohit Joshi',
  'Neha Kapoor', 'Amit Chauhan', 'Sneha Iyer', 'Karan Malhotra', 'Pooja Rao',
];

const GENDERS = ['female', 'male', 'female', 'male', 'other'];

/**
 * Creates members spread across all three statuses, so Members, Expiry and
 * Action Required all have realistic content for a demo.
 */
const run = async () => {
  await connectDatabase(env().mongodbUri);
  await seedPackages();

  const packages = await Package.find().sort({ sortOrder: 1 });
  const today = todayUtc();

  await Member.deleteMany({});
  await Expense.deleteMany({});

  for (const [index, name] of NAMES.entries()) {
    const pkg = packages[index % packages.length];

    // Cycle through: comfortably active, inside the reminder window, expired.
    const offsets = [45, pkg.durationMonths === 1 ? 1 : 3, -12];
    const daysUntilEnd = offsets[index % offsets.length];

    const endDate = addDaysUtc(today, daysUntilEnd);
    const startDate = addDaysUtc(addMonthsUtc(endDate, -pkg.durationMonths), 1);

    await Member.create({
      name,
      phone: `98${String(10000000 + index).padStart(8, '0')}`,
      email: `${name.split(' ')[0].toLowerCase()}${index}@example.com`,
      gender: GENDERS[index % GENDERS.length],
      package: pkg._id,
      packageName: pkg.name,
      packagePrice: pkg.price,
      durationMonths: pkg.durationMonths,
      startDate,
      endDate: calculateEndDate(startDate, pkg.durationMonths),
    });
  }

  const EXPENSES = [
    ['Electricity bill', 8200],
    ['Treadmill servicing', 4500],
    ['Cleaning supplies', 1200],
    ['Trainer salary', 25000],
    ['New dumbbell set', 14000],
    ['Water cooler refill', 900],
  ];

  for (let monthsAgo = 0; monthsAgo < 6; monthsAgo += 1) {
    for (const [description, amount] of EXPENSES.slice(0, 3 + (monthsAgo % 3))) {
      await Expense.create({
        date: addMonthsUtc(today, -monthsAgo),
        description,
        amount,
      });
    }
  }

  console.log(`[seed:demo] ${NAMES.length} members and expenses created up to ${toIsoDate(today)}`);
  await disconnectDatabase();
};

run().catch((error) => {
  console.error('[seed:demo] failed:', error);
  process.exit(1);
});
```

Run it:

```bash
npm run seed:demo --workspace server
```

Expected: `[seed:demo] 15 members and expenses created up to <today>`

> **This deletes every member and expense.** It is a demo-data script — never run it against live client data.

- [ ] **Step 2: Check every screen at three widths**

```bash
npm run dev
```

In the browser devtools device toolbar, check **375px**, **768px** and **1440px** on each of: Login, Dashboard, Members, Add Member drawer, Member detail, Expiry, Action Required, Expenses, Settings.

At each width confirm:
- The page never scrolls horizontally. Tables scroll inside their own container.
- The sidebar is a hamburger sheet below `md` and fixed above it.
- No text is clipped, and no button is smaller than roughly 40×40px.
- Both themes are legible — toggle and re-check at least Dashboard and Members.

Fix whatever fails, then re-check.

- [ ] **Step 3: Check keyboard-only operation**

Without touching the mouse, on the Members page:

1. `Tab` reaches the search box, the status filter, Add New Member, and each row's View and Edit buttons — in that visual order.
2. Every focused element has a visible focus ring.
3. `Enter` on Add New Member opens the drawer, focus moves into it, `Tab` stays trapped inside, and `Escape` closes it and returns focus to the button.
4. The date and select fields are operable with arrow keys.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(client): responsive and accessibility corrections"
```

---

### Task 37: README and handover documentation

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# Gym Management Web Application

Member, membership and expense management for a single gym. Implements the SRS
in `Gym Management Web Application.pdf`.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 · Vite · Tailwind v4 · shadcn/ui · Framer Motion · TanStack Query |
| Backend | Node 20 · Express 5 · Mongoose 8 |
| Database | MongoDB Atlas |
| Auth | JWT (7-day expiry), bcrypt password hashing |
| Tests | Vitest · Supertest · mongodb-memory-server · React Testing Library |

## Getting started

Requires Node 20.19 or newer.

```bash
npm install
cp server/.env.example server/.env   # then fill in the real values
cp client/.env.example client/.env
npm run seed                         # creates packages and demo accounts
npm run dev                          # API on :4000, web on :5173
```

### Environment variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Token signing key, 32+ characters. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `JWT_EXPIRES_IN` | Session length, default `7d` |
| `CLIENT_URL` | Used to build password-reset links |
| `RESET_TOKEN_TTL_MINUTES` | Reset-link lifetime, default `30` |
| `PORT` | API port, default `4000` |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Runs API and web together |
| `npm test` | Runs both test suites |
| `npm run seed` | Idempotent: adds missing packages and demo accounts |
| `npm run seed:demo` | **Destructive.** Replaces all members and expenses with demo data |
| `npm run build` | Production build of the client |

## Demo accounts

| Email | Password | Role |
|---|---|---|
| `admin@gym.com` | `Admin@123` | admin |
| `staff@gym.com` | `Staff@123` | staff |

Change both before the app handles real member data.

## Architecture

```
server/src/
  lib/          pure functions — membership dates, status, tokens, passwords
  models/       mongoose schemas
  middleware/   auth, validation, error formatting
  features/     auth · packages · members · expenses · dashboard
                each: routes → controller → service → schema

client/src/
  lib/          api client, formatting, design constants
  components/   ui (shadcn) · layout (shell) · shared (table, tiles, states)
  features/     auth · members · expiry · actionRequired · expenses
                · dashboard · settings
```

**The rule worth knowing:** membership status is computed on the **server**, in
`server/src/lib/membership.js`, and returned on every member as `status` and
`daysRemaining`. The client never derives it from dates. Changing a business
rule means editing that one file.

## Business rules

| Rule | Where |
|---|---|
| End date = start + duration − 1 day | `lib/membership.js` → `calculateEndDate` |
| Reminder window: 2 days for 1-month, 5 days otherwise | `lib/membership.js` → `REMINDER_DAYS_BY_DURATION` |
| Renewal starts the day after the old end date, or today if lapsed | `lib/membership.js` → `nextRenewalStartDate` |
| Members snapshot the price they were sold at | `models/Member.js` |
| Password policy: 8+ chars, a letter and a number | `lib/password.js` → `passwordSchema` |

## Open items for the client

1. **Confirm the four package prices.** Seeded with placeholders; editable at
   Settings → Membership packages, no deploy needed.
2. **Confirm the end-date rule.** A 1-month membership starting 1 Jan currently
   ends 31 Jan. Change `calculateEndDate` if the gym counts differently.
3. **Confirm the renewal rule.** Renewing early continues from the old end date;
   renewing after a lapse starts today.
4. **Email delivery.** Password-reset links are logged to the server console.
   Implement `server/src/features/auth/email.js` against a real provider before
   staff rely on self-service resets.
5. **Rotate the Atlas password** and restrict Network Access to known IPs.

## Deployment notes

- Set `NODE_ENV=production`. This stops the reset token being returned in the
  API response.
- `npm run build` outputs `client/dist`; serve it as static files and proxy
  `/api` to the Node process.
- Atlas Network Access must allow the production server's IP.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add setup, architecture and handover notes"
```

---

### Task 38: Final verification

Do not claim this is done until every box below is checked with output you have actually seen.

- [ ] **Step 1: Full test suite**

```bash
npm test
```

Expected: both workspaces green, zero failures. Record the totals.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: completes with no errors and writes `client/dist`.

- [ ] **Step 3: End-to-end walkthrough against Atlas**

```bash
npm run dev
```

Work through each item and tick it only after seeing it work:

- [ ] Visiting `/members` while signed out redirects to `/login` (SRS §6.4)
- [ ] Sign in with `admin@gym.com` / `Admin@123`
- [ ] Forgot password → link in the API console → reset → sign in with the new password (SRS §1)
- [ ] Dashboard shows member counts, revenue, expenses and the six-month chart
- [ ] Members lists records with Sr. No., Name, Package, Start Date, End Date, Action (SRS §2.1)
- [ ] Add New Member: picking a package fills the price automatically and previews the end date (SRS §2.2, §2.3)
- [ ] Saving with an empty name shows a validation message, not a crash (SRS §2.3.5)
- [ ] A saved member appears at the top of the listing (SRS §2.3.6)
- [ ] View shows the full record; Edit updates it and preserves the dates (SRS §2.4)
- [ ] Expiry lists only members whose end date has passed (SRS §3)
- [ ] Renewing an expired member removes them from Expiry and records the old period in history
- [ ] Action Required lists only members inside their reminder window (SRS §4)
- [ ] Expenses: add one, see it in the list, and see the month total update (SRS §5.2–5.4)
- [ ] Changing the month filter changes the list; an empty month shows the empty-state message (SRS §5.5)
- [ ] Settings: change a package price, then confirm an existing member's price is unchanged
- [ ] Theme toggle works and persists across a reload
- [ ] Every screen is usable at 375px wide (SRS §6.1)

- [ ] **Step 4: Confirm no secret was ever committed**

```bash
git log --all -p -- server/.env | head -5
git log --all -S '<ATLAS_PASSWORD>' --oneline
```

Expected: both print nothing. If either prints anything, the credential is in
history — rotate the Atlas password immediately and rewrite the history before
pushing anywhere.

- [ ] **Step 5: Final commit**

```bash
git status
git add -A
git commit -m "chore: complete gym management web application"
```

---

## Spec coverage

Every requirement in the SRS, and the task that implements it.

| SRS | Requirement | Task |
|---|---|---|
| §1.2 | Login page — email, password, button, forgot-password link | 8, 25 |
| §1.2 | Forgot Password page and confirmation message | 11, 26 |
| §1.2 | Reset Password page with confirmation and policy validation | 11, 26 |
| §1.3 | Static user accounts for demo | 7 |
| §2.1 | Member listing: title, Add button, table, View/Edit actions | 17, 28 |
| §2.1 | Columns: Sr. No., Name, Package, Start Date, End Date, Action | 28 |
| §2.1 | Latest records first | 17, 28 |
| §2.2 | Add Member form — all fields | 29 |
| §2.3.1–2 | Price auto-populated from package, never typed | 17, 29 |
| §2.3.3 | Start date assigned per business rule | 12, 17, 29 |
| §2.3.4 | End date calculated from duration | 12, 17 |
| §2.3.5 | Mandatory field validation before save | 17, 29 |
| §2.3.6 | Saved member appears in the listing | 28, 29 |
| §2.4 | View and edit member, preserving dates and package | 17, 29, 30 |
| §3.2 | Expiry lists members past their end date, excludes active | 16, 31 |
| §3.2 | Renewed members leave the list | 17, 30 |
| §3.3 | Expiry columns and renewal action | 31, 30 |
| §4.2 | Reminder thresholds: 2 days for 1-month, 5 for the rest | 12 |
| §4.3 | Remaining days calculated; expired excluded from this list | 12, 16, 32 |
| §4.4 | Worked example — 3-month package, 5 days out | 12 |
| §5.2 | Expense listing, Add button, month filter | 18, 33 |
| §5.3 | Add Expense form — date, description, amount | 18, 33 |
| §5.4 | Expense columns | 33 |
| §5.5 | Month filter with empty-state message | 18, 33 |
| §6.1 | Consistent, responsive UI | 21, 23, 24, 36 |
| §6.2 | Validation on all forms, meaningful messages | 8, 17, 18, 25, 29, 33 |
| §6.3 | Persistent storage, consistent dates, configurable prices, no duplicates | 5, 12, 15, 34 |
| §6.4 | Authentication required; protected pages unreachable directly | 9, 22 |
| §7 | Navigation structure | 23, 26–34 |

---

## Execution notes

- **Do not skip a red test.** If a test passes before you write the implementation, the test is wrong — fix the test.
- **Commit at the end of every task.** If a task goes wrong, `git reset --hard HEAD` puts you back on solid ground.
- **The server is the source of truth for business rules.** If you find yourself computing a membership status in a React component, stop — the API already returns it.
- **Flag, don't guess.** Decisions D6 and D8 are business rules the client has not confirmed. If something feels wrong while building, raise it rather than quietly changing the rule.
