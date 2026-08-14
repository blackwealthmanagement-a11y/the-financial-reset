'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMyInvoices } from '../../services/billing.service';
import { getClientDocuments } from '../../services/document.service';
import { getPortalLessonProgress, getPortalLessons } from '../../services/education.service';
import { getPortalConsultations } from '../../services/portal-scheduling.service';
import type { PortalDashboardData } from '../../types/client';

interface DashboardStatsProps {
  activity?: PortalDashboardData['activity'];
}

type StatItem = {
  label: string;
  value: string;
  meta: string;
  href: string;
  loading: boolean;
  fallback?: boolean;
};

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

export function DashboardStats({ activity = [] }: DashboardStatsProps) {
  const [stats, setStats] = useState<Record<string, StatItem>>({
    balance: { label: 'Outstanding Balance', value: 'Loading…', meta: 'Loading', href: '/portal/billing', loading: true },
    invoices: { label: 'Open Invoices', value: 'Loading…', meta: 'Loading', href: '/portal/billing', loading: true },
    documents: { label: 'Documents', value: 'Loading…', meta: 'Loading', href: '/portal/documents', loading: true },
    education: { label: 'Education Progress', value: 'Loading…', meta: 'Loading', href: '/portal/education', loading: true },
    consultation: { label: 'Next Consultation', value: 'Loading…', meta: 'Loading', href: '/portal/scheduling', loading: true },
    activityCard: { label: 'Recent Activity', value: 'Loading…', meta: 'Loading', href: '#recent-activity', loading: true },
  });

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      const settled = await Promise.allSettled([
        (async () => {
          try {
            const { data, error } = await getMyInvoices();
            if (error || !Array.isArray(data)) {
              throw Object.assign(new Error('Billing data unavailable.'), { key: 'balance' });
            }

            const openInvoices = data.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'cancelled');
            const outstanding = openInvoices.reduce((sum, invoice) => sum + Number(invoice.total_cents || 0), 0);

            return {
              key: 'balance',
              value: formatCurrencyCents(outstanding),
              meta: openInvoices.length > 0 ? `${openInvoices.length} invoice${openInvoices.length === 1 ? '' : 's'} open` : 'All caught up',
              href: '/portal/billing',
              fallback: false,
            };
          } catch (error) {
            throw Object.assign(error instanceof Error ? error : new Error('Billing data unavailable.'), { key: 'balance' });
          }
        })(),
        (async () => {
          try {
            const { data, error } = await getMyInvoices();
            if (error || !Array.isArray(data)) {
              throw Object.assign(new Error('Billing data unavailable.'), { key: 'invoices' });
            }

            const openInvoices = data.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'cancelled');
            return {
              key: 'invoices',
              value: String(openInvoices.length),
              meta: openInvoices.length === 0 ? 'No open invoices' : `${openInvoices.length} invoice${openInvoices.length === 1 ? '' : 's'} open`,
              href: '/portal/billing',
              fallback: false,
            };
          } catch (error) {
            throw Object.assign(error instanceof Error ? error : new Error('Billing data unavailable.'), { key: 'invoices' });
          }
        })(),
        (async () => {
          try {
            const { data, error } = await getClientDocuments();
            if (error) {
              throw Object.assign(new Error(error.message), { key: 'documents' });
            }

            const docCount = Array.isArray(data) ? data.length : 0;
            return {
              key: 'documents',
              value: String(docCount),
              meta: docCount === 0 ? 'No documents yet' : `${docCount} uploaded`,
              href: '/portal/documents',
              fallback: false,
            };
          } catch (error) {
            throw Object.assign(error instanceof Error ? error : new Error('Documents unavailable.'), { key: 'documents' });
          }
        })(),
        (async () => {
          try {
            const [{ data: lessons = [] }, { data: progressRows = [] }] = await Promise.all([
              getPortalLessons(),
              getPortalLessonProgress(),
            ]);

            const totalLessons = Array.isArray(lessons) ? lessons.length : 0;
            const completedLessons = Array.isArray(progressRows) ? progressRows.filter((item) => item.completed).length : 0;
            const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

            return {
              key: 'education',
              value: `${percent}%`,
              meta: totalLessons > 0 ? `${completedLessons}/${totalLessons} complete` : 'No lessons yet',
              href: '/portal/education',
              fallback: false,
            };
          } catch (error) {
            throw Object.assign(error instanceof Error ? error : new Error('Education data unavailable.'), { key: 'education' });
          }
        })(),
        (async () => {
          try {
            const { data, error } = await getPortalConsultations();
            if (error) {
              throw Object.assign(new Error(error.message), { key: 'consultation' });
            }

            const upcoming = (Array.isArray(data) ? data : [])
              .filter((event) => event.status === 'scheduled' && new Date(event.start_time).getTime() > Date.now())
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

            const next = upcoming[0];
            return {
              key: 'consultation',
              value: next ? formatShortDate(next.start_time) : 'Not scheduled',
              meta: next ? next.meeting_type || 'Consultation' : 'Book a session',
              href: '/portal/scheduling',
              fallback: false,
            };
          } catch (error) {
            throw Object.assign(error instanceof Error ? error : new Error('Consultation data unavailable.'), { key: 'consultation' });
          }
        })(),
        (async () => {
          try {
            const recent = Array.isArray(activity) ? activity : [];
            return {
              key: 'activityCard',
              value: String(recent.length),
              meta: recent.length > 0 ? recent[0]?.createdAt || 'Latest update' : 'No recent activity',
              href: '#recent-activity',
              fallback: false,
            };
          } catch (error) {
            throw Object.assign(error instanceof Error ? error : new Error('Activity data unavailable.'), { key: 'activityCard' });
          }
        })(),
      ]);

      if (!isMounted) {
        return;
      }

      const nextStats = { ...stats };
      const currentDefaults = {
        balance: { label: 'Outstanding Balance', value: '—', meta: 'Unavailable', href: '/portal/billing', loading: false, fallback: true },
        invoices: { label: 'Open Invoices', value: '—', meta: 'Unavailable', href: '/portal/billing', loading: false, fallback: true },
        documents: { label: 'Documents', value: '—', meta: 'Unavailable', href: '/portal/documents', loading: false, fallback: true },
        education: { label: 'Education Progress', value: '—', meta: 'Unavailable', href: '/portal/education', loading: false, fallback: true },
        consultation: { label: 'Next Consultation', value: 'Not scheduled', meta: 'Unavailable', href: '/portal/scheduling', loading: false, fallback: true },
        activityCard: { label: 'Recent Activity', value: '0', meta: 'No recent activity', href: '#recent-activity', loading: false, fallback: true },
      };

      settled.forEach((result) => {
        if (result.status === 'fulfilled') {
          const item = result.value as { key: string; value: string; meta: string; href: string; fallback?: boolean };
          nextStats[item.key] = {
            label: nextStats[item.key]?.label || currentDefaults[item.key as keyof typeof currentDefaults].label,
            value: item.value,
            meta: item.meta,
            href: item.href,
            loading: false,
            fallback: Boolean(item.fallback),
          };
        } else {
          const key = result.reason?.key || null;
          if (key && currentDefaults[key as keyof typeof currentDefaults]) {
            nextStats[key] = {
              ...currentDefaults[key as keyof typeof currentDefaults],
            };
          }
        }
      });

      setStats(nextStats);
    }

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [activity]);

  const statKeys = ['balance', 'invoices', 'documents', 'education', 'consultation', 'activityCard'] as const;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginTop: 12,
      }}
    >
      {statKeys.map((key) => {
        const item = stats[key];

        return (
          <Link
            key={key}
            href={item.href}
            style={{
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.94)',
                border: '1px solid rgba(11, 31, 51, 0.12)',
                borderRadius: 16,
                padding: '12px 14px',
                minHeight: 108,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 10px 24px rgba(11,31,51,0.05)',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(event) => {
                const target = event.currentTarget as HTMLDivElement;
                target.style.transform = 'translateY(-1px)';
                target.style.boxShadow = '0 12px 28px rgba(11,31,51,0.08)';
              }}
              onMouseLeave={(event) => {
                const target = event.currentTarget as HTMLDivElement;
                target.style.transform = 'translateY(0)';
                target.style.boxShadow = '0 10px 24px rgba(11,31,51,0.05)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#0B1F33',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    opacity: 0.8,
                  }}
                >
                  {item.label}
                </span>
                {item.fallback ? (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: '#C9A14A',
                      background: 'rgba(201,161,74,0.12)',
                      borderRadius: 999,
                      padding: '3px 7px',
                    }}
                  >
                    Fallback
                  </span>
                ) : null}
              </div>

              <div
                style={{
                  fontSize: item.value.length > 6 ? '1.2rem' : '1.5rem',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  color: '#0B1F33',
                  marginTop: 6,
                }}
              >
                {item.loading ? 'Loading…' : item.value}
              </div>

              <div
                style={{
                  fontSize: '0.74rem',
                  color: '#475B73',
                  lineHeight: 1.4,
                  marginTop: 4,
                }}
              >
                {item.loading ? 'Loading the latest data…' : item.meta}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
