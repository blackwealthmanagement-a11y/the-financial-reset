'use client';

import type { ClientDocument } from '../../types/document';
import { DocumentCard } from './DocumentCard';
import { DocumentEmptyState } from './DocumentEmptyState';

interface DocumentListProps {
  documents: ClientDocument[];
  onOpen: (document: ClientDocument) => void;
}

export function DocumentList({ documents, onOpen }: DocumentListProps) {
  if (!documents.length) {
    return <DocumentEmptyState />;
  }

  return (
    <div className="portal-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} onOpen={onOpen} />
      ))}
    </div>
  );
}
