'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EducationCategory, EducationLesson } from '../../../types/education';
import { getCRMCategories, getCRMLessons, saveCRMLesson, saveCRMCategory, saveLessonResource } from '../../../services/education.service';

export default function CRMEducationPage() {
  const [categories, setCategories] = useState<EducationCategory[]>([]);
  const [lessons, setLessons] = useState<EducationLesson[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSlug, setLessonSlug] = useState('');
  const [lessonExcerpt, setLessonExcerpt] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonDifficulty, setLessonDifficulty] = useState('beginner');
  const [lessonReadingTime, setLessonReadingTime] = useState('');
  const [lessonType, setLessonType] = useState('article');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceLessonId, setResourceLessonId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      const [{ data: categoriesData }, { data: lessonsData }] = await Promise.all([getCRMCategories(), getCRMLessons()]);
      setCategories(categoriesData || []);
      setLessons(lessonsData || []);
      if ((categoriesData || []).length > 0) {
        setSelectedCategoryId((categoriesData || [])[0].id);
      }
    }

    loadData();
  }, []);

  const publishedLessons = useMemo(() => lessons.filter((lesson) => lesson.published), [lessons]);
  const featuredLessons = useMemo(() => lessons.filter((lesson) => lesson.featured), [lessons]);

  async function handleCreateCategory(event: React.FormEvent) {
    event.preventDefault();
    const { data } = await saveCRMCategory({ name: categoryName, slug: categorySlug, description: null });
    if (data) {
      setCategories((current) => [...current, data]);
      setCategoryName('');
      setCategorySlug('');
      setStatusMessage(`Category ${data.name} created.`);
    }
  }

  async function handleCreateLesson(event: React.FormEvent) {
    event.preventDefault();
    const { data } = await saveCRMLesson({
      categoryId: selectedCategoryId,
      title: lessonTitle,
      slug: lessonSlug,
      excerpt: lessonExcerpt,
      content: lessonContent,
      difficulty: lessonDifficulty,
      reading_time_minutes: lessonReadingTime ? Number(lessonReadingTime) : null,
      lesson_type: lessonType,
      featured,
      published,
      sort_order: 0
    });
    if (data) {
      setLessons((current) => [data, ...current]);
      setLessonTitle('');
      setLessonSlug('');
      setLessonExcerpt('');
      setLessonContent('');
      setLessonDifficulty('beginner');
      setLessonReadingTime('');
      setLessonType('article');
      setFeatured(false);
      setPublished(false);
      setStatusMessage(`Lesson ${data.title} saved.`);
    }
  }

  async function handleCreateResource(event: React.FormEvent) {
    event.preventDefault();
    const { data } = await saveLessonResource({ lessonId: resourceLessonId, title: resourceTitle, resource_url: resourceUrl, resource_type: 'pdf' });
    if (data) {
      setResourceTitle('');
      setResourceUrl('');
      setResourceLessonId('');
      setStatusMessage(`Resource ${data.title} attached.`);
    }
  }

  return (
    <main className="page-shell">
      <section className="container page-section">
        <div className="page-card">
          <div className="eyebrow">CRM education hub</div>
          <h1>Education content management</h1>
          <p>Create categories, publish lessons, and attach public-facing PDFs.</p>
          {statusMessage ? <p className="portal-card-copy" style={{ marginTop: 12 }}>{statusMessage}</p> : null}

          <div className="portal-grid" style={{ marginTop: 24 }}>
            <div className="portal-card portal-card-gold">
              <h3>Create category</h3>
              <form onSubmit={handleCreateCategory} style={{ display: 'grid', gap: 12 }}>
                <label className="field"><span>Name</span><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></label>
                <label className="field"><span>Slug</span><input value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} /></label>
                <button className="button primary" type="submit">Create category</button>
              </form>
            </div>
            <div className="portal-card portal-card-navy">
              <h3>Create lesson</h3>
              <form onSubmit={handleCreateLesson} style={{ display: 'grid', gap: 12 }}>
                <label className="field"><span>Title</span><input value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} /></label>
                <label className="field"><span>Slug</span><input value={lessonSlug} onChange={(event) => setLessonSlug(event.target.value)} /></label>
                <label className="field"><span>Category</span><select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label className="field"><span>Excerpt</span><input value={lessonExcerpt} onChange={(event) => setLessonExcerpt(event.target.value)} /></label>
                <label className="field"><span>Content</span><textarea value={lessonContent} onChange={(event) => setLessonContent(event.target.value)} rows={4} /></label>
                <label className="field"><span>Difficulty</span><select value={lessonDifficulty} onChange={(event) => setLessonDifficulty(event.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
                <label className="field"><span>Reading time (minutes)</span><input value={lessonReadingTime} onChange={(event) => setLessonReadingTime(event.target.value)} /></label>
                <label className="field"><span>Lesson type</span><select value={lessonType} onChange={(event) => setLessonType(event.target.value)}><option value="article">Article</option><option value="guide">Guide</option><option value="checklist">Checklist</option><option value="video">Video</option><option value="worksheet">Worksheet</option></select></label>
                <label className="field"><span><input type="checkbox" checked={featured} onChange={() => setFeatured((value) => !value)} /> Featured</span></label>
                <label className="field"><span><input type="checkbox" checked={published} onChange={() => setPublished((value) => !value)} /> Publish</span></label>
                <button className="button primary" type="submit">Create lesson</button>
              </form>
            </div>
            <div className="portal-card portal-card-gold">
              <h3>Attach resource</h3>
              <form onSubmit={handleCreateResource} style={{ display: 'grid', gap: 12 }}>
                <label className="field"><span>Lesson</span><select value={resourceLessonId} onChange={(event) => setResourceLessonId(event.target.value)}>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
                <label className="field"><span>Title</span><input value={resourceTitle} onChange={(event) => setResourceTitle(event.target.value)} /></label>
                <label className="field"><span>PDF URL</span><input value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} /></label>
                <button className="button primary" type="submit">Add resource</button>
              </form>
            </div>
          </div>

          <div className="portal-grid" style={{ marginTop: 24 }}>
            <section className="portal-card portal-card-gold">
              <h3>Publishing snapshot</h3>
              <p className="portal-card-copy">{publishedLessons.length} published lessons and {featuredLessons.length} featured lessons.</p>
            </section>
            {lessons.map((lesson) => (
              <article key={lesson.id} className="portal-card portal-card-navy">
                <div className="portal-card-header">
                  <h3>{lesson.title}</h3>
                  {lesson.featured ? <span className="portal-pill">Featured</span> : null}
                </div>
                <p className="portal-card-copy">Published: {lesson.published ? 'Yes' : 'No'}</p>
                <p className="portal-card-copy">Difficulty: {lesson.difficulty || 'Unspecified'}</p>
                <p className="portal-card-copy">Type: {lesson.lesson_type || 'Unspecified'}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
