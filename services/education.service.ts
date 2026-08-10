import { browserSupabase } from '../lib/supabase/browser';
import type { ClientLessonProgress, ClientLearningPathProgress, EducationCategory, EducationLearningPath, EducationLesson, EducationLessonRelation, LessonResource, LearningPathLessonLink } from '../types/education';

async function getAuthHeaders() {
  if (!browserSupabase) {
    throw new Error('The education client is unavailable.');
  }

  const { data: { session } } = await browserSupabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Please sign in to continue.');
  }

  return { Authorization: `Bearer ${session.access_token}` };
}

export async function getPublicCategories() {
  const response = await fetch('/api/education/public');
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load education categories.');
  }
  return { data: payload.categories as EducationCategory[], error: null as Error | null };
}

export async function getPublicLessons() {
  const response = await fetch('/api/education/public?view=lessons');
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load lessons.');
  }
  return { data: payload.lessons as EducationLesson[], error: null as Error | null };
}

export async function getPublicLessonBySlug(slug: string) {
  const response = await fetch(`/api/education/public?slug=${encodeURIComponent(slug)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load this lesson.');
  }
  return {
    data: payload.lesson as EducationLesson,
    relations: payload.relations as EducationLessonRelation[],
    resources: payload.resources as LessonResource[],
    category: payload.category as EducationCategory | null,
    relatedLessons: payload.relatedLessons as EducationLesson[],
    error: null as Error | null
  };
}

export async function getPortalLessons() {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/portal/education', { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load your education content.');
  }
  return { data: payload.lessons as EducationLesson[], error: null as Error | null };
}

export async function getPortalLessonProgress() {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/portal/education?view=progress', { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load lesson progress.');
  }
  return { data: payload.progress as ClientLessonProgress[], error: null as Error | null };
}

export async function toggleLessonProgress(lessonId: string, completed: boolean) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/portal/education', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ lessonId, completed })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not update lesson progress.');
  }
  return { data: payload.progress as ClientLessonProgress, error: null as Error | null };
}

export async function getPortalLessonBySlug(slug: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/portal/education?slug=${encodeURIComponent(slug)}`, { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load this lesson.');
  }
  return {
    data: payload.lesson as EducationLesson,
    relations: payload.relations as EducationLessonRelation[],
    resources: payload.resources as LessonResource[],
    category: payload.category as EducationCategory | null,
    progress: payload.progress as ClientLessonProgress | null,
    error: null as Error | null
  };
}

export async function getLearningPaths() {
  const response = await fetch('/api/education/public?view=learning-paths');
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load learning paths.');
  }
  return { data: payload.paths as EducationLearningPath[], error: null as Error | null };
}

export async function getLearningPath(slug: string) {
  const response = await fetch(`/api/education/public?view=learning-path&slug=${encodeURIComponent(slug)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load this learning path.');
  }
  return { data: payload.path as { id: string; title: string; slug: string; description: string | null; lessons: EducationLesson[]; percentComplete: number; estimatedCompletion: string }, error: null as Error | null };
}

export async function getClientLearningProgress() {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/portal/education?view=path-progress', { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load your learning path progress.');
  }
  return { data: payload.progress as ClientLessonProgress[], error: null as Error | null };
}

export async function updateLearningProgress(pathSlug: string, completed: boolean) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/portal/education', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ pathSlug, completed })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not update your learning path progress.');
  }
  return { data: payload.progress as ClientLearningPathProgress, error: null as Error | null };
}

export async function getRecommendedPath() {
  const response = await fetch('/api/education/public?view=recommended-path');
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load a recommended path.');
  }
  return { data: payload.path as EducationLearningPath | null, error: null as Error | null };
}

export async function getCRMLessons() {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/crm/education', { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load education lessons.');
  }
  return { data: payload.lessons as EducationLesson[], error: null as Error | null };
}

export async function getCRMCategories() {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/crm/education?view=categories', { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load education categories.');
  }
  return { data: payload.categories as EducationCategory[], error: null as Error | null };
}

export async function saveCRMLesson(payload: Partial<EducationLesson> & { id?: string; categoryId?: string }) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/crm/education', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'We could not save the lesson.');
  }
  return { data: json.lesson as EducationLesson, error: null as Error | null };
}

export async function saveCRMCategory(payload: Partial<EducationCategory> & { id?: string }) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/crm/education?view=categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'We could not save the category.');
  }
  return { data: json.category as EducationCategory, error: null as Error | null };
}

export async function saveLessonResource(payload: Partial<LessonResource> & { lessonId?: string }) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/crm/education?view=resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'We could not save the resource.');
  }
  return { data: json.resource as LessonResource, error: null as Error | null };
}
