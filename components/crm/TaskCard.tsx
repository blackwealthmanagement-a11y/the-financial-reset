interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    due_date: string | null;
    completed: boolean;
    created_at: string;
  };
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

export function TaskCard({ task, onEdit, onComplete, onDelete }: TaskCardProps) {
  const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';

  return (
    <div className="crm-field-card">
      <div className="crm-status-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3>{task.title}</h3>
          {task.description ? <p className="crm-widget-copy">{task.description}</p> : null}
        </div>
        <div className="crm-note-meta" style={{ textAlign: 'right' }}>
          <span>{task.priority}</span>
          <span>{task.status}</span>
        </div>
      </div>
      <div className="crm-note-meta" style={{ marginTop: 12 }}>
        <span>Due: {dueDate}</span>
        <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
      </div>
      <div className="form-actions" style={{ marginTop: 12 }}>
        <button type="button" className="button secondary" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="button primary" onClick={onComplete}>
          {task.completed ? 'Reopen' : 'Complete'}
        </button>
        <button type="button" className="button secondary" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
