import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Shown at `/<slug>/…` when no active gym answers to that address. */
export const GymNotFoundPage = ({ slug }) => (
  <div className="relative grid min-h-screen place-items-center px-5">
    <div aria-hidden className="aura-wash grain pointer-events-none fixed inset-0" />

    <div className="relative max-w-md space-y-5 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/20">
        <SearchX className="size-7" />
      </span>

      <div className="space-y-2">
        <p className="eyebrow">Gym not found</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          There is no gym at this address
        </h1>
        <p className="text-sm text-muted-foreground">
          Nothing answers to <span className="font-mono text-foreground">/{slug}</span>. The link
          may be mistyped, or the gym may have moved to a new address. Ask your gym for its
          current sign-in link.
        </p>
      </div>

      <div className="rule mx-auto w-24" />

      <Button asChild variant="outline">
        <Link to="/login">Go to the general sign-in page</Link>
      </Button>
    </div>
  </div>
);
