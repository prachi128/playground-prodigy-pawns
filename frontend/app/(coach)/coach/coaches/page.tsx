'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — redirects to admin coaches page. */
export default function LegacyCoachCoachesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/coaches');
  }, [router]);
  return null;
}
