'use client';

export type JourneyStepStatus = 'completed' | 'current' | 'upcoming';

export interface JourneyStepProps {
  title: string;
  description: string;
  status: JourneyStepStatus;
  date?: string;
  note?: string;
}

const statusConfig: Record<JourneyStepStatus, { dot: string; glow: string; ring: string; label: string }> = {
  completed: {
    dot: '#2F7D5A',
    glow: 'rgba(47,125,90,0.18)',
    ring: 'rgba(47,125,90,0.28)',
    label: 'Completed',
  },
  current: {
    dot: '#C9A14A',
    glow: 'rgba(201,161,74,0.2)',
    ring: 'rgba(201,161,74,0.42)',
    label: 'Current',
  },
  upcoming: {
    dot: '#5C6E7F',
    glow: 'rgba(92,110,127,0.12)',
    ring: 'rgba(92,110,127,0.2)',
    label: 'Upcoming',
  },
};

export function JourneyStep({ title, description, status, date, note }: JourneyStepProps) {
  const config = statusConfig[status];

  return (
    <li
      aria-label={`${title} ${config.label}`}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '36px minmax(0,1fr)',
        gap: '12px',
        alignItems: 'start',
        padding: '0 0 18px',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '36px',
          width: '36px',
          borderRadius: '50%',
          background: config.glow,
          border: `2px solid ${config.ring}`,
          boxShadow: status === 'current' ? `0 0 0 6px ${config.glow}` : 'none',
        }}
      >
        {status === 'completed' ? (
          <span aria-hidden="true" style={{ color: config.dot, fontSize: '1.1rem', fontWeight: 900, lineHeight: 1 }}>✓</span>
        ) : status === 'current' ? (
          <span aria-hidden="true" style={{ width: '10px', height: '10px', borderRadius: '50%', background: config.dot, display: 'block' }} />
        ) : (
          <span aria-hidden="true" style={{ width: '10px', height: '10px', borderRadius: '50%', border: `2px solid ${config.dot}`, display: 'block', background: 'transparent' }} />
        )}
      </div>

      <div style={{ paddingTop: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', lineHeight: 1.3, color: '#0f2436', fontWeight: 700 }}>{title}</h4>
          <span
            style={{
              fontSize: '0.68rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 800,
              color: config.dot,
            }}
          >
            {config.label}
          </span>
        </div>

        <p style={{ margin: '6px 0 0', color: '#4c5d6a', lineHeight: 1.5, fontSize: '0.9rem' }}>{description}</p>

        {date ? (
          <p style={{ margin: '8px 0 0', color: '#2d4050', fontSize: '0.8rem', fontWeight: 600 }}>{date}</p>
        ) : null}

        {note ? (
          <p style={{ margin: '8px 0 0', color: '#6a7d8d', fontSize: '0.78rem', lineHeight: 1.4 }}>{note}</p>
        ) : null}
      </div>
    </li>
  );
}
