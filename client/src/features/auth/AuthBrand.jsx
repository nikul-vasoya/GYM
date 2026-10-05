import { Dumbbell } from 'lucide-react';

import { GymLogo } from '@/components/shared/GymLogo';
import { useGymBranding } from '@/features/branding/GymBrandingContext';
import { cn } from '@/lib/utils';

/**
 * The brand lockup on signed-out screens: the gym's own logo and name at
 * `/<slug>/…`, the product's mark everywhere else.
 */
export const AuthBrand = ({ variant = 'gym', size = 'md' }) => {
  const branding = useGymBranding();
  const tile = size === 'sm' ? 'size-9' : 'size-10';

  return (
    <div className="flex min-w-0 items-center gap-3">
      {branding ? (
        <GymLogo name={branding.name} logoUrl={branding.logoUrl} className={tile} />
      ) : (
        <span className={cn('gold-surface gold-glow grid place-items-center rounded-xl', tile)}>
          <Dumbbell className={size === 'sm' ? 'size-[1.125rem]' : 'size-5'} />
        </span>
      )}
      <span className="font-display truncate text-sm font-semibold tracking-[0.2em] whitespace-nowrap uppercase">
        {branding?.name ?? 'Gym Manager'}
      </span>
      {variant === 'platform' && (
        <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[0.625rem] tracking-[0.14em] text-primary uppercase sm:inline-block">
          Platform
        </span>
      )}
    </div>
  );
};
