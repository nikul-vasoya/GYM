import { Inbox } from 'lucide-react';

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }) => (
  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
    <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
      <Icon className="size-6" />
    </span>
    <div className="space-y-1">
      <p className="font-medium">{title}</p>
      {description && (
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    {action}
  </div>
);
