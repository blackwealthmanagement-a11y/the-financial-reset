import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import type { TaskRow } from '../../types/task';

interface TaskListProps {
  tasks: TaskRow[];
  editingTaskId: string | null;
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
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
  onEdit: (task: TaskRow) => void;
  onComplete: (task: TaskRow) => void;
  onDelete: (task: TaskRow) => void;
}

export function TaskList({
  tasks,
  editingTaskId,
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
  onCancel,
  onEdit,
  onComplete,
  onDelete
}: TaskListProps) {
  return (
    <div className="crm-field-card full-card">
      <h3>Tasks</h3>
      <TaskForm
        title={title}
        description={description}
        priority={priority}
        status={status}
        dueDate={dueDate}
        saving={saving}
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
        onPriorityChange={onPriorityChange}
        onStatusChange={onStatusChange}
        onDueDateChange={onDueDateChange}
        onSubmit={onSubmit}
        onCancel={editingTaskId ? onCancel : undefined}
      />
      <div className="crm-note-stack" style={{ marginTop: 16 }}>
        {tasks.length === 0 ? (
          <p className="crm-widget-copy">No tasks yet for this lead.</p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => onEdit(task)}
              onComplete={() => onComplete(task)}
              onDelete={() => onDelete(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}
