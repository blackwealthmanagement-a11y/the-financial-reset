'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePortalDashboardMetrics } from '../../hooks/usePortalDashboardMetrics';
import type { PortalDashboardData } from '../../types/client';

interface NextActionCardProps {
  activity?: PortalDashboardData['activity'];
}

function formatCurrencyCents(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format((Number.isFinite(cents) ? cents : 0) / 100);
}

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return 'Not scheduled';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(parsed);
}

export function NextActionCard({ activity = [] }: NextActionCardProps) {
  const metrics = usePortalDashboardMetrics(activity);

  const action = useMemo(() => {
    if (metrics.loading) {
      return {
        kind: 'loading',
        title: 'Checking your next step…',
        detail: 'We are reviewing your latest account activity.',
        buttonLabel: null,
        href: '/portal/dashboard',
      };
    }

    if (metrics.nextInvoice && metrics.outstandingBalanceCents > 0) {
      return {
        kind: 'invoice',
        title: 'Pay your outstanding invoice',
        detail: `${metrics.nextInvoice.invoice_number} • ${formatCurrencyCents(metrics.nextInvoice.total_cents)}`,
        buttonLabel: 'Pay securely',
        href: '/portal/billing',
      };
    }

    if (metrics.documentRequirementAction === 'rejected') {
      const category = metrics.documentActionCategory || 'required document';
      return {
        kind: 'documents',
        title: 'Replace rejected document',
        detail: `${category.replace(/_/g, ' ')} needs attention before we can continue.`,
        buttonLabel: 'View documents',
        href: '/portal/documents',
      };
    }

    if (metrics.documentRequirementAction === 'missing') {
      const category = metrics.documentActionCategory || 'required document';
      return {
        kind: 'documents',
        title: 'Upload required documents',
        detail: `${category.replace(/_/g, ' ')} is still missing from your file checklist.`,
        buttonLabel: 'View documents',
        href: '/portal/documents',
      };
    }

    if (metrics.totalLessons > 0 && metrics.educationPercent < 100) {
      return {
        kind: 'education',
        title: 'Continue your learning path',
        detail: `${metrics.educationPercent}% complete • ${metrics.completedLessons}/${metrics.totalLessons} lessons finished`,
        buttonLabel: 'Continue learning',
        href: '/portal/education',
      };
    }

    if (!metrics.nextConsultation) {
      return {
        kind: 'consultation',
        title: 'Schedule your consultation',
        detail: 'A quick consultation will help you move forward with clarity.',
        buttonLabel: 'Schedule now',
        href: '/portal/scheduling',
      };
    }

    return {
      kind: 'caught-up',
      title: 'You’re all caught up',
      detail: 'There’s nothing requiring your attention right now. We’ll let you know when something changes.',
      buttonLabel: null,
      href: '/portal/dashboard',
    };
  }, [metrics]);

  const isAllCaughtUp = action.kind === 'caught-up';
  const isLoading = action.kind === 'loading';
  const buttonRequired = Boolean(action.buttonLabel && action.href);

  if (metrics.error && !metrics.loading && action.kind === 'caught-up') {
    return (
      <section
        aria-live="polite"
        style={{
          background: 'linear-gradient(135deg, rgba(11,31,51,0.97), rgba(22,52,79,0.96))',
          border: '1px solid rgba(201,161,74,0.35)',
          borderRadius: 20,
          padding: '18px 18px 16px',
          color: '#F8F4ED',
          boxShadow: '0 16px 40px rgba(11,31,51,0.08)',
          display: 'grid',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#D7BE7D',
          }}
        >
          NEXT STEP
        </span>
        <h3 style={{ margin: 0, fontSize: '1.3rem', lineHeight: 1.25, color: '#F8F4ED' }}>
          We couldn’t determine your next step right now.
        </h3>
        <p style={{ margin: 0, color: 'rgba(248,244,237,0.8)', lineHeight: 1.5 }}>
          Please refresh or check your account details to continue.
        </p>
        <Link
          href="/portal/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'fit-content',
            padding: '10px 16px',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #C9A14A, #E7C782)',
            color: '#0B1F33',
            fontWeight: 700,
            textDecoration: 'none',
            border: '1px solid rgba(201,161,74,0.5)',
          }}
        >
          Return to dashboard
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-live="polite"
      style={{
        background: 'linear-gradient(135deg, rgba(11,31,51,0.97), rgba(22,52,79,0.96))',
        border: '1px solid rgba(201,161,74,0.35)',
        borderRadius: 20,
        padding: '18px 18px 16px',
        color: '#F8F4ED',
        boxShadow: '0 16px 40px rgba(11,31,51,0.08)',
        display: 'grid',
        gap: 10,
      }}
    >
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#D7BE7D',
        }}
      >
        NEXT STEP
      </span>

      <h3
        style={{
          margin: 0,
          fontSize: isLoading || isAllCaughtUp ? '1.2rem' : '1.5rem',
          lineHeight: 1.2,
          color: '#F8F4ED',
        }}
      >
        {action.title}
      </h3>

      <p
        style={{
          margin: 0,
          color: 'rgba(248,244,237,0.82)',
          lineHeight: 1.5,
          fontSize: '0.9rem',
        }}
      >
        {action.detail}
      </p>

      {buttonRequired && action.href ? (
        <Link
          href={action.href}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'fit-content',
            padding: '10px 16px',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #C9A14A, #E7C782)',
            color: '#0B1F33',
            fontWeight: 700,
            textDecoration: 'none',
            border: '1px solid rgba(201,161,74,0.5)',
            transition: 'transform 0.18s ease',
          }}
        >
          {action.buttonLabel}
        </Link>
      ) : null}
    </section>
  );
}
