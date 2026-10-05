import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useGymPath } from '@/features/branding/useGymPath';

/** @param {{ homePath?: string }} props where "back" goes; the gym dashboard by default. */
export const NotFoundPage = ({ homePath }) => {
  const to = useGymPath();
  const home = homePath ?? to('/dashboard');

  return (
  <div className="grid min-h-[60vh] place-items-center">
    <div className="max-w-md space-y-5 text-center">
      <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/20">
        <span aria-hidden className="absolute inset-0 rounded-2xl bg-primary/12 blur-xl" />
        <Compass className="relative size-7" />
      </span>

      <div className="space-y-2">
        <p className="eyebrow">Error 404</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          That page does not exist. It may have been moved or renamed.
        </p>
      </div>

      <div className="rule mx-auto w-24" />

      <Button asChild>
        <Link to={home}>{homePath ? 'Back' : 'Back to dashboard'}</Link>
      </Button>
    </div>
  </div>
  );
};
