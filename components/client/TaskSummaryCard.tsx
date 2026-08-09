'use client';

interface TaskSummaryCardProps {
  tasks: Array<{ title: string; priority: string; dueDate: string; completed: boolean }>;
}

export function TaskSummaryCard({ tasks }: TaskSummaryCardProps) {
  return (
    <section className="portal-card portal-card-gold">
      <div className="portal-card-header">
        <h3>Client tasks</h3>
        <span className="portal-pill">{tasks.length} items</span>
      </div>
      <ul className="portal-list">
        {tasks.map((task) => (
          <li key={task.title}>
            <div>
              <strong>{task.title}</strong>
              <p>{task.priority} • {task.dueDate}</p>
            </div>
            <strong>{task.completed ? 'Completed' : 'Active'}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
