// Printable progress report for a student (opened from student detail "Generate Report")

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { batchAPI, type Batch } from '@/lib/api';

interface StudentDetails {
  id: number;
  username: string;
  email: string;
  xp: number;
  created_at: string;
  last_active: string;
  total_puzzles_attempted: number;
  total_puzzles_solved: number;
  success_rate: number;
  beginner_solved: number;
  intermediate_solved: number;
  advanced_solved: number;
  expert_solved: number;
  puzzles_this_week: number;
  xp_this_week: number;
  days_since_active: number;
  is_active?: boolean;
}

const row = 'flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0';
const label = 'text-muted-foreground';
const value = 'text-right font-medium tabular-nums text-foreground';

export default function StudentReportPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = parseInt(params.id as string, 10);
  const { isAuthenticated, user } = useAuthStore();

  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [batchName, setBatchName] = useState<string | null>(null);
  const [generatedAt] = useState(() => new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coach' && user?.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }
    if (Number.isNaN(studentId)) {
      router.push('/coach/students');
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const studentPromise = api.get(`/api/coach/students/${studentId}`);
        const batchesPromise = batchAPI.list().catch(() => [] as Batch[]);
        const [res, batches] = await Promise.all([studentPromise, batchesPromise]);
        if (cancelled) return;
        setStudent(res.data);

        let found: string | null = null;
        if (batches.length > 0) {
          const settled = await Promise.allSettled(
            batches.map(async (b) => {
              const list = await batchAPI.listStudents(b.id);
              return { batch: b, list };
            }),
          );
          for (const r of settled) {
            if (
              r.status === 'fulfilled' &&
              r.value.list.some((row) => row.student_id === studentId)
            ) {
              found = r.value.batch.name;
              break;
            }
          }
        }
        if (!cancelled) setBatchName(found);
      } catch {
        if (!cancelled) {
          toast.error('Failed to load report');
          router.push('/coach/students');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, router, studentId]);

  if (loading || !student) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading report…</p>
        </div>
      </div>
    );
  }

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  return (
    <>
      <style>{`
        @media print {
          [data-coach-shell] aside,
          [data-coach-shell] .coach-header-bar {
            display: none !important;
          }
          [data-coach-shell] .lg\\:pl-64,
          [data-coach-shell] .lg\\:pl-16 {
            padding-left: 0 !important;
          }
          [data-coach-shell] .max-w-7xl {
            max-width: 100% !important;
          }
        }
      `}</style>

      <div>
        <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
          <Link
            href={`/coach/students/${studentId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </button>
        </div>

        <header className="mb-8 border-b border-border pb-6">
          <p className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Prodigy Pawns — Coach report
          </p>
          {student.is_active === false && (
            <p className="mt-3 rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground print:border-foreground/20">
              Account status: <span className="font-semibold">deactivated</span> (historical snapshot)
            </p>
          )}
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Student progress report
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generated{' '}
            {generatedAt.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </header>

        <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-lg font-bold text-foreground">Student</h2>
          <dl className="mt-4 space-y-0">
            <div className={row}>
              <dt className={label}>Username</dt>
              <dd className={value}>{student.username}</dd>
            </div>
            <div className={row}>
              <dt className={label}>Email</dt>
              <dd className={`${value} break-all`}>{student.email}</dd>
            </div>
            {batchName ? (
              <div className={row}>
                <dt className={label}>Batch</dt>
                <dd className={value}>{batchName}</dd>
              </div>
            ) : null}
            <div className={row}>
              <dt className={label}>Member since</dt>
              <dd className={value}>{fmtDate(student.created_at)}</dd>
            </div>
            <div className={row}>
              <dt className={label}>Last activity</dt>
              <dd className={value}>{fmtDate(student.last_active)}</dd>
            </div>
            <div className={row}>
              <dt className={label}>Days since active</dt>
              <dd className={value}>{student.days_since_active}</dd>
            </div>
          </dl>
        </section>

        <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-lg font-bold text-foreground">Performance</h2>
          <dl className="mt-4 space-y-0">
            <div className={row}>
              <dt className={label}>Total XP</dt>
              <dd className={value}>{student.xp.toLocaleString()}</dd>
            </div>
            <div className={row}>
              <dt className={label}>XP this week</dt>
              <dd className={value}>{student.xp_this_week.toLocaleString()}</dd>
            </div>
            <div className={row}>
              <dt className={label}>Puzzles attempted</dt>
              <dd className={value}>{student.total_puzzles_attempted.toLocaleString()}</dd>
            </div>
            <div className={row}>
              <dt className={label}>Puzzles solved</dt>
              <dd className={value}>{student.total_puzzles_solved.toLocaleString()}</dd>
            </div>
            <div className={row}>
              <dt className={label}>Success rate</dt>
              <dd className={value}>{student.success_rate}%</dd>
            </div>
            <div className={row}>
              <dt className={label}>Attempts this week</dt>
              <dd className={value}>{student.puzzles_this_week.toLocaleString()}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-lg font-bold text-foreground">Solved by difficulty</h2>
          <dl className="mt-4 space-y-0">
            <div className={row}>
              <dt className={label}>Beginner</dt>
              <dd className={value}>{student.beginner_solved}</dd>
            </div>
            <div className={row}>
              <dt className={label}>Intermediate</dt>
              <dd className={value}>{student.intermediate_solved}</dd>
            </div>
            <div className={row}>
              <dt className={label}>Advanced</dt>
              <dd className={value}>{student.advanced_solved}</dd>
            </div>
            <div className={row}>
              <dt className={label}>Expert</dt>
              <dd className={value}>{student.expert_solved}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
