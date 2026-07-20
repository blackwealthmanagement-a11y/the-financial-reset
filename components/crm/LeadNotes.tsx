import type { FormEvent } from 'react';
import type { LeadNote } from '../../types/crm';

interface LeadNotesProps {
  notes: LeadNote[];
  noteText: string;
  setNoteText: (value: string) => void;
  saving: boolean;
  onAddNote: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function LeadNotes({ notes, noteText, setNoteText, saving, onAddNote }: LeadNotesProps) {
  return (
    <div className="crm-field-card full-card">
      <h3>Internal notes</h3>
      <form className="crm-note-form" onSubmit={onAddNote}>
        <label className="field full">
          <span>New note</span>
          <textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Add call notes, commitments, or next steps..." />
        </label>
        <div className="form-actions">
          <button type="submit" className="button primary" disabled={saving}>
            Add note
          </button>
        </div>
      </form>
      <div className="crm-note-list">
        {notes.length === 0 ? (
          <p className="crm-widget-copy">No internal notes yet.</p>
        ) : (
          notes.map((note) => (
            <article key={note.id} className="crm-note-item">
              <div className="crm-note-meta">
                <strong>{new Date(note.created_at).toLocaleString()}</strong>
                <span>{note.created_by || 'Admin'}</span>
              </div>
              <p>{note.note}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
