import { useMemo } from 'react';
import type { Lead } from '../types/crm';
import type { TaskRow } from '../types/task';
import { LEAD_STATUS } from '../lib/constants';
import { CONSULTATION_STATUS } from '../constants/consultation';

export function useDashboard(rows: Lead[], tasks: TaskRow[] = []) {
  return useMemo(() => {
    const counts = {
      new: 0,
      contacted: 0,
      consultation_scheduled: 0,
      closed: 0,
      consultations_today: 0,
      upcoming_consultations: 0,
      completed_this_month: 0,
      no_shows: 0,
      todays_tasks: 0,
      overdue_tasks: 0,
      completed_today: 0,
      high_priority_tasks: 0
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    rows.forEach((row) => {
      if (row.status === LEAD_STATUS.NEW) counts.new += 1;
      if (row.status === LEAD_STATUS.CONTACTED) counts.contacted += 1;
      if (row.status === LEAD_STATUS.CONSULTATION) counts.consultation_scheduled += 1;
      if (row.status === LEAD_STATUS.CLOSED) counts.closed += 1;

      if (row.consultation_status === CONSULTATION_STATUS.SCHEDULED && row.consultation_date) {
        const consultationDate = new Date(row.consultation_date);
        consultationDate.setHours(0, 0, 0, 0);
        if (consultationDate.getTime() === today.getTime()) {
          counts.consultations_today += 1;
        }
        if (consultationDate.getTime() >= today.getTime()) {
          counts.upcoming_consultations += 1;
        }
      }

      if (row.consultation_status === CONSULTATION_STATUS.COMPLETED && row.consultation_date) {
        const consultationDate = new Date(row.consultation_date);
        if (consultationDate >= thisMonthStart && consultationDate <= today) {
          counts.completed_this_month += 1;
        }
      }

      if (row.consultation_status === CONSULTATION_STATUS.NO_SHOW) {
        counts.no_shows += 1;
      }
    });

    tasks.forEach((task) => {
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      if (dueDate && dueDate >= todayStart && dueDate <= todayEnd) {
        counts.todays_tasks += 1;
      }

      if (dueDate && dueDate < todayStart && !task.completed) {
        counts.overdue_tasks += 1;
      }

      if (task.completed && task.completed_at) {
        const completedAt = new Date(task.completed_at);
        if (completedAt >= todayStart && completedAt <= todayEnd) {
          counts.completed_today += 1;
        }
      }

      if (task.priority === 'High' && !task.completed) {
        counts.high_priority_tasks += 1;
      }
    });

    return counts;
  }, [rows, tasks]);
}
