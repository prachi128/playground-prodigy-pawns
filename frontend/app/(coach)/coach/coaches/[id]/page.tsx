'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminCoachProfilePath } from '@/lib/admin-coach-path';

/** Legacy route — redirects to admin coach detail. */
export default function LegacyCoachDetailRedirect() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const username = decodeURIComponent(params.id ?? '');

  useEffect(() => {
    if (username) {
      router.replace(adminCoachProfilePath(username));
    } else {
      router.replace('/admin/coaches');
    }
  }, [router, username]);

  return null;
}
