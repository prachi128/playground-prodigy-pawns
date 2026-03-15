// app/(coach)/coach/batches/[id]/page.tsx - Batch Detail (Students, Classes, Announcements, Payments)

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  batchAPI, coachAPI, Batch, ClassSession, AnnouncementItem,
  StudentBatchInfo, PaymentStatusOverview, User,
} from '@/lib/api';
import {
  Loader2, ArrowLeft, Users, Calendar, Megaphone, CreditCard,
  Plus, ExternalLink, AlertTriangle, CheckCircle, X, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'students' | 'classes' | 'announcements' | 'payments';

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = Number(params.id);

  const [batch, setBatch] = useState<Batch | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('students');
  const [loading, setLoading] = useState(true);

  // Students
  const [students, setStudents] = useState<StudentBatchInfo[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);

  // Classes
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [showAddClass, setShowAddClass] = useState(false);
  const [classForm, setClassForm] = useState({ date: '', duration_minutes: '60', topic: '', meeting_link: '', notes: '' });

  // Announcements
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [showAddAnn, setShowAddAnn] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', message: '' });

  // Payment Status
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusOverview | null>(null);

  useEffect(() => {
    Promise.all([
      batchAPI.get(batchId),
      batchAPI.listStudents(batchId),
      batchAPI.listClasses(batchId),
      batchAPI.listAnnouncements(batchId),
      batchAPI.getPaymentStatus(batchId),
    ])
      .then(([b, s, c, a, p]) => {
        setBatch(b);
        setStudents(s);
        setClasses(c);
        setAnnouncements(a);
        setPaymentStatus(p);
      })
      .catch(() => toast.error('Failed to load batch'))
      .finally(() => setLoading(false));
  }, [batchId]);

  const handleAddStudent = async (studentId: number) => {
    try {
      await batchAPI.addStudent(batchId, studentId);
      toast.success('Student added!');
      setShowAddStudent(false);
      const updated = await batchAPI.listStudents(batchId);
      setStudents(updated);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add student');
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    try {
      await batchAPI.removeStudent(batchId, studentId);
      toast.success('Student removed');
      setStudents(students.filter(s => s.student_id !== studentId));
    } catch {
      toast.error('Failed to remove student');
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.date) { toast.error('Date is required'); return; }
    try {
      const newClass = await batchAPI.createClass(batchId, {
        date: classForm.date,
        duration_minutes: parseInt(classForm.duration_minutes) || 60,
        topic: classForm.topic || undefined,
        meeting_link: classForm.meeting_link || undefined,
        notes: classForm.notes || undefined,
      });
      setClasses([newClass, ...classes]);
      setShowAddClass(false);
      setClassForm({ date: '', duration_minutes: '60', topic: '', meeting_link: '', notes: '' });
      toast.success('Class session created!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create class');
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.title.trim() || !annForm.message.trim()) { toast.error('Title and message required'); return; }
    try {
      const newAnn = await batchAPI.createAnnouncement(batchId, annForm);
      setAnnouncements([newAnn, ...announcements]);
      setShowAddAnn(false);
      setAnnForm({ title: '', message: '' });
      toast.success('Announcement posted!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to post announcement');
    }
  };

  const searchStudents = async () => {
    if (searchQuery.length < 2) return;
    try {
      const results = await coachAPI.getStudents();
      setAllStudents(results.filter((u: User) =>
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } catch { setAllStudents([]); }
  };

  useEffect(() => {
    if (showAddStudent && searchQuery.length >= 2) {
      const timeout = setTimeout(searchStudents, 300);
      return () => clearTimeout(timeout);
    }
  }, [searchQuery, showAddStudent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!batch) {
    return <p className="text-center text-gray-500 py-16">Batch not found.</p>;
  }

  const tabs: { key: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { key: 'students', label: 'Students', icon: Users, count: students.length },
    { key: 'classes', label: 'Classes', icon: Calendar, count: classes.length },
    { key: 'announcements', label: 'Announcements', icon: Megaphone, count: announcements.length },
    { key: 'payments', label: 'Payments', icon: CreditCard, count: paymentStatus?.overdue_count },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/coach/batches')} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{batch.name}</h1>
          <p className="text-gray-500 text-sm">
            {batch.schedule && <span>{batch.schedule} &middot; </span>}
            {batch.monthly_fee > 0 && <span>${(batch.monthly_fee / 100).toFixed(2)}/month &middot; </span>}
            {students.length} students
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition flex-1 justify-center ${
              activeTab === tab.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab.key === 'payments' && (paymentStatus?.overdue_count ?? 0) > 0
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddStudent(!showAddStudent)}
              className="flex items-center gap-1 bg-primary-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition"
            >
              <Plus className="w-4 h-4" /> Add Student
            </button>
          </div>

          {showAddStudent && (
            <div className="bg-white rounded-xl border-2 border-primary-200 p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary-500 text-gray-800"
                  placeholder="Search students by name..."
                />
              </div>
              {allStudents.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {allStudents
                    .filter(s => !students.some(sb => sb.student_id === s.id))
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleAddStudent(s.id)}
                        className="w-full flex items-center justify-between p-2 hover:bg-primary-50 rounded-lg text-sm text-left transition"
                      >
                        <span className="text-gray-800">{s.full_name} <span className="text-gray-400">@{s.username}</span></span>
                        <Plus className="w-4 h-4 text-primary-500" />
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl border-2 border-gray-200 divide-y divide-gray-100">
            {students.map((sb) => (
              <div key={sb.student_id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-gray-800">{sb.student_name}</p>
                  <p className="text-sm text-gray-500">@{sb.student_username}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    sb.payment_status === 'paid' ? 'bg-green-100 text-green-700'
                    : sb.payment_status === 'overdue' ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                  }`}>
                    {sb.payment_status}
                  </span>
                  <button
                    onClick={() => handleRemoveStudent(sb.student_id)}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <p className="text-gray-500 text-center py-8">No students in this batch yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddClass(!showAddClass)}
              className="flex items-center gap-1 bg-primary-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition"
            >
              <Plus className="w-4 h-4" /> New Class
            </button>
          </div>

          {showAddClass && (
            <form onSubmit={handleAddClass} className="bg-white rounded-xl border-2 border-primary-200 p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={classForm.date}
                    onChange={(e) => setClassForm({ ...classForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary-500 text-gray-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    value={classForm.duration_minutes}
                    onChange={(e) => setClassForm({ ...classForm, duration_minutes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary-500 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Topic</label>
                  <input
                    type="text"
                    value={classForm.topic}
                    onChange={(e) => setClassForm({ ...classForm, topic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary-500 text-gray-800"
                    placeholder="Opening Principles"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting Link</label>
                  <input
                    type="url"
                    value={classForm.meeting_link}
                    onChange={(e) => setClassForm({ ...classForm, meeting_link: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary-500 text-gray-800"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="submit" className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition">
                  Create Class
                </button>
                <button type="button" onClick={() => setShowAddClass(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white rounded-xl border-2 border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{cls.topic || 'Chess Class'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(cls.date).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                    {' '}&middot; {cls.duration_minutes} min
                  </p>
                </div>
                {cls.meeting_link && (
                  <a
                    href={cls.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary-600 text-sm font-semibold hover:text-primary-700"
                  >
                    Link <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
            {classes.length === 0 && (
              <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center text-gray-500">
                No classes scheduled yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddAnn(!showAddAnn)}
              className="flex items-center gap-1 bg-primary-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition"
            >
              <Plus className="w-4 h-4" /> New Announcement
            </button>
          </div>

          {showAddAnn && (
            <form onSubmit={handleAddAnnouncement} className="bg-white rounded-xl border-2 border-primary-200 p-4 mb-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
                  <input
                    type="text"
                    value={annForm.title}
                    onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary-500 text-gray-800"
                    placeholder="Important Update"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Message *</label>
                  <textarea
                    value={annForm.message}
                    onChange={(e) => setAnnForm({ ...annForm, message: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary-500 text-gray-800 resize-none"
                    rows={3}
                    placeholder="Write your announcement..."
                    required
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="submit" className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition">
                  Post
                </button>
                <button type="button" onClick={() => setShowAddAnn(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <div className="flex justify-between mb-1">
                  <p className="font-semibold text-gray-800">{ann.title}</p>
                  <span className="text-xs text-gray-400">{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-600">{ann.message}</p>
              </div>
            ))}
            {announcements.length === 0 && (
              <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center text-gray-500">
                No announcements yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && paymentStatus && (
        <div>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{paymentStatus.total_students}</p>
              <p className="text-xs text-gray-500">Total Students</p>
            </div>
            <div className="bg-green-50 rounded-xl border-2 border-green-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{paymentStatus.paid_count}</p>
              <p className="text-xs text-green-600">Paid</p>
            </div>
            <div className={`rounded-xl border-2 p-4 text-center ${
              paymentStatus.overdue_count > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <p className={`text-2xl font-bold ${paymentStatus.overdue_count > 0 ? 'text-red-700' : 'text-gray-800'}`}>
                {paymentStatus.overdue_count}
              </p>
              <p className={`text-xs ${paymentStatus.overdue_count > 0 ? 'text-red-600' : 'text-gray-500'}`}>Overdue</p>
            </div>
          </div>

          {paymentStatus.is_past_deadline && paymentStatus.overdue_count > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-800">
                  {paymentStatus.overdue_count} student(s) have overdue payments
                </p>
                <p className="text-sm text-red-600">
                  Payment deadline (10th) has passed for {paymentStatus.billing_month}.
                </p>
              </div>
            </div>
          )}

          {/* Student Payment List */}
          <div className="bg-white rounded-xl border-2 border-gray-200 divide-y divide-gray-100">
            {paymentStatus.students.map((s) => (
              <div key={s.student_id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-gray-800">{s.student_name}</p>
                  <p className="text-sm text-gray-500">@{s.student_username}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.payment_status === 'paid' ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                      <CheckCircle className="w-4 h-4" /> Paid
                    </span>
                  ) : s.is_overdue ? (
                    <span className="flex items-center gap-1 text-red-600 text-sm font-semibold">
                      <AlertTriangle className="w-4 h-4" /> Overdue
                    </span>
                  ) : (
                    <span className="text-amber-600 text-sm font-semibold">Pending</span>
                  )}
                </div>
              </div>
            ))}
            {paymentStatus.students.length === 0 && (
              <p className="text-gray-500 text-center py-8">No students in this batch.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
