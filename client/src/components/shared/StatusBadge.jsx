import { Badge } from '@/components/ui/badge';
import { STATUS_META } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** Renders the status the API computed. Never derives it from dates. */
export const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status];
  if (!meta) return null;

  return (
    <Badge variant="outline" className={cn('gap-1.5 py-1 pl-2 font-medium', meta.className)}>
      {/* The dot carries the colour so the label can stay quiet. */}
      <span aria-hidden className={cn('size-1.5 rounded-full', meta.dotClassName)} />
      {meta.label}
    </Badge>
  );
};
