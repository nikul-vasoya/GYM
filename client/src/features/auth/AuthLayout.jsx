import { AuthShowcase } from './AuthShowcase';
import { AuthBrand } from './AuthBrand';
import { useGymBranding } from '@/features/branding/GymBrandingContext';

/**
 * The frame every unauthenticated screen shares.
 *
 * Two columns from `lg` up: the showcase on the left, carrying the brand, and
 * the sign-in card on the right where the cursor ends up. Below `lg` the
 * showcase drops away entirely and the form column becomes the whole page —
 * which is why the brand is repeated in the form column's own header, shown
 * only at those sizes.
 */
export const AuthLayout = ({ children, variant = 'gym' }) => {
  const branding = useGymBranding();

  return (
  <div className="relative min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
    <AuthShowcase variant={variant} />

    {/* Form column */}
    <div className="relative flex min-h-screen flex-col lg:min-h-0">
      <div
        aria-hidden
        className="aura-wash grain pointer-events-none absolute inset-0 lg:opacity-60"
      />

      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between gap-4 px-5 sm:px-8 lg:hidden">
        <AuthBrand variant={variant} size="sm" />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:py-16">
        {children}
      </main>

      <footer className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 px-5 py-6 text-xs text-muted-foreground sm:px-8">
        <p>© {new Date().getFullYear()} {branding?.name ?? 'Gym Manager'}. All rights reserved.</p>
        <div className="flex items-center gap-2">
          <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-success" />
          <span className="tracking-[0.12em] uppercase">v1.0</span>
        </div>
      </footer>
    </div>
  </div>
  );
};
