'use client';

interface RecentActivityCardProps {
  activity: Array<{ title: string; detail: string; createdAt: string }>;
}

export function RecentActivityCard({ activity }: RecentActivityCardProps) {
  return (
    <section className="portal-card portal-card-navy">
      <div className="portal-card-header">
        <h3>Recent activity</h3>
        <span className="portal-pill">Latest 10</span>
      </div>
      <ul className="portal-list">
        {activity.map((item) => (
          <li key={`${item.title}-${item.createdAt}`}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
            <strong>{item.createdAt}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
