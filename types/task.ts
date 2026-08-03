export interface TaskRow {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}
