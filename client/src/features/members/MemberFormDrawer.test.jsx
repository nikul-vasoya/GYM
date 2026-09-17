import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/renderWithProviders';
import { MemberFormDrawer } from './MemberFormDrawer';
import { api } from '@/lib/api';

const packages = [
  { id: 'p1', name: '1 Month', durationMonths: 1, price: 1500 },
  { id: 'p3', name: '3 Months', durationMonths: 3, price: 4000 },
];

const renderDrawer = (props = {}) =>
  renderWithProviders(
    <MemberFormDrawer open onOpenChange={() => {}} member={null} {...props} />,
  );

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: packages } });
});

describe('MemberFormDrawer — add', () => {
  it('renders every field from SRS §2.2', async () => {
    renderDrawer();

    expect(await screen.findByRole('heading', { name: /add new member/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/package/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
  });

  it('keeps the price read-only so it cannot be typed over (SRS §2.3.2)', async () => {
    renderDrawer();
    expect(await screen.findByLabelText(/price/i)).toHaveAttribute('readonly');
  });

  it('fills the price automatically when a package is chosen (SRS §2.3.1)', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(await screen.findByLabelText(/package/i));
    await user.click(await screen.findByRole('option', { name: /3 months/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/price/i)).toHaveValue('₹4,000');
    });
  });

  it('previews the end date the membership will get', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.clear(screen.getByLabelText(/start date/i));
    await user.type(screen.getByLabelText(/start date/i), '2026-01-10');
    await user.click(await screen.findByLabelText(/package/i));
    await user.click(await screen.findByRole('option', { name: /3 months/i }));

    expect(await screen.findByText(/9 Apr 2026/)).toBeInTheDocument();
  });

  it('blocks submission until the mandatory fields are filled (SRS §2.3.5)', async () => {
    const post = vi.spyOn(api, 'post');
    const user = userEvent.setup();
    renderDrawer();

    await user.click(await screen.findByRole('button', { name: /^save$/i }));

    expect(await screen.findByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects a malformed email (SRS §6.2)', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.type(await screen.findByLabelText(/email/i), 'nope');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it('posts packageId and never a price', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { data: { id: 'm1', name: 'Priya Sharma' } } });
    const user = userEvent.setup();
    renderDrawer();

    await user.type(await screen.findByLabelText(/name/i), 'Priya Sharma');
    await user.type(screen.getByLabelText(/phone number/i), '9811111111');
    await user.click(screen.getByLabelText(/gender/i));
    await user.click(await screen.findByRole('option', { name: /female/i }));
    await user.click(screen.getByLabelText(/package/i));
    await user.click(await screen.findByRole('option', { name: /3 months/i }));
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());

    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/members');
    expect(body).toMatchObject({ name: 'Priya Sharma', gender: 'female', packageId: 'p3' });
    expect(body.price).toBeUndefined();
    expect(body.packagePrice).toBeUndefined();
  });
});

describe('MemberFormDrawer — edit', () => {
  const existing = {
    id: 'm1',
    name: 'Priya Sharma',
    phone: '9811111111',
    email: 'priya@example.com',
    gender: 'female',
    package: 'p3',
    packageName: '3 Months',
    packagePrice: 4000,
    startDate: '2026-01-10',
    endDate: '2026-04-09',
  };

  it('pre-fills the form from the member', async () => {
    renderDrawer({ member: existing });

    expect(await screen.findByRole('heading', { name: /edit member/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toHaveValue('Priya Sharma');
    expect(screen.getByLabelText(/email/i)).toHaveValue('priya@example.com');
    expect(screen.getByLabelText(/start date/i)).toHaveValue('2026-01-10');
  });

  it('PATCHes the existing member instead of creating a new one', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { data: existing } });
    const user = userEvent.setup();
    renderDrawer({ member: existing });

    await user.clear(await screen.findByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), 'Priya S.');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0][0]).toBe('/members/m1');
  });

  it('shows a server field error against the right input', async () => {
    vi.spyOn(api, 'patch').mockRejectedValue({
      response: {
        status: 409,
        data: { error: { message: 'A record with that email already exists' } },
      },
    });
    const user = userEvent.setup();
    renderDrawer({ member: existing });

    await user.click(await screen.findByRole('button', { name: /^save$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });
});
