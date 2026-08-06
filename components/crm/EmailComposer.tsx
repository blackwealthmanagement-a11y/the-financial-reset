import { SendEmailButton } from './SendEmailButton';

type EmailTemplate = {
  id: string;
  name: string;
  category: string;
  subject: string;
  html: string;
  active: boolean;
};

type EmailComposerProps = {
  template: EmailTemplate | null;
  subject: string;
  html: string;
  sending: boolean;
  onSend: () => void;
};

export function EmailComposer({ template, subject, html, sending, onSend }: EmailComposerProps) {
  if (!template) {
    return null;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ border: '1px solid #E8E1D4', borderRadius: 14, padding: 14, background: '#FCFBF8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong>Preview</strong>
          <span style={{ color: '#5F6D7A', fontSize: 13 }}>{template.category}</span>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#5F6D7A', marginBottom: 4 }}>Subject</div>
          <div style={{ fontWeight: 700 }}>{subject}</div>
        </div>
        <div style={{ borderTop: '1px solid #E8E1D4', paddingTop: 10 }}>
          <div style={{ fontSize: 13, color: '#5F6D7A', marginBottom: 4 }}>Message</div>
          <div
            style={{ lineHeight: 1.6, color: '#0B1F33' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
      <SendEmailButton loading={sending} disabled={!template} onClick={onSend} />
    </div>
  );
}
