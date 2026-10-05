import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, LogOut, Menu, Palette, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
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
import { cn } from '@/lib/utils';

const PLATFORM_NAV = [
  { to: '/admin/gyms', label: 'Gyms', icon: Building2 },
  { to: '/admin/themes', label: 'Themes', icon: Palette },
];

const PlatformSidebar = ({ onNavigate }) => (
  <div className="relative flex h-full flex-col gap-7 border-r border-sidebar-border bg-sidebar px-4 py-6">
    <div className="flex items-center gap-3 px-2">
      <span className="gold-surface gold-glow grid size-10 place-items-center rounded-xl">
        <ShieldCheck className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="font-display block truncate text-[0.9375rem] font-semibold tracking-[0.14em] uppercase">
          Gym Manager
        </span>
        <span className="block truncate text-[0.6875rem] tracking-[0.08em] text-primary">
          Platform console
        </span>
      </span>
    </div>

    <div className="rule" />

    <nav aria-label="Platform" className="flex flex-1 flex-col gap-1">
      <p className="eyebrow mb-2 px-3">Administration</p>

      {PLATFORM_NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
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
                  layoutId="platform-active"
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
      <span className="eyebrow">Platform</span>
      <span className="text-[0.6875rem] tracking-[0.08em] text-muted-foreground">v1.0</span>
    </div>
  </div>
);

/**
 * The frame for the platform operator's screens.
 *
 * A separate shell from `AppShell`, not a variant of it: the two have
 * different navigation, different branding and — the point of the whole
 * exercise — different data. Sharing one shell would invite a conditional
 * that eventually leaks a gym's screens into the platform side.
 */
export const PlatformShell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin-login', { replace: true });
  };

  return (
    <div className="relative min-h-screen">
      <div aria-hidden className="aura-wash grain pointer-events-none fixed inset-0" />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] md:block">
        <PlatformSidebar />
      </aside>

      <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
        <SheetContent side="left" className="w-[17.5rem] border-r-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <PlatformSidebar onNavigate={() => setIsNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative md:pl-[17rem]">
        <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 px-4 md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation"
            onClick={() => setIsNavOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          <div
            aria-hidden
            className="hidden md:inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5"
          >
            <ShieldCheck className="size-3.5 text-primary" />
            <span className="text-[0.6875rem] tracking-[0.1em] text-primary uppercase">
              Platform console
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />

            <div aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-11 gap-2.5 px-2" aria-label="Account menu">
                  <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/30">
                    <ShieldCheck className="size-4" />
                  </span>
                  <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
