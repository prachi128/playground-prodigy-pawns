// app/(coach)/coach/lessons/page.tsx — Open published lessons for roster students

'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';

import { coachAPI, type Lesson, type LessonAssignmentStudent } from '@/lib/api';
import { formatLessonLevel, lessonLevelBadge } from '@/lib/lesson-ui';

export default function CoachLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<LessonAssignmentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assignLessonId, setAssignLessonId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [lessonRows, studentRows] = await Promise.all([
        coachAPI.getLessons({ include_unpublished: false }),
        coachAPI.getLessonStudents(),
      ]);
      const published = (Array.isArray(lessonRows) ? lessonRows : []).filter(
        (lesson) => lesson.is_published,
      );
      setLessons(published);
      setStudents(Array.isArray(studentRows) ? studentRows : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredLessons = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return lessons;
    return lessons.filter((lesson) =>
      [lesson.title, lesson.summary, lesson.level].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      ),
    );
  }, [lessons, search]);

  const openForStudent = async (lessonId: number) => {
    if (!selectedStudentId) {
      toast.error('Select a student first');
      return;
    }
    try {
      await coachAPI.openLessonForStudent(lessonId, Number(selectedStudentId));
      toast.success('Lesson opened for student');
      setAssignLessonId(null);
      setSelectedStudentId('');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to open lesson for student');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Lessons</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Open published lessons for students on your roster. Lesson content is managed in admin
          mode.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search published lessons"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none ring-0"
        />
      </div>

      <div className="grid gap-4">
        {filteredLessons.map((lesson) => (
          <article key={lesson.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-foreground">{lesson.title}</h2>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${lessonLevelBadge(lesson.level)}`}
                  >
                    {formatLessonLevel(lesson.level)}
                  </span>
                </div>
                {lesson.summary ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {lesson.summary}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
                  <span>{lesson.access_count ?? 0} students opened</span>
                  <span>{lesson.completion_count ?? 0} completions</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAssignLessonId(assignLessonId === lesson.id ? null : lesson.id);
                  setSelectedStudentId('');
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Send className="h-4 w-4" />
                Open for student
              </button>
            </div>

            {assignLessonId === lesson.id ? (
              <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No students on your roster yet. Add students from My students or a class first.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <select
                      value={selectedStudentId}
                      onChange={(e) =>
                        setSelectedStudentId(e.target.value ? Number(e.target.value) : '')
                      }
                      className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm md:max-w-sm"
                    >
                      <option value="">Select a student</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.full_name} (@{student.username}) • Level {student.level}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => openForStudent(lesson.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                    >
                      <BookOpen className="h-4 w-4" />
                      Open lesson
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </article>
        ))}

        {filteredLessons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No published lessons yet. Ask an admin to publish lessons from admin mode.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
