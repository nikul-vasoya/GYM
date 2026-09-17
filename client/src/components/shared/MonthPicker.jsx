import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Native month input — no dependency, and the OS picker is already familiar. */
export const MonthPicker = ({ id = 'month-filter', label = 'Filter by month', value, onChange }) => (
  <div className="flex items-center gap-2">
    <Label htmlFor={id} className="whitespace-nowrap text-sm text-muted-foreground">
      {label}
    </Label>
    <Input
      id={id}
      type="month"
      className="w-[170px]"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);
