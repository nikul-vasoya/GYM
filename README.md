# Gym Management Web Application

A multi-gym platform for member, membership and expense management. One
platform operator creates gyms; each gym runs itself. Implements the SRS in
`Gym Management Web Application.pdf`.

## Who signs in where

| Role | Signs in at | Can do |
|---|---|---|
| `superadmin` (you) | `/admin-login` | Create gyms with their first administrator; edit their details, sign-in address, theme and logo; manage themes; suspend and reactivate gyms. No access to any gym's member data. |
| `admin` (gym owner) | `/<gym-slug>/login` | Everything inside their own gym, plus staff accounts and package prices. |
| `staff` (front desk) | `/<gym-slug>/login` | Everything inside their own gym except staff accounts and package prices. |

Gym accounts sign in with their **mobile number** (or their email, if they
have one). Both are unique across the whole platform, so the gym is derived
from the account. Members need a mobile number; email is optional
everywhere except for the superadmin. A forgotten password is reset by an
administrator: the gym admin resets staff passwords from **Staff**, and the
superadmin resets any gym account's password from **Gyms → Edit → Accounts**. Every member, expense and package belongs to exactly one gym,
and no request can reach another gym's records: the tenant comes from the
session, never from the URL or body.

## Gym addresses and branding

Each gym has its own address and look. A gym with slug `midcity` lives at
`/midcity/…`: staff sign in at `/midcity/login` and work at `/midcity/dashboard`,
`/midcity/members` and so on, in the gym's own colours and with its logo.

- **The slug is presentation only.** The server still takes the gym from the
  session. Signing in at another gym's address fails with the same message as
  a wrong password, and a signed-in user who opens another gym's address is
  moved to the same page at their own gym.
- **Themes.** There are 10 built-in themes (Aura Gold, the original look, is
  the default) and any number of custom ones made on the **Themes** page. A
  theme stores only a primary colour and an optional accent. The client
  (`client/src/lib/theme/generateTheme.js`) builds the full light and dark
  palettes from those, with button text contrast of at least 4.5:1 guaranteed.
  Success, warning and danger colours never change with the theme.
- **Logos.** PNG, JPG, WebP or SVG, up to 1 MB, checked by content rather
  than by file name. Files are stored in `server/uploads/` and served at
  `/uploads` with a sandboxing Content-Security-Policy. `server/src/lib/storage.js`
  is the only module to change when moving to S3 or Cloudinary.
- **Managing it.** On the platform console's **Gyms** page, each row shows the
  gym's theme and its sign-in link, with Copy and Open buttons. **Edit** opens
  a panel with the gym's details, branding (logo, theme, live preview) and
  sign-in address. Changing the address breaks the old link immediately.
- Slugs that collide with app routes (`admin`, `login`, `api`, `dashboard`, …)
  are reserved. See `server/src/lib/reservedSlugs.js`.
- `/login` still works as a general sign-in page and forwards to the user's
  own gym. Old links such as `/dashboard` or `/members/42` redirect the same way.

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
npm run seed                         # creates the platform administrator
npm run dev                          # API on :4000, web on :5173
```

Then sign in at <http://localhost:5173/admin-login> and create your first gym.
Creating a gym also creates its administrator and its four default packages;
hand those credentials and the gym's sign-in link (shown after creation, e.g.
`/midcity/login`) to the gym owner.

### Upgrading a database that predates multi-gym

A database created before this change has members, expenses, packages and
accounts with no gym. Run the migration once:

```bash
npm run migrate:multi-gym               # optional: MIGRATION_GYM_NAME="Iron House"
```

It creates one gym, adopts every existing record into it, and rebuilds the
indexes — including dropping the old platform-wide unique indexes on member
email, member phone and package name, which would otherwise stop a second gym
registering the same phone number. It is safe to run more than once.

### Upgrading a database that predates gym branding

```bash
npm run migrate:branding
```

It creates the 10 built-in themes and gives every existing gym the default
(Aura Gold), so nothing changes visually until you pick a theme. It is safe to
run more than once. `npm run seed` also creates the built-in themes.

### Upgrading for mobile sign-in

```bash
npm run migrate:mobile-login
```

This replaces the old unique index on email, which would reject a second
account that has no email. Existing accounts keep signing in with their email
until someone adds a mobile number, via **Staff → Edit** or **Gyms → Edit →
Accounts**. The script reports how many gym accounts still have no mobile
number. It is safe to run more than once.

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
| `SUPERADMIN_EMAIL` | Platform administrator created by `npm run seed`. Default `superadmin@platform.com`. |
| `SUPERADMIN_PASSWORD` | Its password. Default `Super@123` — set this in any real deployment. |
| `SUPERADMIN_NAME` | Its display name. Default `Platform Admin`. |
| `UPLOAD_DIR` | Where uploaded gym logos are stored. Default `server/uploads`. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Runs API and web together |
| `npm test` | Runs both test suites |
| `npm run seed` | Idempotent: creates the platform administrator |
| `npm run migrate:multi-gym` | One-off: moves a pre-multi-gym database into its first gym |
| `npm run migrate:mobile-login` | Idempotent: rebuilds account indexes so email can be optional |
| `npm run migrate:branding` | Idempotent: creates the built-in themes and gives unthemed gyms the default |
| `npm run seed:demo --workspace server` | **Destructive.** Replaces one gym's members and expenses with demo data (the oldest gym, or `DEMO_GYM_SLUG`) |
| `npm run build` | Production build of the client |

Current test counts: **299** server tests, **191** client tests (`npm test` runs both).

## The seeded account

`npm run seed` creates one account — the platform administrator:

| Email | Password | Role |
|---|---|---|
| `superadmin@platform.com` | `Super@123` | superadmin |

Change it before the app handles real data, or set `SUPERADMIN_EMAIL` and
`SUPERADMIN_PASSWORD` before seeding. Gym accounts are never seeded: every gym
administrator is created deliberately, from the platform console.

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
  `/api` **and `/uploads`** to the Node process. The static server must fall
  back to `index.html` for unknown paths, since gym addresses such as
  `/midcity/login` are client-side routes.
- Uploaded logos live on the API server's disk in `server/uploads/`. Keep that
  directory on a persistent volume, or move storage to S3 or Cloudinary via
  `server/src/lib/storage.js`. Set `UPLOAD_DIR` to store them somewhere else.
- The server calls `app.set('trust proxy', 1)`, which trusts exactly **one**
  hop of `X-Forwarded-*` headers. Put it behind a single reverse proxy (e.g.
  one nginx/load-balancer hop) — chaining two or more proxies in front of it
  will make client IPs (and rate limiting keyed on them) unreliable, and
  removing the proxy entirely without updating this setting would let clients
  spoof their own IP.
- Atlas Network Access must allow the production server's IP.
