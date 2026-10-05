import { cn } from '@/lib/utils';

/** Two overlapping dots: the theme's primary and accent colours. */
export const ThemeSwatch = ({ theme, className }) => (
  <span aria-hidden className={cn('inline-flex shrink-0 items-center', className)}>
    <span
      className="size-4 rounded-full ring-2 ring-card"
      style={{ backgroundColor: theme?.primary }}
    />
    <span
      className="-ml-1.5 size-4 rounded-full ring-2 ring-card"
      style={{ backgroundColor: theme?.accent ?? theme?.primary, opacity: theme?.accent ? 1 : 0.55 }}
    />
  </span>
);

/** A wide strip of the theme's gradient, for theme cards. */
export const ThemeStrip = ({ theme, className }) => (
  <span
    aria-hidden
    className={cn('block h-14 w-full rounded-xl', className)}
    style={{
      backgroundImage: `linear-gradient(120deg, ${theme.accent ?? theme.primary}, ${theme.primary} 60%)`,
    }}
  />
);
