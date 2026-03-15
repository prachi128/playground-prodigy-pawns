// app/(coach)/coach/batches/page.tsx - Batch Management

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { batchAPI, Batch } from '@/lib/api';
import { Loader2, Plus, Users, Calendar, DollarSign, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CoachBatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', schedule: '', monthly_fee: '' });

  const loadBatches = () => {
    batchAPI.list()
      .then(setBatches)
      .catch(() => toast.error('Failed to load batches'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBatches(); }, []);

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
        monthly_fee: form.monthly_fee ? Math.round(parseFloat(form.monthly_fee) * 100) : 0,
      });
      toast.success('Batch created!');
      setShowCreate(false);
      setForm({ name: '', description: '', schedule: '', monthly_fee: '' });
      loadBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Batch Management</h1>
          <p className="text-gray-500">Create and manage student groups, classes, and payments.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-primary-600 transition"
        >
          <Plus className="w-5 h-5" /> New Batch
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border-2 border-primary-200 p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">Create New Batch</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 outline-none text-gray-800"
                placeholder="Beginner Batch A"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Schedule</label>
              <input
                type="text"
                value={form.schedule}
                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 outline-none text-gray-800"
                placeholder="Mon/Wed/Fri 4-5 PM"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Monthly Fee ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.monthly_fee}
                onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 outline-none text-gray-800"
                placeholder="50.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 outline-none text-gray-800"
                placeholder="For beginners ages 6-8"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-primary-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-600 transition disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Batch'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-6 py-2 rounded-lg font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map((batch) => (
          <div
            key={batch.id}
            onClick={() => router.push(`/coach/batches/${batch.id}`)}
            className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:border-primary-300 hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-lg">{batch.name}</h3>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            {batch.description && (
              <p className="text-sm text-gray-500 mb-3">{batch.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" /> {batch.student_count || 0} students
              </span>
              {batch.schedule && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> {batch.schedule}
                </span>
              )}
            </div>
            {batch.monthly_fee > 0 && (
              <div className="mt-2 flex items-center gap-1 text-sm text-emerald-600 font-medium">
                <DollarSign className="w-4 h-4" />
                ${(batch.monthly_fee / 100).toFixed(2)}/month
              </div>
            )}
          </div>
        ))}
      </div>

      {batches.length === 0 && !showCreate && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No batches yet</p>
          <p className="text-gray-400 text-sm">Create your first batch to start organizing students into groups.</p>
        </div>
      )}
    </div>
  );
}
