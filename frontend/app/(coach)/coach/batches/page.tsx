// app/(coach)/coach/batches/page.tsx - Batch Management

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { batchAPI, type Batch } from '@/lib/api';
import {
  Loader2,
  Plus,
  Users,
  Calendar,
  IndianRupee,
  ChevronRight,
  Search,
  Pencil,
  ChevronLeft,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import toast from 'react-hot-toast';

const cardBase =
  'rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/25 hover:shadow-md';
const PAGE_SIZE = 9;

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function CoachBatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', schedule: '', monthly_fee: '' });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    schedule: '',
    monthly_fee: '',
    is_active: true,
  });
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(true);
  const [page, setPage] = useState(1);

  const loadBatches = () => {
    setLoading(true);
    batchAPI
      .list()
      .then(setBatches)
      .catch(() => toast.error('Failed to load batches'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBatches();
  }, []);

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
      schedule: b.schedule ?? '',
      monthly_fee: b.monthly_fee ? Number(b.monthly_fee).toFixed(2) : '',
      is_active: b.is_active,
    });
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
        schedule: editForm.schedule.trim() || undefined,
        monthly_fee: editForm.monthly_fee ? parseFloat(editForm.monthly_fee) : 0,
        is_active: editForm.is_active,
      });
      setBatches((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
      toast.success('Batch updated');
      setEditingBatch(null);
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to update batch');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Batch name is required');
      return;
    }
    setCreating(true);
    try {
      await batchAPI.create({
        name: form.name,
        description: form.description || undefined,
        schedule: form.schedule || undefined,
        monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : 0,
      });
      toast.success('Batch created');
      setShowCreate(false);
      setForm({ name: '', description: '', schedule: '', monthly_fee: '' });
      loadBatches();
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading batches…</p>
        </div>
      </div>
    );
  }

  const activeCount = batches.filter((b) => b.is_active).length;

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-4 flex flex-col gap-4 border-b border-border/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Batch management
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Groups, schedules, and fee tracking. {activeCount} active
            {batches.length !== activeCount ? ` · ${batches.length - activeCount} archived` : ''}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" /> New batch
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batches…"
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
          Show archived batches
        </label>
      </div>

      {showCreate && (
        <div className={`${cardBase} mb-6 p-6`}>
          <h3 className="font-heading mb-4 text-lg font-bold text-card-foreground">Create batch</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Beginner batch A"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Schedule</label>
              <input
                type="text"
                value={form.schedule}
                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Mon / Wed / Fri 4–5 PM"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Monthly fee (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.monthly_fee}
                onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="1600.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Description</label>
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
                {creating ? 'Creating…' : 'Create batch'}
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
        {pageSlice.map((batch) => (
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
                <h3 className="font-heading truncate text-lg font-bold text-card-foreground">{batch.name}</h3>
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
                  title="Edit batch"
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
              {batch.schedule && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span className="truncate">{batch.schedule}</span>
                </span>
              )}
            </div>
            {batch.monthly_fee > 0 && (
              <div className="mt-2 flex items-center gap-1 text-sm font-medium text-primary">
                <IndianRupee className="h-4 w-4" aria-hidden />
                {formatInr(batch.monthly_fee)}/month
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-semibold text-foreground">{safePage}</span> of{' '}
            <span className="font-semibold text-foreground">{totalPages}</span> · {filtered.length} batches
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
            {batches.length === 0 ? 'No batches yet' : 'No matching batches'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {batches.length === 0
              ? 'Create a batch to organize students and schedules.'
              : 'Try a different search or show archived batches.'}
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
              Edit batch
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
              <div>
                <label className="mb-1 block text-sm font-semibold text-foreground">Schedule</label>
                <input
                  type="text"
                  value={editForm.schedule}
                  onChange={(e) => setEditForm({ ...editForm, schedule: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-foreground">Monthly fee (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.monthly_fee}
                  onChange={(e) => setEditForm({ ...editForm, monthly_fee: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-foreground">Description</label>
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
                  Active (visible for new assignments; archived batches stay read-only in lists)
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
