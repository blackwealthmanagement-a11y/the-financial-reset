import Link from 'next/link';

interface LearningPathCardProps {
  title: string;
  description?: string | null;
  slug: string;
  percentComplete?: number;
  lessonCount?: number;
  completedCount?: number;
}

export function LearningPathCard({ title, description, slug, percentComplete = 0, lessonCount = 0, completedCount = 0 }: LearningPathCardProps) {
  return (
    <article className="portal-card portal-card-gold" aria-label={title}>
      <h3>{title}</h3>
      {description ? <p className="portal-card-copy">{description}</p> : null}
      <p className="portal-card-copy">{completedCount} of {lessonCount} lessons completed</p>
      <div className="portal-card-copy" style={{ marginTop: 8 }}>
        <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 999, height: 10, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, Math.max(0, percentComplete))}%`, height: '100%', background: '#0f4c81' }} />
        </div>
        <p style={{ marginTop: 8 }}>{Math.round(percentComplete)}%</p>
      </div>
      <Link className="button secondary" href={`/portal/education/path/${slug}`} style={{ marginTop: 12 }}>Open path</Link>
    </article>
  );
}
