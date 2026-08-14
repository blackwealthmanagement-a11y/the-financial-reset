import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { generateInvoicePdf } from '../../../../../lib/billing/pdf/invoice';
import { generateReceiptPdf } from '../../../../../lib/billing/pdf/receipt';
import { loadInvoicePdfData, loadPaymentReceiptPdfData, sanitizeDocumentFilename } from '../../../../../lib/billing/pdf/loaders';

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
  const invoiceId = request.nextUrl.searchParams.get('invoiceId');
  const paymentId = request.nextUrl.searchParams.get('paymentId');

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
    return NextResponse.json({ error: 'Client record not found.' }, { status: 404 });
  }

  try {
    if (invoiceId) {
      const { data: invoice, error } = await clientClient.from('client_invoices').select('*').eq('id', invoiceId).eq('client_id', clientRecord.id).maybeSingle();
      if (error || !invoice) {
        return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
      }

      const pdfData = await loadInvoicePdfData(clientClient, invoice.id);
      const bytes = await generateInvoicePdf(pdfData);
      const filename = sanitizeDocumentFilename(`${pdfData.invoiceNumber}-invoice.pdf`, 'invoice.pdf');
      const response = new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, private'
        }
      });
      return response;
    }

    if (paymentId || invoiceId) {
      let paymentLookupId = paymentId;
      if (!paymentLookupId && invoiceId) {
        const { data: paymentRow, error: paymentLookupError } = await clientClient
          .from('payment_records')
          .select('*')
          .eq('invoice_id', invoiceId)
          .eq('client_id', clientRecord.id)
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

      const { data: payment, error } = await clientClient.from('payment_records').select('*').eq('id', paymentLookupId).eq('client_id', clientRecord.id).maybeSingle();
      if (error || !payment) {
        return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
      }

      const pdfData = await loadPaymentReceiptPdfData(clientClient, payment.id);
      const bytes = await generateReceiptPdf(pdfData);
      const filename = sanitizeDocumentFilename(`${pdfData.invoiceNumber}-receipt.pdf`, 'receipt.pdf');
      const response = new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, private'
        }
      });
      return response;
    }

    return NextResponse.json({ error: 'Invoice or payment id is required.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'We could not generate the PDF document.' }, { status: 500 });
  }
}
