import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

type WebhookRecord = {
  id: string;
  event_id: string;
  event_type: string;
  status: 'pending' | 'completed' | 'failed';
  attempt_count: number;
  last_error: string | null;
  payload: Record<string, unknown>;
};

function createStripeClient() {
  if (!stripeSecretKey) {
    throw new Error('Stripe is not configured.');
  }

  return new Stripe(stripeSecretKey);
}

function createAdminSupabaseClient() {
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('Supabase is not configured.');
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  return message.length > 1000 ? message.slice(0, 1000) : message;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function minimalWebhookPayload(event: Stripe.Event) {
  const rawObject = event.data.object as unknown as Record<string, unknown> | null;
  const objectId = typeof rawObject?.id === 'string' ? rawObject.id : null;
  const paymentIntentId = typeof rawObject?.payment_intent === 'string' ? rawObject.payment_intent : null;

  return {
    id: event.id,
    type: event.type,
    created: event.created,
    livemode: event.livemode,
    object: {
      id: objectId,
      object: typeof rawObject?.object === 'string' ? rawObject.object : null,
      payment_intent: paymentIntentId,
      customer_email: typeof rawObject?.customer_details === 'object' && rawObject.customer_details && 'email' in (rawObject.customer_details as Record<string, unknown>) ? (rawObject.customer_details as Record<string, unknown>).email : null
    }
  };
}

async function fetchOrCreateWebhookEvent(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, event: Stripe.Event) {
  const { data, error } = await adminSupabase
    .from('stripe_webhook_events')
    .select('*')
    .eq('event_id', event.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (data) {
    return data as WebhookRecord;
  }

  const { data: inserted, error: insertError } = await adminSupabase
    .from('stripe_webhook_events')
    .insert({
      event_id: event.id,
      event_type: event.type,
      status: 'pending',
      attempt_count: 0,
      payload: minimalWebhookPayload(event)
    })
    .select('*')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: recovered, error: recoveryError } = await adminSupabase
        .from('stripe_webhook_events')
        .select('*')
        .eq('event_id', event.id)
        .maybeSingle();

      if (recoveryError) {
        throw recoveryError;
      }

      if (!recovered) {
        throw insertError;
      }

      return recovered as WebhookRecord;
    }

    throw insertError;
  }

  return inserted as WebhookRecord;
}

