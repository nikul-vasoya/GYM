import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { gymLoginUrl } from '@/lib/gymPaths';
import { cn } from '@/lib/utils';

/**
 * A gym's sign-in address with Copy and Open. The address shown is short;
 * what is copied is the full URL, ready to paste into a message to the owner.
 */
export const GymLoginUrl = ({ slug, name, className, showFull = false }) => {
  const [copied, setCopied] = useState(false);
  const url = gymLoginUrl(slug);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Sign-in link copied');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy. Select the link and copy it by hand.');
    }
  };

  return (
    <div className={cn('flex min-w-0 items-center gap-1', className)}>
      <code className="min-w-0 truncate rounded-md bg-secondary/60 px-2 py-1 font-mono text-xs text-foreground/85">
        {showFull ? url : `/${slug}/login`}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8"
        aria-label={`Copy sign-in link for ${name}`}
        onClick={copy}
      >
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </Button>
      <Button asChild variant="ghost" size="icon-sm" className="size-8">
        <a href={url} target="_blank" rel="noreferrer" aria-label={`Open sign-in page for ${name}`}>
          <ExternalLink className="size-4" />
        </a>
      </Button>
    </div>
  );
};
