'use client';

import { CoachLayout as CoachShell } from '@/components/coach/coach-layout';

export default function CoachRouteLayout({ children }: { children: React.ReactNode }) {
  return <CoachShell>{children}</CoachShell>;
}
