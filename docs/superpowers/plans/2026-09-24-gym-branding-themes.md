# Gym Branding, Themes and Per-Gym URLs — Implementation Plan

> Spec: `docs/superpowers/specs/2026-09-24-gym-branding-themes-design.md`
> Executed inline in the same session (user asked to proceed directly).

**Goal:** Each gym gets a theme (10 system + custom), a logo, and its own URL
space `/<slug>/…`; the platform admin manages all of it from the Gyms page.

**Architecture:** `Theme` collection referenced by `Gym`; a public slug lookup
feeds a client-side `generateTheme()` that writes CSS tokens into a
`<style id="gym-theme">` block, overriding `index.css` for both `:root` and
`.dark`. Gym routes move under `/:gymSlug`, with `useGymPath()` building links.

**Tech stack:** Express 5, Mongoose 8, Zod, multer (new), React 19, React Router 7,
TanStack Query, Tailwind v4, Vitest.

---

## Server

### Task 1 — Theme model + system themes
- Create `server/src/models/Theme.js` (name, key, primary, accent, isSystem, createdBy).
- Create `server/src/lib/systemThemes.js`: `SYSTEM_THEMES` (10 rows from spec),
  `ensureSystemThemes()` (upsert by key), `defaultThemeId()` (aura-gold `_id`).
- Test `tests/unit/systemThemes.test.js`: ensure is idempotent, creates 10.

### Task 2 — Gym model changes + reserved slugs
- `Gym.theme` (ref Theme), `Gym.logoUrl`.
- `server/src/lib/reservedSlugs.js`: `RESERVED_SLUGS`, `SLUG_PATTERN`, `isReservedSlug()`.

### Task 3 — Public gym lookup
- `server/src/features/public/public.routes.js`: `GET /api/public/gyms/:slug`
  → 404 when missing or suspended; returns `publicGym(gym)`.
- `gymSummary()` in auth.service extended with `logoUrl` + `theme`; `publicTheme()` helper.
- Test `tests/api/public.test.js`.

### Task 4 — Login `gymSlug` + slug-aware reset link
- `loginSchema.gymSlug` optional; mismatch → `ApiError.unauthorized()`.
- `requestPasswordReset` builds `/<slug>/reset-password` for gym users.
- Tests appended to `auth.login.test.js`, `auth.reset.test.js`.

### Task 5 — Themes CRUD
- `server/src/features/themes/{schema,service,controller,routes}.js`.
- GET (with gymCount), POST, PATCH (403 system), DELETE (403 system, 409 in use).
- Test `tests/api/themes.test.js`.

### Task 6 — Gym edit + theme on create + list populates theme
- `updateGymSchema` (name, slug, contacts, address, theme).
- `createGymSchema` gains optional `slug`, `theme`.
- `PATCH /api/gyms/:id`; list/create responses populate theme.
- Tests appended to `gyms.test.js`.

### Task 7 — Logo upload
- `npm i multer --workspace server`.
- `server/src/lib/storage.js` (`UPLOAD_ROOT`, `saveLogo`, `deleteLogo`).
- `server/src/lib/imageSniff.js` (`detectImageType(buffer)`).
- `POST/DELETE /api/gyms/:id/logo`; `/uploads` static with sandbox CSP.
- Tests `tests/api/gyms.logo.test.js` (temp UPLOAD_DIR).

### Task 8 — Seed + migration
- `seed.js` also runs `ensureSystemThemes()`.
- `seed/migrateBranding.js` + npm scripts `migrate:branding` (server + root).
- `.gitignore` `server/uploads/`.

## Client

### Task 9 — `generateTheme` (TDD)
- `client/src/lib/theme/color.js` (hex→oklch, contrast), `generateTheme.js`,
  `applyTheme.js` (`applyGymTheme(theme)`, `clearGymTheme()`).
- Tests: contrast ≥ 4.5 for all system themes + extremes, both modes.

### Task 10 — Branding plumbing
- `features/branding/usePublicGym.js`, `GymRouteLayout.jsx`, `useGymPath.js`,
  `GymThemeProvider.jsx`, `components/shared/GymLogo.jsx`.
- `vite.config.js` proxies `/uploads`.

### Task 11 — Routing + slug-aware links
- `App.jsx`: `/:gymSlug/*` tree; `/login` fallback.
- Update every hard-coded gym path (constants NAV_ITEMS, Sidebar, Topbar,
  LoginPage, Forgot/Reset, MembersPage, MemberListingPage, MemberDetailPage,
  DashboardPage, NotFoundPage, ProtectedRoute, api.js 401 redirect).
- `AuthContext.login` sends `gymSlug`; stores gym slug for 401 redirect.
- Sidebar / AuthLayout / LoginPage show `GymLogo` + name.
- Fix existing tests for the new paths; add `GymRouteLayout.test.jsx`.

### Task 12 — Platform console
- `usePlatform.js`: themes hooks, `useUpdateGym`, `useUploadLogo`, `useRemoveLogo`.
- `ThemeSwatch.jsx`, `ThemePicker.jsx`, `ThemePreview.jsx`, `ThemeFormDialog.jsx`,
  `ThemesPage.jsx`, `GymEditSheet.jsx`, `CopyButton` in `GymLoginUrl.jsx`.
- `GymsPage.jsx` new columns + Edit; `GymFormDialog.jsx` theme + slug + success state.
- `PlatformShell` nav gets Themes; `App.jsx` `/admin/themes`.
- Tests: GymsPage (login URL, copy, edit save), ThemesPage (delete disabled in use).

### Task 13 — Docs + full verification
- README: branding section, new scripts, URL scheme.
- Run both suites + `vite build`; manual run of API against memory DB.
