// app/(coach)/coach/teaching/page.tsx — Coach teaching workspace (interactive board)

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CoachTeachingBoard } from '@/components/coach/CoachTeachingBoard';

export default function CoachTeachingPage() {
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
      return;
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
    <div className="-mt-4 rounded-xl border border-border bg-card px-4 pb-4 pt-2 shadow-sm sm:px-6 sm:pb-6 sm:pt-3">
      <CoachTeachingBoard />
    </div>
  );
}
