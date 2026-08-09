import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
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
  if (error || !user?.id) {
    return { user: null, error: 'Permission denied.' };
  }

  if (user.id !== adminUserId) {
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

  if (!supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await adminClient.from('billing_products').select('*').eq('active', true).order('name', { ascending: true });
  if (error) {
    return NextResponse.json({ error: 'We could not load billing products.' }, { status: 500 });
  }

  return NextResponse.json({ products: data || [] });
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

  if (!supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const payload = await request.json();
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const serviceType = typeof payload?.service_type === 'string' ? payload.service_type : '';
  const billingType = typeof payload?.billing_type === 'string' ? payload.billing_type : '';
  const priceCents = Number(payload?.price_cents ?? 0);

  if (!name || !serviceType || !billingType) {
    return NextResponse.json({ error: 'Please provide a product name and billing details.' }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await adminClient.from('billing_products').insert({
    name,
    description: typeof payload?.description === 'string' ? payload.description : null,
    service_type: serviceType,
    billing_type: billingType,
    price_cents: Number.isFinite(priceCents) && priceCents >= 0 ? priceCents : 0,
    currency: typeof payload?.currency === 'string' ? payload.currency : 'USD',
    active: payload?.active !== false
  }).select('*').single();

  if (error || !data) {
    return NextResponse.json({ error: 'We could not create the billing product.' }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function PATCH(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Permission denied.' }, { status: 401 });
  }

  const { user, error: authError } = await getAuthenticatedAdminUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Permission denied.' }, { status: 401 });
  }

  const productId = request.nextUrl.searchParams.get('productId');
  if (!productId) {
    return NextResponse.json({ error: 'Product id is required.' }, { status: 400 });
  }

  const payload = await request.json();
  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await adminClient.from('billing_products').update({
    ...payload,
    updated_at: new Date().toISOString()
  }).eq('id', productId).select('*').single();

  if (error || !data) {
    return NextResponse.json({ error: 'We could not update the billing product.' }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}
