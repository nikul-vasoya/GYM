# Gym Branding, Themes and Per-Gym URLs — Design

Date: 2026-09-24
Status: Approved in conversation, pending spec review

## Goal

Every gym on the platform gets its own identity:

- a **theme** (colour palette) chosen from 10 built-in themes or a custom theme
  made by the platform administrator;
- a **logo**;
- its own **URL space**: `/<slug>/login`, `/<slug>/dashboard`, … — e.g. a gym
  with slug `midcity` signs in at `http://localhost:5173/midcity/login` and sees
  its own logo and colours before and after sign-in.

The platform administrator manages all of this from the Gyms page: edit a gym's
details, change its theme and logo, and see/copy its login URL.

## Decisions (made with the user)

| Question | Decision |
|---|---|
| URL scope | **All** gym pages live under `/<slug>/…`, not just login. |
| Logo | **File upload** (PNG, JPG, WebP, SVG; ≤ 1 MB), stored on local disk behind a small storage module so S3/Cloudinary can replace it later. |
| Custom themes | Superadmin picks **a primary colour and an optional accent**; the full light + dark palettes are generated. |
| Dark mode | **Kept.** Every theme has a light and a dark variant; the existing toggle still works. |
| Where themes live | A `Theme` collection. Built-in and custom themes are rows in the same collection (`isSystem` flag) — one code path. |

## Non-goals

- Gym admins editing their own branding (platform administrator only, for now).
- Custom fonts, per-theme border radius, or editing individual colour tokens.
- Custom domains (`midcity.example.com`).
- Theming the platform console itself — it keeps the default Aura Gold look.

---

## 1. Data model (server)

### `Theme` (new — `server/src/models/Theme.js`)

| Field | Type | Notes |
|---|---|---|
| `name` | String, required, ≤ 40, unique (case-insensitive) | "Ocean Blue" |
| `key` | String, unique | stable identifier for system themes (`aura-gold`); `null` for custom |
| `primary` | String, required, `#rrggbb` | brand colour |
| `accent` | String, optional, `#rrggbb` | secondary brand colour; defaults to a hue shift of primary |
| `isSystem` | Boolean, default `false` | system themes cannot be edited or deleted |
| `createdBy` | ObjectId → User | |

### The 10 system themes

Seeded idempotently (upsert by `key`) by `npm run seed` and by the migration.

