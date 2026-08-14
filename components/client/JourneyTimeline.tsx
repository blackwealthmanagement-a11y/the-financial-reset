'use client';

import type { PortalDashboardData } from '../../types/client';
import { JourneyStep, type JourneyStepStatus } from './JourneyStep';

interface JourneyTimelineProps {
  data: PortalDashboardData;
}

function normalize(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function hasDate(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  if (/not scheduled|not available/i.test(value)) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function lookupDate(entries: PortalDashboardData['activity'], keywords: string[]) {
  const matches = entries.filter((entry) => {
    const text = `${entry.title} ${entry.detail}`.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });

  return matches[0]?.createdAt || undefined;
}

function buildMilestoneStatus(currentIndex: number, index: number): JourneyStepStatus {
  if (index < currentIndex) {
    return 'completed';
  }

  if (index === currentIndex) {
    return 'current';
  }

  return 'upcoming';
}

export function JourneyTimeline({ data }: JourneyTimelineProps) {
  const clientStatus = normalize(data.clientStatus);
  const consultationStatus = normalize(data.consultationStatus);
  const hasMemberRecord = hasDate(data.memberSince);
  const hasConsultation = hasDate(data.consultationDate) || consultationStatus.includes('completed') || consultationStatus.includes('scheduled');
  const hasPortalAccess = data.progressPercent >= 25 || clientStatus.includes('active') || clientStatus.includes('onboarding') || clientStatus.includes('in_progress') || clientStatus.includes('in progress');
  const documentKeywords = ['document', 'upload', 'file', 'documents'];
  const hasDocuments =
    data.tasks.some((task) => documentKeywords.some((keyword) => task.title.toLowerCase().includes(keyword))) ||
    data.activity.some((entry) => documentKeywords.some((keyword) => `${entry.title} ${entry.detail}`.toLowerCase().includes(keyword))) ||
    data.progressPercent >= 45;
  const hasCreditReview =
    data.activity.some((entry) => /credit|analysis|review/.test(`${entry.title} ${entry.detail}`.toLowerCase())) ||
    data.progressPercent >= 60;
  const hasPayment =
    data.activity.some((entry) => /payment|invoice|billing|paid/.test(`${entry.title} ${entry.detail}`.toLowerCase())) ||
    data.progressPercent >= 75;
  const hasEducationProgress =
    data.activity.some((entry) => /education|lesson|course/.test(`${entry.title} ${entry.detail}`.toLowerCase())) ||
    data.tasks.some((task) => /education|lesson/.test(task.title.toLowerCase())) ||
    data.progressPercent >= 75;
  const hasEducationComplete =
    data.activity.some((entry) => /education complete|course complete|lesson complete|completed learning/.test(`${entry.title} ${entry.detail}`.toLowerCase())) ||
    data.progressPercent >= 90;
  const hasResetComplete =
    data.progressPercent >= 100 || clientStatus.includes('completed') || clientStatus.includes('finished') ||
    data.activity.some((entry) => /financial reset complete|reset complete|program complete/.test(`${entry.title} ${entry.detail}`.toLowerCase()));

  let currentIndex = 0;

  if (hasMemberRecord) currentIndex = Math.max(currentIndex, 1);
  if (hasConsultation) currentIndex = Math.max(currentIndex, 2);
  if (hasPortalAccess) currentIndex = Math.max(currentIndex, 3);
  if (hasDocuments) currentIndex = Math.max(currentIndex, 4);
  if (hasCreditReview) currentIndex = Math.max(currentIndex, 5);
  if (hasPayment) currentIndex = Math.max(currentIndex, 6);
  if (hasEducationProgress) currentIndex = Math.max(currentIndex, 7);
  if (hasEducationComplete) currentIndex = Math.max(currentIndex, 8);
  if (hasResetComplete) currentIndex = Math.max(currentIndex, 9);

  const milestoneCount = 9;
  if (currentIndex > milestoneCount) {
    currentIndex = milestoneCount;
  }

  const steps = [
    {
      title: 'Intake Submitted',
      description: 'The initial client intake was submitted and reviewed for onboarding.',
      date: hasMemberRecord ? data.memberSince : undefined,
      note: hasMemberRecord ? 'Client record received.' : 'Awaiting intake completion.',
    },
    {
      title: 'Consultation Completed',
      description: 'The discovery consultation was completed and the next steps were mapped.',
      date: hasConsultation && data.consultationDate && !/not scheduled/i.test(data.consultationDate) ? data.consultationDate : undefined,
      note: consultationStatus.includes('completed') ? 'Consultation recorded.' : hasConsultation ? 'Consultation scheduled or completed.' : 'Awaiting consultation completion.',
    },
    {
      title: 'Portal Activated',
      description: 'The client portal and onboarding access were activated for progress tracking.',
      date: hasPortalAccess ? data.memberSince : undefined,
      note: hasPortalAccess ? 'Portal access is live.' : 'Portal activation is pending.',
    },
    {
      title: 'Documents Received',
      description: 'Required financial documents, supporting files, and verifications were received.',
      date: lookupDate(data.activity, ['document', 'upload', 'file']),
      note: hasDocuments ? 'Documents are in place for review.' : 'Awaiting document intake.',
    },
    {
      title: 'Credit Analysis',
      description: 'The credit profile was reviewed to identify opportunities and constraints.',
      date: lookupDate(data.activity, ['credit', 'analysis', 'review']),
      note: hasCreditReview ? 'Credit review has started.' : 'Credit analysis pending.',
    },
    {
      title: 'Payment Complete',
      description: 'The billing and payment requirements were fulfilled for the client journey.',
      date: lookupDate(data.activity, ['payment', 'invoice', 'billing', 'paid']),
      note: hasPayment ? 'Payment status has been satisfied.' : 'Payment completion is pending.',
    },
    {
      title: 'Education Started',
      description: 'The educational curriculum began and the client is actively learning the plan.',
      date: lookupDate(data.activity, ['education', 'lesson', 'course']),
      note: hasEducationProgress ? 'Education sequence is underway.' : 'Education is not started yet.',
    },
    {
      title: 'Education Complete',
      description: 'The required learning milestones were completed and acknowledged.',
      date: lookupDate(data.activity, ['education complete', 'course complete', 'lesson complete']),
      note: hasEducationComplete ? 'Education milestones are complete.' : 'Final learning requirements remain.',
    },
    {
      title: 'Financial Reset Complete',
      description: 'The overall program has reached completion and the client has finished the reset journey.',
      date: hasResetComplete ? data.memberSince : undefined,
      note: hasResetComplete ? 'Program completion recorded.' : 'Final completion remains outstanding.',
    },
  ];

  return (
    <section
      aria-labelledby="journey-timeline-heading"
      style={{
        background: 'rgba(255,255,255,0.98)',
        border: '1px solid rgba(11, 31, 51, 0.08)',
        borderRadius: 20,
        boxShadow: '0 16px 40px rgba(11,31,51,0.06)',
        padding: '18px 18px 8px',
        marginTop: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#C9A14A',
              marginBottom: 6,
            }}
          >
            Journey
          </div>
          <h3 id="journey-timeline-heading" style={{ margin: 0, fontSize: '1.25rem', color: '#0B1F33' }}>
            Financial Reset Journey Timeline
          </h3>
        </div>
      </div>

      <ol
        aria-live="polite"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          position: 'relative',
        }}
      >
        {steps.map((step, index) => (
          <div
            key={step.title}
            style={{
              position: 'relative',
              paddingLeft: 0,
            }}
          >
            {index < steps.length - 1 ? (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '18px',
                  top: '30px',
                  bottom: '-10px',
                  width: '2px',
                  background: 'linear-gradient(to bottom, rgba(201,161,74,0.5), rgba(11,31,51,0.08))',
                }}
              />
            ) : null}
            <JourneyStep
              title={step.title}
              description={step.description}
              status={buildMilestoneStatus(currentIndex, index)}
              date={step.date}
              note={step.note}
            />
          </div>
        ))}
      </ol>
    </section>
  );
}
