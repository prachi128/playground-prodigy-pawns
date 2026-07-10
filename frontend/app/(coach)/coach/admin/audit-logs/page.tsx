'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — redirects to admin shell audit logs page. */
export default function LegacyAdminAuditLogsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/audit-logs');
  }, [router]);
  return null;
}
