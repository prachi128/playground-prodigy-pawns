'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { batchAPI, type Batch, type ClassSession } from '@/lib/api';
import api from '@/lib/api';
import {
  ClassSchedulePicker,
  batchToScheduleValue,
  type ClassScheduleValue,
} from '@/components/coach/ClassSchedulePicker';
import { batchScheduleLabel } from '@/lib/coach-schedule';
import {
  Plus,
  Users,
  ExternalLink,
  Loader2,
  X,
  Video,
  CalendarClock,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BatchStudent {
  student_id: number;
  student_name: string;
  student_username: string;
}

interface RosterRecord {
  student_id: number;
  student_name: string;
  student_username: string;
  expected_to_join: boolean;
  status: 'present' | 'absent' | 'not_marked';
  attendance_source?: 'auto_join' | 'coach_manual' | null;
  joined_at?: string | null;
  marked_at: string | null;
  notes?: string | null;
}

interface CoachBatchSessionsTabProps {
  batch: Batch;
  batchId: number;
  students: BatchStudent[];
  classes: ClassSession[];
  onClassesChange: (classes: ClassSession[]) => void;
  onBatchUpdated: (batch: Batch) => void;
  initialSessionId?: number | null;
}

const panel = 'rounded-xl border border-border bg-card shadow-sm';

export function CoachBatchSessionsTab({
  batch,
  batchId,
  students,
  classes,
  onClassesChange,
  onBatchUpdated,
  initialSessionId,
}: CoachBatchSessionsTabProps) {
  const [scheduleValue, setScheduleValue] = useState<ClassScheduleValue>(() =>
    batchToScheduleValue(batch),
  );
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [showMakeup, setShowMakeup] = useState(false);
  const [makeupForm, setMakeupForm] = useState({
    date: '',
    duration_minutes: String(batch.default_duration_minutes ?? 60),
    topic: 'Make-up session',
    meeting_link: batch.default_meeting_link ?? '',
    student_ids: [] as number[],
  });

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(initialSessionId ?? null);
  const [roster, setRoster] = useState<RosterRecord[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);

  useEffect(() => {
    setScheduleValue(batchToScheduleValue(batch));
    setMakeupForm((f) => ({
      ...f,
      duration_minutes: String(batch.default_duration_minutes ?? 60),
      meeting_link: batch.default_meeting_link ?? f.meeting_link,
    }));
  }, [batch]);

  useEffect(() => {
    if (initialSessionId) {
      void loadRoster(initialSessionId);
    }
  }, [initialSessionId]);

  const now = new Date();
  const upcomingClasses = classes.filter((c) => new Date(c.date) >= now);
  const pastClasses = classes.filter((c) => new Date(c.date) < now);

  const selectedSession = useMemo(
    () => classes.find((c) => c.id === selectedSessionId) ?? null,
    [classes, selectedSessionId],
  );

  const joiningCount = roster.filter((r) => r.expected_to_join).length;

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const updated = await batchAPI.update(batchId, {
        schedule_weekdays: scheduleValue.schedule_weekdays,
        schedule_time: scheduleValue.schedule_time || undefined,
        schedule_timezone: scheduleValue.schedule_timezone || undefined,
        default_duration_minutes: scheduleValue.default_duration_minutes,
        default_meeting_link: scheduleValue.default_meeting_link || undefined,
      } as Partial<Batch>);
      onBatchUpdated(updated);
      toast.success('Weekly schedule saved — your calendar is updated');
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleMakeup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!makeupForm.date) {
      toast.error('Date and time required');
      return;
    }
    if (makeupForm.student_ids.length === 0) {
      toast.error('Select at least one student');
      return;
    }
    try {
      const created = await batchAPI.createClass(batchId, {
        date: makeupForm.date,
        duration_minutes: parseInt(makeupForm.duration_minutes, 10) || 60,
        topic: makeupForm.topic || 'Make-up session',
        meeting_link: makeupForm.meeting_link || undefined,
        session_kind: 'makeup',
        student_ids: makeupForm.student_ids,
      });
      onClassesChange([created, ...classes]);
      setShowMakeup(false);
      setMakeupForm((f) => ({ ...f, date: '', student_ids: [] }));
      toast.success('Make-up session scheduled');
      void loadRoster(created.id);
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to schedule make-up');
    }
  };

  const loadRoster = async (sessionId: number) => {
    setRosterLoading(true);
    try {
      const res = await api.get(`/api/attendance/session/${sessionId}`);
      setRoster(res.data);
      setSelectedSessionId(sessionId);
    } catch {
      toast.error('Failed to load session roster');
    } finally {
      setRosterLoading(false);
    }
  };

  const toggleExpected = async (studentId: number, expected: boolean) => {
    if (!selectedSessionId) return;
    setTogglingId(studentId);
    try {
      await api.post(`/api/attendance/session/${selectedSessionId}/expected`, {
        student_id: studentId,
        expected_to_join: expected,
      });
      setRoster((prev) =>
        prev.map((r) => (r.student_id === studentId ? { ...r, expected_to_join: expected } : r)),
      );
    } catch {
      toast.error('Failed to update roster');
    } finally {
      setTogglingId(null);
    }
  };

  const markAttendance = async (studentId: number, status: 'present' | 'absent') => {
    if (!selectedSessionId) return;
    let notes: string | null = null;
    if (status === 'absent') {
      const input = window.prompt('Optional note (e.g. left early — medical)', '');
      if (input === null) return;
      notes = input.trim() || null;
    }
    setMarkingId(studentId);
    try {
      await api.post(`/api/attendance/session/${selectedSessionId}/mark`, {
        student_id: studentId,
        status,
        notes: status === 'absent' ? notes : null,
      });
      setRoster((prev) =>
        prev.map((r) =>
          r.student_id === studentId
            ? {
                ...r,
                status,
                attendance_source: 'coach_manual',
                marked_at: new Date().toISOString(),
                notes: status === 'absent' ? notes : null,
              }
            : r,
        ),
      );
    } catch {
      toast.error('Failed to mark attendance');
    } finally {
      setMarkingId(null);
    }
  };

  const openRecurringSlot = async (dateIso: string) => {
    try {
      const created = await batchAPI.openRecurringSlot(batchId, dateIso);
      const exists = classes.some((c) => c.id === created.id);
      if (!exists) onClassesChange([created, ...classes]);
      void loadRoster(created.id);
      toast.success('Session opened — mark who will join');
    } catch {
      toast.error('Failed to open session');
    }
  };

  const toggleMakeupStudent = (studentId: number) => {
    setMakeupForm((f) => ({
      ...f,
      student_ids: f.student_ids.includes(studentId)
        ? f.student_ids.filter((id) => id !== studentId)
        : [...f.student_ids, studentId],
    }));
  };

  return (
    <div className="space-y-6">
      <div className={`${panel} p-5`}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">Weekly schedule</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Sets when this class blocks your calendar each week. No payment details here — just
              your teaching time.
            </p>
            {batchScheduleLabel(batch) && (
              <p className="mt-2 text-sm font-medium text-primary">{batchScheduleLabel(batch)}</p>
            )}
          </div>
          <Link
            href="/coach/batches"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View full calendar
          </Link>
        </div>
        <ClassSchedulePicker value={scheduleValue} onChange={setScheduleValue} />
        <button
          type="button"
          onClick={handleSaveSchedule}
          disabled={savingSchedule}
          className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {savingSchedule ? 'Saving…' : 'Save weekly schedule'}
        </button>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setShowMakeup((s) => !s)}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/60"
        >
          <Plus className="h-4 w-4" /> Schedule make-up
        </button>
      </div>

      {showMakeup && (
        <form onSubmit={handleMakeup} className={`${panel} p-4`}>
          <h4 className="font-heading mb-3 font-semibold text-foreground">Make-up session</h4>
          <p className="mb-3 text-sm text-muted-foreground">
            For a student who missed class — pick who it&apos;s for and when to meet.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Date & time *
              </label>
              <input
                type="datetime-local"
                value={makeupForm.date}
                onChange={(e) => setMakeupForm({ ...makeupForm, date: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Topic</label>
              <input
                type="text"
                value={makeupForm.topic}
                onChange={(e) => setMakeupForm({ ...makeupForm, topic: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Zoom link</label>
              <input
                type="url"
                value={makeupForm.meeting_link}
                onChange={(e) => setMakeupForm({ ...makeupForm, meeting_link: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Students for this make-up *
            </p>
            <div className="flex flex-wrap gap-2">
              {students.map((s) => {
                const selected = makeupForm.student_ids.includes(s.student_id);
                return (
                  <button
                    key={s.student_id}
                    type="button"
                    onClick={() => toggleMakeupStudent(s.student_id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground hover:bg-muted/60'
                    }`}
                  >
                    {s.student_name || s.student_username}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Schedule make-up
            </button>
            <button
              type="button"
              onClick={() => setShowMakeup(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {upcomingClasses.length > 0 && (
        <div>
          <h3 className="font-heading mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming sessions
          </h3>
          <div className="space-y-2">
            {upcomingClasses.map((cls) => (
              <SessionRow
                key={cls.id}
                cls={cls}
                onManage={() => loadRoster(cls.id)}
                joiningCount={cls.expected_join_count}
              />
            ))}
          </div>
        </div>
      )}

      {batchRecurringHint(batch) && (
        <div className={`${panel} flex flex-wrap items-center justify-between gap-3 p-4`}>
          <div className="flex items-start gap-2 text-sm">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">
              Next weekly slot on your calendar — open it to mark who will join today.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = nextRecurringSlotDate(batch);
              if (next) void openRecurringSlot(next.toISOString());
            }}
            className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            Open this week&apos;s session
          </button>
        </div>
      )}

      {pastClasses.length > 0 && (
        <div>
          <h3 className="font-heading mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Past sessions
          </h3>
          <div className="space-y-2">
            {pastClasses.map((cls) => (
              <SessionRow key={cls.id} cls={cls} muted onManage={() => loadRoster(cls.id)} />
            ))}
          </div>
        </div>
      )}

      {classes.length === 0 && !batchRecurringHint(batch) && (
        <div className={`${panel} p-10 text-center text-muted-foreground`}>
          Set a weekly schedule above, or schedule a make-up session.
        </div>
      )}

      {selectedSessionId !== null && (
        <div className={`${panel} p-4`}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-base font-semibold text-foreground">
                {selectedSession?.session_kind === 'makeup' ? 'Make-up' : 'Session'} roster
                {selectedSession?.topic ? ` · ${selectedSession.topic}` : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                {joiningCount} of {roster.length} marked as joining · Students who tap{' '}
                <span className="font-medium">Join class</span> in the app are auto-marked present
                (you can override below).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSessionId(null);
                setRoster([]);
              }}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/60"
              aria-label="Close roster"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {rosterLoading ? (
            <div className="flex min-h-[120px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {roster.map((r) => (
                <div
                  key={r.student_id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {r.student_name}{' '}
                      <span className="font-normal text-muted-foreground">@{r.student_username}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {r.joined_at && (
                        <span>
                          Joined{' '}
                          {new Date(r.joined_at).toLocaleTimeString('en-IN', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                      {r.status !== 'not_marked' && r.attendance_source === 'auto_join' && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">
                          Auto
                        </span>
                      )}
                      {r.status !== 'not_marked' && r.attendance_source === 'coach_manual' && (
                        <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 font-medium">
                          Manual
                        </span>
                      )}
                      {r.notes && (
                        <span className="italic" title={r.notes}>
                          Note: {r.notes}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={r.expected_to_join}
                        disabled={togglingId === r.student_id}
                        onChange={(e) => void toggleExpected(r.student_id, e.target.checked)}
                        className="rounded border-input"
                      />
                      <span className="font-medium">Will join</span>
                    </label>
                    <div className="flex overflow-hidden rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => void markAttendance(r.student_id, 'present')}
                        disabled={markingId === r.student_id}
                        className={`px-3 py-1.5 text-sm font-semibold ${
                          r.status === 'present'
                            ? 'bg-[hsl(var(--green-medium))] text-white'
                            : 'bg-card hover:bg-muted/60'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => void markAttendance(r.student_id, 'absent')}
                        disabled={markingId === r.student_id}
                        className={`px-3 py-1.5 text-sm font-semibold ${
                          r.status === 'absent'
                            ? 'bg-destructive text-white'
                            : 'bg-card hover:bg-muted/60'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function batchRecurringHint(batch: Batch): boolean {
  return Boolean(batch.schedule_weekdays?.trim() || batch.schedule_time?.trim() || batch.schedule?.trim());
}

function nextRecurringSlotDate(batch: Batch): Date | null {
  const days = batch.schedule_weekdays
    ?.split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
  if (!days?.length) return null;
  const now = new Date();
  for (let offset = 0; offset < 8; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    if (!days.includes(d.getDay())) continue;
    if (batch.schedule_time) {
      const [h, m] = batch.schedule_time.split(':').map(Number);
      if (!Number.isNaN(h)) {
        d.setHours(h, m || 0, 0, 0);
      }
    }
    if (d >= now) return d;
  }
  return null;
}

function SessionRow({
  cls,
  muted,
  onManage,
  joiningCount,
}: {
  cls: ClassSession;
  muted?: boolean;
  onManage: () => void;
  joiningCount?: number;
}) {
  const isMakeup = cls.session_kind === 'makeup';
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between ${muted ? 'opacity-90' : ''}`}
    >
      <div>
        <p className="font-semibold text-foreground">
          {isMakeup && (
            <span className="mr-2 rounded bg-[hsl(var(--gold-light))] px-1.5 py-0.5 text-xs font-semibold text-[hsl(var(--gold-dark))]">
              Make-up
            </span>
          )}
          {cls.topic || 'Class session'}
        </p>
        <p className="text-sm text-muted-foreground">
          {new Date(cls.date).toLocaleString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}{' '}
          · {cls.duration_minutes} min
          {joiningCount != null ? ` · ${joiningCount} joining` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {cls.meeting_link && (
          <a
            href={cls.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-[hsl(var(--blue-dark))] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            <Video className="h-3.5 w-3.5" />
            Zoom
            <ExternalLink className="h-3 w-3 opacity-80" />
          </a>
        )}
        <button
          type="button"
          onClick={onManage}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted/60"
        >
          <Users className="h-4 w-4" />
          Who&apos;s joining
        </button>
      </div>
    </div>
  );
}
