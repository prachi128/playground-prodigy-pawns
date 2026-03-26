// app/(parent)/layout.tsx - Parent App Layout (auth + parent only)

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ParentLayout as ParentShell } from '@/components/parent/parent-layout';
import { Inter } from 'next/font/google';

const parentFont = Inter({
  subsets: ['latin'],
  variable: '--font-parent',
  display: 'swap',
});

export default function ParentRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    useAuthStore.getState().loadSession();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'parent') {
      toast.error('Access denied. Parent account required.');
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, authLoading, user, router]);

  if (authLoading) {
    return (
      <div
        className={`${parentFont.variable} parent-fonts antialiased fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50/80 via-slate-100 to-slate-200/90 backdrop-blur-md`}
      >
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="font-semibold text-foreground/90">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (user && user.role !== 'parent') return null;

  return (
    <div className={`${parentFont.variable} parent-fonts antialiased`}>
      <ParentShell>{children}</ParentShell>
    </div>
  );
}
