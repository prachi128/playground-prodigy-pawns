// app/(parent)/parent/page.tsx - Parent Dashboard Home

'use client';

import { useEffect, useState } from 'react';
import { parentAPI, ParentDashboard } from '@/lib/api';
import { usernameInitial } from '@/lib/avatar';
import { Loader2, Calendar, CreditCard, Megaphone, Users, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ParentDashboardPage() {
  const [data, setData] = useState<ParentDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentAPI.getDashboard()
      .then(setData)
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-500">
        Failed to load dashboard data. Please try again.
      </div>
    );
  }

  const now = new Date();
  const dayOfMonth = now.getDate();
  const isNearDeadline = dayOfMonth >= 7 && dayOfMonth <= 10;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Welcome, {data.parent_name}!</h1>
        <p className="text-emerald-100">
          Here&apos;s an overview of your child&apos;s chess journey.
        </p>
      </div>

      {/* Payment Deadline Banner */}
      {data.children.some(c => c.payment_status === 'overdue') && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Payment Overdue</p>
            <p className="text-sm text-red-600">
              One or more payments are past the 10th deadline. Please pay to keep your child in their batch.
            </p>
          </div>
        </div>
      )}

      {isNearDeadline && data.children.some(c => c.payment_status === 'pending') && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Payment Deadline Approaching</p>
            <p className="text-sm text-amber-600">
              Monthly payment is due by the 10th. Please pay to avoid disruption.
            </p>
          </div>
        </div>
      )}

      {/* Children Summary */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-pink-500" />
          Your Children
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.children.map((child) => (
            <div key={child.id} className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-lg">
                  {usernameInitial(child.username)}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{child.full_name}</p>
                  <p className="text-xs text-gray-500">@{child.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Rating</p>
                  <p className="font-bold text-gray-800">{child.rating}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Level</p>
                  <p className="font-bold text-gray-800">{child.level}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Rank</p>
                  <p className="font-bold text-gray-800 text-xs">{child.level_category || 'Pawn'}</p>
                </div>
              </div>
              {child.batch_name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Batch: <span className="font-medium text-gray-700">{child.batch_name}</span></span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    child.payment_status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : child.payment_status === 'overdue'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {child.payment_status === 'paid' ? 'Paid' : child.payment_status === 'overdue' ? 'Overdue' : 'Pending'}
                  </span>
                </div>
              )}
            </div>
          ))}
          {data.children.length === 0 && (
            <p className="text-gray-500 col-span-2 text-center py-8">No children linked to your account yet.</p>
          )}
        </div>
      </div>

      {/* Upcoming Classes */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-500" />
          Upcoming Classes
        </h2>
        <div className="bg-white rounded-xl border-2 border-gray-200 divide-y divide-gray-100">
          {data.upcoming_classes.map((cls) => (
            <div key={cls.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{cls.topic || 'Chess Class'}</p>
                <p className="text-sm text-gray-500">
                  {new Date(cls.date).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                  {' '}&middot;{' '}{cls.duration_minutes} min
                  {cls.batch_name && <span> &middot; {cls.batch_name}</span>}
                </p>
              </div>
              {cls.meeting_link && (
                <a
                  href={cls.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition"
                >
                  Join <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
          {data.upcoming_classes.length === 0 && (
            <p className="text-gray-500 text-center py-8">No upcoming classes scheduled.</p>
          )}
        </div>
      </div>

      {/* Recent Announcements */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-amber-500" />
          Recent Announcements
        </h2>
        <div className="space-y-3">
          {data.announcements.map((ann) => (
            <div key={ann.id} className="bg-white rounded-xl border-2 border-gray-200 p-4">
              <div className="flex items-start justify-between mb-1">
                <p className="font-semibold text-gray-800">{ann.title}</p>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                  {new Date(ann.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-600">{ann.message}</p>
              {ann.batch_name && (
                <p className="text-xs text-gray-400 mt-2">
                  {ann.batch_name} &middot; by {ann.coach_name || 'Coach'}
                </p>
              )}
            </div>
          ))}
          {data.announcements.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center text-gray-500">
              No announcements yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
