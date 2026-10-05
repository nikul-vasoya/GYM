import { useState } from 'react';

import { cn } from '@/lib/utils';

/** "Mid City Fitness" → "MC". */
export const gymInitials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || 'G';

/**
 * A gym's mark: its uploaded logo, or its initials on the brand gradient.
 *
 * Falls back to initials if the image fails to load, so a deleted file never
 * leaves a broken-image icon in the sidebar.
 */
export const GymLogo = ({ name, logoUrl, className, imageClassName, style }) => {
  const [failedUrl, setFailedUrl] = useState(null);
  const showImage = logoUrl && failedUrl !== logoUrl;

  if (showImage) {
    return (
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-card ring-1 ring-border',
          className,
        )}
        style={style}
      >
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className={cn('size-full object-contain p-1', imageClassName)}
          onError={() => setFailedUrl(logoUrl)}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        'gold-surface gold-glow font-display grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold tracking-wide',
        className,
      )}
      style={style}
    >
      {gymInitials(name)}
    </span>
  );
};
