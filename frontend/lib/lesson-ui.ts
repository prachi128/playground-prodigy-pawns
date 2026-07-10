export type LessonLevel = 'beginner' | 'intermediate' | 'advanced' | 'super_advanced';

export const emptyLessonForm = {
  title: '',
  summary: '',
  content: '',
  video_url: '',
  cover_image_url: '',
  level: 'beginner' as LessonLevel,
  is_published: false,
};

export function lessonLevelBadge(level: string): string {
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

export function formatLessonLevel(level: string): string {
  return level.replaceAll('_', ' ');
}