async function updateWebhookEvent(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, eventId: string, patch: Record<string, unknown>) {
  const { data, error } = await adminSupabase
    .from('stripe_webhook_events')
    .update(patch)
    .eq('event_id', eventId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as WebhookRecord;
}

async function resolveLatestChargeId(stripe: Stripe, session: Stripe.Checkout.Session) {
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
  if (!paymentIntentId) {
    return null;
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : null;
}

async function findExistingPaymentRecord(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, session: Stripe.Checkout.Session) {
  const sessionId = session.id;
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

  if (sessionId) {
    const { data: bySession, error: sessionError } = await adminSupabase
      .from('payment_records')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();

    if (sessionError && sessionError.code !== 'PGRST116') {
      throw sessionError;
    }

    if (bySession) {
      return bySession;
    }
  }

  if (paymentIntentId) {
    const { data: byIntent, error: intentError } = await adminSupabase
      .from('payment_records')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (intentError && intentError.code !== 'PGRST116') {
      throw intentError;
    }

    if (byIntent) {
      return byIntent;
    }
  }

  return null;
}

async function upsertStripePaymentRecord(
  adminSupabase: ReturnType<typeof createAdminSupabaseClient>,
  invoice: { id: string; client_id: string; currency: string; total_cents: number; invoice_number: string },
  session: Stripe.Checkout.Session,
  paid: boolean,
  stripeChargeId: string | null
) {
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
  const sessionId = session.id;
  const paidAt = paid ? new Date().toISOString() : null;
  const paymentRow = {
    invoice_id: invoice.id,
    client_id: invoice.client_id,
    amount_cents: typeof session.amount_total === 'number' ? session.amount_total : invoice.total_cents,
    currency: (invoice.currency || 'USD').toUpperCase(),
    payment_method: 'stripe',
    processor: 'stripe',
    status: paid ? 'paid' : 'failed',
    external_reference: sessionId,
    stripe_checkout_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
    stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
    stripe_charge_id: stripeChargeId,
    stripe_metadata: {
      invoice_number: invoice.invoice_number,
      customer_email: session.customer_details?.email || null,
      payment_status: session.payment_status || null,
      mode: session.mode || null,
      payment_intent_id: paymentIntentId || null
    },
    paid_at: paidAt
  };

  const existing = await findExistingPaymentRecord(adminSupabase, session);
  if (existing) {
    const { data, error } = await adminSupabase
      .from('payment_records')
      .update({
        ...paymentRow,
        stripe_checkout_session_id: existing.stripe_checkout_session_id || sessionId,
        stripe_payment_intent_id: existing.stripe_payment_intent_id || paymentIntentId,
        status: paid ? 'paid' : 'failed',
        paid_at: paid ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  try {
    const { data, error } = await adminSupabase.from('payment_records').insert(paymentRow).select('*').single();
    if (error) {
      if (error.code === '23505') {
        const recovered = await findExistingPaymentRecord(adminSupabase, session);
        if (!recovered) {
          throw error;
        }

        const { data: updated, error: updateError } = await adminSupabase
          .from('payment_records')
          .update({
            ...paymentRow,
            stripe_checkout_session_id: recovered.stripe_checkout_session_id || sessionId,
            stripe_payment_intent_id: recovered.stripe_payment_intent_id || paymentIntentId,
            status: paid ? 'paid' : 'failed',
            paid_at: paid ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', recovered.id)
          .select('*')
          .single();

        if (updateError) {
          throw updateError;
        }

        return updated;
      }

      throw error;
    }

    return data;
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        const recovered = await findExistingPaymentRecord(adminSupabase, session);
        if (!recovered) {
          throw error;
        }

        const { data: updated, error: updateError } = await adminSupabase
          .from('payment_records')
          .update({
            ...paymentRow,
            stripe_checkout_session_id: recovered.stripe_checkout_session_id || sessionId,
            stripe_payment_intent_id: recovered.stripe_payment_intent_id || paymentIntentId,
            status: paid ? 'paid' : 'failed',
            paid_at: paid ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', recovered.id)
          .select('*')
          .single();

        if (updateError) {
          throw updateError;
        }

        return updated;
      }
    }

    throw error;
  }
}

async function persistActivityWithIdempotency(
  adminSupabase: ReturnType<typeof createAdminSupabaseClient>,
  payload: {
    lead_id: string;
    activity_type: string;
    message: string;
    created_by: string;
    automation_key?: string;
  }
) {
  const { error } = await adminSupabase.from('crm_lead_activity').insert({
    ...payload,
    automation_key: payload.automation_key || null
  });

  if (!error) {
    return true;
  }

  if (error.code === '23505') {
    return true;
  }

  throw error;
}

export async function retryPaymentReceipt(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, invoiceId: string, sessionId?: string) {
  const { data: paymentRecord, error: paymentError } = await adminSupabase
    .from('payment_records')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (paymentError) {
    throw paymentError;
  }

  if (!paymentRecord || paymentRecord.status !== 'paid' || paymentRecord.receipt_sent) {
    return false;
  }

  const { data: invoice, error: invoiceError } = await adminSupabase
    .from('client_invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();

  if (invoiceError || !invoice) {
    throw invoiceError || new Error('Invoice not found.');
  }

  const { data: lead, error: leadError } = await adminSupabase
    .from('intake_submissions')
    .select('id, full_name, email')
    .eq('id', invoice.lead_id)
    .maybeSingle();

  if (leadError || !lead?.email) {
    throw leadError || new Error('Lead email not found for payment receipt.');
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!resendApiKey || !fromEmail) {
    return false;
  }

  const safeFirstName = escapeHtml(String(lead.full_name || '').split(/\s+/).filter(Boolean)[0] || 'friend');
  const safeInvoiceNumber = escapeHtml(invoice.invoice_number);
  const receiptKey = `stripe-payment-receipt:${sessionId || paymentRecord.stripe_checkout_session_id || invoice.id}`;
  const amountLabel = new Intl.NumberFormat('en-US', { style: 'currency', currency: (invoice.currency || 'USD').toUpperCase() }).format(paymentRecord.amount_cents / 100);
  const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://the-financial-reset.com'}/portal/billing`;
  const messageHtml = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin-bottom: 8px;">Payment receipt</h2>
      <p>Hello ${safeFirstName},</p>
      <p>Your payment for invoice <strong>${safeInvoiceNumber}</strong> was received successfully.</p>
      <p><strong>Amount paid:</strong> ${amountLabel}</p>
      <p><strong>Paid date:</strong> ${paymentRecord.paid_at ? new Date(paymentRecord.paid_at).toLocaleDateString() : '—'}</p>
      <p>You can view your billing records anytime in the <a href="${portalUrl}">portal billing</a> area.</p>
    </div>
  `;

  try {
    const resend = new Resend(resendApiKey);
    const emailResult = await resend.emails.send(
      {
        from: fromEmail,
        to: [lead.email],
        subject: `Payment received for ${safeInvoiceNumber}`,
        html: messageHtml
      },
      { idempotencyKey: receiptKey }
    );

    if (emailResult.error) {
      const safeMessage = safeErrorMessage(emailResult.error);
      await adminSupabase.from('payment_records').update({
        receipt_sent: false,
        receipt_last_error: safeMessage,
        receipt_sent_at: null
      }).eq('id', paymentRecord.id);
      return false;
    }

    await adminSupabase.from('payment_records').update({
      receipt_sent: true,
      receipt_sent_at: new Date().toISOString(),
      receipt_last_error: null
    }).eq('id', paymentRecord.id);

    return true;
  } catch (error) {
    await adminSupabase.from('payment_records').update({
      receipt_sent: false,
      receipt_last_error: safeErrorMessage(error),
      receipt_sent_at: null
    }).eq('id', paymentRecord.id);
    return false;
  }
}

async function sendPaymentReceiptEmail(
  adminSupabase: ReturnType<typeof createAdminSupabaseClient>,
  invoice: { id: string; invoice_number: string; client_id: string; lead_id: string; total_cents: number; currency: string },
  session: Stripe.Checkout.Session,
  paidAt: string
) {
  const { data: paymentRecord, error: paymentRecordError } = await adminSupabase
    .from('payment_records')
    .select('id, receipt_sent, stripe_checkout_session_id, status, amount_cents, paid_at')
    .eq('invoice_id', invoice.id)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (paymentRecordError) {
    throw paymentRecordError;
  }

  if (!paymentRecord) {
    return false;
  }

  if (paymentRecord.receipt_sent) {
    return true;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!resendApiKey || !fromEmail) {
    return false;
  }

  const { data: lead, error: leadError } = await adminSupabase
    .from('intake_submissions')
    .select('id, full_name, email')
    .eq('id', invoice.lead_id)
    .maybeSingle();

  if (leadError || !lead?.email) {
    return false;
  }

  const firstName = String(lead.full_name || '').split(/\s+/).filter(Boolean)[0] || 'friend';
  const safeFirstName = escapeHtml(firstName);
  const safeInvoiceNumber = escapeHtml(invoice.invoice_number);
  const receiptKey = `stripe-payment-receipt:${session.id}`;
  const amountLabel = new Intl.NumberFormat('en-US', { style: 'currency', currency: (invoice.currency || 'USD').toUpperCase() }).format(invoice.total_cents / 100);
  const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://the-financial-reset.com'}/portal/billing`;
  const messageHtml = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin-bottom: 8px;">Payment receipt</h2>
      <p>Hello ${safeFirstName},</p>
      <p>Your payment for invoice <strong>${safeInvoiceNumber}</strong> was received successfully.</p>
      <p><strong>Amount paid:</strong> ${amountLabel}</p>
      <p><strong>Paid date:</strong> ${new Date(paidAt).toLocaleDateString()}</p>
      <p>You can view your billing records anytime in the <a href="${portalUrl}">portal billing</a> area.</p>
    </div>
  `;

  try {
    const resend = new Resend(resendApiKey);
    const emailResult = await resend.emails.send(
      {
        from: fromEmail,
        to: [lead.email],
        subject: `Payment received for ${safeInvoiceNumber}`,
        html: messageHtml
      },
      { idempotencyKey: receiptKey }
    );

    if (emailResult.error) {
      const safeMessage = safeErrorMessage(emailResult.error);
      await adminSupabase.from('payment_records').update({
        receipt_sent: false,
        receipt_sent_at: null,
        receipt_last_error: safeMessage
      }).eq('id', paymentRecord.id);
      await persistActivityWithIdempotency(adminSupabase, {
        lead_id: invoice.lead_id,
        activity_type: 'payment',
        message: `Stripe receipt email failed for ${safeInvoiceNumber}.`,
        created_by: 'system',
        automation_key: receiptKey
      });
      return false;
    }

    await adminSupabase.from('payment_records').update({
      receipt_sent: true,
      receipt_sent_at: new Date().toISOString(),
      receipt_last_error: null
    }).eq('id', paymentRecord.id);

    await persistActivityWithIdempotency(adminSupabase, {
      lead_id: invoice.lead_id,
      activity_type: 'payment',
      message: `Stripe receipt email sent for ${safeInvoiceNumber}.`,
      created_by: 'system',
      automation_key: receiptKey
    });

    return true;
  } catch (error) {
    const safeMessage = safeErrorMessage(error);
    await adminSupabase.from('payment_records').update({
      receipt_sent: false,
      receipt_sent_at: null,
      receipt_last_error: safeMessage
    }).eq('id', paymentRecord.id);
    await persistActivityWithIdempotency(adminSupabase, {
      lead_id: invoice.lead_id,
      activity_type: 'payment',
      message: `Stripe receipt email failed for ${safeInvoiceNumber}.`,
      created_by: 'system',
      automation_key: receiptKey
    });
    return false;
  }
}

async function syncCheckoutAttemptStatus(
  adminSupabase: ReturnType<typeof createAdminSupabaseClient>,
  sessionId: string,
  status: 'paid' | 'failed' | 'cancelled'
) {
  if (!sessionId) {
    return;
  }

  await adminSupabase
    .from('stripe_checkout_attempts')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('session_id', sessionId);
}

async function processStripeCheckoutEvent(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const invoiceId = session.metadata?.invoice_id;
  const clientId = session.metadata?.client_id;
  const sessionClientReferenceId = session.client_reference_id || null;

  if (!invoiceId) {
    throw new Error('Stripe session metadata is missing invoice_id.');
  }

  const { data: invoice, error: invoiceError } = await adminSupabase
    .from('client_invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();

  if (invoiceError) {
    throw invoiceError;
  }

  if (!invoice) {
    throw new Error('Invoice not found for Stripe checkout session.');
  }

  const normalizedClientReference = sessionClientReferenceId || session.metadata?.client_id;
  if (normalizedClientReference && normalizedClientReference !== invoice.client_id) {
    throw new Error('Stripe session client reference does not match the invoice owner.');
  }

  if (clientId && clientId !== invoice.client_id) {
    throw new Error('Stripe session client metadata does not match the invoice owner.');
  }

  const expectedCurrency = (invoice.currency || 'USD').toUpperCase();
  if ((session.currency || 'usd').toUpperCase() !== expectedCurrency) {
    throw new Error(`Currency mismatch: expected ${expectedCurrency} but got ${(session.currency || 'usd').toUpperCase()}.`);
  }

  if (typeof session.amount_total !== 'number') {
    throw new Error('Stripe paid event is missing a valid amount_total value.');
  }

  if (session.amount_total !== invoice.total_cents) {
    throw new Error(`Amount mismatch: expected ${invoice.total_cents} but got ${session.amount_total}.`);
  }

  if (invoice.status === 'paid') {
    const existingPaidRow = await adminSupabase
      .from('payment_records')
      .select('id, status, stripe_checkout_session_id, stripe_payment_intent_id')
      .eq('invoice_id', invoice.id)
      .eq('status', 'paid')
      .maybeSingle();

    if (existingPaidRow.data && existingPaidRow.data.stripe_checkout_session_id !== session.id) {
      await persistActivityWithIdempotency(adminSupabase, {
        lead_id: invoice.lead_id,
        activity_type: 'payment',
        message: `Stripe duplicate payment received for invoice ${invoice.invoice_number}; original payment remains authoritative.`,
        created_by: 'system',
        automation_key: `stripe-payment-duplicate:${session.id}`
      });
      return;
    }
  }

  if (event.type === 'checkout.session.completed') {
    const paymentStatus = session.payment_status;
    if (paymentStatus !== 'paid') {
      return;
    }
  }

  const eventType = String(event.type);

  if (eventType === 'checkout.session.async_payment_failed') {
    await syncCheckoutAttemptStatus(adminSupabase, session.id, 'failed');

    const stripe = createStripeClient();
    const stripeChargeId = await resolveLatestChargeId(stripe, session);
    await upsertStripePaymentRecord(adminSupabase, invoice, session, false, stripeChargeId);
    await persistActivityWithIdempotency(adminSupabase, {
      lead_id: invoice.lead_id,
      activity_type: 'payment',
      message: `Stripe payment failed for ${invoice.invoice_number}.`,
      created_by: 'system',
      automation_key: `stripe-payment-failed:${session.id}`
    });
    return;
  }

  if (eventType === 'checkout.session.expired' || eventType === 'checkout.session.cancelled') {
    await syncCheckoutAttemptStatus(adminSupabase, session.id, 'cancelled');
    return;
  }

  if (eventType === 'checkout.session.async_payment_succeeded' || eventType === 'checkout.session.completed') {
    const paymentStatus = session.payment_status;
    if (paymentStatus !== 'paid') {
      return;
    }

    if (invoice.status === 'paid') {
      await persistActivityWithIdempotency(adminSupabase, {
        lead_id: invoice.lead_id,
        activity_type: 'payment',
        message: `Stripe duplicate successful payment ignored for ${invoice.invoice_number}; original invoice payment remains authoritative.`,
        created_by: 'system',
        automation_key: `stripe-payment-duplicate:${session.id}`
      });
      return;
    }

    await syncCheckoutAttemptStatus(adminSupabase, session.id, 'paid');

    const stripe = createStripeClient();
    const stripeChargeId = await resolveLatestChargeId(stripe, session);
    const paidAt = new Date().toISOString();
    const paymentRecord = await upsertStripePaymentRecord(adminSupabase, invoice, session, true, stripeChargeId);

    if (!paymentRecord) {
      throw new Error('Stripe payment record could not be persisted.');
    }

    const { error: invoiceUpdateError } = await adminSupabase
      .from('client_invoices')
      .update({
        status: 'paid',
        paid_at: paidAt,
        updated_at: paidAt
      })
      .eq('id', invoice.id);

    if (invoiceUpdateError) {
      throw invoiceUpdateError;
    }

    await persistActivityWithIdempotency(adminSupabase, {
      lead_id: invoice.lead_id,
      activity_type: 'payment',
      message: `Stripe payment received for ${invoice.invoice_number}.`,
      created_by: 'system',
      automation_key: `stripe-payment-paid:${session.id}`
    });

    await sendPaymentReceiptEmail(adminSupabase, invoice, session, paidAt);
  }
}

export async function POST(request: NextRequest) {
  if (!webhookSecret || !stripeSecretKey || !supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = createStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('Invalid Stripe webhook signature.', error);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  const adminSupabase = createAdminSupabaseClient();

  try {
    const record = await fetchOrCreateWebhookEvent(adminSupabase, event);

    if (record.status === 'completed') {
      return NextResponse.json({ received: true });
    }

    const nextAttemptCount = (Number(record.attempt_count) || 0) + 1;
    await updateWebhookEvent(adminSupabase, event.id, {
      attempt_count: nextAttemptCount,
      updated_at: new Date().toISOString(),
      last_error: null
    });

    const webhookEventType = String(event.type);

    if (webhookEventType !== 'checkout.session.completed'
      && webhookEventType !== 'checkout.session.async_payment_succeeded'
      && webhookEventType !== 'checkout.session.async_payment_failed'
      && webhookEventType !== 'checkout.session.expired'
      && webhookEventType !== 'checkout.session.cancelled') {
      await updateWebhookEvent(adminSupabase, event.id, {
        status: 'completed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_error: null
      });
      return NextResponse.json({ received: true });
    }

    await processStripeCheckoutEvent(adminSupabase, event);

    await updateWebhookEvent(adminSupabase, event.id, {
      status: 'completed',
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_error: null
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const safeMessage = safeErrorMessage(error);
    console.error('Stripe webhook processing failed.', safeMessage);

    try {
      const adminSupabase = createAdminSupabaseClient();
      await updateWebhookEvent(adminSupabase, event.id, {
        status: 'failed',
        last_error: safeMessage,
        updated_at: new Date().toISOString()
      });
    } catch (persistError) {
      console.error('Failed to persist Stripe webhook failure state.', safeErrorMessage(persistError));
    }

    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
