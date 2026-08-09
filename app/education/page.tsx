'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Search } from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import type { EducationCategory, EducationLesson } from '../../types/education';
import { getPublicCategories, getPublicLessons } from '../../services/education.service';

export default function EducationPage() {
  const [categories, setCategories] = useState<EducationCategory[]>([]);
  const [lessons, setLessons] = useState<EducationLesson[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

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

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lessons.filter((lesson) => {
      const matchesQuery = !query || [lesson.title, lesson.excerpt, lesson.content].filter(Boolean).join(' ').toLowerCase().includes(query);
      const matchesCategory = activeCategory === 'all' || lesson.category_id === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [activeCategory, lessons, search]);

  return (
    <>
      <Nav />
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card">
            <div className="eyebrow">Education hub</div>
            <h1>Learn at your own pace.</h1>
            <p>Browse published lessons, explore practical guidance, and return to the material whenever you need a refresher.</p>
            <div className="hero-actions" style={{ marginTop: 24 }}>
              <label className="field" style={{ minWidth: 280 }}>
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
              {filteredLessons.map((lesson) => (
                <article key={lesson.id} className="portal-card portal-card-navy">
                  <div className="portal-card-header">
                    <h3><GraduationCap size={18} /> {lesson.title}</h3>
                    {lesson.featured ? <span className="portal-pill">Featured</span> : null}
                  </div>
                  <p className="portal-card-copy">{lesson.excerpt || lesson.content}</p>
                  <Link className="button secondary" href={`/education/${lesson.slug}`}>Open lesson</Link>
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
