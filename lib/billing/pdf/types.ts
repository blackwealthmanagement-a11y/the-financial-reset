export type BillingCurrency = 'USD';

export type InvoiceStatusLike = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type PaymentStatusLike = 'pending' | 'paid' | 'failed' | 'refunded';

export interface BillingPdfBranding {
  brandName: string;
  website: string;
  supportEmail: string;
  businessPhone?: string | null;
  footerText: string;
  accentColor: [number, number, number];
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  status: InvoiceStatusLike | string;
  clientName: string;
  clientEmail?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  paidDate?: string | null;
  subtotalCents: number;
  discountCents?: number;
  totalCents: number;
  amountPaidCents?: number;
  balanceDueCents?: number;
  currency?: BillingCurrency | string;
  notes?: string | null;
  items: InvoiceLineItem[];
}

export interface ReceiptPdfData {
  receiptReference?: string | null;
  paymentRecordId?: string | null;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string | null;
  amountCents: number;
  paymentDate?: string | null;
  paymentMethod?: string | null;
  processor?: string | null;
  transactionReference?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  currency?: BillingCurrency | string;
  note?: string | null;
}
