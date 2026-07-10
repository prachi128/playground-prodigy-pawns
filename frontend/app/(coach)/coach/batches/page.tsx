// app/(coach)/coach/batches/page.tsx - My classes (schedule + batches)

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { batchAPI, coachAPI, type Batch, type CoachUpcomingClass } from '@/lib/api';
import {
  buildCoachWeekSchedule,
  getBatchScheduleHints,
  upcomingSessionsInRange,
  batchRecurringDays,
} from '@/lib/coach-schedule';
import {
  ClassSchedulePicker,
  batchToScheduleValue,
  emptyScheduleValue,
} from '@/components/coach/ClassSchedulePicker';
import {
  Loader2,
  Plus,
  Users,
  Calendar,
  ChevronRight,
  Search,
  Pencil,
  ChevronLeft,
  Archive,
  ArchiveRestore,
  Video,
  ExternalLink,
  CalendarClock,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

const cardBase =
  'rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/25 hover:shadow-md';
const PAGE_SIZE = 9;

function formatClassDateTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return d.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function CalendarLegendTooltip() {
  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Calendar legend"
      >
        <Info className="h-4 w-4" />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute left-full top-0 z-10 ml-2 w-64 rounded-lg border border-border bg-card px-3 py-2 text-[12px] leading-snug text-foreground shadow-md group-hover:visible group-focus-within:visible"
      >
        <p>
          <span className="inline-block rounded border border-primary/25 bg-primary/5 px-1.5 py-0.5 font-medium text-primary">
            Highlighted
          </span>{' '}
          = one-off or make-up session
        </p>
        <p className="mt-1.5 text-muted-foreground">
          Plain blocks = your weekly time slot (blocks every week)
        </p>
      </div>
    </div>
  );
}

