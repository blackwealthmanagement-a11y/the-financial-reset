import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminUserId = process.env.ADMIN_USER_ID || '61058da7-5a59-46c7-a115-ad74eec69213';

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice('Bearer '.length);
}

async function getAuthenticatedAdminUser(token: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: 'Storage unavailable.' };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user?.id || user.id !== adminUserId) {
    return { user: null, error: 'Permission denied.' };
  }

  return { user, error: null };
}

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Permission denied.' }, { status: 401 });
  }

  const { user, error: authError } = await getAuthenticatedAdminUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Permission denied.' }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const view = request.nextUrl.searchParams.get('view');
  if (view === 'categories') {
    const { data: categories, error } = await adminClient.from('education_categories').select('*').order('sort_order', { ascending: true });
    if (error) {
      return NextResponse.json({ error: 'We could not load categories.' }, { status: 500 });
    }
    return NextResponse.json({ categories: categories || [] });
  }

  const { data: lessons, error } = await adminClient.from('education_lessons').select('*').order('featured', { ascending: false }).order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: 'We could not load lessons.' }, { status: 500 });
  }

  return NextResponse.json({ lessons: lessons || [] });
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Permission denied.' }, { status: 401 });
  }

  const { user, error: authError } = await getAuthenticatedAdminUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Permission denied.' }, { status: 401 });
  }

  const payload = await request.json();
  const view = request.nextUrl.searchParams.get('view');
  const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  if (view === 'categories') {
    const categoryPayload = {
      name: payload?.name,
      slug: payload?.slug,
      description: payload?.description ?? null,
      sort_order: Number(payload?.sortOrder ?? 0)
    };
    const { data: category, error } = await adminClient.from('education_categories').insert(categoryPayload).select('*').single();
    if (error || !category) {
      return NextResponse.json({ error: 'We could not create the category.' }, { status: 500 });
    }
    return NextResponse.json({ category });
  }

  if (view === 'resources') {
    const resourcePayload = {
      lesson_id: payload?.lessonId,
      title: payload?.title,
      resource_url: payload?.resourceUrl,
      resource_type: payload?.resourceType || 'pdf'
    };
    const { data: resource, error } = await adminClient.from('lesson_resources').insert(resourcePayload).select('*').single();
    if (error || !resource) {
      return NextResponse.json({ error: 'We could not add the resource.' }, { status: 500 });
    }
    return NextResponse.json({ resource });
  }

  const lessonPayload = {
    category_id: payload?.categoryId,
    title: payload?.title,
    slug: payload?.slug,
    excerpt: payload?.excerpt ?? null,
    content: payload?.content ?? '',
    featured: Boolean(payload?.featured),
    published: Boolean(payload?.published),
    sort_order: Number(payload?.sortOrder ?? 0),
    published_at: payload?.published ? new Date().toISOString() : null
  };

  const lessonId = typeof payload?.id === 'string' ? payload.id : null;
  const { data: lesson, error } = lessonId
    ? await adminClient.from('education_lessons').update(lessonPayload).eq('id', lessonId).select('*').single()
    : await adminClient.from('education_lessons').insert(lessonPayload).select('*').single();

  if (error || !lesson) {
    return NextResponse.json({ error: 'We could not save the lesson.' }, { status: 500 });
  }

  return NextResponse.json({ lesson });
}
