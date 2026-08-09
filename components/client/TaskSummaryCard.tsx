'use client';

interface TaskSummaryCardProps {
  tasks: Array<{ title: string; status: string }>;
}

export function TaskSummaryCard({ tasks }: TaskSummaryCardProps) {
  return (
    <section className="portal-card portal-card-gold">
      <div className="portal-card-header">
        <h3>Assigned tasks</h3>
        <span className="portal-pill">{tasks.length} items</span>
      </div>
      <ul className="portal-list">
        {tasks.map((task) => (
          <li key={task.title}>
            <span>{task.title}</span>
            <strong>{task.status}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
