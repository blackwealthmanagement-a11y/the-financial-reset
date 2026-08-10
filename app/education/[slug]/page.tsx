'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import type { EducationCategory, EducationLesson, EducationLessonRelation, LessonResource } from '../../../types/education';
import { getPublicLessonBySlug } from '../../../services/education.service';

export default function EducationLessonPage() {
  const params = useParams();
  const [lesson, setLesson] = useState<EducationLesson | null>(null);
  const [category, setCategory] = useState<EducationCategory | null>(null);
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [relatedLessons, setRelatedLessons] = useState<EducationLesson[]>([]);
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  useEffect(() => {
    async function loadLesson() {
      if (!slug) return;
      const { data, category: categoryData, resources: resourceData, relations, relatedLessons: relatedLessonData } = await getPublicLessonBySlug(slug);
      setLesson(data || null);
      setCategory(categoryData || null);
      setResources(resourceData || []);
      setRelatedLessons(relatedLessonData || []);
    }

    loadLesson();
  }, [slug]);

  if (!lesson) {
    return (
      <>
        <Nav />
        <main className="page-shell">
          <section className="container page-section">
            <div className="page-card">
              <div className="eyebrow">Education hub</div>
              <h1>Lesson coming soon.</h1>
              <p>This lesson is not currently available to public visitors.</p>
              <Link className="button secondary" href="/education">Back to education hub</Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card">
            <div className="eyebrow">Education hub</div>
            <h1>{lesson.title}</h1>
            <p>{lesson.excerpt}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {category ? <span className="portal-pill">{category.name}</span> : null}
              {lesson.difficulty ? <span className="portal-pill">{lesson.difficulty}</span> : null}
              {lesson.lesson_type ? <span className="portal-pill">{lesson.lesson_type}</span> : null}
              {lesson.reading_time_minutes ? <span className="portal-pill">{lesson.reading_time_minutes} min read</span> : null}
              {lesson.featured ? <span className="portal-pill">Featured</span> : null}
            </div>
            <div style={{ marginTop: 24, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: lesson.content.replace(/\n/g, '<br />') }} />
            {lesson.key_takeaways && lesson.key_takeaways.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <h3>Key takeaways</h3>
                <ul>{lesson.key_takeaways.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : null}
            {lesson.action_steps && lesson.action_steps.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <h3>Action steps</h3>
                <ol>{lesson.action_steps.map((item) => <li key={item}>{item}</li>)}</ol>
              </div>
            ) : null}
            {resources.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <h3>Resources</h3>
                {resources.map((resource) => <a key={resource.id} className="button secondary" href={resource.resource_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8 }}>{resource.title}</a>)}
              </div>
            ) : null}
            {relatedLessons.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <h3>Related lessons</h3>
                {relatedLessons.map((relatedLesson) => <Link key={relatedLesson.id} className="button secondary" href={`/education/${relatedLesson.slug}`} style={{ display: 'inline-block', marginTop: 8 }}>{relatedLesson.title}</Link>)}
              </div>
            ) : null}
            <div style={{ marginTop: 24 }}>
              <Link className="button secondary" href="/education">Back to all lessons</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
