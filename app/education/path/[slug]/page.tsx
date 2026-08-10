'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Nav from '../../../components/Nav';
import Footer from '../../../components/Footer';
import { getLearningPath, getLearningPaths } from '../../../../services/education.service';

export default function EducationPathPage() {
  const params = useParams();
  const [path, setPath] = useState<any>(null);
  const [paths, setPaths] = useState<any[]>([]);
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  useEffect(() => {
    async function loadPath() {
      if (!slug) return;
      const [{ data: pathsData }, { data: pathData }] = await Promise.all([getLearningPaths(), getLearningPath(slug)]);
      setPaths(pathsData || []);
      setPath(pathData || null);
    }

    loadPath();
  }, [slug]);

  const lessonCount = useMemo(() => path?.lessons?.length || 0, [path]);
  const completedCount = useMemo(() => (path?.lessons || []).filter((lesson: { completed?: boolean }) => lesson.completed).length, [path]);
  const progressPercent = lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0;

  return (
    <>
      <Nav />
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card">
            <div className="eyebrow">Education hub</div>
            <h1>{path?.title || 'Learning path'}</h1>
            <p>{path?.description || 'Follow a guided path through the Education Hub.'}</p>
            <div style={{ marginTop: 20 }}>
              <div className="portal-progress-track">
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="portal-card-copy" style={{ marginTop: 10 }}>{completedCount} of {lessonCount} lessons completed</p>
            </div>
            <div style={{ marginTop: 24 }}>
              <Link className="button primary" href="/intake">Start Your Reset</Link>
              <Link className="button secondary" href="/book" style={{ marginLeft: 8 }}>Book Consultation</Link>
            </div>
            {path?.lessons?.length ? (
              <div style={{ marginTop: 24 }}>
                <h2>Path outline</h2>
                <div className="portal-grid" style={{ marginTop: 12 }}>
                  {path.lessons.map((lesson: any) => (
                    <article key={lesson.id} className="portal-card portal-card-gold">
                      <div className="portal-card-header">
                        <h3>{lesson.title}</h3>
                        {lesson.completed ? <span className="portal-pill">Completed</span> : <span className="portal-pill">Next up</span>}
                      </div>
                      <p className="portal-card-copy">{lesson.excerpt || 'Continue through the sequence for a more complete understanding.'}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
            <div style={{ marginTop: 24 }}>
              <h2>Explore more paths</h2>
              {paths.map((item) => <Link key={item.id} className="button secondary" href={`/education/path/${item.slug}`} style={{ display: 'inline-block', marginTop: 8 }}>{item.title}</Link>)}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
