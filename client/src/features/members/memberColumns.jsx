import { Eye, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatDaysRemaining } from '@/lib/format';

/**
 * The columns from SRS §2.1, shared by Members, Expiry and Action Required
 * so the three listings stay visually identical.
 *
 * @param {object} handlers
 * @param {(member) => void} handlers.onView
 * @param {(member) => void} [handlers.onEdit] Omitted on the read-only listings
 */
export const buildMemberColumns = ({ onView, onEdit }) => [
  {
    key: 'srNo',
    header: 'Sr. No.',
    className: 'w-16 text-muted-foreground tabular-nums',
    cell: (_row, index) => index + 1,
  },
  {
    key: 'name',
    header: 'Name',
    cell: (member) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{member.name}</p>
        {member.phone && <p className="truncate text-xs text-muted-foreground">{member.phone}</p>}
      </div>
    ),
  },
  {
    key: 'package',
    header: 'Package',
    cell: (member) => <span className="whitespace-nowrap">{member.packageName}</span>,
  },
  {
    key: 'startDate',
    header: 'Start Date',
    className: 'whitespace-nowrap',
    cell: (member) => formatDate(member.startDate),
  },
  {
    key: 'endDate',
    header: 'End Date',
    className: 'whitespace-nowrap',
    cell: (member) => (
      <div>
        <p>{formatDate(member.endDate)}</p>
        <p className="text-xs text-muted-foreground">
          {formatDaysRemaining(member.daysRemaining)}
        </p>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    cell: (member) => <StatusBadge status={member.status} />,
  },
  {
    key: 'action',
    header: 'Action',
    className: 'text-right',
    cell: (member) => (
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`View ${member.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onView(member);
          }}
        >
          <Eye className="size-4" />
        </Button>

        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${member.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(member);
            }}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
    ),
  },
];
