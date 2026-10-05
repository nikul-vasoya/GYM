import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder rows that keep the layout stable while data loads. */
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div role="status" aria-label="Loading records">
    {/* A header band, so the skeleton has the same silhouette as the table. */}
    <div className="flex gap-4 border-b border-border/70 bg-secondary/35 px-4 py-3.5 dark:bg-secondary/25">
      {Array.from({ length: columns }).map((_, columnIndex) => (
        <Skeleton key={columnIndex} className="h-3 flex-1 rounded-full" />
      ))}
    </div>

    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        className="flex gap-4 border-b border-border/50 px-4 py-4 last:border-0"
      >
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <Skeleton key={columnIndex} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);
