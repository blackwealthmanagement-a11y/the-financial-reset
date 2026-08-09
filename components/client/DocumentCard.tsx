'use client';

import type { ClientDocument } from '../../types/document';

interface DocumentCardProps {
  document: ClientDocument;
  onOpen: (document: ClientDocument) => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export function DocumentCard({ document, onOpen }: DocumentCardProps) {
  return (
    <article className="portal-card portal-card-gold">
      <div className="portal-card-header">
        <h3>{document.file_name}</h3>
        <span className="portal-pill">{document.category}</span>
      </div>
      <p className="portal-card-copy">Status: {document.status}</p>
      <p className="portal-card-copy">Uploaded: {formatDate(document.created_at)}</p>
      <p className="portal-card-copy">File type: {document.mime_type}</p>
      <p className="portal-card-copy">Size: {(document.file_size / 1024).toFixed(1)} KB</p>
      <button type="button" className="button secondary" onClick={() => onOpen(document)}>
        Open securely
      </button>
    </article>
  );
}
