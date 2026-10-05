import { Check, Plus } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { ThemeSwatch } from './ThemeSwatch';
import { cn } from '@/lib/utils';

/**
 * Choose one theme from a grid. Keyboard and screen-reader friendly: it is a
 * radio group, each card a radio.
 *
 * @param {object} props
 * @param {Array} props.themes from `useThemes`
 * @param {string|null} props.value selected theme id
 * @param {(id: string) => void} props.onChange
 * @param {() => void} [props.onCreate] shows a "New theme" card when given
 */
export const ThemePicker = ({ themes, isLoading, value, onChange, onCreate, className }) => {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 gap-2.5 sm:grid-cols-3', className)}>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-12 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="Theme" className={cn('grid grid-cols-2 gap-2.5 sm:grid-cols-3', className)}>
      {themes?.map((theme) => {
        const isSelected = theme.id === value;

        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(theme.id)}
            className={cn(
              'relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
              isSelected
                ? 'border-primary/60 bg-primary/8 ring-1 ring-primary/40'
                : 'border-border hover:border-primary/35 hover:bg-accent/50',
            )}
          >
            <ThemeSwatch theme={theme} />
            <span className="min-w-0 flex-1 truncate font-medium">{theme.name}</span>
            {isSelected && <Check aria-hidden className="size-4 shrink-0 text-primary" />}
          </button>
        );
      })}

      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary"
        >
          <Plus className="size-4" />
          New theme
        </button>
      )}
    </div>
  );
};
