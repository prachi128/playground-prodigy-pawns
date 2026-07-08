'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Loader2, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceAPI } from '@/lib/api';

export interface JoinClassChildOption {
  id: number;
  name: string;
  batchId?: number | null;
}

interface JoinClassButtonProps {
  sessionId: number;
  batchId: number;
  meetingLink?: string | null;
  canJoin?: boolean;
  /** Student joining for themselves */
  studentId?: number;
  /** Parent: children to pick from when more than one is in this batch */
  childrenOptions?: JoinClassChildOption[];
  size?: 'sm' | 'md';
}

export function JoinClassButton({
  sessionId,
  batchId,
  meetingLink,
  canJoin = true,
  studentId,
  childrenOptions,
  size = 'md',
}: JoinClassButtonProps) {
  const eligibleChildren = useMemo(
    () =>
      (childrenOptions ?? []).filter(
        (c) => c.batchId == null || c.batchId === batchId,
      ),
    [childrenOptions, batchId],
  );

  const [selectedChildId, setSelectedChildId] = useState<number | ''>(() => {
    if (studentId) return studentId;
    if (eligibleChildren.length === 1) return eligibleChildren[0].id;
    return '';
  });
  const [joining, setJoining] = useState(false);

  const resolvedStudentId =
    studentId ??
    (selectedChildId !== '' ? selectedChildId : undefined);

  const needsChildPick =
    !studentId && eligibleChildren.length > 1 && selectedChildId === '';

  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  const openZoom = () => {
    if (meetingLink) {
      window.open(meetingLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleJoin = async () => {
    if (needsChildPick) {
      toast.error('Select which child is joining');
      return;
    }
    setJoining(true);
    try {
      const res = await attendanceAPI.joinSession(sessionId, resolvedStudentId);
      if (res.coach_override) {
        toast.success('Join recorded — attendance was already set by your coach');
      } else {
        toast.success('You’re checked in for class');
      }
      const link = res.meeting_link || meetingLink;
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Could not join class');
    } finally {
      setJoining(false);
    }
  };

  if (!canJoin && meetingLink) {
    return (
      <a
        href={meetingLink}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90 ${pad}`}
      >
        <Video className="h-3.5 w-3.5" />
        Open Zoom
        <ExternalLink className="h-3 w-3 opacity-80" />
      </a>
    );
  }

  if (!canJoin) {
    return (
      <span className={`inline-flex rounded-lg border border-border bg-muted/40 text-muted-foreground ${pad}`}>
        Not open yet
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {eligibleChildren.length > 1 && !studentId && (
        <select
          value={selectedChildId}
          onChange={(e) =>
            setSelectedChildId(e.target.value ? Number(e.target.value) : '')
          }
          className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
          aria-label="Which child is joining"
        >
          <option value="">Select child…</option>
          {eligibleChildren.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={() => void handleJoin()}
        disabled={joining || needsChildPick}
        className={`inline-flex items-center gap-1.5 rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 ${pad}`}
      >
        {joining ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Video className="h-3.5 w-3.5" />
        )}
        Join class
      </button>
    </div>
  );
}
