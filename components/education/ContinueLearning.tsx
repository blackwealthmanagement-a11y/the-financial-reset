import Link from 'next/link';

interface ContinueLearningProps {
  title: string;
  href: string;
  summary?: string;
}

export function ContinueLearning({ title, href, summary }: ContinueLearningProps) {
  return (
    <section className="portal-card portal-card-gold" aria-label="Continue learning">
      <h3>Continue learning</h3>
      <p className="portal-card-copy">{summary || 'Pick up where you left off.'}</p>
      <Link className="button secondary" href={href} style={{ marginTop: 12 }}>
        {title}
      </Link>
    </section>
  );
}
