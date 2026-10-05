import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { PlatformShell } from '@/components/layout/PlatformShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { AdminLoginPage } from '@/features/platform/AdminLoginPage';
import { GymsPage } from '@/features/platform/GymsPage';
import { ThemesPage } from '@/features/platform/ThemesPage';
import { GymRouteLayout } from '@/features/branding/GymRouteLayout';
import { GymHomeRedirect } from '@/features/branding/GymHomeRedirect';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { MembersPage } from '@/features/members/MembersPage';
import { MemberDetailPage } from '@/features/members/MemberDetailPage';
import { ExpiryPage } from '@/features/expiry/ExpiryPage';
import { ActionRequiredPage } from '@/features/actionRequired/ActionRequiredPage';
import { ExpensesPage } from '@/features/expenses/ExpensesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { StaffPage } from '@/features/staff/StaffPage';
import { NotFoundPage } from '@/components/shared/NotFoundPage';

/** The gym pages as they were before moving under `/<slug>/…`. */
const LEGACY_GYM_PATHS = [
  '/dashboard',
  '/members/*',
  '/expiry',
  '/action-required',
  '/expenses',
  '/settings',
  '/staff',
];

/**
 * Two products behind one origin.
 *
 * `/admin-login` and everything under `/admin` belong to the platform
 * operator. Each gym lives at its own address, `/<slug>/…`, in its own theme.
 * The role guards here mirror the server's, so a URL typed by hand cannot get
 * anyone into the other half — and the slug is presentation only: the server
 * takes the gym from the session, never from the URL.
 *
 * Static paths outrank `/:gymSlug`, which is also why those words are
 * reserved and can never be a gym's slug.
 */
export default function App() {
  return (
    <Routes>
      {/* Unbranded sign-in, for anyone who does not know their gym's address */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />

      {/* Platform operator */}
      <Route element={<ProtectedRoute roles={['superadmin']} signInPath="/admin-login" />}>
        <Route element={<PlatformShell />}>
          <Route path="/admin" element={<Navigate to="/admin/gyms" replace />} />
          <Route path="/admin/gyms" element={<GymsPage />} />
          <Route path="/admin/themes" element={<ThemesPage />} />
          <Route path="/admin/*" element={<NotFoundPage homePath="/admin/gyms" />} />
        </Route>
      </Route>

      {/* One gym, at its own address and in its own theme (SRS §6.4) */}
      <Route path="/:gymSlug" element={<GymRouteLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute roles={['admin', 'staff']} />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="members/:id" element={<MemberDetailPage />} />
            <Route path="expiry" element={<ExpiryPage />} />
            <Route path="action-required" element={<ActionRequiredPage />} />
            <Route path="expenses" element={<ExpensesPage />} />

            {/* Administrator-only, mirroring the server's rules (decision M3) */}
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="settings" element={<SettingsPage />} />
              <Route path="staff" element={<StaffPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>

      {/* Old bookmarks and bare `/`: forwarded to the same page at the user's gym */}
      {LEGACY_GYM_PATHS.map((path) => (
        <Route key={path} path={path} element={<GymHomeRedirect />} />
      ))}
      <Route path="/" element={<GymHomeRedirect />} />
      <Route path="*" element={<GymHomeRedirect />} />
    </Routes>
  );
}
