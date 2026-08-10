export interface EducationCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EducationLesson {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured: boolean;
  published: boolean;
  sort_order: number;
  reading_time_minutes: number | null;
  difficulty: string | null;
  lesson_type: string | null;
  key_takeaways: string[] | null;
  action_steps: string[] | null;
  featured_image_url: string | null;
  video_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EducationLessonRelation {
  id: string;
  lesson_id: string;
  related_lesson_id: string;
  sort_order: number;
  created_at: string;
}

export interface LessonResource {
  id: string;
  lesson_id: string;
  title: string;
  resource_url: string;
  resource_type: string;
  created_at: string;
}

export interface ClientLessonProgress {
  id: string;
  client_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}
