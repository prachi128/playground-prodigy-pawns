// app/(parent)/layout.tsx - Parent App Layout (auth + parent only)

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ParentLayout as ParentShell } from '@/components/parent/parent-layout';

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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (user && user.role !== 'parent') return null;

  return <ParentShell>{children}</ParentShell>;
}
