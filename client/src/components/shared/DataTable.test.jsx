import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DataTable } from './DataTable';

const columns = [
  { key: 'srNo', header: 'Sr. No.', cell: (row, index) => index + 1 },
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'package', header: 'Package', cell: (row) => row.packageName },
];

const rows = [
  { id: '1', name: 'Priya Sharma', packageName: '3 Months' },
  { id: '2', name: 'Rahul Verma', packageName: '1 Month' },
];

describe('DataTable', () => {
  it('renders a header cell per column', () => {
    render(<DataTable columns={columns} rows={rows} />);

    expect(screen.getByRole('columnheader', { name: 'Sr. No.' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Package' })).toBeInTheDocument();
  });

  it('renders a row per record with a 1-based serial number', () => {
    render(<DataTable columns={columns} rows={rows} />);

    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('Rahul Verma')).toBeInTheDocument();
    // 2 data rows + 1 header row
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('offsets the serial number by the current page', () => {
    render(<DataTable columns={columns} rows={rows} startIndex={20} />);

    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
  });

  it('shows the skeleton while loading, not the empty state', () => {
    render(<DataTable columns={columns} rows={[]} isLoading emptyState={<p>No members</p>} />);

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText('No members')).not.toBeInTheDocument();
  });

  it('shows the empty state when there is nothing to display', () => {
    render(<DataTable columns={columns} rows={[]} emptyState={<p>No members</p>} />);

    expect(screen.getByText('No members')).toBeInTheDocument();
  });

  it('calls onRowClick with the record', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();

    render(<DataTable columns={columns} rows={rows} onRowClick={onRowClick} />);
    await user.click(screen.getByText('Priya Sharma'));

    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('paginates when given pagination and a handler', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DataTable
        columns={columns}
        rows={rows}
        pagination={{ page: 2, limit: 10, total: 25, totalPages: 3 }}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole('button', { name: /previous page/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('disables previous on the first page and next on the last', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        pagination={{ page: 1, limit: 10, total: 5, totalPages: 1 }}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });
});
