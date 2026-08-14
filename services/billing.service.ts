import { browserSupabase } from '../lib/supabase/browser';
import type { BillingProduct, ClientInvoice, InvoiceItem, PaymentRecord } from '../types/billing';

async function getAuthHeaders() {
  if (!browserSupabase) {
    throw new Error('The billing client is unavailable.');
  }

  const { data: { session } } = await browserSupabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Please sign in to continue.');
  }

  return { Authorization: `Bearer ${session.access_token}` };
}

export async function getBillingProducts() {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/crm/billing/products', { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load billing products.');
  }
  return { data: payload.products as BillingProduct[], error: null as Error | null };
}

export async function createBillingProduct(payload: Partial<BillingProduct>) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/crm/billing/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'We could not create the billing product.');
  }
  return { data: json.product as BillingProduct, error: null as Error | null };
}

export async function updateBillingProduct(productId: string, payload: Partial<BillingProduct>) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/crm/billing/products?productId=${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'We could not update the billing product.');
  }
  return { data: json.product as BillingProduct, error: null as Error | null };
}

export async function getClientInvoices(leadId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/crm/billing/invoices?leadId=${encodeURIComponent(leadId)}`, { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load invoices.');
  }
  return { data: payload.invoices as ClientInvoice[], error: null as Error | null };
}

export async function getInvoice(invoiceId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/crm/billing/invoices?invoiceId=${encodeURIComponent(invoiceId)}`, { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load the invoice.');
  }
  return { data: payload.invoice as ClientInvoice, error: null as Error | null };
}

export async function createInvoice(payload: {
  clientId: string;
  leadId: string;
  productId?: string;
  description?: string;
  quantity?: number;
  unitPriceCents?: number;
  dueDate?: string | null;
  notes?: string | null;
}) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/crm/billing/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'We could not create the invoice.');
  }
  return { data: json as { invoice: ClientInvoice; item: InvoiceItem }, error: null as Error | null };
}

export async function updateInvoiceStatus(invoiceId: string, status: ClientInvoice['status']) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/crm/billing/invoices?invoiceId=${encodeURIComponent(invoiceId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ status })
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'We could not update the invoice status.');
  }
  return { data: json.invoice as ClientInvoice, error: null as Error | null };
}

export async function addInvoiceItem(invoiceId: string, payload: Partial<InvoiceItem>) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/crm/billing/invoices?invoiceId=${encodeURIComponent(invoiceId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'We could not add the invoice item.');
  }
  return { data: json.item as InvoiceItem, error: null as Error | null };
}

export async function removeInvoiceItem(invoiceItemId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/crm/billing/invoices?invoiceItemId=${encodeURIComponent(invoiceItemId)}`, {
    method: 'DELETE',
    headers,
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'We could not remove the invoice item.');
  }
  return { data: json.ok === true, error: null as Error | null };
}

export async function recordManualPayment(invoiceId: string, payload: {
  amountCents: number;
  paymentMethod: string;
  reference?: string | null;
  status?: string;
}) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/crm/billing/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ invoiceId, ...payload })
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'We could not record the payment.');
  }
  return { data: json as { payment: PaymentRecord; invoice: ClientInvoice }, error: null as Error | null };
}

export async function getMyInvoices() {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/portal/billing', { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load your invoices.');
  }
  return { data: payload.invoices as ClientInvoice[], error: null as Error | null };
}

export async function getMyInvoice(invoiceId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/portal/billing?invoiceId=${encodeURIComponent(invoiceId)}`, { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load the invoice.');
  }
  return { data: payload.invoice as ClientInvoice, error: null as Error | null };
}

export async function getMyPaymentHistory() {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/portal/billing?includePayments=true', { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not load your payment history.');
  }
  return { data: payload.payments as PaymentRecord[], error: null as Error | null };
}

export async function createStripeCheckoutSession(invoiceId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/portal/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ invoiceId })
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'We could not start a secure checkout session.');
  }
  return { data: json as { sessionId: string; url: string; invoice: ClientInvoice }, error: null as Error | null };
}

async function openPdfDownload(route: string, query: string, headers: Record<string, string>) {
  const response = await fetch(`${route}?${query}`, { headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || 'We could not generate the PDF document.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function downloadMyInvoicePdf(invoiceId: string) {
  const headers = await getAuthHeaders();
  await openPdfDownload('/api/portal/billing/download', `invoiceId=${encodeURIComponent(invoiceId)}`, headers);
}

export async function downloadMyReceiptPdf(paymentId: string) {
  const headers = await getAuthHeaders();
  await openPdfDownload('/api/portal/billing/download', `paymentId=${encodeURIComponent(paymentId)}`, headers);
}

export async function downloadInvoicePdfForAdmin(invoiceId: string) {
  const headers = await getAuthHeaders();
  await openPdfDownload('/api/crm/billing/download', `invoiceId=${encodeURIComponent(invoiceId)}`, headers);
}

export async function downloadReceiptPdfForAdmin(paymentId: string) {
  const headers = await getAuthHeaders();
  await openPdfDownload('/api/crm/billing/download', `paymentId=${encodeURIComponent(paymentId)}`, headers);
}
