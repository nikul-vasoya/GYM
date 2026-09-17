import { PartyPopper } from 'lucide-react';

import { MemberListingPage } from '@/components/shared/MemberListingPage';

export const ActionRequiredPage = () => (
  <MemberListingPage
    title="Action Required"
    description="Memberships approaching expiry — 2 days ahead for 1-month packages, 5 days for 3, 6 and 12-month packages."
    status="expiring-soon"
    emptyState={{
      icon: PartyPopper,
      title: 'Nothing needs follow-up',
      description: 'No memberships are inside their reminder window right now.',
    }}
  />
);
