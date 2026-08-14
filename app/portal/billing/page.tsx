'use client';

import { useEffect, useState } from 'react';
import { PortalLayout } from '../../../components/client/PortalLayout';
import { createStripeCheckoutSession, downloadMyInvoicePdf, downloadMyReceiptPdf, getMyInvoices, getMyPaymentHistory } from '../../../services/billing.service';
import { formatCurrencyCents } from '../../../utils/format';
import type { ClientInvoice, PaymentRecord } from '../../../types/billing';

export default function PortalBillingPage() {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null);

  async function handleCheckout(invoice: ClientInvoice) {
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return;
    }

    setCheckoutLoadingId(invoice.id);
    setError(null);

    try {
      const { data } = await createStripeCheckoutSession(invoice.id);
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError('We could not open the secure checkout page.');
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'We could not start secure checkout.');
    } finally {
      setCheckoutLoadingId(null);
    }
  }

  async function handleDownloadInvoice(invoiceId: string) {
    try {
      await downloadMyInvoicePdf(invoiceId);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'We could not download the invoice PDF.');
    }
  }

  async function handleDownloadReceipt(paymentId: string) {
    try {
      await downloadMyReceiptPdf(paymentId);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'We could not download the receipt PDF.');
    }
  }

  useEffect(() => {
    async function loadBilling() {
      setLoading(true);
      setError(null);
      try {
        const [{ data: invoicesData }, { data: paymentsData }] = await Promise.all([getMyInvoices(), getMyPaymentHistory()]);
        setInvoices(invoicesData || []);
        setPayments(paymentsData || []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'We could not load your billing information.');
      } finally {
        setLoading(false);
      }
    }

    loadBilling();
  }, []);

  return (
    <PortalLayout title="Billing" subtitle="View invoices and payment history for your account.">
      <section className="portal-grid" style={{ gridTemplateColumns: '1fr' }}>
        {error ? <div className="status-banner error" role="alert">{error}</div> : null}
        {loading ? (
          <div className="portal-card portal-card-gold">Loading your billing information…</div>
        ) : (
          <>
            <div className="portal-card portal-card-navy">
              <div className="portal-card-header">
                <h3>Invoices</h3>
                <span className="portal-pill">{invoices.length} listed</span>
              </div>
              {invoices.length === 0 ? (
                <p className="portal-card-copy">No invoices are available yet.</p>
              ) : (
                <div className="portal-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                  {invoices.map((invoice) => (
                    <article key={invoice.id} className="portal-card portal-card-gold">
                      <p className="portal-card-copy"><strong>Invoice:</strong> {invoice.invoice_number}</p>
                      <p className="portal-card-copy"><strong>Date:</strong> {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : '—'}</p>
                      <p className="portal-card-copy"><strong>Due:</strong> {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</p>
                      <p className="portal-card-copy"><strong>Amount:</strong> {formatCurrencyCents(invoice.total_cents, invoice.currency)}</p>
                      <p className="portal-card-copy"><strong>Status:</strong> {invoice.status}</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                        <button type="button" className="button secondary" onClick={() => handleDownloadInvoice(invoice.id)}>
                          Download invoice
                        </button>
                        {invoice.status !== 'paid' && invoice.status !== 'cancelled' ? (
                          <button
                            type="button"
                            className="button primary"
                            onClick={() => handleCheckout(invoice)}
                            disabled={checkoutLoadingId === invoice.id}
                          >
                            {checkoutLoadingId === invoice.id ? 'Opening checkout…' : 'Pay securely'}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="portal-card portal-card-gold">
              <div className="portal-card-header">
                <h3>Payment history</h3>
                <span className="portal-pill">{payments.length} records</span>
              </div>
              {payments.length === 0 ? (
                <p className="portal-card-copy">No payment history is available yet.</p>
              ) : (
                <div className="portal-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                  {payments.map((payment) => (
                    <article key={payment.id} className="portal-card portal-card-navy">
                      <p className="portal-card-copy"><strong>Amount:</strong> {formatCurrencyCents(payment.amount_cents, payment.currency)}</p>
                      <p className="portal-card-copy"><strong>Method:</strong> {payment.payment_method}</p>
                      <p className="portal-card-copy"><strong>Date:</strong> {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'Pending'}</p>
                      <p className="portal-card-copy"><strong>Status:</strong> {payment.status}</p>
                      {payment.status === 'paid' ? (
                        <button type="button" className="button secondary" style={{ marginTop: 8 }} onClick={() => handleDownloadReceipt(payment.id)}>
                          Download receipt
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </PortalLayout>
  );
}
