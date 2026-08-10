import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server configuration is missing.' }, { status: 500 });
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const slug = request.nextUrl.searchParams.get('slug');
  const view = request.nextUrl.searchParams.get('view');

  if (slug) {
    const { data: lesson, error } = await client
      .from('education_lessons')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();

    if (error || !lesson) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    }

    const { data: category } = await client.from('education_categories').select('*').eq('id', lesson.category_id).maybeSingle();
    const { data: resources } = await client.from('lesson_resources').select('*').eq('lesson_id', lesson.id).order('created_at', { ascending: true });
    const { data: relations } = await client.from('education_lesson_relations').select('*').eq('lesson_id', lesson.id).order('sort_order', { ascending: true }).order('created_at', { ascending: true });

    const relatedLessonIds = (relations || []).map((relation) => relation.related_lesson_id);
    const { data: relatedLessons } = relatedLessonIds.length
      ? await client.from('education_lessons').select('*').in('id', relatedLessonIds).eq('published', true).order('featured', { ascending: false }).order('sort_order', { ascending: true })
      : { data: [] };

    return NextResponse.json({ lesson, category, resources: resources || [], relations: relations || [], relatedLessons: relatedLessons || [] });
  }

  if (view === 'lessons') {
    const { data: lessons, error } = await client
      .from('education_lessons')
      .select('*')
      .eq('published', true)
      .order('featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'We could not load lessons.' }, { status: 500 });
    }

    return NextResponse.json({ lessons: lessons || [] });
  }

  if (view === 'learning-paths') {
    const { data: paths, error } = await client.from('education_learning_paths').select('*').eq('published', true).order('featured', { ascending: false }).order('sort_order', { ascending: true });
    if (error) {
      return NextResponse.json({ error: 'We could not load learning paths.' }, { status: 500 });
    }
    return NextResponse.json({ paths: paths || [] });
  }

  if (view === 'learning-path') {
    const pathSlug = request.nextUrl.searchParams.get('slug');
    if (!pathSlug) {
      return NextResponse.json({ error: 'A path slug is required.' }, { status: 400 });
    }

    const { data: path, error: pathError } = await client.from('education_learning_paths').select('*').eq('slug', pathSlug).eq('published', true).maybeSingle();
    if (pathError || !path) {
      return NextResponse.json({ error: 'Learning path not found.' }, { status: 404 });
    }

    const { data: links } = await client.from('learning_path_lessons').select('*').eq('learning_path_id', path.id).order('sort_order', { ascending: true });
    const lessonIds = (links || []).map((link) => link.lesson_id);
    const { data: lessons } = lessonIds.length ? await client.from('education_lessons').select('*').in('id', lessonIds).eq('published', true).order('sort_order', { ascending: true }) : { data: [] };
    const percentComplete = 0;
    const estimatedCompletion = 'Continue learning';

    return NextResponse.json({ path: { ...path, lessons: lessons || [], percentComplete, estimatedCompletion } });
  }

  if (view === 'recommended-path') {
    const { data: path } = await client.from('education_learning_paths').select('*').eq('published', true).eq('featured', true).order('sort_order', { ascending: true }).limit(1).maybeSingle();
    return NextResponse.json({ path });
  }

  const { data: categories, error } = await client
    .from('education_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'We could not load education content.' }, { status: 500 });
  }

  return NextResponse.json({ categories: categories || [] });
}
