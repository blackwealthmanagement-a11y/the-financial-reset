import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase configuration is missing.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  const { error } = await supabase.from('intake_submissions').insert([
    {
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
    return NextResponse.json({ error: 'We could not save your intake right now.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Submission received.' }, { status: 201 });
}
