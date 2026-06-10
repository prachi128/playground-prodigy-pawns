'use client';

import { useEffect, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceAPI, type UpcomingClassSession } from '@/lib/api';
import { JoinClassButton } from '@/components/JoinClassButton';
import { canJoinClassSession } from '@/lib/class-join';

export function StudentUpcomingClasses() {
  const [sessions, setSessions] = useState<UpcomingClassSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    attendanceAPI
      .getUpcomingSessions(5)
      .then(setSessions)
      .catch(() => toast.error('Failed to load upcoming classes'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <h2 className="font-heading mb-3 flex items-center gap-2 text-lg font-bold text-card-foreground">
        <Calendar className="h-5 w-5 text-primary" />
        Upcoming classes
      </h2>
      <div className="space-y-2">
        {sessions.map((cls) => (
          <div
            key={cls.id}
            className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-heading font-semibold text-foreground">
                {cls.topic || 'Chess class'}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(cls.date).toLocaleString('en-IN', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {cls.batch_name ? ` · ${cls.batch_name}` : ''}
              </p>
            </div>
            <JoinClassButton
              sessionId={cls.id}
              batchId={cls.batch_id}
              meetingLink={cls.meeting_link}
              canJoin={cls.can_join || canJoinClassSession(cls.date, cls.duration_minutes ?? 60)}
              size="sm"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
