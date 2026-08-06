type EmailTemplate = {
  id: string;
  name: string;
  category: string;
  subject: string;
  html: string;
  active: boolean;
};

type EmailTemplateListProps = {
  templates: EmailTemplate[];
  selectedTemplateId: string | null;
  onSelect: (templateId: string) => void;
  loading?: boolean;
};

export function EmailTemplateList({ templates, selectedTemplateId, onSelect, loading = false }: EmailTemplateListProps) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Templates</strong>
        <span style={{ color: '#5F6D7A', fontSize: 13 }}>{loading ? 'Loading…' : `${templates.length} available`}</span>
      </div>
      {templates.length === 0 ? (
        <div style={{ border: '1px dashed #E8E1D4', borderRadius: 12, padding: 16, color: '#5F6D7A' }}>
          No active templates are available yet.
        </div>
      ) : (
        templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            style={{
              border: selectedTemplateId === template.id ? '1px solid #C9A14A' : '1px solid #E8E1D4',
              background: selectedTemplateId === template.id ? '#FFF8E8' : '#ffffff',
              borderRadius: 12,
              padding: '12px 14px',
              textAlign: 'left',
              cursor: 'pointer',
              color: '#0B1F33'
            }}
          >
            <div style={{ fontWeight: 700 }}>{template.name}</div>
            <div style={{ fontSize: 13, color: '#5F6D7A', marginTop: 4 }}>{template.category}</div>
          </button>
        ))
      )}
    </div>
  );
}
