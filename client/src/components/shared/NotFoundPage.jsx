import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';

export const NotFoundPage = () => (
  <div className="grid min-h-[60vh] place-items-center">
    <div className="max-w-md space-y-4 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-6" />
      </span>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          That page does not exist. It may have been moved or renamed.
        </p>
      </div>
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  </div>
);
