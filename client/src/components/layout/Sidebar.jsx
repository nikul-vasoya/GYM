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
