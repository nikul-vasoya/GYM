import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Counts from 0 to `value` — the small flourish that makes a dashboard feel alive. */
const useCountUp = (value, durationMs = 700) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (typeof value !== 'number') return undefined;

    const prefersReducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) {
      setDisplay(value);
      return undefined;
    }

    let frame;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / durationMs, 1);
      // Ease-out cubic: fast start, gentle settle.
      setDisplay(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return display;
};

export const StatCard = ({ label, value, icon: Icon, tone = 'default', format, delay = 0 }) => {
  const counted = useCountUp(typeof value === 'number' ? value : 0);
  const shown = format ? format(counted) : counted;

  const tones = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="elevated">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{shown}</p>
          </div>
          {Icon && (
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', tones[tone])}>
              <Icon className="size-5" />
            </span>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
