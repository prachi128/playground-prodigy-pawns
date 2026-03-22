'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, BookOpen, ChevronRight } from 'lucide-react';
import { assignmentAPI, type StudentAssignmentSummary } from '@/lib/api';
import toast from 'react-hot-toast';

export default function StudentAssignmentsPage() {
  const [items, setItems] = useState<StudentAssignmentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await assignmentAPI.getMyAssignments();
        if (!cancelled) setItems(data);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load assignments');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <BookOpen className="h-8 w-8 text-primary" />
        <h1 className="font-heading text-2xl font-bold text-foreground">My assignments</h1>
      </div>
      <p className="mb-6 font-sans text-sm text-muted-foreground">
        Open an assignment to solve puzzles your coach assigned. Progress is saved when you complete each puzzle from the assignment.
      </p>

      {items.length === 0 ? (
        <p className="rounded-xl border-2 border-border bg-card p-8 text-center font-sans text-muted-foreground">
          No assignments yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={`/assignments/${a.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border-2 border-border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-bold text-foreground">{a.title}</p>
                  {a.description ? (
                    <p className="mt-1 line-clamp-2 font-sans text-xs text-muted-foreground">
                      {a.description}
                    </p>
                  ) : null}
                  <p className="mt-2 font-sans text-xs text-muted-foreground">
                    {a.puzzles_completed}/{a.puzzle_count} puzzles · {a.completion_pct}% complete
                    {a.is_overdue ? (
                      <span className="ml-2 font-semibold text-amber-600">Overdue</span>
                    ) : null}
                    {a.is_complete ? (
                      <span className="ml-2 font-semibold text-emerald-600">Done</span>
                    ) : null}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
