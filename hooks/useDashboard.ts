import { useMemo } from 'react';
import type { Lead } from '../types/crm';
import { LEAD_STATUS } from '../lib/constants';

export function useDashboard(rows: Lead[]) {
  return useMemo(() => {
    const counts = {
      new: 0,
      contacted: 0,
      consultation_scheduled: 0,
      closed: 0
    };

    rows.forEach((row) => {
      if (row.status === LEAD_STATUS.NEW) counts.new += 1;
      if (row.status === LEAD_STATUS.CONTACTED) counts.contacted += 1;
      if (row.status === LEAD_STATUS.CONSULTATION) counts.consultation_scheduled += 1;
      if (row.status === LEAD_STATUS.CLOSED) counts.closed += 1;
    });

    return counts;
  }, [rows]);
}
