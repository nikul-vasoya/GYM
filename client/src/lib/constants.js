import {
  LayoutDashboard,
  Users,
  CalendarX2,
  BellRing,
  Receipt,
  Settings,
  UserCog,
} from 'lucide-react';

/**
 * The navigation structure from SRS §7. One list drives the whole sidebar.
 *
 * `roles` names who may see an item. It is presentation only — the route
 * guards and the API enforce the same rules, so hiding a link is a courtesy
 * rather than a control.
 */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/expiry', label: 'Expiry', icon: CalendarX2 },
  { to: '/action-required', label: 'Action Required', icon: BellRing },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/staff', label: 'Staff', icon: UserCog, roles: ['admin'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

/** The items one role may see. */
export const navItemsForRole = (role) =>
  NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

/** Presentation for each membership status returned by the API. */
export const STATUS_META = {
  active: {
    label: 'Active',
    className: 'bg-success/12 text-success border-success/25',
    dotClassName: 'bg-success',
  },
  'expiring-soon': {
    label: 'Expiring soon',
    className: 'bg-warning/12 text-warning border-warning/25',
    dotClassName: 'bg-warning',
  },
  expired: {
    label: 'Expired',
    className: 'bg-destructive/12 text-destructive border-destructive/25',
    dotClassName: 'bg-destructive',
  },
};

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const THEME_STORAGE_KEY = 'gym.theme';
