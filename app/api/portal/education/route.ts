import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice('Bearer '.length);
}

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: clientRecord } = await adminClient.from('clients').select('id').eq('auth_user_id', user.id).maybeSingle();
  if (!clientRecord?.id) {
    return NextResponse.json({ lessons: [], progress: [] });
  }

  const slug = request.nextUrl.searchParams.get('slug');
  const view = request.nextUrl.searchParams.get('view');

  if (slug) {
    const { data: lesson, error: lessonError } = await adminClient.from('education_lessons').select('*').eq('slug', slug).eq('published', true).maybeSingle();
    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    }

    const { data: category } = await adminClient.from('education_categories').select('*').eq('id', lesson.category_id).maybeSingle();
    const { data: resources } = await adminClient.from('lesson_resources').select('*').eq('lesson_id', lesson.id).order('created_at', { ascending: true });
    const { data: relations } = await adminClient.from('education_lesson_relations').select('*').eq('lesson_id', lesson.id).order('sort_order', { ascending: true }).order('created_at', { ascending: true });
    const { data: progress } = await adminClient.from('client_lesson_progress').select('*').eq('client_id', clientRecord.id).eq('lesson_id', lesson.id).maybeSingle();

    const relatedLessonIds = (relations || []).map((relation) => relation.related_lesson_id);
    const { data: relatedLessons } = relatedLessonIds.length
      ? await adminClient.from('education_lessons').select('*').in('id', relatedLessonIds).eq('published', true).order('featured', { ascending: false }).order('sort_order', { ascending: true })
      : { data: [] };

    const { data: progressRows } = await adminClient.from('client_lesson_progress').select('*').eq('client_id', clientRecord.id).order('updated_at', { ascending: false });

    await adminClient.from('client_lesson_progress').upsert({ client_id: clientRecord.id, lesson_id: lesson.id, completed: progress?.completed || false, completed_at: progress?.completed_at ?? null, last_accessed_at: new Date().toISOString() }, { onConflict: 'client_id,lesson_id' });

    return NextResponse.json({ lesson, category, resources: resources || [], relations: relations || [], relatedLessons: relatedLessons || [], progress: progress || null, progressRows: progressRows || [] });
  }

  if (view === 'progress') {
    const { data: progress, error } = await adminClient.from('client_lesson_progress').select('*').eq('client_id', clientRecord.id).order('updated_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'We could not load progress.' }, { status: 500 });
    }
    return NextResponse.json({ progress: progress || [] });
  }

  const { data: lessons, error } = await adminClient.from('education_lessons').select('*').eq('published', true).order('featured', { ascending: false }).order('sort_order', { ascending: true });
  if (error) {
    return NextResponse.json({ error: 'We could not load lessons.' }, { status: 500 });
  }

  return NextResponse.json({ lessons: lessons || [] });
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: clientRecord } = await adminClient.from('clients').select('id').eq('auth_user_id', user.id).maybeSingle();
  if (!clientRecord?.id) {
    return NextResponse.json({ error: 'Client profile not found.' }, { status: 404 });
  }

  const payload = await request.json();
  const lessonId = typeof payload?.lessonId === 'string' ? payload.lessonId : '';
  const completed = Boolean(payload?.completed);

  if (!lessonId) {
    return NextResponse.json({ error: 'Lesson id is required.' }, { status: 400 });
  }

  const { data: existing, error: lookupError } = await adminClient.from('client_lesson_progress').select('*').eq('client_id', clientRecord.id).eq('lesson_id', lessonId).maybeSingle();
  if (lookupError) {
    return NextResponse.json({ error: 'We could not update your progress.' }, { status: 500 });
  }

  const progressPayload = {
    client_id: clientRecord.id,
    lesson_id: lessonId,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
    last_accessed_at: new Date().toISOString()
  };

  const { data: progress, error } = existing
    ? await adminClient.from('client_lesson_progress').update(progressPayload).eq('id', existing.id).select('*').single()
    : await adminClient.from('client_lesson_progress').insert(progressPayload).select('*').single();

  if (error || !progress) {
    return NextResponse.json({ error: 'We could not update your progress.' }, { status: 500 });
  }

  return NextResponse.json({ progress });
}
