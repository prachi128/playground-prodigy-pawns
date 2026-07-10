// app/(parent)/parent/children/[id]/page.tsx - Child profile & progress report

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { parentAPI, ParentChildProfile } from '@/lib/api';
import { usernameInitial } from '@/lib/avatar';
import { StudentProgressReport } from '@/components/student/student-progress-report';
import { formatInr, isBillableChild, paymentDueLabel } from '@/lib/parent-billing';
import { ArrowLeft, Loader2, Printer, Trophy, TrendingUp, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ParentChildProfilePage() {
  const params = useParams();
  const router = useRouter();
  const childId = parseInt(params.id as string, 10);
  const [profile, setProfile] = useState<ParentChildProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Number.isNaN(childId)) {
      router.push('/parent/children');
      return;
    }
    parentAPI
      .getChildProfile(childId)
      .then(setProfile)
      .catch(() => {
        toast.error('Failed to load child profile');
        router.push('/parent');
      })
      .finally(() => setLoading(false));
  }, [childId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/parent"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 print:hidden"
        >
          <Printer className="h-4 w-4" />
          Print report
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm print:hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-6 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
              {usernameInitial(profile.username)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{profile.full_name}</h1>
              <p className="text-emerald-100">@{profile.username}</p>
              {profile.batch_name && (
                <p className="mt-1 text-sm text-emerald-100">Batch: {profile.batch_name}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/15 px-3 py-2">
                <Trophy className="mx-auto mb-1 h-4 w-4" />
                <p className="text-lg font-bold">{profile.rating}</p>
                <p className="text-xs text-emerald-100">Rating</p>
              </div>
              <div className="rounded-xl bg-white/15 px-3 py-2">
                <TrendingUp className="mx-auto mb-1 h-4 w-4" />
                <p className="text-lg font-bold">{profile.level}</p>
                <p className="text-xs text-emerald-100">Level</p>
              </div>
              <div className="rounded-xl bg-white/15 px-3 py-2">
                <Zap className="mx-auto mb-1 h-4 w-4" />
                <p className="text-lg font-bold">{profile.total_xp.toLocaleString()}</p>
                <p className="text-xs text-emerald-100">XP</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 border-t border-gray-100 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Rank</p>
            <p className="font-semibold text-gray-800">{profile.level_category || 'Pawn'}</p>
          </div>
          {isBillableChild(profile) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Payment</p>
              <p className="font-semibold capitalize text-gray-800">{profile.payment_status}</p>
              {profile.monthly_fee != null && profile.payment_status !== 'paid' && (
                <p className="text-sm text-gray-600">Fee: {formatInr(profile.monthly_fee)}</p>
              )}
              {paymentDueLabel(profile) && (
                <p className="text-xs text-gray-500">{paymentDueLabel(profile)}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <StudentProgressReport
        student={profile.report}
        batchName={profile.batch_name}
        reportLabel="Torus Chess — Parent report"
      />
    </div>
  );
}
