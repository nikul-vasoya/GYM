import {
  LayoutDashboard,
  Users,
  CalendarX2,
  BellRing,
  Receipt,
  Settings,
} from 'lucide-react';

/** The navigation structure from SRS §7. One list drives the whole sidebar. */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/expiry', label: 'Expiry', icon: CalendarX2 },
  { to: '/action-required', label: 'Action Required', icon: BellRing },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/** Presentation for each membership status returned by the API. */
export const STATUS_META = {
  active: { label: 'Active', className: 'bg-success/15 text-success border-success/30' },
  'expiring-soon': {
    label: 'Expiring soon',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  expired: {
    label: 'Expired',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
};

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const THEME_STORAGE_KEY = 'gym.theme';
