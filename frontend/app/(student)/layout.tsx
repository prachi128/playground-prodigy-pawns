// app/(student)/layout.tsx - Student App Layout (Dashboard Theme)

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Loader2 } from 'lucide-react';
import { Fredoka, Nunito } from 'next/font/google';

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-fredoka' })
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' })

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    useAuthStore.getState().loadSession();
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className={`${fredoka.variable} ${nunito.variable} dashboard-fonts min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50 flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const hideHeader = pathname?.startsWith('/puzzles') ?? false;

  return (
    <div className={`${fredoka.variable} ${nunito.variable} dashboard-fonts`}>
      <DashboardLayout hideHeader={hideHeader}>{children}</DashboardLayout>
    </div>
  );
}
