'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { lessonAPI, Lesson } from '@/lib/api';

function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function levelBadge(level: string): string {
  switch (level) {
    case 'beginner':
      return 'border-green-200 bg-green-50 text-green-700';
    case 'intermediate':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'advanced':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'super_advanced':
      return 'border-purple-200 bg-purple-50 text-purple-700';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

export default function LessonDetailPage() {
  const params = useParams();
  const lessonId = Number(params.id);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!lessonId) return;
    lessonAPI
      .getLesson(lessonId)
      .then(setLesson)
      .catch(() => toast.error('Failed to load lesson'))
      .finally(() => setLoading(false));
  }, [lessonId]);

  const embedUrl = useMemo(() => youtubeEmbedUrl(lesson?.video_url), [lesson?.video_url]);

  const markComplete = async () => {
    if (!lesson || lesson.student_completed) return;
    setCompleting(true);
    try {
      const result = await lessonAPI.completeLesson(lesson.id);
      setLesson((prev) =>
        prev
          ? {
              ...prev,
              student_completed: true,
              completed_at: result.completed_at,
            }
          : prev,
      );
      toast.success(result.already_completed ? 'Lesson already completed' : 'Lesson completed');
    } catch {
      toast.error('Failed to mark lesson complete');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!lesson) {
    return <div className="py-16 text-center text-muted-foreground">Lesson not found.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl pt-6">
      <Link
        href="/learn/lessons"
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-heading font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to Lessons
      </Link>

      <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-r from-pink-400 to-rose-500 px-6 py-6 text-white">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${levelBadge(lesson.level)}`}>
              {lesson.level.replaceAll('_', ' ')}
            </span>
            {lesson.student_completed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 font-heading text-3xl font-bold">{lesson.title}</h1>
          {lesson.summary ? <p className="mt-2 max-w-3xl text-sm font-medium text-white/85">{lesson.summary}</p> : null}
        </div>

        <div className="space-y-6 px-6 py-6">
          {embedUrl ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-black">
              <iframe
                className="aspect-video w-full"
                src={embedUrl}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : lesson.video_url ? (
            <a
              href={lesson.video_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Watch lesson video
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}

          <div className="rounded-2xl border border-border bg-background px-5 py-4">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
              {lesson.content}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {lesson.student_completed
                ? `Completed on ${lesson.completed_at ? new Date(lesson.completed_at).toLocaleDateString('en-IN') : 'today'}.`
                : 'Finish reading the lesson and mark it complete.'}
            </p>
            <button
              type="button"
              onClick={markComplete}
              disabled={lesson.student_completed || completing}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {lesson.student_completed ? 'Completed' : 'Mark complete'}
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
