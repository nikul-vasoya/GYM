import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shimmer rounded-lg bg-secondary/70 dark:bg-secondary/50", className)}
      {...props} />
  );
}

export { Skeleton }
