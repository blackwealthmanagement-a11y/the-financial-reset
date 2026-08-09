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
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  if (documentId) {
    const { data: documentRow, error: documentLookupError } = await adminClient
      .from('client_documents')
      .select('storage_path, client_id')
      .eq('id', documentId)
      .maybeSingle();

    if (documentLookupError || !documentRow?.storage_path) {
      return NextResponse.json({ error: 'We could not find that document.' }, { status: 404 });
    }

    const { data: clientRecord, error: clientLookupError } = await adminClient
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (clientLookupError || !clientRecord?.id || clientRecord.id !== documentRow.client_id) {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const { data, error } = await adminClient.storage.from('client-documents').createSignedUrl(documentRow.storage_path, 5 * 60);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: 'We could not create a secure link.' }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  }

  const { data: clientRecord, error: clientLookupError } = await adminClient
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (clientLookupError) {
    return NextResponse.json({ error: 'We could not resolve your client profile.' }, { status: 500 });
  }

  if (!clientRecord?.id) {
    return NextResponse.json({ documents: [] });
  }

  const { data, error } = await adminClient.from('client_documents').select('*').eq('client_id', clientRecord.id);
  if (error) {
    return NextResponse.json({ error: 'We could not load your documents.' }, { status: 500 });
  }

  const documents = (data || []).map((document) => {
    const { storage_path: _storagePath, ...rest } = document as Record<string, unknown>;
    return rest;
  });

  return NextResponse.json({ documents });
}
