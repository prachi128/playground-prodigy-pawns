// app/(coach)/coach/analysis/page.tsx — Coach analysis board (Stockfish)

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import { CoachAnalysisBoard } from '@/components/coach/CoachAnalysisBoard';

export default function CoachAnalysisPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    useAuthStore.getState().loadSession();
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'coach' && user.role !== 'admin') {
      toast.error('Access denied. Coach privileges required.');
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-2">
      <CoachAnalysisBoard />
    </div>
  );
}
