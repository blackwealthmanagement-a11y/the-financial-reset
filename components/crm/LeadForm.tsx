import type { FormEvent } from 'react';

interface LeadFormProps {
  nextFollowUpDate: string;
  setNextFollowUpDate: (value: string) => void;
  temperature: string;
  setTemperature: (value: string) => void;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function LeadForm({ nextFollowUpDate, setNextFollowUpDate, temperature, setTemperature, saving, onSubmit }: LeadFormProps) {
  return (
    <div className="crm-field-card full-card">
      <h3>Follow-up and temperature</h3>
      <form className="crm-note-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="field">
            <span>Next follow-up date</span>
            <input type="date" value={nextFollowUpDate} onChange={(event) => setNextFollowUpDate(event.target.value)} />
          </label>
          <label className="field">
            <span>Lead temperature</span>
            <select value={temperature} onChange={(event) => setTemperature(event.target.value)}>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="button primary" disabled={saving}>
            Save follow-up details
          </button>
        </div>
      </form>
    </div>
  );
}
