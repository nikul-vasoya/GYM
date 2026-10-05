import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('hides the value until the toggle is pressed', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Secret" defaultValue="hunter2" />);

    const field = screen.getByLabelText('Secret');
    expect(field).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(field).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(field).toHaveAttribute('type', 'password');
  });

  it('names the toggle after the field it belongs to', () => {
    render(<PasswordInput aria-label="Secret" describes="new password" />);

    expect(screen.getByRole('button', { name: 'Show new password' })).toBeInTheDocument();
  });

  it('never submits the form it sits in', () => {
    render(
      <form>
        <PasswordInput aria-label="Secret" />
      </form>,
    );

    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('type', 'button');
  });
});
