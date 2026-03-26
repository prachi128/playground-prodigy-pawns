'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, CheckCircle, XCircle, Clock3 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AttendanceSummary {
  total_sessions: number;
  present_count: number;
  absent_count: number;
  not_marked_count: number;
  attendance_pct: number;
}

interface AttendanceSession {
  session_id: number;
  date: string;
  topic: string | null;
  batch_name: string;
  status: 'present' | 'absent' | 'not_marked';
  notes: string | null;
}

interface AttendanceResponse {
  summary: AttendanceSummary;
  sessions: AttendanceSession[];
}

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StudentAttendancePage() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<AttendanceResponse>('/api/attendance/my');
        if (cancelled) return;
        setSummary(res.data.summary);
        setSessions(res.data.sessions ?? []);
      } catch {
        if (!cancelled) {
          toast.error('Failed to load attendance');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const streak = useMemo(() => {
    let count = 0;
    for (const s of sessions) {
      if (s.status === 'present') count += 1;
      else break;
    }
    return count;
  }, [sessions]);

  const attendancePct = Math.round(summary?.attendance_pct ?? 0);
  const attendanceColor =
    attendancePct >= 75
      ? 'text-[hsl(var(--green-medium))]'
      : attendancePct >= 50
        ? 'text-[hsl(var(--gold-dark))]'
        : 'text-destructive';

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">My Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track your class attendance record</p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border-2 border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classes attended</p>
          <p className="mt-2 font-heading text-2xl font-bold text-[hsl(var(--green-medium))]">
            {summary?.present_count ?? 0}
          </p>
        </div>
        <div className="rounded-xl border-2 border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classes missed</p>
          <p className="mt-2 font-heading text-2xl font-bold text-destructive">{summary?.absent_count ?? 0}</p>
        </div>
        <div className="rounded-xl border-2 border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendance rate</p>
          <p className={`mt-2 font-heading text-2xl font-bold ${attendanceColor}`}>{attendancePct}%</p>
        </div>
      </div>

      {streak >= 2 && (
        <div className="mb-5 rounded-xl border border-[hsl(var(--gold-dark))]/30 bg-[hsl(var(--gold-light))] px-4 py-3 text-sm font-semibold text-[hsl(var(--gold-dark))]">
          🔥 {streak} class streak! Keep it up!
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="rounded-xl border-2 border-border bg-card p-8 text-center text-muted-foreground">
          No classes scheduled yet.
          <br />
          Your attendance will appear here once your coach schedules classes.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className="flex items-center justify-between gap-4 rounded-xl border-2 border-border bg-card p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{formatSessionDate(session.date).replace(',', ' ·')}</p>
                <p className="font-heading text-base font-bold text-foreground">{session.topic || 'Chess Class'}</p>
                <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {session.batch_name}
                </span>
              </div>

              <div className="shrink-0">
                {session.status === 'present' ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--green-medium))]">
                    <CheckCircle className="h-4 w-4" />
                    Present
                  </span>
                ) : session.status === 'absent' ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive">
                    <XCircle className="h-4 w-4" />
                    Absent
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <Clock3 className="h-4 w-4" />
                    Not recorded
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

