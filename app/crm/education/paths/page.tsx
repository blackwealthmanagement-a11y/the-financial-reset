'use client';

import { useEffect, useState } from 'react';

export default function CRMLearningPathsPage() {
  const [paths, setPaths] = useState<any[]>([]);

  useEffect(() => {
    async function loadPaths() {
      const response = await fetch('/api/education/public?view=learning-paths');
      const payload = await response.json();
      setPaths(payload.paths || []);
    }

    loadPaths();
  }, []);

  return (
    <main className="page-shell">
      <section className="container page-section">
        <div className="page-card">
          <div className="eyebrow">CRM learning paths</div>
          <h1>Learning paths</h1>
          <p>Create guided paths and assign lessons from the education hub.</p>
          <div className="portal-grid" style={{ marginTop: 24 }}>
            {paths.map((path) => (
              <article key={path.id} className="portal-card portal-card-gold">
                <h3>{path.title}</h3>
                <p className="portal-card-copy">{path.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
