'use client';

import { useEffect, useMemo, useState } from 'react';
import { parentAPI, AnnouncementItem } from '@/lib/api';
import { Loader2, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ParentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState('all');

  useEffect(() => {
    parentAPI
      .getAnnouncements()
      .then(setAnnouncements)
      .catch(() => toast.error('Failed to load announcements'))
      .finally(() => setLoading(false));
  }, []);

  const batchNames = useMemo(() => {
    return Array.from(
      new Set(
        announcements
          .map((item) => item.batch_name?.trim())
          .filter((name): name is string => Boolean(name))
      )
    );
  }, [announcements]);

  const showBatchFilter = batchNames.length > 1;

  const filteredAnnouncements = useMemo(() => {
    if (selectedBatch === 'all') return announcements;
    return announcements.filter((item) => (item.batch_name ?? '').trim() === selectedBatch);
  }, [announcements, selectedBatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Announcements</h1>
        <p className="text-gray-500">Messages from your coach</p>
      </div>

      {showBatchFilter && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <label htmlFor="batch-filter" className="block text-sm font-semibold text-gray-700 mb-2">
            Filter by batch
          </label>
          <select
            id="batch-filter"
            className="w-full md:w-72 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            <option value="all">All batches</option>
            {batchNames.map((batchName) => (
              <option key={batchName} value={batchName}>
                {batchName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-3">
        {filteredAnnouncements.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:shadow-md transition">
            <h2 className="font-semibold text-gray-800">{item.title}</h2>
            <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap">{item.message}</p>

            <div className="mt-4 flex items-end justify-between gap-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
                {item.batch_name || 'General'}
              </span>

              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-gray-400">by {item.coach_name || 'Coach'}</p>
              </div>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
            <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No announcements yet.</p>
            <p className="text-gray-400 text-sm mt-1">Your coach hasn&apos;t posted anything.</p>
          </div>
        )}

        {announcements.length > 0 && filteredAnnouncements.length === 0 && (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-10 text-center">
            <p className="text-gray-500">No announcements for this batch.</p>
          </div>
        )}
      </div>
    </div>
  );
}
