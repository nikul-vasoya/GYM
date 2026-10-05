import { LogOut, Menu, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
import { useGymPath } from '@/features/branding/useGymPath';

export const Topbar = ({ onOpenNav }) => {
  const { user, gym, logout } = useAuth();
  const navigate = useNavigate();
  const to = useGymPath();

  const handleLogout = () => {
    // Back to this gym's own sign-in page, still in its colours.
    const signIn = to('/login');
    logout();
    navigate(signIn, { replace: true });
  };

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 px-4 md:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open navigation"
        onClick={onOpenNav}
      >
        <Menu className="size-5" />
      </Button>

      {/* Ambient reassurance, not a control — decorative on purpose. */}
      <div
        aria-hidden
        className="hidden items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1.5 md:inline-flex"
      >
        <span className="pulse-dot size-1.5 rounded-full bg-success" />
        <span className="text-[0.6875rem] tracking-[0.1em] text-muted-foreground uppercase">
          {gym?.name ?? 'All systems online'}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />

        <div aria-hidden className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-11 gap-2.5 px-2" aria-label="Account menu">
              <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground ring-1 ring-primary/30">
                <User className="size-4" />
              </span>
              <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              {gym && (
                <p className="mt-1 text-[0.6875rem] tracking-[0.08em] text-primary uppercase">
                  {user?.role === 'admin' ? 'Administrator' : 'Staff'} · {gym.name}
                </p>
              )}
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
  );
};
