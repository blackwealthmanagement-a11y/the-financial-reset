'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PortalLayout } from '../../../components/client/PortalLayout';
import type { ClientLessonProgress, EducationCategory, EducationLesson } from '../../../types/education';
import { getLearningPaths, getPortalLessonProgress, getPortalLessons, toggleLessonProgress, getPublicCategories } from '../../../services/education.service';

const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
const lessonTypeOrder = ['article', 'guide', 'checklist', 'video', 'worksheet'];

export default function PortalEducationPage() {
  const [lessons, setLessons] = useState<EducationLesson[]>([]);
  const [categories, setCategories] = useState<EducationCategory[]>([]);
  const [paths, setPaths] = useState<any[]>([]);
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
        const [{ data: lessonsData }, { data: progressData }, { data: pathsData }, { data: categoriesData }] = await Promise.all([getPortalLessons(), getPortalLessonProgress(), getLearningPaths(), getPublicCategories()]);
        setLessons(lessonsData || []);
        setCategories(categoriesData || []);
        setProgress(progressData || []);
        setPaths(pathsData || []);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const progressMap = useMemo(() => new Map(progress.map((item) => [item.lesson_id, item])), [progress]);
  const completedCount = progress.filter((item) => item.completed).length;
  const overallPercentage = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const featuredLessons = useMemo(() => lessons.filter((lesson) => lesson.featured).slice(0, 3), [lessons]);
  const recommendedLesson = useMemo(() => lessons.find((lesson) => !progressMap.get(lesson.id)?.completed) || lessons[0] || null, [lessons, progressMap]);
  const activePath = useMemo(() => paths[0] || null, [paths]);
  const completedLessonTitles = useMemo(() => progress.filter((item) => item.completed).map((entry) => lessons.find((lesson) => lesson.id === entry.lesson_id)?.title || 'Lesson'), [lessons, progress]);

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
        <section className="portal-card portal-card-gold" style={{ gridColumn: '1 / -1' }}>
          <div className="portal-card-header">
            <div>
              <p className="eyebrow">Progress snapshot</p>
              <h3>{overallPercentage}% complete</h3>
            </div>
            <span className="portal-pill">{completedCount}/{lessons.length} lessons</span>
          </div>
          <div className="portal-progress-track" style={{ marginTop: 12 }}>
            <span style={{ width: `${overallPercentage}%` }} />
          </div>
          <p className="portal-card-copy" style={{ marginTop: 12 }}>You have completed {completedCount} lessons. Keep momentum with {recommendedLesson?.title || 'your next lesson'}.</p>
        </section>
        <section className="portal-card portal-card-navy">
          <div className="portal-card-header">
            <h3>Continue learning</h3>
            <span className="portal-pill">Recommended</span>
          </div>
          {recommendedLesson ? (
            <>
              <p className="portal-card-copy">{recommendedLesson.excerpt || recommendedLesson.content}</p>
              <Link className="button secondary" href={`/portal/education/${recommendedLesson.slug}`} style={{ marginTop: 8 }}>Open {recommendedLesson.title}</Link>
            </>
          ) : (
            <p className="portal-card-copy">No lessons are available yet.</p>
          )}
        </section>
        <section className="portal-card portal-card-gold">
          <div className="portal-card-header">
            <h3>Active path</h3>
            {activePath ? <span className="portal-pill">Guided path</span> : null}
          </div>
          {activePath ? (
            <>
              <p className="portal-card-copy">Follow the guided sequence for {activePath.title}.</p>
              <Link className="button secondary" href={`/portal/education/path/${activePath.slug}`} style={{ marginTop: 8 }}>Open path</Link>
            </>
          ) : (
            <p className="portal-card-copy">Learning paths will appear as soon as they are published.</p>
          )}
        </section>
      </div>
      <div className="portal-grid" style={{ marginBottom: 24 }}>
        <section className="portal-card portal-card-navy">
          <div className="portal-card-header">
            <h3>Featured lessons</h3>
            <span className="portal-pill">{featuredLessons.length} highlighted</span>
          </div>
          {featuredLessons.length > 0 ? featuredLessons.map((lesson) => <Link key={lesson.id} className="button secondary" href={`/portal/education/${lesson.slug}`} style={{ display: 'inline-block', marginTop: 8 }}>{lesson.title}</Link>) : <p className="portal-card-copy">Featured lessons will appear here soon.</p>}
        </section>
        <section className="portal-card portal-card-gold">
          <div className="portal-card-header">
            <h3>Completed lessons</h3>
            <span className="portal-pill">{completedCount} done</span>
          </div>
          {completedLessonTitles.length > 0 ? completedLessonTitles.slice(0, 4).map((title, index) => <p key={`${title}-${index}`} className="portal-card-copy">{title}</p>) : <p className="portal-card-copy">No completed lessons yet.</p>}
        </section>
      </div>
      <div className="portal-grid" style={{ marginBottom: 24 }}>
        <section className="portal-card portal-card-gold">
          <label className="field">
            <span>Search lessons</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title or topic" />
          </label>
        </section>
        <section className="portal-card portal-card-gold">
          <label className="field">
            <span>Difficulty</span>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="all">All levels</option>
              {difficultyOrder.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </section>
        <section className="portal-card portal-card-gold">
          <label className="field">
            <span>Lesson type</span>
            <select value={lessonType} onChange={(event) => setLessonType(event.target.value)}>
              <option value="all">All</option>
              {lessonTypeOrder.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </section>
        <section className="portal-card portal-card-gold">
          <div className="portal-card-header">
            <h3>Browse by category</h3>
            <span className="portal-pill">{categories.length} topics</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <button type="button" className="button secondary" onClick={() => setActiveCategory('all')} style={activeCategory === 'all' ? { backgroundColor: '#0B1F33', color: '#fff' } : undefined}>All lessons</button>
            {categories.map((category) => (
              <button key={category.id} type="button" className="button secondary" onClick={() => setActiveCategory(category.id)} style={activeCategory === category.id ? { backgroundColor: '#0B1F33', color: '#fff' } : undefined}>{category.name}</button>
            ))}
          </div>
        </section>
      </div>
      {loading ? <p className="portal-card-copy">Loading your learning hub…</p> : null}
      {filteredLessons.length === 0 ? (
        <section className="portal-card portal-card-gold">
          <h3>No lessons match those filters yet</h3>
          <p className="portal-card-copy">Try switching categories or clearing the search to find more learning topics.</p>
        </section>
      ) : null}
      <div className="portal-grid">
        {filteredLessons.map((lesson) => {
          const currentProgress = progressMap.get(lesson.id);
          return (
            <article key={lesson.id} className={`portal-card portal-card-navy education-card ${lesson.featured ? 'education-card--featured' : ''}`}>
              <div className="portal-card-header">
                <h3>{lesson.title}</h3>
                <span className={`portal-pill ${currentProgress?.completed ? 'education-badge--success' : ''}`}>{currentProgress?.completed ? 'Completed' : 'In progress'}</span>
              </div>
              <p className="education-card__summary">{lesson.excerpt || lesson.content}</p>
              <div className="education-card__meta">
                {lesson.featured ? <span className="education-badge">Featured</span> : null}
                {lesson.difficulty ? <span className="education-badge education-badge--muted">{lesson.difficulty}</span> : null}
                {lesson.lesson_type ? <span className="education-badge education-badge--muted">{lesson.lesson_type}</span> : null}
              </div>
              <div className="education-card__status">
                <span>{currentProgress?.completed ? '✓' : '•'}</span>
                <span>{currentProgress?.completed ? 'You completed this lesson' : 'Keep this one moving'}</span>
              </div>
              <div className="education-card__actions">
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
