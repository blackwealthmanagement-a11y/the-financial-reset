'use client';

import { Suspense } from 'react';
import AdminLoginPage from './page';

export default function AdminLoginSuspenseBoundary() {
  return (
    <Suspense fallback={<div className="page-shell"><section className="container page-section"><div className="page-card"><div className="eyebrow">Internal access</div><h1>Loading sign-in…</h1></div></section></div>}>
      <AdminLoginPage />
    </Suspense>
  );
}
