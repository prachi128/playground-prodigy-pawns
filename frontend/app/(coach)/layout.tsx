// app/(coach)/layout.tsx - Coach App Layout (auth + coach/admin only)

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CoachLayout as CoachShell } from '@/components/coach/coach-layout';
import axios from 'axios';
import { coachAPI } from '@/lib/api';
import { CoachStatsContext, type CoachStatsData } from '@/contexts/coach-stats-context';
import { Inter } from 'next/font/google';

/** Clean geometric sans (bold titles) — matches coach dashboard reference */
const coachFont = Inter({
  subsets: ['latin'],
  variable: '--font-coach',
  display: 'swap',
});

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();
  const [coachStats, setCoachStats] = useState<CoachStatsData | null>(null);
  const [coachStatsLoading, setCoachStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { user: u, stats } = await coachAPI.bootstrap();
        if (cancelled) return;
        useAuthStore.getState().login(u);
        setCoachStats(stats as CoachStatsData);
      } catch (e) {
        if (cancelled) return;
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          toast.error('Access denied. Coach privileges required.');
          await useAuthStore.getState().loadSession();
          router.push('/dashboard');
          return;
        }
        useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
      } finally {
        if (!cancelled) setCoachStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'coach' && user.role !== 'admin') {
      toast.error('Access denied. Coach privileges required.');
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, authLoading, user, router]);

  if (authLoading) {
    return (
      <div
        className={`${coachFont.variable} coach-fonts antialiased fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50/80 via-slate-100 to-slate-200/90 backdrop-blur-md`}
        aria-busy="true"
        aria-label="Loading"
      >
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="font-semibold text-foreground/90">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (user && user.role !== 'coach' && user.role !== 'admin') return null;

  return (
    <CoachStatsContext.Provider value={{ stats: coachStats, statsLoading: coachStatsLoading }}>
      <div className={`${coachFont.variable} coach-fonts antialiased`}>
        <CoachShell>{children}</CoachShell>
      </div>
    </CoachStatsContext.Provider>
  );
}
