'use client';

import { useEffect, useMemo, useState } from 'react';
import { PortalLayout } from '../../../components/client/PortalLayout';
import type { ClientLessonProgress, EducationLesson } from '../../../types/education';
import { getPortalLessonProgress, getPortalLessons, toggleLessonProgress } from '../../../services/education.service';

export default function PortalEducationPage() {
  const [lessons, setLessons] = useState<EducationLesson[]>([]);
  const [progress, setProgress] = useState<ClientLessonProgress[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [{ data: lessonsData }, { data: progressData }] = await Promise.all([getPortalLessons(), getPortalLessonProgress()]);
        setLessons(lessonsData || []);
        setProgress(progressData || []);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const progressMap = useMemo(() => new Map(progress.map((item) => [item.lesson_id, item])), [progress]);

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lessons.filter((lesson) => {
      const matchesQuery = !query || [lesson.title, lesson.excerpt, lesson.content].filter(Boolean).join(' ').toLowerCase().includes(query);
      const matchesCategory = activeCategory === 'all' || lesson.category_id === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [activeCategory, lessons, search]);

  async function handleToggleProgress(lessonId: string, completed: boolean) {
    const { data } = await toggleLessonProgress(lessonId, completed);
    if (data) {
      setProgress((current) => {
        const next = current.filter((item) => item.lesson_id !== lessonId);
        return [...next, data];
      });
    }
  }

  return (
    <PortalLayout title="Education" subtitle="Continue learning and track your progress.">
      <div className="portal-grid" style={{ marginBottom: 24 }}>
        <div className="portal-card portal-card-gold">
          <label className="field">
            <span>Search lessons</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title or topic" />
          </label>
        </div>
      </div>
      {loading ? <p className="portal-card-copy">Loading your learning hub…</p> : null}
      <div className="portal-grid">
        {filteredLessons.map((lesson) => {
          const currentProgress = progressMap.get(lesson.id);
          return (
            <article key={lesson.id} className="portal-card portal-card-navy">
              <div className="portal-card-header">
                <h3>{lesson.title}</h3>
                {lesson.featured ? <span className="portal-pill">Featured</span> : null}
              </div>
              <p className="portal-card-copy">{lesson.excerpt || lesson.content}</p>
              <p className="portal-card-copy">Status: {currentProgress?.completed ? 'Completed' : 'In progress'}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" className="button secondary" onClick={() => handleToggleProgress(lesson.id, !currentProgress?.completed)}>
                  {currentProgress?.completed ? 'Mark as in progress' : 'Mark complete'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </PortalLayout>
  );
}
