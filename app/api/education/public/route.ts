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

    return NextResponse.json({ lesson });
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

  const { data: categories, error } = await client
    .from('education_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'We could not load education content.' }, { status: 500 });
  }

  return NextResponse.json({ categories: categories || [] });
}
