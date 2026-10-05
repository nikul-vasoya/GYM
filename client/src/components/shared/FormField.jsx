import { useId } from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Label + control + error message, wired together for screen readers.
 *
 * `children` is a render prop receiving the generated id and aria props, so
 * it works with an Input, a Select, a textarea — anything.
 */
export const FormField = ({ label, error, hint, required, className, children }) => {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={id}
        className="text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase"
      >
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </Label>

      {children({
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': error ? errorId : undefined,
      })}

      {error ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
};
