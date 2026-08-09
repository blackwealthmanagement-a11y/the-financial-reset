'use client';

import { useEffect, useState } from 'react';
import { PortalLayout } from '../../../components/client/PortalLayout';
import { DocumentList } from '../../../components/client/DocumentList';
import { getClientDocuments, getSignedDocumentUrl } from '../../../services/document.service';
import type { ClientDocument } from '../../../types/document';

export default function PortalDocumentsPage() {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      setError(null);
      const { data, error: loadError } = await getClientDocuments();
      if (loadError) {
        setError(loadError.message);
      } else {
        setDocuments(data);
      }
      setLoading(false);
    }

    loadDocuments();
  }, []);

  async function handleOpen(documentItem: ClientDocument) {
    const { signedUrl, error: signedUrlError } = await getSignedDocumentUrl(documentItem.storage_path);
    if (signedUrlError || !signedUrl) {
      setError(signedUrlError?.message || 'We could not open this document.');
      return;
    }

    window.open(signedUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <PortalLayout title="Documents" subtitle="Secure access to the documents shared with your team.">
      <section className="portal-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="portal-card portal-card-navy">
          <div className="portal-card-header">
            <h3>Secure document vault</h3>
            <span className="portal-pill">Read-only</span>
          </div>
          <p className="portal-card-copy">Documents are stored privately and shared with you through time-limited secure links.</p>
        </div>
        {error ? <div className="status-banner error" role="alert">{error}</div> : null}
        {loading ? <div className="portal-card portal-card-gold">Loading your documents…</div> : <DocumentList documents={documents} onOpen={handleOpen} />}
      </section>
    </PortalLayout>
  );
}
