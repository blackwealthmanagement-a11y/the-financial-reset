import type { FormEvent } from 'react';
import { CONSULTATION_OUTCOME, CONSULTATION_STATUS } from '../../constants/consultation';

interface ConsultationCardProps {
  consultationStatus: string;
  consultationDate: string;
  consultationOutcome: string;
  consultationSummary: string;
  onStatusChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onOutcomeChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function ConsultationCard({
  consultationStatus,
  consultationDate,
  consultationOutcome,
  consultationSummary,
  onStatusChange,
  onDateChange,
  onOutcomeChange,
  onSummaryChange,
  saving,
  onSubmit
}: ConsultationCardProps) {
  return (
    <div className="crm-field-card full-card">
      <h3>Consultation</h3>
      <form className="crm-note-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="field">
            <span>Consultation status</span>
            <select value={consultationStatus} onChange={(event) => onStatusChange(event.target.value)} disabled={saving}>
              <option value={CONSULTATION_STATUS.NOT_BOOKED}>{CONSULTATION_STATUS.NOT_BOOKED}</option>
              <option value={CONSULTATION_STATUS.SCHEDULED}>{CONSULTATION_STATUS.SCHEDULED}</option>
              <option value={CONSULTATION_STATUS.COMPLETED}>{CONSULTATION_STATUS.COMPLETED}</option>
              <option value={CONSULTATION_STATUS.NO_SHOW}>{CONSULTATION_STATUS.NO_SHOW}</option>
              <option value={CONSULTATION_STATUS.CANCELLED}>{CONSULTATION_STATUS.CANCELLED}</option>
            </select>
          </label>
          <label className="field">
            <span>Consultation date</span>
            <input type="date" value={consultationDate} onChange={(event) => onDateChange(event.target.value)} disabled={saving} />
          </label>
          <label className="field">
            <span>Consultation outcome</span>
            <select value={consultationOutcome} onChange={(event) => onOutcomeChange(event.target.value)} disabled={saving}>
              <option value="">Select outcome</option>
              <option value={CONSULTATION_OUTCOME.QUALIFIED}>{CONSULTATION_OUTCOME.QUALIFIED}</option>
              <option value={CONSULTATION_OUTCOME.FOLLOW_UP}>{CONSULTATION_OUTCOME.FOLLOW_UP}</option>
              <option value={CONSULTATION_OUTCOME.CLOSED}>{CONSULTATION_OUTCOME.CLOSED}</option>
              <option value={CONSULTATION_OUTCOME.NOT_QUALIFIED}>{CONSULTATION_OUTCOME.NOT_QUALIFIED}</option>
            </select>
          </label>
          <label className="field full">
            <span>Consultation summary</span>
            <textarea value={consultationSummary} onChange={(event) => onSummaryChange(event.target.value)} placeholder="Capture decisions, next steps, and notes from the consultation..." disabled={saving} />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="button primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Consultation'}
          </button>
        </div>
      </form>
    </div>
  );
}
