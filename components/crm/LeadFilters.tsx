interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  serviceFilter: string;
  onServiceFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortOrder: 'newest' | 'oldest';
  onSortOrderChange: (value: 'newest' | 'oldest') => void;
}

export function LeadFilters({
  search,
  onSearchChange,
  serviceFilter,
  onServiceFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortOrder,
  onSortOrderChange
}: LeadFiltersProps) {
  return (
    <div className="crm-toolbar-actions">
      <label className="field" style={{ minWidth: 220 }}>
        <span>Search</span>
        <input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Name, email, or phone" />
      </label>
      <label className="field" style={{ minWidth: 180 }}>
        <span>Service</span>
        <select value={serviceFilter} onChange={(event) => onServiceFilterChange(event.target.value)}>
          <option value="all">All services</option>
          <option value="Personal Credit">Personal Credit</option>
          <option value="Business Credit">Business Credit</option>
          <option value="Both">Both</option>
        </select>
      </label>
      <label className="field" style={{ minWidth: 180 }}>
        <span>Status</span>
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="consultation_scheduled">Consultation scheduled</option>
          <option value="in_progress">In progress</option>
          <option value="follow_up">Follow up</option>
          <option value="closed">Closed</option>
          <option value="not_qualified">Not qualified</option>
        </select>
      </label>
      <label className="field" style={{ minWidth: 180 }}>
        <span>Sort</span>
        <select value={sortOrder} onChange={(event) => onSortOrderChange(event.target.value as 'newest' | 'oldest')}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </label>
    </div>
  );
}
