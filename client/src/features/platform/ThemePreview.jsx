import { Dumbbell } from 'lucide-react';

import { GymLogo } from '@/components/shared/GymLogo';
import { themeStyle } from '@/lib/theme/applyTheme';
import { cn } from '@/lib/utils';

/**
 * A miniature of a gym's sign-in card, painted in a theme, in one mode.
 *
 * Scoped: the generated tokens are set as custom properties on this element
 * only, so the console around it keeps its own colours.
 */
const PreviewPane = ({ theme, mode, gymName, logoUrl }) => (
  <div
    className="rounded-xl border p-4"
    style={{
      ...themeStyle(theme, mode),
      backgroundColor: 'var(--background)',
      borderColor: 'var(--border)',
      color: 'var(--foreground)',
    }}
  >
    <p className="mb-3 text-[0.625rem] tracking-[0.16em] uppercase" style={{ color: 'var(--muted-foreground)' }}>
      {mode}
    </p>

    <div className="space-y-3 rounded-lg p-3" style={{ backgroundColor: 'var(--card)' }}>
      <div className="flex items-center gap-2">
        {gymName ? (
          <GymLogo name={gymName} logoUrl={logoUrl} className="size-7 rounded-lg text-[0.625rem]" />
        ) : (
          <span className="gold-surface grid size-7 place-items-center rounded-lg">
            <Dumbbell className="size-3.5" />
          </span>
        )}
        <span className="truncate text-xs font-semibold">{gymName || 'Your gym'}</span>
      </div>

      <div className="h-6 rounded-md border" style={{ borderColor: 'var(--input)' }} />

      <div className="gold-surface grid h-7 place-items-center rounded-md text-[0.6875rem] font-semibold">
        Sign in
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 text-[0.625rem]"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' }}
        >
          Members
        </span>
        <span className="text-[0.625rem] font-medium" style={{ color: 'var(--primary)' }}>
          Forgot password?
        </span>
      </div>
    </div>
  </div>
);

/** Light and dark previews side by side. */
export const ThemePreview = ({ theme, gymName, logoUrl, className }) => (
  <div className={cn('grid grid-cols-2 gap-3', className)} aria-label="Theme preview" role="img">
    <PreviewPane theme={theme} mode="light" gymName={gymName} logoUrl={logoUrl} />
    <PreviewPane theme={theme} mode="dark" gymName={gymName} logoUrl={logoUrl} />
  </div>
);
