'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Search } from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import type { EducationCategory, EducationLesson } from '../../types/education';
import { getLearningPaths, getPublicCategories, getPublicLessons } from '../../services/education.service';

const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
const lessonTypeOrder = ['article', 'guide', 'checklist', 'video', 'worksheet'];

export default function EducationPage() {
  const [categories, setCategories] = useState<EducationCategory[]>([]);
  const [lessons, setLessons] = useState<EducationLesson[]>([]);
  const [paths, setPaths] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [lessonType, setLessonType] = useState('all');

  useEffect(() => {
    async function loadContent() {
      try {
        const [{ data: categoriesData }, { data: lessonsData }, { data: pathsData }] = await Promise.all([getPublicCategories(), getPublicLessons(), getLearningPaths()]);
        setCategories(categoriesData || []);
        setLessons(lessonsData || []);
        setPaths(pathsData || []);
      } catch (error) {
        console.error(error);
      }
    }

    loadContent();
  }, []);

  const featuredLessons = useMemo(() => lessons.filter((lesson) => lesson.featured), [lessons]);
  const beginnerGuides = useMemo(() => lessons.filter((lesson) => lesson.difficulty === 'beginner'), [lessons]);
  const recommendedLessons = useMemo(() => lessons.slice(0, 6), [lessons]);
  const spotlightLesson = useMemo(() => featuredLessons[0] || lessons[0] || null, [featuredLessons, lessons]);

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

  return (
    <>
      <Nav />
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card">
            <div className="eyebrow">Education hub</div>
            <h1>Practical lessons for building confidence and momentum.</h1>
            <p>Explore public lessons on personal credit, business credit, and financial wellness with clear takeaways, guided action steps, and resources you can return to anytime.</p>
            <div className="hero-actions" style={{ marginTop: 24 }}>
              <label className="field" style={{ minWidth: 320 }}>
                <span className="sr-only">Search lessons</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Search size={18} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search lessons" />
                </div>
              </label>
            </div>
            <div className="portal-grid" style={{ marginTop: 24 }}>
              <div className="portal-card portal-card-gold" style={{ gridColumn: '1 / -1' }}>
                <div className="portal-card-header">
                  <div>
                    <p className="eyebrow">Momentum snapshot</p>
                    <h3>{lessons.length} lessons ready to explore</h3>
                  </div>
                  <span className="portal-pill">{featuredLessons.length} featured</span>
                </div>
                <p className="portal-card-copy" style={{ marginTop: 8 }}>Start with {spotlightLesson?.title || 'a featured lesson'} and build your confidence from there.</p>
              </div>
              <div className="portal-card portal-card-gold">
                <h3>Learning paths</h3>
                {paths.length > 0 ? paths.map((path) => <Link key={path.id} className="button secondary" href={`/education/path/${path.slug}`} style={{ display: 'inline-block', marginTop: 8 }}>{path.title}</Link>) : <p className="portal-card-copy">Learning paths will appear here soon.</p>}
              </div>
              <div className="portal-card portal-card-gold">
                <div className="portal-card-header">
                  <h3>Browse by category</h3>
                  <span className="portal-pill">{categories.length} topics</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <button type="button" className="button secondary" onClick={() => setActiveCategory('all')} style={activeCategory === 'all' ? { backgroundColor: '#0B1F33', color: '#fff' } : undefined}>All lessons</button>
                  {categories.map((category) => (
                    <button key={category.id} type="button" className="button secondary" onClick={() => setActiveCategory(category.id)} style={activeCategory === category.id ? { backgroundColor: '#0B1F33', color: '#fff' } : undefined}>{category.name}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="portal-grid" style={{ marginTop: 24 }}>
              <div className="portal-card portal-card-navy">
                <h3>Featured lessons</h3>
                {featuredLessons.length > 0 ? featuredLessons.slice(0, 3).map((lesson) => <Link key={lesson.id} className="button secondary" href={`/education/${lesson.slug}`} style={{ display: 'inline-block', marginTop: 8 }}>{lesson.title}</Link>) : <p className="portal-card-copy">Featured lessons will appear here soon.</p>}
              </div>
              <div className="portal-card portal-card-gold">
                <h3>Beginner guides</h3>
                {beginnerGuides.length > 0 ? beginnerGuides.slice(0, 3).map((lesson) => <Link key={lesson.id} className="button secondary" href={`/education/${lesson.slug}`} style={{ display: 'inline-block', marginTop: 8 }}>{lesson.title}</Link>) : <p className="portal-card-copy">Beginner-friendly lessons will appear here soon.</p>}
              </div>
              <div className="portal-card portal-card-navy">
                <h3>Recommended lessons</h3>
                {recommendedLessons.length > 0 ? recommendedLessons.slice(0, 3).map((lesson) => <Link key={lesson.id} className="button secondary" href={`/education/${lesson.slug}`} style={{ display: 'inline-block', marginTop: 8 }}>{lesson.title}</Link>) : <p className="portal-card-copy">Recommended lessons will appear here soon.</p>}
              </div>
            </div>
            <div className="portal-grid" style={{ marginTop: 24 }}>
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
            <div className="portal-grid" style={{ marginTop: 24 }}>
              {filteredLessons.length === 0 ? (
                <section className="portal-card portal-card-gold" style={{ gridColumn: '1 / -1' }}>
                  <h3>No lessons match those filters yet</h3>
                  <p className="portal-card-copy">Try switching categories or widening your search to find more helpful material.</p>
                </section>
              ) : null}
              {filteredLessons.map((lesson) => (
                <article key={lesson.id} className={`portal-card portal-card-navy education-card ${lesson.featured ? 'education-card--featured' : ''}`}>
                  <div className="portal-card-header">
                    <h3><GraduationCap size={18} /> {lesson.title}</h3>
                    {lesson.featured ? <span className="portal-pill">Featured</span> : null}
                  </div>
                  <p className="education-card__summary">{lesson.excerpt || lesson.content}</p>
                  <div className="education-card__meta">
                    {lesson.difficulty ? <span className="education-badge">{lesson.difficulty}</span> : null}
                    {lesson.lesson_type ? <span className="education-badge education-badge--muted">{lesson.lesson_type}</span> : null}
                    {lesson.reading_time_minutes ? <span className="education-badge education-badge--muted">{lesson.reading_time_minutes} min read</span> : null}
                  </div>
                  <div className="education-card__actions">
                    <Link className="button secondary" href={`/education/${lesson.slug}`}>Open lesson</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
