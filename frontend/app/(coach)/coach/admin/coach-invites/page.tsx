'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — redirects to admin shell coach invites page. */
export default function LegacyAdminCoachInvitesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/coach-invites');
  }, [router]);
  return null;
}
