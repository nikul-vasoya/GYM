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
| `ALLOW_DEV_RESET_TOKEN` | When `true`, returns the raw password-reset token in the API response so the forgot-password flow can be completed without a real email provider. Defaults to `false`. **Must stay `false` or absent in production** — leaving it on discloses a working reset token to anyone who can see the response. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Runs API and web together |
| `npm test` | Runs both test suites |
| `npm run seed` | Idempotent: adds missing packages and demo accounts |
| `npm run seed:demo --workspace server` | **Destructive.** Replaces all members and expenses with demo data |
| `npm run build` | Production build of the client |

Current test counts: **187** server tests, **85** client tests (`npm test` runs both).

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
4. **Email delivery.** Password-reset links are logged to the server console
   (or, with `ALLOW_DEV_RESET_TOKEN=true`, returned directly in the API
   response for local testing). Implement `server/src/features/auth/email.js`
   against a real provider before staff rely on self-service resets, and make
   sure `ALLOW_DEV_RESET_TOKEN` is unset in that environment.
5. **Rotate the Atlas password.** An earlier credential was committed to this
   repository and has since been purged from git history — but a purge only
   removes it from the repo, it does not un-expose a secret that may already
   have been seen. Rotate the Atlas password and restrict Network Access to
   known IPs regardless.

## Deployment notes

- Set `NODE_ENV=production` and leave `ALLOW_DEV_RESET_TOKEN` unset/`false`.
  This stops the raw reset token being returned in the API response.
- `npm run build` outputs `client/dist`; serve it as static files and proxy
  `/api` to the Node process.
- The server calls `app.set('trust proxy', 1)`, which trusts exactly **one**
  hop of `X-Forwarded-*` headers. Put it behind a single reverse proxy (e.g.
  one nginx/load-balancer hop) — chaining two or more proxies in front of it
  will make client IPs (and rate limiting keyed on them) unreliable, and
  removing the proxy entirely without updating this setting would let clients
  spoof their own IP.
- Atlas Network Access must allow the production server's IP.
