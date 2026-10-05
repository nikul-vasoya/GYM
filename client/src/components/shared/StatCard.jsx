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
    default: 'bg-primary/12 text-primary ring-primary/20',
    success: 'bg-success/12 text-success ring-success/20',
    warning: 'bg-warning/12 text-warning ring-warning/20',
    destructive: 'bg-destructive/12 text-destructive ring-destructive/20',
  };

  const glows = {
    default: 'from-primary/12',
    success: 'from-success/12',
    warning: 'from-warning/12',
    destructive: 'from-destructive/12',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
    >
      <Card className="group h-full transition-shadow duration-300 hover:elevated-lift">
        {/* Corner light, tinted to the tile's tone. Purely atmospheric. */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-gradient-to-br to-transparent opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100',
            glows[tone],
          )}
        />

        <CardContent className="relative flex items-center justify-between gap-4 px-5 py-1">
          <div className="min-w-0 space-y-1.5">
            <p className="eyebrow truncate">{label}</p>
            <p className="font-display text-[1.75rem] leading-none font-semibold tracking-tight tabular-nums">
              {shown}
            </p>
          </div>
          {Icon && (
            <span
              className={cn(
                'grid size-12 shrink-0 place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105',
                tones[tone],
              )}
            >
              <Icon className="size-5" />
            </span>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
