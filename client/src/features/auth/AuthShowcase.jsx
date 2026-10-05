import {
  Building2,
  CalendarCheck2,
  Receipt,
  ShieldCheck,
  ToggleLeft,
  Users,
} from 'lucide-react';

import { AuthBrand } from './AuthBrand';

/**
 * Line-art gym equipment, drawn rather than photographed.
 *
 * A stock photo would fight the gold palette and add a megabyte to the login
 * screen; strokes in the brand gradient sit inside it. Everything is one
 * gradient and one stroke width, so it reads as a drawing, not clip art.
 */
const EquipmentArt = (props) => (
  <svg viewBox="0 0 640 640" fill="none" aria-hidden {...props}>
    <defs>
      <linearGradient id="auth-art-stroke" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--gold-1)" />
        <stop offset="55%" stopColor="var(--gold-2)" />
        <stop offset="100%" stopColor="var(--gold-3)" />
      </linearGradient>
    </defs>

    <g
      stroke="url(#auth-art-stroke)"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Weight plates, seen face on, as the backdrop. */}
      <g opacity="0.22">
        <circle cx="320" cy="320" r="252" />
        <circle cx="320" cy="320" r="206" />
        <circle cx="320" cy="320" r="150" />
        {[0, 45, 90, 135].map((angle) => (
          <line
            key={angle}
            x1="320"
            y1="70"
            x2="320"
            y2="170"
            transform={`rotate(${angle} 320 320)`}
          />
        ))}
        {[180, 225, 270, 315].map((angle) => (
          <line
            key={angle}
            x1="320"
            y1="70"
            x2="320"
            y2="170"
            transform={`rotate(${angle} 320 320)`}
          />
        ))}
      </g>

      {/* The dumbbell itself, tipped off the horizontal so it has some life. */}
      <g opacity="0.85" transform="rotate(-21 320 320)">
        <rect x="248" y="309" width="144" height="22" rx="11" />
        <line x1="286" y1="315" x2="286" y2="325" opacity="0.6" />
        <line x1="304" y1="315" x2="304" y2="325" opacity="0.6" />
        <line x1="322" y1="315" x2="322" y2="325" opacity="0.6" />
        <line x1="340" y1="315" x2="340" y2="325" opacity="0.6" />
        <line x1="358" y1="315" x2="358" y2="325" opacity="0.6" />

        <rect x="228" y="292" width="22" height="56" rx="8" />
        <rect x="390" y="292" width="22" height="56" rx="8" />

        <rect x="180" y="262" width="48" height="116" rx="16" />
        <rect x="412" y="262" width="48" height="116" rx="16" />

        <rect x="146" y="286" width="34" height="68" rx="12" />
        <rect x="460" y="286" width="34" height="68" rx="12" />
      </g>

      {/* A kettlebell and a stray plate, to break the symmetry. */}
      <g opacity="0.4">
        <path d="M120 520c0-24 18-42 42-42s42 18 42 42" />
        <path d="M204 520a42 44 0 1 1-84 0" />
        <circle cx="520" cy="150" r="46" />
        <circle cx="520" cy="150" r="14" />
      </g>
    </g>
  </svg>
);

/**
 * The two doors get different copy: a gym's staff and the platform operator
 * are looking at the same product from opposite ends.
 */
const CONTENT = {
  gym: {
    eyebrow: 'Gym management, end to end',
    headline: ['Run the floor,', 'not the paperwork.'],
    body: 'Memberships, renewals and running costs in one calm workspace built for the front desk.',
    highlights: [
      {
        icon: Users,
        title: 'Every member in one place',
        body: 'Search, filter and renew from a single roster.',
      },
      {
        icon: CalendarCheck2,
        title: 'Never miss a renewal',
        body: 'Expiry and follow-up lists, recalculated every day.',
      },
      {
        icon: Receipt,
        title: 'Costs at a glance',
        body: 'Monthly running costs and revenue, side by side.',
      },
    ],
  },
  platform: {
    eyebrow: 'Platform administration',
    headline: ['One platform,', 'every gym on it.'],
    body: 'Create a gym, hand its owner the keys, and let them run it. Their data stays theirs.',
    highlights: [
      {
        icon: Building2,
        title: 'Create a gym in one step',
        body: 'Its first administrator and packages come with it.',
      },
      {
        icon: ShieldCheck,
        title: 'Separated by design',
        body: 'No gym can see another gym, and neither can you.',
      },
      {
        icon: ToggleLeft,
        title: 'Suspend without deleting',
        body: 'Access stops at once; nothing is thrown away.',
      },
    ],
  },
};

/**
 * The left half of the signed-out screens: brand, promise, and what the
 * product does. The sign-in card sits opposite it.
 *
 * Hidden below `lg`: on a phone the form is the whole job, and a decorative
 * panel above it would only push the fields under the fold.
 */
export const AuthShowcase = ({ variant = 'gym' }) => {
  const { eyebrow, headline, body, highlights } = CONTENT[variant] ?? CONTENT.gym;

  return (
  <div className="relative hidden overflow-hidden border-r border-border/60 bg-sidebar lg:block">
    <div aria-hidden className="aura-wash grain pointer-events-none absolute inset-0" />

    {/* The artwork bleeds off the right edge so it reads as a window, not a sticker. */}
    <EquipmentArt
      aria-hidden
      className="pointer-events-none absolute -top-24 -right-28 h-[44rem] w-[44rem] opacity-90"
    />

    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[78%] bg-gradient-to-t from-sidebar from-45% via-sidebar/92 via-72% to-transparent"
    />

    <div className="relative flex h-full flex-col p-12 xl:p-16">
      {/* Brand lockup — on this column at desktop sizes, so the card opposite
          can be nothing but the form. */}
      <AuthBrand variant={variant} />

      <div className="mt-auto max-w-md space-y-4">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="font-display text-[2.5rem] leading-[1.1] font-semibold tracking-tight text-balance xl:text-[2.875rem]">
          {headline[0]}
          <br />
          {headline[1]}
        </h2>
        <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">{body}</p>
      </div>

      <div className="rule my-10 max-w-md" />

      <ul className="max-w-md space-y-5">
        {highlights.map(({ icon: Icon, title, body: line }) => (
          <li key={title} className="flex items-start gap-3.5">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Icon className="size-[1.125rem]" />
            </span>
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">{title}</span>
              <span className="block text-sm text-muted-foreground">{line}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  </div>
  );
};
