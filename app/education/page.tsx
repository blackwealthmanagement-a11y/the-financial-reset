'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Search } from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import type { EducationCategory, EducationLesson } from '../../types/education';
import { getPublicCategories, getPublicLessons } from '../../services/education.service';

const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
const lessonTypeOrder = ['article', 'guide', 'checklist', 'video', 'worksheet'];

export default function EducationPage() {
  const [categories, setCategories] = useState<EducationCategory[]>([]);
  const [lessons, setLessons] = useState<EducationLesson[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [lessonType, setLessonType] = useState('all');

  useEffect(() => {
    async function loadContent() {
      try {
        const [{ data: categoriesData }, { data: lessonsData }] = await Promise.all([getPublicCategories(), getPublicLessons()]);
        setCategories(categoriesData || []);
        setLessons(lessonsData || []);
      } catch (error) {
        console.error(error);
      }
    }

    loadContent();
  }, []);

  const featuredLessons = useMemo(() => lessons.filter((lesson) => lesson.featured), [lessons]);
  const beginnerGuides = useMemo(() => lessons.filter((lesson) => lesson.difficulty === 'beginner'), [lessons]);
  const recommendedLessons = useMemo(() => lessons.slice(0, 6), [lessons]);

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
              <div className="portal-card portal-card-gold">
                <p className="portal-card-copy"><strong>Browse by category</strong></p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <button type="button" className={`button secondary ${activeCategory === 'all' ? 'is-active' : ''}`} onClick={() => setActiveCategory('all')}>All lessons</button>
                  {categories.map((category) => (
                    <button key={category.id} type="button" className={`button secondary ${activeCategory === category.id ? 'is-active' : ''}`} onClick={() => setActiveCategory(category.id)}>{category.name}</button>
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
              {filteredLessons.map((lesson) => (
                <article key={lesson.id} className="portal-card portal-card-navy">
                  <div className="portal-card-header">
                    <h3><GraduationCap size={18} /> {lesson.title}</h3>
                    {lesson.featured ? <span className="portal-pill">Featured</span> : null}
                  </div>
                  <p className="portal-card-copy">{lesson.excerpt || lesson.content}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {lesson.difficulty ? <span className="portal-pill">{lesson.difficulty}</span> : null}
                    {lesson.lesson_type ? <span className="portal-pill">{lesson.lesson_type}</span> : null}
                    {lesson.reading_time_minutes ? <span className="portal-pill">{lesson.reading_time_minutes} min read</span> : null}
                  </div>
                  <Link className="button secondary" href={`/education/${lesson.slug}`} style={{ marginTop: 16 }}>Open lesson</Link>
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
