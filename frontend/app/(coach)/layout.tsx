// app/(coach)/layout.tsx - Staff auth (coach + admin roles)

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { coachAPI } from '@/lib/api';
import { CoachStatsContext, type CoachStatsData } from '@/contexts/coach-stats-context';
import { CoachThemeProvider } from '@/contexts/coach-theme-context';
import { Plus_Jakarta_Sans } from 'next/font/google';

const coachFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-coach',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export default function StaffLayout({
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
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'coach' && user.role !== 'admin') {
      toast.error('Access denied. Coach privileges required.');
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, user, router]);

  if (authLoading) {
    return (
      <div
        className={`${coachFont.variable} coach-fonts antialiased fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[hsl(220_14%_96%)]`}
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
      <CoachThemeProvider>
        <div className={`${coachFont.variable} coach-fonts antialiased`}>{children}</div>
      </CoachThemeProvider>
    </CoachStatsContext.Provider>
  );
}
