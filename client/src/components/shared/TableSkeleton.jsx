import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder rows that keep the layout stable while data loads. */
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div role="status" aria-label="Loading records" className="space-y-3 p-4">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4">
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <Skeleton key={columnIndex} className="h-5 flex-1" />
        ))}
      </div>
    ))}
  </div>
);
