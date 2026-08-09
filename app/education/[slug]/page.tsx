'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Nav from '../../components/Nav';
import Footer from '../../components/Footer';
import type { EducationLesson } from '../../../types/education';
import { getPublicLessonBySlug } from '../../../services/education.service';

export default function EducationLessonPage() {
  const params = useParams();
  const [lesson, setLesson] = useState<EducationLesson | null>(null);
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  useEffect(() => {
    async function loadLesson() {
      if (!slug) return;
      const { data } = await getPublicLessonBySlug(slug);
      setLesson(data || null);
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
            <div style={{ marginTop: 24, lineHeight: 1.75 }}>{lesson.content}</div>
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
