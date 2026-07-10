'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — redirects to admin coach accounts page. */
export default function LegacyAdminCoachesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/coach-accounts');
  }, [router]);
  return null;
}
