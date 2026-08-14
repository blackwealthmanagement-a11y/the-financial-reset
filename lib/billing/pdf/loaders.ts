import { buildDisplayReference } from './shared';
import type { InvoicePdfData, ReceiptPdfData } from './types';

export type BillingSupabaseClient = any;

export function sanitizeDocumentFilename(value: string, fallback = 'document') {
  const normalized = String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);

  return normalized || fallback;
}

export async function loadInvoicePdfData(adminSupabase: BillingSupabaseClient, invoiceId: string): Promise<InvoicePdfData> {
  const { data: invoice, error: invoiceError } = await adminSupabase
    .from('client_invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();

  if (invoiceError) {
    throw invoiceError;
  }

  if (!invoice) {
    throw new Error('Invoice not found.');
  }

  const [{ data: items }, { data: client }, { data: lead }, { data: payments }] = await Promise.all([
    adminSupabase.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('created_at', { ascending: true }),
    adminSupabase.from('clients').select('id, lead_id').eq('id', invoice.client_id).maybeSingle(),
    adminSupabase.from('intake_submissions').select('id, full_name, email').eq('id', invoice.lead_id).maybeSingle(),
    adminSupabase.from('payment_records').select('*').eq('invoice_id', invoiceId).order('created_at', { ascending: true })
  ]);

  const paidAmount = (payments || []).reduce((sum, row) => sum + (row.status === 'paid' ? Number(row.amount_cents || 0) : 0), 0);
  const clientName = lead?.full_name || 'Client';

  return {
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    clientName,
    clientEmail: lead?.email || null,
    issueDate: invoice.created_at,
    dueDate: invoice.due_date,
    paidDate: invoice.paid_at,
    subtotalCents: Number(invoice.subtotal_cents || 0),
    discountCents: Number(invoice.discount_cents || 0),
    totalCents: Number(invoice.total_cents || 0),
    amountPaidCents: paidAmount,
    balanceDueCents: Math.max(Number(invoice.total_cents || 0) - paidAmount, 0),
    currency: invoice.currency || 'USD',
    notes: invoice.notes,
    items: (items || []).map((item) => ({
      description: item.description || 'Service',
      quantity: Number(item.quantity || 1),
      unitPriceCents: Number(item.unit_price_cents || 0),
      lineTotalCents: Number(item.line_total_cents || 0)
    }))
  };
}

export async function loadPaymentReceiptPdfData(adminSupabase: BillingSupabaseClient, paymentId: string): Promise<ReceiptPdfData> {
  const { data: payment, error: paymentError } = await adminSupabase
    .from('payment_records')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();

  if (paymentError) {
    throw paymentError;
  }

  if (!payment) {
    throw new Error('Payment record not found.');
  }

  if (payment.status !== 'paid') {
    throw new Error('Receipt is only available for paid payments.');
  }

  const { data: invoice, error: invoiceError } = await adminSupabase
    .from('client_invoices')
    .select('*')
    .eq('id', payment.invoice_id)
    .maybeSingle();

  if (invoiceError) {
    throw invoiceError;
  }

  if (!invoice) {
    throw new Error('Invoice not found for payment receipt.');
  }

  const { data: client } = await adminSupabase
    .from('clients')
    .select('id, lead_id')
    .eq('id', payment.client_id)
    .maybeSingle();

  const { data: lead } = await adminSupabase
    .from('intake_submissions')
    .select('id, full_name, email')
    .eq('id', invoice.lead_id)
    .maybeSingle();

  const clientName = lead?.full_name || 'Client';

  return {
    receiptReference: buildDisplayReference(payment.id, invoice.invoice_number),
    paymentRecordId: payment.id,
    invoiceNumber: invoice.invoice_number,
    clientName,
    clientEmail: lead?.email || null,
    amountCents: Number(payment.amount_cents || 0),
    paymentDate: payment.paid_at || payment.created_at,
    paymentMethod: payment.payment_method,
    processor: payment.processor || (payment.payment_method === 'stripe' ? 'stripe' : 'manual'),
    transactionReference: payment.external_reference || payment.stripe_charge_id || payment.stripe_payment_intent_id || payment.stripe_checkout_session_id || payment.id,
    stripePaymentIntentId: payment.stripe_payment_intent_id,
    stripeChargeId: payment.stripe_charge_id,
    currency: payment.currency || invoice.currency || 'USD',
    note: payment.external_reference ? `Reference: ${payment.external_reference}` : null
  };
}
