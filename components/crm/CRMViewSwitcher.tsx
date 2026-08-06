'use client';

interface CRMViewSwitcherProps {
  activeView: 'table' | 'pipeline';
  onChange: (view: 'table' | 'pipeline') => void;
}

export function CRMViewSwitcher({ activeView, onChange }: CRMViewSwitcherProps) {
  return (
    <div className="crm-view-switcher" role="tablist" aria-label="CRM view switcher">
      <button
        type="button"
        className={`crm-view-switcher-button ${activeView === 'table' ? 'is-active' : ''}`}
        role="tab"
        aria-selected={activeView === 'table'}
        onClick={() => onChange('table')}
      >
        Table View
      </button>
      <button
        type="button"
        className={`crm-view-switcher-button ${activeView === 'pipeline' ? 'is-active' : ''}`}
        role="tab"
        aria-selected={activeView === 'pipeline'}
        onClick={() => onChange('pipeline')}
      >
        Pipeline View
      </button>
    </div>
  );
}
