import { Badge } from '@/components/ui/badge';
import { STATUS_META } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** Renders the status the API computed. Never derives it from dates. */
export const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status];
  if (!meta) return null;

  return (
    <Badge variant="outline" className={cn('font-medium', meta.className)}>
      {meta.label}
    </Badge>
  );
};