| key | name | primary | accent |
|---|---|---|---|
| `aura-gold` | Aura Gold (default — today's look) | `#C9A227` | `#8C6A1C` |
| `ember-red` | Ember Red | `#DC2626` | `#F97316` |
| `ocean-blue` | Ocean Blue | `#2563EB` | `#06B6D4` |
| `emerald` | Emerald | `#059669` | `#84CC16` |
| `royal-purple` | Royal Purple | `#7C3AED` | `#EC4899` |
| `sunset-orange` | Sunset Orange | `#EA580C` | `#FACC15` |
| `rose` | Rose | `#E11D48` | `#F472B6` |
| `teal` | Teal | `#0D9488` | `#38BDF8` |
| `steel` | Steel | `#475569` | `#94A3B8` |
| `volt-lime` | Volt Lime | `#65A30D` | `#22D3EE` |

### `Gym` (changed)

- `theme`: ObjectId → Theme, required; defaults to the `aura-gold` theme.
- `logoUrl`: String, optional — public path such as `/uploads/logos/<gymId>-<ts>.png`.
- `slug`: unchanged field, but now **editable** by the platform admin and
  validated against a reserved list: `admin`, `admin-login`, `api`, `uploads`,
  `assets`, `login`, `forgot-password`, `reset-password`, `static`.
  Format: `^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$`.

### Migration

`npm run migrate:branding` (idempotent): upserts the 10 system themes and sets
`theme = aura-gold` on every gym without one.

---

## 2. API

### Public (no auth)

`GET /api/public/gyms/:slug` → `{ name, slug, logoUrl, theme: { name, primary, accent } }`

- 404 when the slug does not exist **or the gym is suspended** (same response,
  so it cannot be used to probe suspended gyms).
- Rate-limited like the auth routes.
- Returns nothing about members, contacts or accounts.

### Platform administrator only (`requireAuth, requirePlatformAdmin`)

| Method & path | Purpose |
|---|---|
| `GET /api/themes` | all themes, system first, with `gymCount` (how many gyms use each) |
| `POST /api/themes` | create custom theme `{ name, primary, accent? }` |
| `PATCH /api/themes/:id` | edit custom theme; 403 for system themes |
| `DELETE /api/themes/:id` | delete custom theme; 403 for system, 409 if any gym uses it |
| `PATCH /api/gyms/:id` | edit gym details: `name`, `slug`, `contactEmail`, `contactPhone`, `address`, `theme` — all optional; 409 on duplicate slug, 400 on reserved slug |
| `POST /api/gyms/:id/logo` | multipart `logo` field; replaces the old file |
| `DELETE /api/gyms/:id/logo` | removes the logo (falls back to initials) |
| `POST /api/gyms` (changed) | accepts optional `theme` and `slug` |

`GET /api/gyms` (changed): each gym includes its populated `theme`
(`id, name, primary, accent`) and `logoUrl`.

### Session responses (changed)

`gymSummary` becomes `{ id, name, slug, logoUrl, theme: { name, primary, accent } }`
so the signed-in app can theme itself from `/auth/me` without a second request.

### Login (changed)

`POST /api/auth/login` accepts optional `gymSlug`. When given and the account
does not belong to that gym, the response is the **same generic 401** as a wrong
password — the endpoint must not reveal which gym an email belongs to.
Without `gymSlug` it behaves exactly as today (the plain `/login` fallback).

Password-reset links become `${CLIENT_URL}/<slug>/reset-password?token=…` for
gym users; unchanged for the platform administrator.

### Tenant isolation is unchanged

The slug in the URL is **presentation only**. Every data request still takes
the gym from the session (`req.user.gym`), never from the URL.

### Logo upload & storage

- `multer` with memory storage, 1 MB limit, MIME **and** magic-byte check for
  PNG/JPEG/WebP; SVG accepted by MIME + must parse as XML with an `<svg` root.
- Written by `server/src/lib/storage.js` (`saveLogo(gymId, buffer, ext)`,
  `deleteLogo(url)`) to `server/uploads/logos/`. This module is the one seam to
  swap for S3/Cloudinary.
- Served by `express.static` at `/uploads` with
  `X-Content-Type-Options: nosniff` and
  `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`
  so an uploaded SVG opened directly cannot run script.
- `server/uploads/` is git-ignored. Vite dev server proxies `/uploads` like `/api`.

---

## 3. Client routing

```
/admin-login, /admin/*            platform console (unchanged, default theme)
/login                            fallback sign-in (no branding) → redirects to /<slug>/dashboard
/forgot-password, /reset-password fallback versions (unchanged)

/:gymSlug/login                   branded sign-in
/:gymSlug/forgot-password         branded
/:gymSlug/reset-password          branded
/:gymSlug                         → /:gymSlug/dashboard
/:gymSlug/dashboard | members | members/:id | expiry | action-required
         | expenses | settings | staff        (signed-in, as today)
```

- `GymRouteLayout` wraps every `/:gymSlug/*` route: fetches
  `/api/public/gyms/:slug` (TanStack Query, cached), applies the theme, and
  shows a branded "Gym not found" page on 404.
- A signed-in user whose own gym slug differs from the URL slug is redirected
  to the same page under **their** slug (`/irongym/members` → `/midcity/members`).
- Signed-out users hitting a protected gym page go to `/<slug>/login`.
- The 401 handler signs out to `/<slug>/login` when the user had a gym.
- All in-app links (`Sidebar`, `navigate()` calls, member detail links) go
  through a `useGymPath()` helper — `gymPath('/members')` → `/midcity/members` —
  so no page hard-codes the slug.
- If an admin renames a slug, users on the old URL get "Gym not found" — the
  edit dialog warns about this before saving.

---

## 4. Theming engine (client)

`client/src/lib/theme/generateTheme.js` — pure function, unit-tested:

```
generateTheme({ primary, accent }) → { light: {token: value}, dark: {token: value} }
```

- Converts hex → OKLCH (small inline conversion, no dependency).
- Brand hue drives: `--primary`, `--ring`, `--accent`, `--chart-1`,
  `--gold-1/2/3`, `--aura`, `--gold-glow`, `--sidebar` tint.
- Neutrals (`--background`, `--card`, `--muted`, `--border`, …) keep today's
  lightness values but take the brand hue at very low chroma, so each theme's
  surfaces carry a faint tint of its colour.
- Primary lightness is clamped per mode (light ≈ 0.50–0.58, dark ≈ 0.72–0.82)
  so any picked colour stays usable.
- `--primary-foreground` / `--gold-ink` are chosen as near-black or near-white by
  WCAG contrast (≥ 4.5 : 1 against the primary).
- Status colours (`--success`, `--warning`, `--destructive`) do **not** change
  with the theme — red must always mean danger.
- `aura-gold` generates values matching today's `index.css` closely; `index.css`
  remains the fallback before a theme loads.

`GymThemeProvider` writes the generated tokens as inline CSS variables on
`<html>` (light set on `:root`, dark set applied when `.dark` is present via a
generated `<style id="gym-theme">` block), and removes them on unmount so the
platform console returns to the default. It also sets the page `<title>` and
favicon to the gym's name and logo.

`GymLogo` component: shows the logo image, or the gym's initials on a
brand-gradient tile when there is none. Used in the sidebar, top bar, sign-in
page and the platform Gyms table.

---

## 5. Platform console UI

### Sidebar

Adds **Themes** under Administration, below **Gyms**.

### Gyms page (the screen in the user's screenshot)

Table columns become:

| Gym | Theme | Login URL | Members | Accounts | Status | Actions |
|---|---|---|---|---|---|---|
| `GymLogo` + name + contact email (subtext) | colour swatch (primary + accent dots) + theme name | `/midcity/login` in mono, with **Copy** (full URL incl. origin) and **Open** (new tab) icon buttons | count | count | badge | **Edit** · **Suspend/Reactivate** |

"Added" date moves to the Edit sheet to make room. On narrow screens the table
scrolls horizontally inside its card (existing `DataTable` behaviour).

### Edit gym (new) — right-hand `Sheet`, three tabs

1. **Details** — name, contact email, contact phone, address. Shows created date.
2. **Branding** —
   - theme picker: grid of theme cards (swatch + name), selected card ringed;
     a "+ New theme" card opens the theme dialog inline and selects the result;
   - logo: current logo/initials preview, **Upload** (drag-drop or file
     picker; client-side type/size check before upload) and **Remove**;
   - **live preview**: a miniature of the gym's sign-in card rendered with the
     selected theme in light and dark, updating as the theme changes.
3. **Access** — slug field with live URL preview and uniqueness/reserved
   validation from the server; warning text that changing it breaks the old
   link; login URL with Copy/Open.

One **Save changes** button for Details + Branding theme + slug (single
`PATCH /api/gyms/:id`). Logo upload/remove saves immediately (it is a file
operation) with a toast.

### Add gym dialog (changed)

Adds a theme picker (defaults to Aura Gold) and an editable slug (pre-filled
from the name as you type). Logo is added afterwards from Edit — the success
toast offers "Add logo" which opens the Edit sheet on the Branding tab. After
creation the dialog's success state shows the new gym's login URL with Copy,
alongside the admin credentials to hand over.

### Themes page (new — `/admin/themes`)

- Grid of theme cards: name, large swatch strip, "System" badge or
  Edit/Delete actions, "Used by N gyms".
- **New theme** dialog: name, primary colour, optional accent (native colour
  input + hex text field), live preview panel (buttons, badge, card, sidebar
  item in light and dark) using `generateTheme`.
- Delete is disabled with a tooltip when `gymCount > 0`.

---

## 6. Gym-side UI

- Sidebar header: `GymLogo` + gym name (replaces the fixed "Gym Manager" mark).
- Sign-in page at `/<slug>/login`: gym logo and name in the brand panel,
  themed buttons; "Forgot password" links stay within `/<slug>/`.
- Everything else themes itself through the CSS tokens — no component changes.

---

## 7. Error handling

| Case | Behaviour |
|---|---|
| Unknown or suspended slug | Branded-neutral "Gym not found" page with link to `/login` |
| Logo too big / wrong type | 400 with field message; client blocks it earlier |
| Duplicate / reserved slug | 409 / 400 shown on the slug field |
| Delete theme in use | 409 "Used by N gyms"; button disabled in UI anyway |
| Edit/delete system theme | 403 |
| Theme fetch fails | App keeps the `index.css` default theme; nothing breaks |

## 8. Testing

Server (Vitest + Supertest + mongodb-memory-server):
- public gym lookup: found, unknown → 404, suspended → 404, no private fields;
- login with `gymSlug` of another gym → generic 401; with own slug → 200;
- slug edit: reserved → 400, duplicate → 409, format rules;
- themes CRUD: system themes immutable (403), in-use delete → 409, gym-admin → 403;
- logo upload: accepts PNG, rejects oversized, rejects a `.png` that is not a
  PNG, served with the sandbox CSP header;
- migration is idempotent.

Client (Vitest + RTL):
- `generateTheme`: foreground contrast ≥ 4.5 : 1 for all 10 system themes and
  for extreme inputs (`#ffffff`, `#000000`, `#ffff00`), both modes;
- `GymRouteLayout`: redirects a user to their own slug; 404 page on unknown slug;
- Gyms page: shows login URL, copy puts the full URL on the clipboard, Edit
  sheet saves details;
- Themes page: delete disabled when in use.

## 9. Files touched (overview)

Server — new: `models/Theme.js`, `features/themes/*`, `features/public/*`,
`lib/storage.js`, `lib/systemThemes.js`, `lib/reservedSlugs.js`,
`seed/migrateBranding.js`. Changed: `models/Gym.js`, `features/gyms/*`,
`features/auth/auth.service.js` + schema, `app.js`, `seed/seed.js`,
`.gitignore`, `package.json` (`multer`, `migrate:branding`).

Client — new: `lib/theme/generateTheme.js`, `features/branding/GymThemeProvider.jsx`,
`features/branding/GymRouteLayout.jsx`, `features/branding/useGymPath.js`,
`components/shared/GymLogo.jsx`, `features/platform/ThemesPage.jsx`,
`features/platform/ThemeFormDialog.jsx`, `features/platform/GymEditSheet.jsx`,
`features/platform/ThemePicker.jsx`. Changed: `App.jsx`, `Sidebar.jsx`,
`PlatformShell` nav, `GymsPage.jsx`, `GymFormDialog.jsx`, `usePlatform.js`,
`LoginPage.jsx` / forgot / reset pages, `AuthContext.jsx`, `lib/api.js`
(401 redirect), `vite.config.js` (`/uploads` proxy). README updated.
