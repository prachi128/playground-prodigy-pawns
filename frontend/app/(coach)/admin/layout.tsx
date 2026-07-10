'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout as AdminShell } from '@/components/admin/admin-layout';

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.role !== 'admin') {
      toast.error('Admin privileges required.');
      router.replace('/coach');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role !== 'admin') return null;

  return <AdminShell>{children}</AdminShell>;
}
