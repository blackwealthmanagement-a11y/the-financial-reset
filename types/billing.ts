export type BillingServiceType = 'personal_credit_education' | 'business_credit_guidance' | 'consultation' | 'monthly_coaching';
export type BillingType = 'one_time' | 'monthly';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'manual' | 'cash' | 'bank_transfer' | 'zelle' | 'stripe' | 'other';

export interface BillingProduct {
  id: string;
  name: string;
  description: string | null;
  service_type: BillingServiceType;
  billing_type: BillingType;
  price_cents: number;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientInvoice {
  id: string;
  client_id: string;
  lead_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  invoice_id: string;
  client_id: string;
  amount_cents: number;
  currency: string;
  payment_method: PaymentMethod;
  processor?: 'manual' | 'stripe';
  status: PaymentStatus;
  external_reference: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_charge_id?: string | null;
  stripe_metadata?: Record<string, string | null> | null;
  paid_at: string | null;
  created_at: string;
}
