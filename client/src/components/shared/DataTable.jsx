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
      <div className="overflow-hidden rounded-xl border bg-card elevated">
        <TableSkeleton columns={columns.length} />
      </div>
    );
  }

  if (rows.length === 0 && emptyState) {
    return <div className="rounded-xl border bg-card elevated">{emptyState}</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card elevated">
      {/* Horizontal scroll lives here so the page body never scrolls sideways. */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn('whitespace-nowrap text-xs uppercase tracking-wide', column.className)}
                >
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
                  'border-b transition-colors last:border-0 hover:bg-muted/50',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn('py-3', column.className)}>
                    {column.cell(row, startIndex + index)}
                  </TableCell>
                ))}
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} record
            {pagination.total === 1 ? '' : 's'}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Next page"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
