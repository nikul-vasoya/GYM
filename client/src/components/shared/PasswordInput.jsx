import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * A password field with a reveal toggle.
 *
 * `forwardRef` because react-hook-form's `register()` hands back a ref, and
 * the toggle is a `type="button"` so it never submits the form it sits in.
 *
 * The toggle is named "Show <describes>" / "Hide <describes>", so a screen
 * reader hears which field it belongs to when a form has two of them. That
 * name also matches a loose `getByLabelText(/password/i)`, so tests anchor
 * the pattern (`/^password/i`) to keep addressing the field itself.
 */
export const PasswordInput = forwardRef(({ className, describes = 'password', ...props }, ref) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={isVisible ? 'text' : 'password'}
        className={cn('pr-11', className)}
      />

      <button
        type="button"
        aria-label={`${isVisible ? 'Hide' : 'Show'} ${describes}`}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
        className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
