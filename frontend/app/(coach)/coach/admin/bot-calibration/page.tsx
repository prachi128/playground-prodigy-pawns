'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — redirects to admin shell bot calibration page. */
export default function LegacyAdminBotCalibrationRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/bot-calibration');
  }, [router]);
  return null;
}
