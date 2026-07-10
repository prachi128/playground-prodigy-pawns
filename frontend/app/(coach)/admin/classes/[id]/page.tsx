// app/(coach)/admin/classes/[id]/page.tsx — Admin class detail

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  batchAPI,
  coachAPI,
  type Batch,
  type ClassSession,
  type AnnouncementItem,
  type StudentBatchInfo,
  type PaymentStatusOverview,
  type User,
} from '@/lib/api';
import api from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  Users,
  Calendar,
  Megaphone,
  CreditCard,
  Plus,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  X,
  Search,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Archive,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { CoachBatchSessionsTab } from '@/components/coach/CoachBatchSessionsTab';
import { adminStudentProfilePath } from '@/lib/admin-student-path';

type Tab = 'students' | 'classes' | 'announcements' | 'payments';
type CoachStudentStatsLite = { id: number; xp: number; success_rate: number };
type BulkStudentDraft = {
  first_name: string;
  last_name: string;
  username: string;
  guardian_email: string;
  age: string;
  gender: string;
  password: string;
};

const panel = 'rounded-xl border border-border bg-card shadow-sm';
const STUDENT_PAGE = 10;

function createEmptyBulkStudentDraft(): BulkStudentDraft {
  return {
    first_name: '',
    last_name: '',
    username: '',
    guardian_email: '',
    age: '',
    gender: '',
    password: '',
  };
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const VALID_TABS: Tab[] = ['students', 'classes', 'announcements', 'payments'];

export default function AdminClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchId = Number(params.id);

  const tabFromUrl = searchParams.get('tab');
  const sessionFromUrl = searchParams.get('session');
  const initialSessionId = sessionFromUrl ? parseInt(sessionFromUrl, 10) : null;
  const resolvedTab =
    tabFromUrl && VALID_TABS.includes(tabFromUrl as Tab) ? (tabFromUrl as Tab) : 'students';
  const initialTab: Tab = resolvedTab;

  const [batch, setBatch] = useState<Batch | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState<StudentBatchInfo[]>([]);
  const [allCoachStudents, setAllCoachStudents] = useState<CoachStudentStatsLite[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState('chess123');
  const [bulkStudents, setBulkStudents] = useState<BulkStudentDraft[]>([
    createEmptyBulkStudentDraft(),
  ]);
  const [bulkResult, setBulkResult] = useState<import('@/lib/api').BulkStudentCreateResponse | null>(null);
  const [studentPage, setStudentPage] = useState(1);
  const [removeId, setRemoveId] = useState<number | null>(null);

  const [classes, setClasses] = useState<ClassSession[]>([]);

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [showAddAnn, setShowAddAnn] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', message: '' });

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusOverview | null>(null);
  const [paymentLoaded, setPaymentLoaded] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [showEditBatch, setShowEditBatch] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    schedule: '',
    monthly_fee: '',
    is_active: true,
  });
  const [savingBatch, setSavingBatch] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setPaymentLoaded(false);
    setPaymentStatus(null);
    try {
      const [batchRes, studentsRes, classesRes, announcementsRes, coachStudentsRes] = await Promise.allSettled([
        batchAPI.get(batchId),
        batchAPI.listStudents(batchId),
        batchAPI.listClasses(batchId),
        batchAPI.listAnnouncements(batchId),
        coachAPI.getStudents(),
      ]);

      if (
        batchRes.status !== 'fulfilled' ||
        studentsRes.status !== 'fulfilled' ||
        classesRes.status !== 'fulfilled' ||
        announcementsRes.status !== 'fulfilled'
      ) {
        throw new Error('Failed to load batch');
      }

      const b = batchRes.value;
      const s = studentsRes.value;
      const c = classesRes.value;
      const a = announcementsRes.value;
      setBatch(b);
      setStudents(s);
      setClasses(c);
      setAnnouncements(a);

      if (coachStudentsRes.status === 'fulfilled') {
        const list = Array.isArray(coachStudentsRes.value) ? coachStudentsRes.value : [];
        const normalized = list
          .filter((u): u is User & { success_rate?: number } => typeof u?.id === 'number')
          .map((u) => ({
            id: u.id,
            xp: typeof u.xp === 'number' ? u.xp : 0,
            success_rate: typeof u.success_rate === 'number' ? u.success_rate : 0,
          }));
        setAllCoachStudents(normalized);
      } else {
        setAllCoachStudents([]);
      }

      if (b) {
        setEditForm({
          name: b.name,
          description: b.description ?? '',
          schedule: b.schedule ?? '',
          monthly_fee: b.monthly_fee ? Number(b.monthly_fee).toFixed(2) : '',
          is_active: b.is_active,
        });
      }
    } catch {
      toast.error('Failed to load batch');
      router.push('/admin/classes');
    } finally {
      setLoading(false);
    }
  }, [batchId, router]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (activeTab !== 'payments' || paymentLoaded) return;
    let cancelled = false;

    (async () => {
      setPaymentLoading(true);
      try {
        const data = await batchAPI.getPaymentStatus(batchId);
        if (cancelled) return;
        setPaymentStatus(data);
        setPaymentLoaded(true);
      } catch {
        if (!cancelled) {
          toast.error('Failed to load payment status');
        }
      } finally {
        if (!cancelled) {
          setPaymentLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, paymentLoaded, batchId]);

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch || !editForm.name.trim()) return;
    setSavingBatch(true);
    try {
      const updated = await batchAPI.update(batch.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        schedule: editForm.schedule.trim() || undefined,
        monthly_fee: editForm.monthly_fee ? parseFloat(editForm.monthly_fee) : undefined,
        is_active: editForm.is_active,
      });
      setBatch(updated);
      toast.success('Batch updated');
      setShowEditBatch(false);
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to update');
    } finally {
      setSavingBatch(false);
    }
  };

  const handleAddStudent = async (studentId: number) => {
    try {
      await batchAPI.addStudent(batchId, studentId);
      toast.success('Student added');
      setShowAddStudent(false);
      setSearchQuery('');
      const updated = await batchAPI.listStudents(batchId);
      setStudents(updated);
      const b = await batchAPI.get(batchId);
      setBatch(b);
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to add student');
    }
  };

  const updateBulkStudent = (
    index: number,
    field: keyof BulkStudentDraft,
    value: string,
  ) => {
    setBulkStudents((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    );
  };

  const addBulkStudentRow = () => {
    setBulkStudents((prev) => [...prev, createEmptyBulkStudentDraft()]);
  };

  const removeBulkStudentRow = (index: number) => {
    setBulkStudents((prev) => (prev.length === 1 ? [createEmptyBulkStudentDraft()] : prev.filter((_, i) => i !== index)));
  };

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkDefaultPassword || bulkDefaultPassword.length < 4) {
      toast.error('Default password must be at least 4 characters');
      return;
    }

    const rows = bulkStudents
      .map((row) => ({
        first_name: row.first_name.trim(),
        last_name: row.last_name.trim(),
        username: row.username.trim(),
        guardian_email: row.guardian_email.trim(),
        age: row.age.trim(),
        gender: row.gender.trim(),
        password: row.password.trim(),
      }))
      .filter((row) => Object.values(row).some(Boolean));

    if (rows.length === 0) {
      toast.error('Add at least one student row');
      return;
    }

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!row.first_name || !row.last_name || !row.username) {
        toast.error(`Student ${index + 1}: first name, last name, and username are required`);
        return;
      }
      if (row.password && row.password.length < 4) {
        toast.error(`Student ${index + 1}: password must be at least 4 characters`);
        return;
      }
      if (row.age && Number.isNaN(Number(row.age))) {
        toast.error(`Student ${index + 1}: age must be a number`);
        return;
      }
    }

    setBulkCreating(true);
    try {
      const result = await batchAPI.bulkCreateStudents(batchId, {
        students: rows.map((row) => ({
          first_name: row.first_name,
          last_name: row.last_name,
          username: row.username,
          guardian_email: row.guardian_email || undefined,
          age: row.age ? Number(row.age) : undefined,
          gender: row.gender || undefined,
          password: row.password || undefined,
        })),
        default_password: bulkDefaultPassword,
      });
      setBulkResult(result);
      setBulkStudents([createEmptyBulkStudentDraft()]);
      const updated = await batchAPI.listStudents(batchId);
      setStudents(updated);
      const b = await batchAPI.get(batchId);
      setBatch(b);
      toast.success(`Created ${result.created.length} student account(s)`);
      if (result.warnings.length > 0) {
        toast.error(`${result.warnings.length} warning(s) — check guardian emails`);
      }
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Bulk create failed');
    } finally {
      setBulkCreating(false);
    }
  };

  const confirmRemove = async () => {
    if (removeId == null) return;
    try {
      await batchAPI.removeStudent(batchId, removeId);
      toast.success('Student removed');
      setStudents((prev) => prev.filter((s) => s.student_id !== removeId));
      setRemoveId(null);
      const b = await batchAPI.get(batchId);
      setBatch(b);
    } catch {
      toast.error('Failed to remove student');
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.title.trim() || !annForm.message.trim()) {
      toast.error('Title and message required');
      return;
    }
    try {
      const newAnn = await batchAPI.createAnnouncement(batchId, annForm);
      setAnnouncements([newAnn, ...announcements]);
      setShowAddAnn(false);
      setAnnForm({ title: '', message: '' });
      toast.success('Announcement posted');
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to post');
    }
  };

  const searchStudents = useCallback(async () => {
    if (searchQuery.length < 2) return;
    try {
      const results = await coachAPI.getStudents();
      const list = Array.isArray(results) ? results : [];
      setAllStudents(
        list.filter(
          (u: User) =>
            (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())),
        ),
      );
    } catch {
      setAllStudents([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (showAddStudent && searchQuery.length >= 2) {
      const t = setTimeout(searchStudents, 300);
      return () => clearTimeout(t);
    }
  }, [searchQuery, showAddStudent, searchStudents]);

  const totalStudentPages = Math.max(1, Math.ceil(students.length / STUDENT_PAGE));
  const safeStudentPage = Math.min(studentPage, totalStudentPages);
  const studentSlice = students.slice(
    (safeStudentPage - 1) * STUDENT_PAGE,
    safeStudentPage * STUDENT_PAGE,
  );
  const batchStats = useMemo(() => {
    const batchStudentDetails = allCoachStudents.filter((s) =>
      students.some((bs) => bs.student_id === s.id),
    );
    if (batchStudentDetails.length === 0) return null;

    const totalXP = batchStudentDetails.reduce((acc, s) => acc + s.xp, 0);
    const totalAccuracy = batchStudentDetails.reduce((acc, s) => acc + s.success_rate, 0);
    const count = batchStudentDetails.length;

    return {
      avgXP: Math.round(totalXP / count),
      avgAccuracy: Math.round((totalAccuracy / count) * 10) / 10,
      count,
    };
  }, [students, allCoachStudents]);

  useEffect(() => {
    setStudentPage(1);
  }, [students.length]);

  if (loading || !batch) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading batch…</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { key: 'students', label: 'Students', icon: Users, count: students.length },
    { key: 'classes', label: 'Sessions', icon: Calendar, count: classes.length },
    { key: 'announcements', label: 'News', icon: Megaphone, count: announcements.length },
    {
      key: 'payments' as const,
      label: 'Payments',
      icon: CreditCard,
      count: paymentStatus?.overdue_count,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 border-b border-border/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => router.push('/admin/classes')}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
            All academy classes
          </button>
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {batch.name}
            </h1>
            {!batch.is_active && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                <Archive className="h-3 w-3" /> Archived
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {batch.schedule && <span>{batch.schedule} · </span>}
            {batch.monthly_fee != null && batch.monthly_fee > 0 && (
              <span>{formatInr(batch.monthly_fee)}/month · </span>
            )}
            {students.length} students
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setShowEditBatch(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/60"
          >
            <Pencil className="h-4 w-4" />
            Edit class
          </button>
        </div>
      </div>

      {batchStats && batchStats.count > 0 && (
        <div className="mb-6 flex gap-3">
          <div className={`${panel} flex-1 p-3`}>
            <p className="font-heading text-xl font-bold text-[hsl(var(--gold-dark))]">{batchStats.avgXP}</p>
            <p className="text-xs text-muted-foreground">Avg XP</p>
          </div>
          <div className={`${panel} flex-1 p-3`}>
            <p className="font-heading text-xl font-bold text-[hsl(var(--green-medium))]">
              {batchStats.avgAccuracy}%
            </p>
            <p className="text-xs text-muted-foreground">Avg accuracy</p>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:min-w-[120px] sm:flex-none ${
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  tab.key === 'payments' && (paymentStatus?.overdue_count ?? 0) > 0
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'students' && (
        <div>
          <div className="mb-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowBulkCreate((s) => !s);
                setShowAddStudent(false);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/60"
            >
              <Plus className="h-4 w-4" /> Bulk create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddStudent((s) => !s);
                setShowBulkCreate(false);
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add existing
            </button>
          </div>

          {showBulkCreate && (
            <div className={`${panel} mb-4 p-4 space-y-4`}>
              <div>
                <h3 className="font-semibold text-foreground">Bulk create student accounts</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Fill one row per student. Guardian email helps parent accounts auto-link, and individual passwords are optional.
                </p>
              </div>
              <form onSubmit={handleBulkCreate} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Default password for all students *
                  </label>
                  <input
                    type="text"
                    value={bulkDefaultPassword}
                    onChange={(e) => setBulkDefaultPassword(e.target.value)}
                    className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    minLength={4}
                    required
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-foreground">Students</label>
                    <button
                      type="button"
                      onClick={addBulkStudentRow}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add another
                    </button>
                  </div>
                  <div className="space-y-3">
                    {bulkStudents.map((row, index) => (
                      <div key={index} className="rounded-xl border border-border bg-background/50 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">Student {index + 1}</p>
                          <button
                            type="button"
                            onClick={() => removeBulkStudentRow(index)}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Remove student row"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <input
                            type="text"
                            value={row.first_name}
                            onChange={(e) => updateBulkStudent(index, 'first_name', e.target.value)}
                            placeholder="First name *"
                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                          <input
                            type="text"
                            value={row.last_name}
                            onChange={(e) => updateBulkStudent(index, 'last_name', e.target.value)}
                            placeholder="Last name *"
                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                          <input
                            type="text"
                            value={row.username}
                            onChange={(e) => updateBulkStudent(index, 'username', e.target.value)}
                            placeholder="Username *"
                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                          <input
                            type="email"
                            value={row.guardian_email}
                            onChange={(e) => updateBulkStudent(index, 'guardian_email', e.target.value)}
                            placeholder="Guardian email"
                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            min={1}
                            value={row.age}
                            onChange={(e) => updateBulkStudent(index, 'age', e.target.value)}
                            placeholder="Age"
                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          />
                          <select
                            value={row.gender}
                            onChange={(e) => updateBulkStudent(index, 'gender', e.target.value)}
                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Gender</option>
                            <option value="girl">Girl</option>
                            <option value="boy">Boy</option>
                          </select>
                          <input
                            type="text"
                            value={row.password}
                            onChange={(e) => updateBulkStudent(index, 'password', e.target.value)}
                            placeholder="Password (optional)"
                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm md:col-span-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={bulkCreating}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {bulkCreating ? 'Creating…' : 'Create accounts & enroll'}
                </button>
              </form>
              {bulkResult && bulkResult.created.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm font-semibold text-foreground mb-2">Login cards (share with families)</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
                    {bulkResult.created.map((row) => (
                      <div key={row.student_id} className="rounded-md bg-card border border-border p-2">
                        <p className="font-medium">{row.full_name}</p>
                        <p>Username: <span className="font-mono">{row.username}</span></p>
                        <p>Password: <span className="font-mono">{row.password}</span></p>
                        {row.guardian_email && (
                          <p className="text-muted-foreground text-xs">Parent: {row.guardian_email}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {showAddStudent && (
            <div className={`${panel} mb-4 p-4`}>
              <div className="mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Search students (min 2 characters)…"
                />
              </div>
              {allStudents.length > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {allStudents
                    .filter((s) => !students.some((sb) => sb.student_id === s.id))
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleAddStudent(s.id)}
                        className="flex w-full items-center justify-between rounded-lg p-2 text-left text-sm transition-colors hover:bg-muted/60"
                      >
                        <span className="text-foreground">
                          {s.full_name} <span className="text-muted-foreground">@{s.username}</span>
                        </span>
                        <Plus className="h-4 w-4 text-primary" />
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          <div className={`${panel} divide-y divide-border`}>
            {studentSlice.map((sb) => (
              <div key={sb.student_id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={adminStudentProfilePath(sb.student_username)}
                    className="font-semibold text-primary hover:text-primary/90 hover:underline"
                  >
                    {sb.student_name}
                  </Link>
                  <p className="text-sm text-muted-foreground">@{sb.student_username}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      sb.payment_status === 'paid'
                        ? 'bg-[hsl(var(--green-very-light))] text-[hsl(var(--green-medium))]'
                        : sb.payment_status === 'overdue'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-[hsl(var(--gold-light))] text-[hsl(var(--gold-dark))]'
                    }`}
                  >
                    {sb.payment_status}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRemoveId(sb.student_id)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Remove from batch"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <p className="p-8 text-center text-muted-foreground">No students in this batch yet.</p>
            )}
          </div>

          {students.length > STUDENT_PAGE && (
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <p className="text-sm text-muted-foreground">
                {safeStudentPage} / {totalStudentPages} · {students.length} total
              </p>
              <div className="flex overflow-hidden rounded-lg border border-border bg-card">
                <button
                  type="button"
                  disabled={safeStudentPage <= 1}
                  onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-9 w-9 items-center justify-center border-r border-border hover:bg-muted disabled:opacity-40"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  disabled={safeStudentPage >= totalStudentPages}
                  onClick={() => setStudentPage((p) => Math.min(totalStudentPages, p + 1))}
                  className="inline-flex h-9 w-9 items-center justify-center hover:bg-muted disabled:opacity-40"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'classes' && batch && (
        <CoachBatchSessionsTab
          batch={batch}
          batchId={batchId}
          students={students}
          classes={classes}
          onClassesChange={setClasses}
          onBatchUpdated={setBatch}
          initialSessionId={Number.isNaN(initialSessionId ?? NaN) ? null : initialSessionId}
        />
      )}

      {activeTab === 'announcements' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddAnn((s) => !s)}
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> New announcement
            </button>
          </div>

          {showAddAnn && (
            <form onSubmit={handleAddAnnouncement} className={`${panel} mb-4 p-4`}>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Title *</label>
                  <input
                    type="text"
                    value={annForm.title}
                    onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Message *</label>
                  <textarea
                    value={annForm.message}
                    onChange={(e) => setAnnForm({ ...annForm, message: e.target.value })}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Post
                </button>
                <button type="button" onClick={() => setShowAddAnn(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className={`${panel} p-4`}>
                <div className="mb-1 flex justify-between gap-2">
                  <p className="font-heading font-semibold text-card-foreground">{ann.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(ann.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{ann.message}</p>
              </div>
            ))}
            {announcements.length === 0 && (
              <div className={`${panel} p-10 text-center text-muted-foreground`}>No announcements yet.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payments' && paymentLoading && (
        <div className={`${panel} flex min-h-[220px] items-center justify-center`}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading payments…</p>
          </div>
        </div>
      )}

      {activeTab === 'payments' && paymentStatus && (
        <div>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={`${panel} p-4 text-center`}>
              <p className="font-heading text-2xl font-bold text-foreground">{paymentStatus.total_students}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
            <div className={`${panel} border-[hsl(var(--green-medium))]/25 bg-[hsl(var(--green-very-light))]/40 p-4 text-center`}>
              <p className="font-heading text-2xl font-bold text-[hsl(var(--green-medium))]">{paymentStatus.paid_count}</p>
              <p className="text-xs text-[hsl(var(--green-medium))]">Paid</p>
            </div>
            <div
              className={`${panel} p-4 text-center ${
                paymentStatus.overdue_count > 0 ? 'border-destructive/30 bg-destructive/5' : ''
              }`}
            >
              <p
                className={`font-heading text-2xl font-bold ${
                  paymentStatus.overdue_count > 0 ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {paymentStatus.overdue_count}
              </p>
              <p className={`text-xs ${paymentStatus.overdue_count > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                Overdue
              </p>
            </div>
          </div>

          {paymentStatus.is_past_deadline && paymentStatus.overdue_count > 0 && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">
                  {paymentStatus.overdue_count} student(s) overdue
                </p>
                <p className="text-sm text-muted-foreground">
                  Deadline (10th) passed for {paymentStatus.billing_month}.
                </p>
              </div>
            </div>
          )}

          <div className={`${panel} divide-y divide-border`}>
            {paymentStatus.students.map((s) => (
              <div key={s.student_id} className="flex items-center justify-between p-4">
                <div>
                  <Link
                    href={adminStudentProfilePath(s.student_username)}
                    className="font-semibold text-primary hover:underline"
                  >
                    {s.student_name}
                  </Link>
                  <p className="text-sm text-muted-foreground">@{s.student_username}</p>
                </div>
                <div>
                  {s.payment_status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--green-medium))]">
                      <CheckCircle className="h-4 w-4" /> Paid
                    </span>
                  ) : s.is_overdue ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-destructive">
                      <AlertTriangle className="h-4 w-4" /> Overdue
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-[hsl(var(--gold-dark))]">Pending</span>
                  )}
                </div>
              </div>
            ))}
            {paymentStatus.students.length === 0 && (
              <p className="p-8 text-center text-muted-foreground">No students in this batch.</p>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={removeId !== null}
        title="Remove student from batch?"
        message="They will lose this batch on their roster until added again."
        confirmText="Remove"
        cancelText="Cancel"
        isDanger
        onConfirm={confirmRemove}
        onCancel={() => setRemoveId(null)}
      />

      {showEditBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="font-heading mb-4 text-xl font-bold">Edit class</h2>
            <form onSubmit={handleSaveBatch} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Schedule</label>
                <input
                  type="text"
                  value={editForm.schedule}
                  onChange={(e) => setEditForm({ ...editForm, schedule: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Monthly fee (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.monthly_fee}
                  onChange={(e) => setEditForm({ ...editForm, monthly_fee: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="1600.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="rounded border-input"
                />
                Batch is active
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingBatch}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {savingBatch ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditBatch(false)}
                  className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold"
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
