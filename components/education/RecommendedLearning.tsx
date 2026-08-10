import Link from 'next/link';

interface RecommendedLearningProps {
  title: string;
  href: string;
  description?: string | null;
}

export function RecommendedLearning({ title, href, description }: RecommendedLearningProps) {
  return (
    <section className="portal-card portal-card-navy" aria-label="Recommended learning">
      <h3>Recommended next lesson</h3>
      <p className="portal-card-copy">{description || 'Keep momentum with the next lesson in your path.'}</p>
      <Link className="button secondary" href={href} style={{ marginTop: 12 }}>
        {title}
      </Link>
    </section>
  );
}
