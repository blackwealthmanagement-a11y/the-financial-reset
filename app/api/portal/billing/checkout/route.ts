import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice('Bearer '.length);
}

function createStripeClient() {
  if (!stripeSecretKey) {
    throw new Error('Stripe is not configured.');
  }

  return new Stripe(stripeSecretKey);
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 401 });
    }

    const clientClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: clientRecord, error: clientLookupError } = await clientClient
      .from('clients')
      .select('id, lead_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (clientLookupError || !clientRecord?.id) {
      return NextResponse.json({ error: 'Client account not found.' }, { status: 404 });
    }

    const body = await request.json();
    const invoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId : '';
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice id is required.' }, { status: 400 });
    }

    const { data: invoice, error: invoiceError } = await clientClient
      .from('client_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('client_id', clientRecord.id)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return NextResponse.json({ error: 'This invoice is no longer payable.' }, { status: 400 });
    }

    if (!invoice.total_cents || invoice.total_cents <= 0) {
      return NextResponse.json({ error: 'This invoice has no amount due.' }, { status: 400 });
    }

    const serviceClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: activeAttempt, error: activeAttemptError } = await serviceClient
      .from('stripe_checkout_attempts')
      .select('id, status, session_id')
      .eq('invoice_id', invoice.id)
      .in('status', ['pending', 'created'])
      .maybeSingle();

    if (activeAttemptError) {
      throw activeAttemptError;
    }

    if (activeAttempt?.id) {
      if (activeAttempt.status === 'created' && activeAttempt.session_id) {
        const stripe = createStripeClient();

        try {
          const existingSession = await stripe.checkout.sessions.retrieve(activeAttempt.session_id);

          if (existingSession.status === 'open') {
            return NextResponse.json({
              sessionId: existingSession.id,
              url: existingSession.url,
              invoice,
              reused: true
            });
          }

          const nextStatus = existingSession.status === 'complete' ? 'paid' : existingSession.status === 'expired' ? 'cancelled' : 'failed';
          await serviceClient
            .from('stripe_checkout_attempts')
            .update({
              status: nextStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', activeAttempt.id);
        } catch (error) {
          console.warn('Existing Stripe checkout session could not be verified; releasing stale attempt.', error);
          await serviceClient
            .from('stripe_checkout_attempts')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', activeAttempt.id);
        }
      } else {
        return NextResponse.json({ error: 'A payment session is already in progress for this invoice.' }, { status: 409 });
      }
    }

    const { data: insertedAttempt, error: attemptInsertError } = await serviceClient
      .from('stripe_checkout_attempts')
      .insert({
        invoice_id: invoice.id,
        session_id: null,
        status: 'pending'
      })
      .select('id')
      .single();

    if (attemptInsertError) {
      if (attemptInsertError.code === '23505') {
        return NextResponse.json({ error: 'A payment session is already in progress for this invoice.' }, { status: 409 });
      }
      throw attemptInsertError;
    }

    const stripe = createStripeClient();
    const idempotencyKey = `invoice-checkout:${invoice.id}:${insertedAttempt.id}`;

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        currency: (invoice.currency || 'USD').toLowerCase(),
        line_items: [{
          quantity: 1,
          price_data: {
            currency: (invoice.currency || 'USD').toLowerCase(),
            unit_amount: invoice.total_cents,
            product_data: {
              name: `Payment for ${invoice.invoice_number}`,
              description: invoice.notes || 'Invoice payment'
            }
          }
        }],
        metadata: {
          invoice_id: invoice.id,
          client_id: invoice.client_id,
          lead_id: invoice.lead_id,
          invoice_number: invoice.invoice_number
        },
        success_url: `${siteUrl}/portal/billing?checkout=success&invoice=${encodeURIComponent(invoice.id)}`,
        cancel_url: `${siteUrl}/portal/billing?checkout=cancelled&invoice=${encodeURIComponent(invoice.id)}`,
        customer_email: user.email || undefined,
        billing_address_collection: 'auto'
      }, {
        idempotencyKey
      });

      await serviceClient
        .from('stripe_checkout_attempts')
        .update({
          session_id: session.id,
          status: 'created',
          updated_at: new Date().toISOString()
        })
        .eq('id', insertedAttempt.id);

      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
        invoice
      });
    } catch (error) {
      await serviceClient
        .from('stripe_checkout_attempts')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', insertedAttempt.id);

      console.error('Stripe checkout session creation failed.', error);
      return NextResponse.json({ error: 'We could not start a secure checkout session.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Stripe checkout session creation failed.', error);
    const message = error instanceof Error ? error.message : 'We could not start a secure checkout session.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
