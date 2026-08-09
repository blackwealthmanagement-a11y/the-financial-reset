'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { PortalLayout } from '../../../components/client/PortalLayout';
import { DocumentList } from '../../../components/client/DocumentList';
import { browserSupabase } from '../../../lib/supabase/browser';
import { buildRequirementStatuses, getClientDocumentRequirements, getClientDocuments, getRequiredDocumentCategories, getSignedDocumentUrl, upsertClientDocumentRequirements, uploadClientDocument } from '../../../services/document.service';
import type { ClientDocument, ClientDocumentRequirement, DocumentCategory } from '../../../types/document';

export default function PortalDocumentsPage() {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [requirements, setRequirements] = useState<ClientDocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('other');
  const [notice, setNotice] = useState<string | null>(null);

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

      if (browserSupabase) {
        const { data: { session } } = await browserSupabase.auth.getSession();
        if (session?.user?.id) {
          const { data: clientRecord, error: clientLookupError } = await browserSupabase
            .from('clients')
            .select('id, lead_id, program')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          if (!clientLookupError && clientRecord?.id) {
            const businessCreditClient = Boolean(clientRecord.program && ['business_credit', 'business', 'business-credit'].includes(String(clientRecord.program).toLowerCase()));
            const categories = getRequiredDocumentCategories(businessCreditClient);
            const { data: existingRequirements, error: requirementsError } = await getClientDocumentRequirements(clientRecord.id);
            if (requirementsError) {
              setError(requirementsError.message);
            } else if (existingRequirements.length === 0) {
              const { data: insertedRequirements } = await upsertClientDocumentRequirements(clientRecord.id, clientRecord.lead_id, categories);
              setRequirements(insertedRequirements || []);
            } else {
              setRequirements(existingRequirements);
            }
          }
        }
      }

      setLoading(false);
    }

    loadDocuments();
  }, []);

  async function handleOpen(documentItem: ClientDocument) {
    const { signedUrl, error: signedUrlError } = await getSignedDocumentUrl(documentItem.id);
    if (signedUrlError || !signedUrl) {
      setError(signedUrlError?.message || 'We could not open this document.');
      return;
    }

    window.open(signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadFile) {
      setError('Please choose a file to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setNotice(null);

    const { data, error: uploadError } = await uploadClientDocument({
      category: uploadCategory,
      file: uploadFile
    });

    setUploading(false);
    if (uploadError || !data?.document) {
      setError(uploadError?.message || 'We could not upload your document.');
      return;
    }

    setUploadFile(null);
    setUploadCategory('other');
    const input = document.getElementById('portal-document-upload') as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
    setNotice(`Uploaded ${data.document.original_file_name}`);
    const { data: refreshedDocuments, error: reloadError } = await getClientDocuments();
    if (reloadError) {
      setError(reloadError.message);
    } else {
      setDocuments(refreshedDocuments);
    }
  }

  const requirementStatuses = buildRequirementStatuses(requirements, documents);
  const receivedCount = requirementStatuses.filter((item) => item.status !== 'missing').length;

  return (
    <PortalLayout title="Documents" subtitle="Secure access to the documents shared with your team.">
      <section className="portal-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="portal-card portal-card-navy">
          <div className="portal-card-header">
            <h3>Secure document vault</h3>
            <span className="portal-pill">Review workflow</span>
          </div>
          <p className="portal-card-copy">Documents are stored privately and shared with you through time-limited secure links.</p>
        </div>
        <form onSubmit={handleUpload} style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <label className="field">
            <span>Upload a document</span>
            <input id="portal-document-upload" type="file" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value as DocumentCategory)}>
              <option value="identity">Identity</option>
              <option value="proof_of_address">Proof of Address</option>
              <option value="credit_report">Credit Report</option>
              <option value="income">Income</option>
              <option value="tax">Tax</option>
              <option value="banking">Banking</option>
              <option value="business">Business</option>
              <option value="agreement">Agreement</option>
              <option value="other">Other</option>
            </select>
          </label>
          <button type="submit" className="button primary" disabled={uploading || !uploadFile}>
            {uploading ? 'Uploading…' : 'Upload document'}
          </button>
        </form>
        {error ? <div className="status-banner error" role="alert">{error}</div> : null}
        {notice ? <div className="status-banner" role="status">{notice}</div> : null}
        {requirementStatuses.length > 0 ? (
          <div className="portal-card portal-card-gold">
            <div className="portal-card-header">
              <h3>Required documents</h3>
              <span className="portal-pill">{receivedCount} of {requirementStatuses.length} received</span>
            </div>
            <div className="portal-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 12 }}>
              {requirementStatuses.map((item) => (
                <div key={item.category} className="portal-card portal-card-navy" style={{ margin: 0 }}>
                  <p className="portal-card-copy" style={{ textTransform: 'capitalize', fontWeight: 700 }}>{item.category.replace(/_/g, ' ')}</p>
                  <p className="portal-card-copy">Status: {item.status}</p>
                  {item.rejectionReason ? <p className="portal-card-copy">Rejection reason: {item.rejectionReason}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {loading ? <div className="portal-card portal-card-gold">Loading your documents…</div> : <DocumentList documents={documents} onOpen={handleOpen} />}
      </section>
    </PortalLayout>
  );
}
