import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names, letting a later Tailwind class win over an earlier one.
 *
 * `cn('p-2', 'p-4')` → 'p-4'. Plain template strings would keep both and let
 * CSS source order decide, which is how "why won't this override" happens.
 */
export const cn = (...inputs) => twMerge(clsx(inputs));
