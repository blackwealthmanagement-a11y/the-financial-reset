import assert from 'node:assert/strict';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';

import { formatCurrency } from '../shared.ts';
import { generateInvoicePdf } from '../invoice.ts';
import { generateReceiptPdf } from '../receipt.ts';

const invoiceData = {
  invoiceNumber: 'TFR-2026-000001',
  status: 'paid',
  clientName: 'Taylor Morgan',
  clientEmail: 'taylor@example.com',
  issueDate: '2026-08-01T00:00:00.000Z',
  dueDate: '2026-08-15T00:00:00.000Z',
  paidDate: '2026-08-10T00:00:00.000Z',
  subtotalCents: 24000,
  discountCents: 0,
  totalCents: 24000,
  amountPaidCents: 24000,
  balanceDueCents: 0,
  currency: 'USD',
  notes: 'Thank you for your continued support.',
  items: [
    { description: 'Business credit guidance package', quantity: 1, unitPriceCents: 20000, lineTotalCents: 20000 },
    { description: 'Monthly financial check-in and strategy review', quantity: 2, unitPriceCents: 2000, lineTotalCents: 4000 }
  ]
} as const;

const receiptData = {
  receiptReference: 'RCPT-AB12CD34',
  invoiceNumber: 'TFR-2026-000001',
  clientName: 'Taylor Morgan',
  clientEmail: 'taylor@example.com',
  amountCents: 24000,
  paymentDate: '2026-08-10T00:00:00.000Z',
  paymentMethod: 'stripe',
  processor: 'stripe',
  transactionReference: 'pi_12345',
  stripeChargeId: 'ch_abc123',
  currency: 'USD',
  note: 'Payment received and confirmed.'
} as const;

test('invoice PDF returns valid PDF bytes', async () => {
  const bytes = await generateInvoicePdf(invoiceData as any);
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 1000);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount() >= 1, true);
});

test('receipt PDF returns valid PDF bytes', async () => {
  const bytes = await generateReceiptPdf(receiptData as any);
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 1000);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
});

test('currency formatting matches expected values', () => {
  assert.equal(formatCurrency(12345, 'USD'), '$123.45');
  assert.equal(formatCurrency(0, 'USD'), '$0.00');
});

test('missing optional fields do not crash generation', async () => {
  const bytes = await generateInvoicePdf({
    ...invoiceData,
    clientEmail: null,
    notes: null,
    dueDate: null,
    paidDate: null,
    items: [{ description: 'One-off service', quantity: 1, unitPriceCents: 15000, lineTotalCents: 15000 }]
  } as any);

  assert.ok(bytes.length > 1000);
});

test('long invoice descriptions do not break layout', async () => {
  const bytes = await generateInvoicePdf({
    ...invoiceData,
    items: [{
      description: 'A very long invoice description that exceeds the standard line length and should still render safely without breaking the PDF structure or layout.',
      quantity: 1,
      unitPriceCents: 15000,
      lineTotalCents: 15000
    }]
  } as any);

  assert.ok(bytes.length > 1000);
});
