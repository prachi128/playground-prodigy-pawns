'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — redirects to admin shell students page. */
export default function LegacyAdminStudentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/students');
  }, [router]);
  return null;
}
