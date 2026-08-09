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
  const invoiceId = typeof payload?.invoiceId === 'string' ? payload.invoiceId : '';
  const amountCents = Number(payload?.amountCents ?? 0);
  const paymentMethod = typeof payload?.paymentMethod === 'string' ? payload.paymentMethod : 'manual';
  const reference = typeof payload?.reference === 'string' ? payload.reference : null;
  const status = typeof payload?.status === 'string' ? payload.status : 'paid';

  if (!invoiceId || amountCents <= 0) {
    return NextResponse.json({ error: 'Please provide a valid invoice and payment amount.' }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: invoice, error: invoiceError } = await adminClient.from('client_invoices').select('*').eq('id', invoiceId).maybeSingle();
  if (invoiceError || !invoice) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  }

  const { data: payment, error: paymentError } = await adminClient.from('payment_records').insert({
    invoice_id: invoiceId,
    client_id: invoice.client_id,
    amount_cents: amountCents,
    currency: 'USD',
    payment_method: paymentMethod,
    status,
    external_reference: reference,
    paid_at: status === 'paid' ? new Date().toISOString() : null
  }).select('*').single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: 'We could not record the payment.' }, { status: 500 });
  }

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status === 'paid') {
    updatePayload.status = 'paid';
    updatePayload.paid_at = new Date().toISOString();
  }

  const { data: updatedInvoice, error: updateError } = await adminClient.from('client_invoices').update(updatePayload).eq('id', invoiceId).select('*').single();
  if (updateError || !updatedInvoice) {
    return NextResponse.json({ error: 'We could not update the invoice after recording payment.' }, { status: 500 });
  }

  const { error: activityError } = await adminClient.from('crm_lead_activity').insert({
    lead_id: invoice.lead_id,
    activity_type: 'document',
    message: `Manual payment recorded. ${invoice.invoice_number}`,
    created_by: 'admin'
  });

  if (activityError) {
    console.error('Payment activity logging failed.', activityError);
  }

  return NextResponse.json({ payment, invoice: updatedInvoice });
}
