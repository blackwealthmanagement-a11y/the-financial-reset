import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

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

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  const leadId = request.nextUrl.searchParams.get('leadId');
  const documentId = request.nextUrl.searchParams.get('documentId');

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
  if (userError || !user || user.id !== adminUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (documentId) {
    const signedUrlClient = createClient(supabaseUrl, supabaseAnonKey, {
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

    const { data: documentRow, error: documentLookupError } = await signedUrlClient
      .from('client_documents')
      .select('storage_path')
      .eq('id', documentId)
      .maybeSingle();

    if (documentLookupError || !documentRow?.storage_path) {
      return NextResponse.json({ error: 'We could not find that document.' }, { status: 404 });
    }

    const { data, error } = await signedUrlClient.storage.from('client-documents').createSignedUrl(documentRow.storage_path, 5 * 60);
    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: 'We could not create a secure link.' }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
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

  const { data, error } = await adminClient.from('client_documents').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: 'We could not load the documents.' }, { status: 500 });
  }

  const documents = (data || []).map((document) => {
    const { storage_path: _storagePath, ...rest } = document as Record<string, unknown>;
    return rest;
  });

  return NextResponse.json({ documents });
}
