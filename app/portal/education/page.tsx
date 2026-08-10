'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PortalLayout } from '../../../components/client/PortalLayout';
import type { ClientLessonProgress, EducationCategory, EducationLesson } from '../../../types/education';
import { getPortalLessonProgress, getPortalLessons, toggleLessonProgress } from '../../../services/education.service';

const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
const lessonTypeOrder = ['article', 'guide', 'checklist', 'video', 'worksheet'];

export default function PortalEducationPage() {
  const [lessons, setLessons] = useState<EducationLesson[]>([]);
  const [categories, setCategories] = useState<EducationCategory[]>([]);
  const [progress, setProgress] = useState<ClientLessonProgress[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [lessonType, setLessonType] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [{ data: lessonsData }, { data: progressData }] = await Promise.all([getPortalLessons(), getPortalLessonProgress()]);
        setLessons(lessonsData || []);
        setCategories((lessonsData || []).reduce<EducationCategory[]>((accumulator, lesson) => {
          return accumulator;
        }, []));
        setProgress(progressData || []);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const progressMap = useMemo(() => new Map(progress.map((item) => [item.lesson_id, item])), [progress]);
  const completedCount = progress.filter((item) => item.completed).length;
  const overallPercentage = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const recentlyViewed = useMemo(() => progress.slice(0, 3), [progress]);
  const featuredLessons = useMemo(() => lessons.filter((lesson) => lesson.featured), [lessons]);
  const continueLearning = useMemo(() => lessons.find((lesson) => !progressMap.get(lesson.id)?.completed) || lessons[0], [lessons, progressMap]);

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lessons.filter((lesson) => {
      const matchesQuery = !query || [lesson.title, lesson.excerpt, lesson.content].filter(Boolean).join(' ').toLowerCase().includes(query);
      const matchesCategory = activeCategory === 'all' || lesson.category_id === activeCategory;
      const matchesDifficulty = difficulty === 'all' || lesson.difficulty === difficulty;
      const matchesType = lessonType === 'all' || lesson.lesson_type === lessonType;
      return matchesQuery && matchesCategory && matchesDifficulty && matchesType;
    });
  }, [activeCategory, difficulty, lessonType, lessons, search]);

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
          <h3>Overall progress</h3>
          <p className="portal-card-copy">{completedCount} of {lessons.length} lessons completed</p>
          <p className="portal-card-copy">{overallPercentage}% complete</p>
        </div>
        <div className="portal-card portal-card-navy">
          <h3>Continue learning</h3>
          {continueLearning ? <Link className="button secondary" href={`/portal/education/${continueLearning.slug}`}>{continueLearning.title}</Link> : <p className="portal-card-copy">No lessons yet.</p>}
        </div>
        <div className="portal-card portal-card-gold">
          <h3>Recently viewed</h3>
          {recentlyViewed.length > 0 ? recentlyViewed.map((entry) => <p key={entry.id} className="portal-card-copy">{lessons.find((lesson) => lesson.id === entry.lesson_id)?.title || 'Lesson'}</p>) : <p className="portal-card-copy">No recent activity yet.</p>}
        </div>
      </div>
      <div className="portal-grid" style={{ marginBottom: 24 }}>
        <div className="portal-card portal-card-navy">
          <h3>Featured lessons</h3>
          {featuredLessons.length > 0 ? featuredLessons.map((lesson) => <Link key={lesson.id} className="button secondary" href={`/portal/education/${lesson.slug}`} style={{ display: 'inline-block', marginTop: 8 }}>{lesson.title}</Link>) : <p className="portal-card-copy">Featured lessons will appear here soon.</p>}
        </div>
        <div className="portal-card portal-card-gold">
          <h3>Completed lessons</h3>
          {progress.filter((item) => item.completed).length > 0 ? progress.filter((item) => item.completed).map((entry) => <p key={entry.id} className="portal-card-copy">{lessons.find((lesson) => lesson.id === entry.lesson_id)?.title || 'Lesson'}</p>) : <p className="portal-card-copy">No completed lessons yet.</p>}
        </div>
      </div>
      <div className="portal-grid" style={{ marginBottom: 24 }}>
        <div className="portal-card portal-card-gold">
          <label className="field">
            <span>Search lessons</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title or topic" />
          </label>
        </div>
        <div className="portal-card portal-card-gold">
          <label className="field">
            <span>Difficulty</span>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="all">All levels</option>
              {difficultyOrder.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <div className="portal-card portal-card-gold">
          <label className="field">
            <span>Lesson type</span>
            <select value={lessonType} onChange={(event) => setLessonType(event.target.value)}>
              <option value="all">All</option>
              {lessonTypeOrder.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
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
                <Link className="button secondary" href={`/portal/education/${lesson.slug}`}>Open</Link>
              </div>
            </article>
          );
        })}
      </div>
    </PortalLayout>
  );
}
