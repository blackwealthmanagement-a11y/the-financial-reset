import { useEffect, useState } from 'react';
import { getTasksForLead } from '../services/task.service';
import type { TaskRow } from '../types/task';

export function useTasks(leadId: string | undefined) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!leadId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: taskError } = await getTasksForLead(leadId);
    if (taskError) {
      setError('We could not load tasks.');
      setTasks([]);
    } else {
      setTasks(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [leadId]);

  return { tasks, loading, error, reload: load, setTasks };
}
