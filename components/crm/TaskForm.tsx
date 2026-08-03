import type { FormEvent } from 'react';

interface TaskFormProps {
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  saving: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel?: () => void;
}

export function TaskForm({
  title,
  description,
  priority,
  status,
  dueDate,
  saving,
  onTitleChange,
  onDescriptionChange,
  onPriorityChange,
  onStatusChange,
  onDueDateChange,
  onSubmit,
  onCancel
}: TaskFormProps) {
  return (
    <form className="crm-note-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <label className="field full">
          <span>Task title</span>
          <input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Add a follow-up task" disabled={saving} required />
        </label>
        <label className="field full">
          <span>Description</span>
          <textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} placeholder="Capture details, next steps, or owner notes..." disabled={saving} />
        </label>
        <label className="field">
          <span>Priority</span>
          <select value={priority} onChange={(event) => onPriorityChange(event.target.value)} disabled={saving}>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={status} onChange={(event) => onStatusChange(event.target.value)} disabled={saving}>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </label>
        <label className="field">
          <span>Due date</span>
          <input type="date" value={dueDate} onChange={(event) => onDueDateChange(event.target.value)} disabled={saving} />
        </label>
      </div>
      <div className="form-actions">
        {onCancel ? (
          <button type="button" className="button secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        ) : null}
        <button type="submit" className="button primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Task'}
        </button>
      </div>
    </form>
  );
}
