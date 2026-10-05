import { CalendarCheck2 } from 'lucide-react';

import { MemberListingPage } from '@/components/shared/MemberListingPage';

export const ExpiryPage = () => (
  <MemberListingPage
    eyebrow="Renewals"
    title="Expiry"
    description="Memberships that have ended and not been renewed."
    status="expired"
    canRenew
    emptyState={{
      icon: CalendarCheck2,
      title: 'No expired memberships',
      description: 'Everyone currently on the books has an active membership.',
    }}
  />
);
