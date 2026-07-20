import Link from 'next/link';
import type { Lead } from '../../types/crm';
import { formatDate, getFollowUpState } from '../../utils/date';
import { StatusBadge } from './StatusBadge';
import { TemperatureBadge } from './TemperatureBadge';

interface LeadTableProps {
  rows: Lead[];
}

export function LeadTable({ rows }: LeadTableProps) {
  return (
    <div className="crm-table-shell">
      <table className="crm-table">
        <thead>
          <tr>
            <th scope="col">Full name</th>
            <th scope="col">Email</th>
            <th scope="col">Phone</th>
            <th scope="col">Service interest</th>
            <th scope="col">Next follow-up</th>
            <th scope="col">Temperature</th>
            <th scope="col">Status</th>
            <th scope="col">Submission date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const followUpState = getFollowUpState(row.next_follow_up_date, row.status);
            return (
              <tr key={row.id}>
                <td>
                  <Link href={`/crm/leads/${row.id}`} className="crm-link">
                    {row.full_name || 'Unnamed lead'}
                  </Link>
                </td>
                <td>{row.email || '—'}</td>
                <td>{row.phone || '—'}</td>
                <td>{row.service_interest || '—'}</td>
                <td>
                  <span className={`crm-followup-pill${followUpState.isOverdue ? ' overdue' : ''}`}>
                    {followUpState.label}
                  </span>
                </td>
                <td><TemperatureBadge temperature={row.lead_temperature} /></td>
                <td><StatusBadge status={row.status} /></td>
                <td>{formatDate(row.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
