'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, CheckCircle2, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

export default function BookPage() {
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim();
  const hasCalendlyUrl = Boolean(calendlyUrl);

  const embedTitle = useMemo(() => 'Calendly consultation booking', []);

  return (
    <>
      <Nav />
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card booking-card">
            <div className="eyebrow">Consultation booking</div>
            <h1>Book Your Financial Reset Consultation</h1>
            <p className="booking-intro">
              Reserve a 30-minute consultation to talk through your goals, review your next steps, and see whether a tailored reset plan is the right fit for you.
            </p>

            <div className="booking-callout" role="note">
              <div className="booking-icon">
                <CalendarDays size={24} />
              </div>
              <div>
                <h2>Before you book</h2>
                <p>
                  We recommend completing the intake form first so we can better understand your priorities before the consultation.
                </p>
              </div>
            </div>

            <div className="hero-actions booking-actions">
              <Link className="button primary" href="/intake">
                Complete Intake First <ArrowRight size={18} />
              </Link>
              {hasCalendlyUrl ? (
                <a className="button secondary" href={calendlyUrl} target="_blank" rel="noopener noreferrer">
                  Open Calendly directly <ExternalLink size={16} />
                </a>
              ) : null}
            </div>

            {hasCalendlyUrl ? (
              <div className="booking-embed-shell" aria-label="Calendly booking widget">
                <iframe
                  src={calendlyUrl}
                  title={embedTitle}
                  className="booking-iframe"
                  loading="lazy"
                  allow="clipboard-write"
                />
              </div>
            ) : (
              <div className="status-banner booking-config" role="status">
                <div className="booking-config-icon">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <strong>Calendly is not configured yet.</strong>
                  <p>Set NEXT_PUBLIC_CALENDLY_URL in your local environment or Vercel project settings to enable the inline booking widget.</p>
                </div>
              </div>
            )}

            {!hasCalendlyUrl ? (
              <div className="form-actions booking-fallback-actions">
                <a className="button primary" href="https://calendly.com" target="_blank" rel="noopener noreferrer">
                  Visit Calendly to configure your booking link
                </a>
              </div>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
