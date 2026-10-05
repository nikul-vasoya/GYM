import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from './TableSkeleton';
import { cn } from '@/lib/utils';

/**
 * The one table used by every listing screen.
 *
 * @param {object} props
 * @param {{key: string, header: string, cell: (row, index) => React.ReactNode, className?: string}[]} props.columns
 * @param {object[]} props.rows
 * @param {boolean} [props.isLoading]
 * @param {React.ReactNode} [props.emptyState] Shown only when not loading and there are no rows
 * @param {number} [props.startIndex] Row offset, so serial numbers continue across pages
 * @param {(row) => void} [props.onRowClick]
 * @param {{page:number,limit:number,total:number,totalPages:number}} [props.pagination]
 * @param {(page:number) => void} [props.onPageChange]
 */

/** One shell for all four states, so the frame never shifts between them. */
const Shell = ({ className, children }) => (
  <div className={cn('panel overflow-hidden rounded-2xl border border-border/70', className)}>
    {children}
  </div>
);

export const DataTable = ({
  columns,
  rows,
  isLoading = false,
  emptyState = null,
  startIndex = 0,
  onRowClick,
  pagination,
  onPageChange,
}) => {
  if (isLoading) {
    return (
      <Shell>
        <TableSkeleton columns={columns.length} />
      </Shell>
    );
  }

  if (rows.length === 0 && emptyState) {
    return <Shell>{emptyState}</Shell>;
  }

  return (
    <Shell>
      {/* Horizontal scroll lives here so the page body never scrolls sideways. */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column.key} className={cn('px-4', column.className)}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row, index) => (
              <motion.tr
                key={row.id ?? index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.2) }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'group border-b border-border/50 transition-colors last:border-0 hover:bg-primary/[0.045]',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn('px-4 py-3.5', column.className)}>
                    {column.cell(row, startIndex + index)}
                  </TableCell>
                ))}
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-secondary/25 px-4 py-3 dark:bg-secondary/15">
          <p className="text-xs tracking-[0.06em] text-muted-foreground uppercase">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} record
            {pagination.total === 1 ? '' : 's'}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </Shell>
  );
};
