'use client';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  accent?: 'gold' | 'navy';
}

export function DashboardCard({ title, children, accent = 'navy' }: DashboardCardProps) {
  return (
    <section className={`portal-card portal-card-${accent}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}
