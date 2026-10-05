import { Inbox } from 'lucide-react';

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }) => (
  <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
    <span className="relative grid size-14 place-items-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/20">
      <span
        aria-hidden
        className="absolute inset-0 rounded-2xl bg-primary/10 blur-lg"
      />
      <Icon className="relative size-6" />
    </span>

    <div className="space-y-1.5">
      <p className="font-display text-base font-semibold">{title}</p>
      {description && (
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
    </div>

    {action}
  </div>
);
