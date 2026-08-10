'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { PortalLayout } from '../../../../components/client/PortalLayout';
import type { ClientLessonProgress, EducationCategory, EducationLesson, EducationLessonRelation, LessonResource } from '../../../../types/education';
import { getPortalLessonBySlug, toggleLessonProgress } from '../../../../services/education.service';

export default function PortalLessonPage() {
  const params = useParams();
  const [lesson, setLesson] = useState<EducationLesson | null>(null);
  const [category, setCategory] = useState<EducationCategory | null>(null);
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [relations, setRelations] = useState<EducationLessonRelation[]>([]);
  const [relatedLessons, setRelatedLessons] = useState<EducationLesson[]>([]);
  const [progress, setProgress] = useState<ClientLessonProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  useEffect(() => {
    async function loadLesson() {
      if (!slug) return;
      setLoading(true);
      try {
        const { data, category: categoryData, resources: resourceData, relations: relationData, progress: progressData } = await getPortalLessonBySlug(slug);
        setLesson(data || null);
        setCategory(categoryData || null);
        setResources(resourceData || []);
        setRelations(relationData || []);
        setProgress(progressData || null);
        setRelatedLessons((data as unknown as { relatedLessons?: EducationLesson[] } | null)?.relatedLessons || []);
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, [slug]);

  async function handleProgressToggle() {
    if (!lesson) return;
    const updated = await toggleLessonProgress(lesson.id, !(progress?.completed ?? false));
    setProgress(updated.data || null);
  }

  const completionLabel = useMemo(() => (progress?.completed ? 'Completed' : 'In progress'), [progress?.completed]);

  if (!lesson && !loading) {
    return (
      <PortalLayout title="Education" subtitle="Continue learning with your private study plan.">
        <div className="portal-card portal-card-gold">
          <h3>Lesson not found</h3>
          <p className="portal-card-copy">This lesson is not available yet.</p>
          <Link className="button secondary" href="/portal/education">Back to dashboard</Link>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Education" subtitle="Continue learning with a focused lesson experience.">
      {loading ? <p className="portal-card-copy">Loading lesson…</p> : null}
      {lesson ? (
        <div className="portal-grid">
          <article className="portal-card portal-card-gold">
            <p className="eyebrow">{category?.name || 'Lesson'}</p>
            <h2>{lesson.title}</h2>
            <p className="portal-card-copy">{lesson.excerpt}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {lesson.featured ? <span className="portal-pill">Featured</span> : null}
              {lesson.difficulty ? <span className="portal-pill">{lesson.difficulty}</span> : null}
              {lesson.lesson_type ? <span className="portal-pill">{lesson.lesson_type}</span> : null}
              {lesson.reading_time_minutes ? <span className="portal-pill">{lesson.reading_time_minutes} min read</span> : null}
            </div>
            <div style={{ marginTop: 16 }}>
              <button type="button" className="button primary" onClick={handleProgressToggle}>{progress?.completed ? 'Mark as incomplete' : 'Mark complete'}</button>
            </div>
            <p className="portal-card-copy" style={{ marginTop: 12 }}>Status: {completionLabel}</p>
            {progress?.last_accessed_at ? <p className="portal-card-copy">Last opened: {new Date(progress.last_accessed_at).toLocaleDateString()}</p> : null}
            <div style={{ marginTop: 16, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: lesson.content.replace(/\n/g, '<br />') }} />
            {lesson.key_takeaways && lesson.key_takeaways.length > 0 ? (
              <div style={{ marginTop: 20 }}>
                <h3>Key takeaways</h3>
                <ul>{lesson.key_takeaways.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : null}
            {lesson.action_steps && lesson.action_steps.length > 0 ? (
              <div style={{ marginTop: 20 }}>
                <h3>Action steps</h3>
                <ol>{lesson.action_steps.map((item) => <li key={item}>{item}</li>)}</ol>
              </div>
            ) : null}
          </article>
          <aside className="portal-card portal-card-navy">
            <h3>Resources</h3>
            {resources.length > 0 ? resources.map((resource) => <a key={resource.id} className="button secondary" href={resource.resource_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8 }}>{resource.title}</a>) : <p className="portal-card-copy">No resources yet.</p>}
            {relatedLessons.length > 0 ? <div style={{ marginTop: 20 }}><h3>Related lessons</h3>{relatedLessons.map((relatedLesson) => <Link key={relatedLesson.id} className="button secondary" href={`/portal/education/${relatedLesson.slug}`} style={{ display: 'inline-block', marginTop: 8 }}>{relatedLesson.title}</Link>)}</div> : null}
            <div style={{ marginTop: 20 }}>
              <Link className="button secondary" href="/portal/education">Continue learning</Link>
            </div>
          </aside>
        </div>
      ) : null}
    </PortalLayout>
  );
}
