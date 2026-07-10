// app/(coach)/admin/lessons/page.tsx — Academy lesson library (authoring)

'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Loader2, Plus, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import { coachAPI, type Lesson } from '@/lib/api';
import {
  emptyLessonForm,
  formatLessonLevel,
  lessonLevelBadge,
  type LessonLevel,
} from '@/lib/lesson-ui';

export default function AdminLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFormId, setActiveFormId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(emptyLessonForm);

  const loadData = async () => {
    setLoading(true);
    try {
      const lessonRows = await coachAPI.getLessons({ include_unpublished: true });
      setLessons(Array.isArray(lessonRows) ? lessonRows : []);
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

  const startCreate = () => {
    setForm(emptyLessonForm);
    setActiveFormId('new');
  };

  const startEdit = async (lessonId: number) => {
    try {
      const lesson = await coachAPI.getLesson(lessonId);
      setForm({
        title: lesson.title,
        summary: lesson.summary ?? '',
        content: lesson.content ?? '',
        video_url: lesson.video_url ?? '',
        cover_image_url: lesson.cover_image_url ?? '',
        level: (lesson.level as LessonLevel) ?? 'beginner',
        is_published: lesson.is_published,
      });
      setActiveFormId(lessonId);
    } catch {
      toast.error('Failed to load lesson details');
    }
  };

  const saveForm = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        summary: form.summary.trim(),
        content: form.content.trim(),
        video_url: form.video_url.trim(),
        cover_image_url: form.cover_image_url.trim(),
      };
      if (activeFormId === 'new') {
        await coachAPI.createLesson(payload);
        toast.success('Lesson created');
      } else if (typeof activeFormId === 'number') {
        await coachAPI.updateLesson(activeFormId, payload);
        toast.success('Lesson updated');
      }
      setActiveFormId(null);
      setForm(emptyLessonForm);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const moveLesson = async (lessonId: number, direction: -1 | 1) => {
    const index = lessons.findIndex((lesson) => lesson.id === lessonId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= lessons.length) return;
    const reordered = [...lessons];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setLessons(reordered);
    try {
      await coachAPI.reorderLessons(reordered.map((lesson) => lesson.id));
      toast.success('Lesson order updated');
      await loadData();
    } catch {
      toast.error('Failed to reorder lessons');
      await loadData();
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Lesson library</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Create and publish lessons for the academy. Coaches open published lessons for their
            students from coach mode.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New lesson
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lessons by title, summary, or level"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none ring-0"
        />
      </div>

      {activeFormId ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {activeFormId === 'new' ? 'Create lesson' : 'Edit lesson'}
            </h2>
            <button
              type="button"
              onClick={() => setActiveFormId(null)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Level</span>
              <select
                value={form.level}
                onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value as LessonLevel }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="super_advanced">Super advanced</option>
              </select>
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-sm font-medium text-foreground">Summary</span>
              <textarea
                value={form.summary}
                onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                rows={2}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Video URL</span>
              <input
                value={form.video_url}
                onChange={(e) => setForm((prev) => ({ ...prev, video_url: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Cover image URL</span>
              <input
                value={form.cover_image_url}
                onChange={(e) => setForm((prev) => ({ ...prev, cover_image_url: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-sm font-medium text-foreground">Lesson content</span>
              <textarea
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                rows={10}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))}
              />
              Publish lesson
            </label>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={saveForm}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save lesson
            </button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4">
        {filteredLessons.map((lesson, index) => (
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
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      lesson.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {lesson.is_published ? 'Published' : 'Draft'}
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
                  <span>Updated {new Date(lesson.updated_at).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => moveLesson(lesson.id, -1)}
                  disabled={index === 0}
                  className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-medium disabled:opacity-40"
                >
                  <ChevronUp className="h-4 w-4" />
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => moveLesson(lesson.id, 1)}
                  disabled={index === lessons.length - 1}
                  className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-medium disabled:opacity-40"
                >
                  <ChevronDown className="h-4 w-4" />
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(lesson.id)}
                  className="rounded-xl border border-border px-3 py-2 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
          </article>
        ))}

        {filteredLessons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No lessons found.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