export default function CoachBatchesPage() {
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<CoachUpcomingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [createSchedule, setCreateSchedule] = useState(emptyScheduleValue);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const [editSchedule, setEditSchedule] = useState(emptyScheduleValue);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);

  const loadAll = () => {
    setLoading(true);
    Promise.all([batchAPI.list(), coachAPI.getUpcomingClasses(40)])
      .then(([batchList, classes]) => {
        setBatches(batchList);
        setUpcomingClasses(classes);
      })
      .catch(() => toast.error('Failed to load classes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const activeBatches = useMemo(() => batches.filter((b) => b.is_active), [batches]);
  const weekColumns = useMemo(
    () => buildCoachWeekSchedule(activeBatches, upcomingClasses),
    [activeBatches, upcomingClasses],
  );
  const scheduleHints = useMemo(() => getBatchScheduleHints(activeBatches), [activeBatches]);
  const nextSessions = useMemo(
    () => upcomingSessionsInRange(upcomingClasses, 14),
    [upcomingClasses],
  );

  const batchesWithoutSchedule = useMemo(
    () => activeBatches.filter((b) => batchRecurringDays(b).length === 0),
    [activeBatches],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = batches;
    if (!showArchived) {
      list = list.filter((b) => b.is_active);
    }
    if (!q) {
      return [...list].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
    return list
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q)) ||
          (b.schedule && b.schedule.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [batches, search, showArchived]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, showArchived]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openEdit = (b: Batch) => {
    setEditingBatch(b);
    setEditForm({
      name: b.name,
      description: b.description ?? '',
      is_active: b.is_active,
    });
    setEditSchedule(batchToScheduleValue(b));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch || !editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await batchAPI.update(editingBatch.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        schedule_weekdays: editSchedule.schedule_weekdays,
        schedule_time: editSchedule.schedule_time || undefined,
        schedule_timezone: editSchedule.schedule_timezone || undefined,
        default_duration_minutes: editSchedule.default_duration_minutes,
        default_meeting_link: editSchedule.default_meeting_link || undefined,
        is_active: editForm.is_active,
      } as Partial<Batch>);
      setBatches((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
      toast.success('Class updated');
      setEditingBatch(null);
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to update class');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Class name is required');
      return;
    }
    setCreating(true);
    try {
      await batchAPI.create({
        name: form.name,
        description: form.description || undefined,
        schedule_weekdays: createSchedule.schedule_weekdays,
        schedule_time: createSchedule.schedule_time || undefined,
        schedule_timezone: createSchedule.schedule_timezone || undefined,
        default_duration_minutes: createSchedule.default_duration_minutes,
        default_meeting_link: createSchedule.default_meeting_link || undefined,
      } as Partial<Batch> & { name: string });
      toast.success('Class created');
      setShowCreate(false);
      setForm({ name: '', description: '' });
      setCreateSchedule(emptyScheduleValue());
      loadAll();
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to create class');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading your schedule…</p>
        </div>
      </div>
    );
  }

  const activeCount = activeBatches.length;
  const weekHasItems = weekColumns.some((col) => col.items.length > 0);

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-6 flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            My classes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Your weekly schedule and class groups. {activeCount} active class
            {activeCount === 1 ? '' : 'es'}
            {batches.length !== activeCount
              ? ` · ${batches.length - activeCount} archived`
              : ''}
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" /> New class
        </button>
      </div>

      {/* Weekly schedule */}
      <section className="mb-8">
        <h2 className="font-heading mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
          <Calendar className="h-5 w-5 text-primary" aria-hidden />
          This week
          <CalendarLegendTooltip />
        </h2>

        {weekHasItems ? (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <div className="grid min-w-[640px] grid-cols-7 divide-x divide-border">
              {weekColumns.map((col) => (
                <div
                  key={col.date.toISOString()}
                  className={`min-h-[120px] ${col.isPast && !col.isToday ? 'bg-muted/20' : ''}`}
                >
                  <div
                    className={`border-b border-border px-2 py-2 text-center ${
                      col.isToday ? 'bg-primary/10' : 'bg-muted/30'
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        col.isToday ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {col.dayLabel}
                    </p>
                    <p
                      className={`text-sm font-bold ${
                        col.isToday ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {col.dateLabel}
                    </p>
                  </div>
                  <ul className="space-y-1.5 p-2">
                    {col.items.length === 0 ? (
                      <li className="px-1 py-2 text-center text-[10px] text-muted-foreground/60">
                        —
                      </li>
                    ) : (
                      col.items.map((item) => (
                        <li key={`${item.type}-${item.batchId}-${item.sessionId ?? item.label}`}>
                          <Link
                            href={item.href}
                            className={`block rounded-lg border px-2 py-1.5 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 ${
                              item.type === 'session'
                                ? 'border-primary/25 bg-primary/5'
                                : 'border-border/80 bg-background'
                            }`}
                          >
                            <p className="truncate text-[11px] font-semibold text-foreground">
                              {item.batchName}
                            </p>
                            {item.timeLabel && (
                              <p className="text-[10px] font-medium text-primary">{item.timeLabel}</p>
                            )}
                            <p className="line-clamp-2 text-[10px] text-muted-foreground">
                              {item.type === 'session' ? item.label : item.label}
                            </p>
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <CalendarClock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No schedule on the calendar yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a recurring schedule to each class (e.g. &quot;Mon / Wed 4–5 PM&quot;) and schedule
              Zoom sessions under Classes.
            </p>
          </div>
        )}

      </section>

      {/* Upcoming sessions */}
      {nextSessions.length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading mb-3 text-lg font-bold text-foreground">Upcoming sessions</h2>
          <ul className="space-y-2">
            {nextSessions.slice(0, 8).map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {session.batch_name ?? 'Class'}
                    {session.topic ? (
                      <span className="font-normal text-muted-foreground"> · {session.topic}</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatClassDateTime(session.date)}
                    {session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {session.meeting_link ? (
                    <a
                      href={session.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--blue-dark))] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Join Zoom
                      <ExternalLink className="h-3 w-3 opacity-80" />
                    </a>
                  ) : (
                    <Link
                      href={`/coach/batches/${session.batch_id}?tab=classes`}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/60"
                    >
                      Add Zoom link
                    </Link>
                  )}
                  <Link
                    href={`/coach/batches/${session.batch_id}?tab=classes`}
                    className="inline-flex items-center gap-0.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary hover:bg-muted/60"
                  >
                    Details
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {batchesWithoutSchedule.length > 0 && (
        <div className="mb-6 rounded-xl border border-[hsl(var(--gold-medium))]/35 bg-[hsl(var(--gold-light))]/30 px-4 py-3 text-sm">
          <p className="font-semibold text-[hsl(var(--gold-dark))]">
            {batchesWithoutSchedule.length} class{batchesWithoutSchedule.length === 1 ? '' : 'es'}{' '}
            without a recurring schedule
          </p>
          <p className="mt-0.5 text-muted-foreground">
            {batchesWithoutSchedule.map((b) => b.name).join(', ')} — edit the class to add when it
            usually meets.
          </p>
        </div>
      )}

      {/* Class list */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-lg font-bold text-foreground">All classes</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classes…"
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-input"
            />
            Show archived
          </label>
        </div>
      </div>

      {showCreate && (
        <div className={`${cardBase} mb-6 p-6`}>
          <h3 className="font-heading mb-4 text-lg font-bold text-card-foreground">Create class</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Beginner Group A"
                required
              />
            </div>
            <div className="md:col-span-2">
              <ClassSchedulePicker value={createSchedule} onChange={setCreateSchedule} compact />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-foreground">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Ages 6–8, foundations"
              />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create class'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-border bg-muted px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pageSlice.map((batch) => {
          const hint = scheduleHints.find((h) => h.batch.id === batch.id);
          return (
            <div
              key={batch.id}
              className={`${cardBase} cursor-pointer p-5 ${!batch.is_active ? 'opacity-75' : ''}`}
              onClick={() => router.push(`/coach/batches/${batch.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/coach/batches/${batch.id}`);
                }
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-heading truncate text-lg font-bold text-card-foreground">
                    {batch.name}
                  </h3>
                  {!batch.is_active && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      <Archive className="h-3 w-3" /> Archived
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Edit class"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(batch);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              {batch.description && (
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{batch.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4 shrink-0" /> {batch.student_count ?? 0} students
                </span>
              </div>
              {batch.schedule ? (
                <p className="mt-2 inline-flex items-start gap-1.5 text-sm text-foreground">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {hint?.meetsToday && (
                      <span className="font-semibold text-[hsl(var(--gold-dark))]">Today · </span>
                    )}
                    {!hint?.meetsToday && hint?.nextDayLabel && (
                      <span className="text-muted-foreground">Next {hint.nextDayLabel} · </span>
                    )}
                    {batch.schedule}
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-xs text-[hsl(var(--gold-dark))]">No recurring schedule set</p>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-semibold text-foreground">{safePage}</span> of{' '}
            <span className="font-semibold text-foreground">{totalPages}</span> · {filtered.length}{' '}
            classes
          </p>
          <div className="flex overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-9 w-9 items-center justify-center border-r border-border transition-colors hover:bg-muted disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-9 w-9 items-center justify-center transition-colors hover:bg-muted disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card py-16 text-center shadow-sm">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="font-heading text-lg text-muted-foreground">
            {batches.length === 0 ? 'No classes yet' : 'No matching classes'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {batches.length === 0
              ? 'Create a class to organize students and your teaching schedule.'
              : 'Try a different search or show archived classes.'}
          </p>
        </div>
      )}

      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-batch-title"
          >
            <h2 id="edit-batch-title" className="font-heading mb-4 text-xl font-bold text-card-foreground">
              Edit class
            </h2>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-foreground">Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="space-y-3">
                <ClassSchedulePicker value={editSchedule} onChange={setEditSchedule} compact />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-foreground">
                  Description <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="rounded border-input"
                />
                <span className="inline-flex items-center gap-1">
                  {editForm.is_active ? (
                    <ArchiveRestore className="h-4 w-4 text-primary" />
                  ) : (
                    <Archive className="h-4 w-4 text-muted-foreground" />
                  )}
                  Active (archived classes stay read-only in lists)
                </span>
              </label>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {savingEdit ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="rounded-xl border border-border bg-muted px-5 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
