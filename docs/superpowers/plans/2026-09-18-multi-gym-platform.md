# Multi-gym platform

Turns the single-gym app into a platform that hosts many gyms.

## Decisions

| # | Decision | Chosen |
|---|---|---|
| M1 | How gym staff reach their gym at sign-in | Email alone — unique platform-wide, gym derived from the user record |
| M2 | Platform admin scope | Create a gym with its first admin, list gyms, suspend/reactivate |
| M3 | What `staff` cannot do | Manage staff accounts; change package prices |
| M4 | Existing Atlas data | One-off migration into a first gym |

## Roles

| Role | Belongs to a gym | Signs in at | Can |
|---|---|---|---|
| `superadmin` | no | `/admin-login` | Create/list/suspend gyms. No access to any gym's member data. |
| `admin` | yes | `/login` | Everything inside their gym, plus staff accounts and package prices. |
| `staff` | yes | `/login` | Everything inside their gym except staff accounts and package prices. |

## Data model

- New `Gym`: `name`, `slug` (unique), contact fields, `isActive`, `createdBy`.
- `User`: `+gym` (null for `superadmin`, required otherwise), role enum gains `superadmin`.
  A pre-validate hook enforces that pairing in both directions.
- `Member`, `Expense`, `Package`: `+gym` (required, indexed).
- Index changes — the old global uniqueness would stop two gyms having a member
  with the same phone, or both having a "3 Months" package:
  - `Member`: `{email:1}`/`{phone:1}` unique sparse → `{gym:1,email:1}`/`{gym:1,phone:1}`
    unique **partial** (`$type: 'string'`). Partial, not sparse: a compound sparse index
    still indexes a document when *any* key exists, and `gym` always exists, so blanks
    would collide.
  - `Package`: `name` unique → `{gym:1,name:1}` unique.
  - `Member`: `{endDate:1,durationMonths:1}` → `{gym:1,endDate:1,durationMonths:1}`.

## Tenant isolation

The security-critical part. Every read and write in members, expenses, packages and
dashboard is filtered by `req.gymId`, which `requireAuth` sets from the signed-in user
and nothing else can influence — there is no gym id in any request body, query or URL.
A gym id is never accepted from the client.

`requireAuth` also re-reads the gym on each request and rejects a suspended one, so a
suspension takes effect immediately rather than at token expiry.

## Steps

1. `Gym` model; `gym` on `User`, `Member`, `Expense`, `Package`; index migration.
2. `requireRole` middleware; `requireAuth` sets `req.gymId` and blocks suspended gyms.
3. Login takes a `scope` (`gym` | `platform`) so the two doors stay separate.
4. `features/gyms` — platform CRUD, creating a gym provisions its admin + default packages.
5. `features/staff` — gym admin lists/creates/removes staff in their own gym.
6. Scope members, expenses, packages, dashboard by `req.gymId`; price edits become admin-only.
7. Seeds: `seed` creates the superadmin; `migrate:multi-gym` moves existing data into a gym.
8. Server tests: gym-aware factories, isolation tests, role tests, suspension tests.
9. Client: `/admin-login`, platform shell + Gyms screen, Staff screen, role-gated nav.
10. Verify: both suites, production build, browser pass over every screen.

## Out of scope

Cross-gym reporting, gym self-signup, per-gym branding, billing.
