import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

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
  const leadId = request.nextUrl.searchParams.get('leadId');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server configuration is missing.' }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!leadId) {
    return NextResponse.json({ error: 'Lead id is required.' }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data, error } = await adminClient.from('client_documents').select('*').eq('lead_id', leadId);
  if (error) {
    return NextResponse.json({ error: 'We could not load the documents.' }, { status: 500 });
  }

  return NextResponse.json({ documents: data || [] });
}
