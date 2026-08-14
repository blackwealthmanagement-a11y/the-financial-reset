import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { generateInvoicePdf } from '../../../../../lib/billing/pdf/invoice';
import { generateReceiptPdf } from '../../../../../lib/billing/pdf/receipt';
import { loadInvoicePdfData, loadPaymentReceiptPdfData, sanitizeDocumentFilename } from '../../../../../lib/billing/pdf/loaders';

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
  const invoiceId = request.nextUrl.searchParams.get('invoiceId');
  const paymentId = request.nextUrl.searchParams.get('paymentId');

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

  try {
    if (invoiceId) {
      const pdfData = await loadInvoicePdfData(adminClient, invoiceId);
      const bytes = await generateInvoicePdf(pdfData);
      const filename = sanitizeDocumentFilename(`${pdfData.invoiceNumber}-invoice.pdf`, 'invoice.pdf');
      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, private'
        }
      });
    }

    if (paymentId || invoiceId) {
      let paymentLookupId = paymentId;
      if (!paymentLookupId && invoiceId) {
        const { data: paymentRow, error: paymentLookupError } = await adminClient
          .from('payment_records')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (paymentLookupError) {
          throw paymentLookupError;
        }

        paymentLookupId = paymentRow?.id || null;
      }

      if (!paymentLookupId) {
        return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
      }

      const pdfData = await loadPaymentReceiptPdfData(adminClient, paymentLookupId);
      const bytes = await generateReceiptPdf(pdfData);
      const filename = sanitizeDocumentFilename(`${pdfData.invoiceNumber}-receipt.pdf`, 'receipt.pdf');
      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, private'
        }
      });
    }

    return NextResponse.json({ error: 'Invoice or payment id is required.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'We could not generate the PDF document.' }, { status: 500 });
  }
}
