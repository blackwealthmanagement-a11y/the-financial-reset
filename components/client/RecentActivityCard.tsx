'use client';

interface RecentActivityCardProps {
  activity: Array<{ title: string; detail: string }>;
}

export function RecentActivityCard({ activity }: RecentActivityCardProps) {
  return (
    <section className="portal-card portal-card-navy">
      <div className="portal-card-header">
        <h3>Recent activity</h3>
        <span className="portal-pill">Recent</span>
      </div>
      <ul className="portal-list">
        {activity.map((item) => (
          <li key={item.title}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
