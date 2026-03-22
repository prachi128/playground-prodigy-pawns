'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, CheckCircle2, Circle } from 'lucide-react';
import { assignmentAPI, type StudentAssignmentDetail } from '@/lib/api';
import { getDifficultyColor } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function StudentAssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = parseInt(params.id as string, 10);
  const [detail, setDetail] = useState<StudentAssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);

  const fetchDetail = useCallback(
    async (opts: { showSpinner?: boolean; isInitial?: boolean } = {}) => {
      const { showSpinner = false, isInitial = false } = opts;
      if (Number.isNaN(assignmentId)) {
        if (isInitial) router.push('/assignments');
        return;
      }
      if (showSpinner) setLoading(true);
      try {
        const data = await assignmentAPI.getStudentAssignmentDetail(assignmentId);
        lastFetchRef.current = Date.now();
        setDetail(data);
        router.refresh();
      } catch (e) {
        console.error(e);
        if (isInitial) {
          toast.error('Assignment not found');
          router.push('/assignments');
        }
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [assignmentId, router]
  );

  useEffect(() => {
    fetchDetail({ showSpinner: true, isInitial: true });
  }, [fetchDetail]);

  useEffect(() => {
    if (Number.isNaN(assignmentId)) return;

    const runBackgroundRefresh = () => {
      const now = Date.now();
      if (now - lastFetchRef.current < 400) return;
      lastFetchRef.current = now;
      fetchDetail({ showSpinner: false, isInitial: false });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        runBackgroundRefresh();
      }
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        runBackgroundRefresh();
      }
    };

    const onFocus = () => {
      runBackgroundRefresh();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', onFocus);
    };
  }, [assignmentId, fetchDetail]);

  if (loading || !detail) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/assignments"
        className="mb-4 inline-flex items-center gap-1 font-heading text-sm font-semibold text-primary hover:text-primary/90"
      >
        <ArrowLeft className="w-4 h-4" />
        All assignments
      </Link>

      <h1 className="font-heading text-2xl font-bold text-foreground">{detail.title}</h1>
      {detail.description ? (
        <p className="mt-2 font-sans text-sm text-muted-foreground">{detail.description}</p>
      ) : null}
      {detail.due_date ? (
        <p className="mt-1 font-sans text-xs text-muted-foreground">
          Due: {new Date(detail.due_date).toLocaleString()}
        </p>
      ) : null}

      <h2 className="mt-8 font-heading text-lg font-bold text-foreground">Puzzles</h2>
      <ul className="mt-3 space-y-2">
        {detail.puzzles.map((p) => (
          <li key={p.puzzle_id}>
            <Link
              href={`/puzzles/${p.puzzle_id}?assignment_id=${assignmentId}`}
              className="flex items-center gap-3 rounded-xl border-2 border-border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              {p.completed ? (
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" aria-hidden />
              ) : (
                <Circle className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-heading font-bold text-foreground">{p.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-heading text-xs font-bold capitalize ${getDifficultyColor(p.difficulty)}`}
                  >
                    {p.difficulty}
                  </span>
                  <span className="font-sans text-xs text-muted-foreground">{p.xp_reward} XP</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
