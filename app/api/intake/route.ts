import { createHash, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { runIntakeAutomation } from '../../../services/workflow.service';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip');
  const cloudflare = request.headers.get('cf-connecting-ip');
  return forwarded || realIp || cloudflare || 'unknown';
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);

  if (!existing || now >= existing.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  existing.count += 1;
  return false;
}

function sanitizeText(value: unknown, maxLength = 255) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}

function sanitizeEmail(value: unknown) {
  const sanitized = sanitizeText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized) ? sanitized : '';
}

function normalizeServiceInterest(value: string) {
  const cleaned = sanitizeText(value, 80);
  const allowed = ['Personal Credit', 'Business Credit', 'Both'];
  return allowed.includes(cleaned) ? cleaned : 'Both';
}

function normalizePreferredContactMethod(value: string) {
  const cleaned = sanitizeText(value, 40);
  const allowed = ['Email', 'Phone', 'Text'];
  return allowed.includes(cleaned) ? cleaned : 'Email';
}

function buildIdempotencyKey(payload: Record<string, string>) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Pending' : date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

async function sendIntakeEmails(payload: {
  fullName: string;
  email: string;
  phone: string;
  serviceInterest: string;
  estimatedCreditScore: string;
  financialGoal: string;
  creditChallenge: string;
  preferredContactMethod: string;
  bestContactTime: string;
  submittedAt: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.INTAKE_NOTIFICATION_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !notificationEmail || !fromEmail) {
    return { ok: false, reason: 'missing-config' as const };
  }

  const resend = new Resend(apiKey);
  const idempotencyKey = buildIdempotencyKey({
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    serviceInterest: payload.serviceInterest,
    financialGoal: payload.financialGoal,
    creditChallenge: payload.creditChallenge,
    preferredContactMethod: payload.preferredContactMethod,
    bestContactTime: payload.bestContactTime,
    submittedAt: payload.submittedAt
  });

  const ownerSubject = `New intake submission from ${payload.fullName}`;
  const ownerHtml = `
    <div style="font-family:Inter,Arial,sans-serif;background:#F7F4EE;padding:24px;color:#0B1F33;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #E8E1D4;border-radius:24px;padding:24px;">
        <h2 style="margin:0 0 12px;color:#0B1F33;">New intake received</h2>
        <p style="margin:0 0 16px;color:#5F6D7A;">A new lead has entered the intake workflow.</p>
        <ul style="padding-left:18px;color:#0B1F33;line-height:1.8;">
          <li><strong>Full name:</strong> ${payload.fullName}</li>
          <li><strong>Email:</strong> ${payload.email}</li>
          <li><strong>Phone:</strong> ${payload.phone || 'Not provided'}</li>
          <li><strong>Service interest:</strong> ${payload.serviceInterest}</li>
          <li><strong>Estimated credit score range:</strong> ${payload.estimatedCreditScore || 'Not provided'}</li>
          <li><strong>Financial goal:</strong> ${payload.financialGoal}</li>
          <li><strong>Credit challenge:</strong> ${payload.creditChallenge || 'Not provided'}</li>
          <li><strong>Preferred contact method:</strong> ${payload.preferredContactMethod}</li>
          <li><strong>Best contact time:</strong> ${payload.bestContactTime || 'Not provided'}</li>
          <li><strong>Submission timestamp:</strong> ${formatTimestamp(payload.submittedAt)}</li>
        </ul>
      </div>
    </div>
  `;

  const prospectFirstName = payload.fullName.split(' ')[0] || 'friend';
  const prospectSubject = 'We received your intake request';
  const prospectHtml = `
    <div style="font-family:Inter,Arial,sans-serif;background:#F7F4EE;padding:24px;color:#0B1F33;">
      <div style="max-width:720px;margin:0 auto;background:linear-gradient(135deg,#ffffff,#F7F4EE);border:1px solid #E8E1D4;border-radius:24px;padding:24px;">
        <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:#0B1F33;color:#ffffff;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:16px;">The Financial Reset</div>
        <h2 style="margin:0 0 12px;color:#0B1F33;">Hello ${prospectFirstName},</h2>
        <p style="margin:0 0 12px;color:#5F6D7A;line-height:1.7;">Thank you for sharing your goals with us. Your intake has been received securely, and our team will review it shortly.</p>
        <p style="margin:0 0 12px;color:#5F6D7A;line-height:1.7;">We will review the information you shared and follow up with next steps that make sense for your circumstances. The Financial Reset provides education and general financial wellness guidance, and results vary and are not guaranteed.</p>
        <p style="margin:16px 0 0;color:#C9A14A;font-weight:700;">Thank you for taking the first step.</p>
      </div>
    </div>
  `;

  const [ownerResult, prospectResult] = await Promise.allSettled([
    resend.emails.send({
      from: fromEmail,
      to: [notificationEmail],
      subject: ownerSubject,
      html: ownerHtml,
      headers: { 'Idempotency-Key': `${idempotencyKey}-owner` }
    }),
    resend.emails.send({
      from: fromEmail,
      to: [payload.email],
      subject: prospectSubject,
      html: prospectHtml,
      headers: { 'Idempotency-Key': `${idempotencyKey}-prospect` }
    })
  ]);

  const failures = [ownerResult, prospectResult].filter((result) => result.status === 'rejected');
  if (failures.length > 0) {
    console.error('Intake email delivery failed.');
    return { ok: false, reason: 'delivery-failed' as const };
  }

  return { ok: true };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const honeypot = sanitizeText(body.honeypot, 50);
  const website = sanitizeText(body.website, 50);
  const company = sanitizeText(body.company, 50);
  if (honeypot || website || company) {
    return NextResponse.json({ error: 'Submission rejected.' }, { status: 400 });
  }

  const fullName = sanitizeText(body.full_name, 120);
  const email = sanitizeEmail(body.email);
  const phone = sanitizeText(body.phone, 30);
  const serviceInterest = normalizeServiceInterest(sanitizeText(body.service_interest, 80));
  const estimatedCreditScore = sanitizeText(body.estimated_credit_score, 20);
  const financialGoal = sanitizeText(body.financial_goal, 500);
  const creditChallenge = sanitizeText(body.credit_challenge, 500);
  const preferredContactMethod = normalizePreferredContactMethod(sanitizeText(body.preferred_contact_method, 40));
  const bestContactTime = sanitizeText(body.best_contact_time, 80);

  if (!fullName || !email || !financialGoal) {
    return NextResponse.json({ error: 'Please complete the required fields.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseSecretKey) {
    return NextResponse.json({ error: 'Supabase configuration is missing.' }, { status: 500 });
  }

  const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  const adminSupabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  const leadId = randomUUID();
  const submittedAt = new Date().toISOString();
  const { error } = await publicSupabase.from('intake_submissions').insert([
    {
      id: leadId,
      full_name: fullName,
      email,
      phone,
      service_interest: serviceInterest,
      estimated_credit_score: estimatedCreditScore,
      financial_goal: financialGoal,
      credit_challenge: creditChallenge,
      preferred_contact_method: preferredContactMethod,
      best_contact_time: bestContactTime,
      status: 'new'
    }
  ]);

  if (error) {
    console.error('Supabase intake insert failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });

    return NextResponse.json({ error: 'We could not save your intake right now.' }, { status: 500 });
  }

  try {
    await runIntakeAutomation(adminSupabase, leadId, submittedAt);
  } catch (automationError) {
    console.error('Intake automation failed after the lead was saved.', automationError);
  }

  const emailResult = await sendIntakeEmails({
    fullName,
    email,
    phone,
    serviceInterest,
    estimatedCreditScore,
    financialGoal,
    creditChallenge,
    preferredContactMethod,
    bestContactTime,
    submittedAt
  });

  if (emailResult.ok === false && emailResult.reason === 'delivery-failed') {
    console.error('Intake email delivery failed after the database insert.');
  }

  return NextResponse.json({ success: true, message: 'Submission received.' }, { status: 201 });
}
