import { useState } from 'react';
import { addLeadActivity, addLeadNote } from '../services/crm.service';

export function useNotes(leadId: string | undefined) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function saveNote(noteText: string, refresh: () => Promise<void>) {
    if (!leadId || !noteText.trim()) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: noteError } = await addLeadNote(leadId, noteText.trim());
    if (noteError) {
      setSaving(false);
      setError('We could not save the note.');
      return;
    }

    await addLeadActivity(leadId, 'note', 'Internal note added.');
    setSaving(false);
    setNotice('Note saved.');
    await refresh();
  }

  return { saving, error, notice, setError, setNotice, saveNote };
}
