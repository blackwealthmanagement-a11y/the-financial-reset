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
  if (!token) {
    return NextResponse.json({ error: 'Permission denied.' }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: 'Permission denied.' }, { status: 401 });
  }

  const clientClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: clientRecord, error: clientLookupError } = await clientClient.from('clients').select('id').eq('auth_user_id', user.id).maybeSingle();
  if (clientLookupError || !clientRecord?.id) {
    return NextResponse.json({ invoices: [], payments: [] });
  }

  const invoiceId = request.nextUrl.searchParams.get('invoiceId');
  const includePayments = request.nextUrl.searchParams.get('includePayments') === 'true';

  if (invoiceId) {
    const { data: invoice, error } = await clientClient.from('client_invoices').select('*').eq('id', invoiceId).eq('client_id', clientRecord.id).maybeSingle();
    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  }

  const { data: invoices, error: invoicesError } = await clientClient.from('client_invoices').select('*').eq('client_id', clientRecord.id).order('created_at', { ascending: false });
  if (invoicesError) {
    return NextResponse.json({ error: 'We could not load your invoices.' }, { status: 500 });
  }

  let payments: unknown[] = [];
  if (includePayments) {
    const { data: paymentRows, error: paymentsError } = await clientClient.from('payment_records').select('*').eq('client_id', clientRecord.id).order('created_at', { ascending: false });
    if (paymentsError) {
      return NextResponse.json({ error: 'We could not load your payment history.' }, { status: 500 });
    }
    payments = paymentRows || [];
  }

  return NextResponse.json({ invoices: invoices || [], payments });
}
