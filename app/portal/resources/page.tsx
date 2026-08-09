'use client';

import { PortalLayout } from '../../../components/client/PortalLayout';

export default function PortalResourcesPage() {
  return (
    <PortalLayout title="Resources" subtitle="Helpful guidance and next steps.">
      <section className="portal-grid">
        <div className="portal-card portal-card-gold">
          <h3>Preparing your documents</h3>
          <p className="portal-card-copy">Upload your forms through the secure document vault once your team shares them with you.</p>
        </div>
        <div className="portal-card portal-card-navy">
          <h3>Need help?</h3>
          <p className="portal-card-copy">Use the message center or reach out to your advisor if you need help locating a document.</p>
        </div>
      </section>
    </PortalLayout>
  );
}
