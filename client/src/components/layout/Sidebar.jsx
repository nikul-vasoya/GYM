import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { navItemsForRole } from '@/lib/constants';
import { useAuth } from '@/features/auth/useAuth';
import { useGymPath } from '@/features/branding/useGymPath';
import { useGymBranding } from '@/features/branding/GymBrandingContext';
import { GymLogo } from '@/components/shared/GymLogo';

/**
 * Primary navigation.
 *
 * The active indicator is a single shared element with a `layoutId`, so
 * Framer Motion slides it between items instead of cross-fading two
 * backgrounds — that continuity is what reads as polish. The indicator is a
 * tinted panel with a gold edge rather than a solid block: at this size a
 * filled pill shouts, and nothing else on the page shouts.
 */
export const Sidebar = ({ onNavigate }) => {
  const { user, gym } = useAuth();
  const branding = useGymBranding() ?? gym;
  const to = useGymPath();
  const navItems = navItemsForRole(user?.role);

  return (
  <div className="relative flex h-full flex-col gap-7 border-r border-sidebar-border bg-sidebar px-4 py-6">
    {/* Brand lockup — the gym's name, because the platform hosts many */}
    <div className="flex items-center gap-3 px-2">
      <GymLogo name={branding?.name ?? 'Gym Manager'} logoUrl={branding?.logoUrl} />
      <span className="min-w-0">
        <span className="font-display block truncate text-[0.9375rem] font-semibold tracking-[0.14em] uppercase">
          {branding?.name ?? 'Gym Manager'}
        </span>
        <span className="block truncate text-[0.6875rem] tracking-[0.08em] text-muted-foreground">
          Management Suite
        </span>
      </span>
    </div>

    <div className="rule" />

    <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
      <p className="eyebrow mb-2 px-3">Navigation</p>

      {navItems.map(({ to: path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={to(path)}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-primary/10 ring-1 ring-primary/25"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                >
                  <span className="gold-surface absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full" />
                </motion.span>
              )}
              <Icon className="relative size-[1.125rem] shrink-0" />
              <span className="relative">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>

    <div className="rule" />

    <div className="flex items-center justify-between px-3 pb-1">
      <span className="eyebrow">{user?.role === 'admin' ? 'Administrator' : 'Staff'}</span>
      <span className="text-[0.6875rem] tracking-[0.08em] text-muted-foreground">v1.0</span>
    </div>
  </div>
  );
};
