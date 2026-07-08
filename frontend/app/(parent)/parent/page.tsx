// app/(parent)/parent/page.tsx - Parent Dashboard Home

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { parentAPI, ParentDashboard } from '@/lib/api';
import { usernameInitial } from '@/lib/avatar';
import { Loader2, Calendar, Megaphone, Users, AlertTriangle, Plus, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { AddChildPanel } from '@/components/parent/add-child-panel';
import { NoChildrenState } from '@/components/parent/no-children-state';
import { formatInr, isBillableChild } from '@/lib/parent-billing';
import { JoinClassButton } from '@/components/JoinClassButton';
import { canJoinClassSession } from '@/lib/class-join';

export default function ParentDashboardPage() {
  const [data, setData] = useState<ParentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const dashboard = await parentAPI.getDashboard();
      setData(dashboard);
    } catch {
      toast.error('Failed to load dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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
  const deadlineDay = data.payment_deadline_day;
  const billableChildren = data.children.filter(isBillableChild);
  const isNearDeadline =
    dayOfMonth >= deadlineDay - 3 &&
    dayOfMonth <= deadlineDay &&
    billableChildren.some((c) => c.payment_status === 'pending' && !c.is_join_month);
  const hasChildren = data.children.length > 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Welcome, {data.parent_name}!</h1>
        <p className="text-emerald-100">
          {hasChildren
            ? "Here's an overview of your children's chess journey."
            : 'Set up your family accounts or wait for children to link via your guardian email.'}
        </p>
      </div>

      {showAddChild && (
        <AddChildPanel
          onCreated={() => {
            setShowAddChild(false);
            setLoading(true);
            loadDashboard();
          }}
          onClose={() => setShowAddChild(false)}
        />
      )}

      {/* Payment Deadline Banner */}
      {hasChildren && billableChildren.some((c) => c.payment_status === 'overdue') && (
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

      {hasChildren && isNearDeadline && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Payment Deadline Approaching</p>
            <p className="text-sm text-amber-600">
              Monthly payment is due by the {deadlineDay}th. Please pay to avoid disruption.
            </p>
          </div>
        </div>
      )}

      {/* Children Summary */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-500" />
            Your Children
          </h2>
          {hasChildren && (
            <button
              type="button"
              onClick={() => setShowAddChild(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <Plus className="h-4 w-4" />
              Add child
            </button>
          )}
        </div>

        {!hasChildren ? (
          <NoChildrenState onAddChild={() => setShowAddChild(true)} />
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from(
              new Map(data.children.map((child) => [child.id, child])).values()
            ).map((child) => (
              <Link
                key={child.id}
                href={`/parent/children/${child.id}`}
                className="block rounded-xl border-2 border-gray-200 bg-white p-5 transition hover:border-emerald-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
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
                {isBillableChild(child) && child.batch_name && (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">
                        Batch: <span className="font-medium text-gray-700">{child.batch_name}</span>
                      </span>
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
                    {child.monthly_fee != null && child.payment_status !== 'paid' && (
                      <p className="text-gray-600">
                        Fee: <span className="font-semibold text-gray-800">{formatInr(child.monthly_fee)}</span>
                        {child.is_join_month
                          ? <span className="text-gray-400"> · no deadline this month</span>
                          : child.payment_due_day
                          ? <span className="text-gray-400"> · due by the {child.payment_due_day}th</span>
                          : null}
                      </p>
                    )}
                  </div>
                )}
                <p className="mt-3 text-xs font-medium text-emerald-600">View full profile & report →</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Classes */}
      {hasChildren && (
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
                {cls.meeting_link || canJoinClassSession(cls.date, cls.duration_minutes ?? 60) ? (
                  <JoinClassButton
                    sessionId={cls.id}
                    batchId={cls.batch_id}
                    meetingLink={cls.meeting_link}
                    canJoin={canJoinClassSession(cls.date, cls.duration_minutes ?? 60)}
                    childrenOptions={data.children.map((c) => ({
                      id: c.id,
                      name: c.full_name,
                      batchId: c.batch_id,
                    }))}
                    size="sm"
                  />
                ) : null}
              </div>
            ))}
            {data.upcoming_classes.length === 0 && (
              <p className="text-gray-500 text-center py-8">No upcoming classes scheduled.</p>
            )}
          </div>
        </div>
      )}

      {/* Recent Announcements */}
      {hasChildren && (
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
      )}

      {/* Lesson Progress */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-500" />
          Progress
        </h2>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-5 space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-violet-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Lessons Opened</p>
              <p className="mt-2 text-2xl font-bold text-violet-900">{data.lesson_progress?.total_opened ?? 0}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Lessons Completed</p>
              <p className="mt-2 text-2xl font-bold text-emerald-900">{data.lesson_progress?.total_completed ?? 0}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Completion Rate</p>
              <p className="mt-2 text-2xl font-bold text-amber-900">{data.lesson_progress?.completion_pct ?? 0}%</p>
            </div>
          </div>

          {data.lesson_progress?.children?.length ? (
            <div className="space-y-3">
              {data.lesson_progress.children.map((child) => (
                <div key={child.child_id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-800">{child.child_name}</span>
                    <span className="text-gray-500">
                      {child.completed_lessons}/{child.opened_lessons} lessons
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      style={{ width: `${Math.min(100, child.completion_pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No lesson activity yet.</p>
          )}

          {data.lesson_progress?.graph?.length ? (
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">Recent completions</p>
              <div className="flex items-end gap-3">
                {data.lesson_progress.graph.map((point) => {
                  const max = Math.max(...data.lesson_progress!.graph.map((item) => item.completions), 1);
                  const height = Math.max(16, Math.round((point.completions / max) * 96));
                  return (
                    <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
                      <div className="text-xs font-semibold text-gray-500">{point.completions}</div>
                      <div className="flex h-28 w-full items-end rounded-lg bg-gray-50 px-1.5 pb-1.5">
                        <div
                          className="w-full rounded-md bg-gradient-to-t from-violet-500 to-fuchsia-400"
                          style={{ height }}
                        />
                      </div>
                      <div className="text-xs font-medium text-gray-500">{point.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
