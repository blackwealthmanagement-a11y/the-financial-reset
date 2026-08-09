'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardCard } from '../../../components/client/DashboardCard';
import { PortalLayout } from '../../../components/client/PortalLayout';
import { ProgressCard } from '../../../components/client/ProgressCard';
import { RecentActivityCard } from '../../../components/client/RecentActivityCard';
import { TaskSummaryCard } from '../../../components/client/TaskSummaryCard';
import { UpcomingConsultationCard } from '../../../components/client/UpcomingConsultationCard';
import { useClient } from '../../../hooks/useClient';
import { browserSupabase } from '../../../lib/supabase/browser';

export default function PortalDashboardPage() {
  const router = useRouter();
  const { user, dashboardData, loading, error } = useClient();

  useEffect(() => {
    async function checkAccess() {
      if (!browserSupabase) {
        router.replace('/portal/login');
        return;
      }

      const { data: { session } } = await browserSupabase.auth.getSession();
      if (!session) {
        router.replace('/portal/login');
      }
    }

    checkAccess();
  }, [router]);

  if (loading) {
    return (
      <PortalLayout title="Dashboard" subtitle="Preparing your client experience.">
        <div className="crm-empty-state">
          <h3>Loading your portal…</h3>
          <p>Please hold while your dashboard is prepared.</p>
        </div>
      </PortalLayout>
    );
  }

  if (error || !user || !dashboardData) {
    return (
      <PortalLayout title="Dashboard" subtitle="You need to sign in to continue.">
        <div className="crm-empty-state">
          <h3>Access required</h3>
          <p>Please sign in to view your client dashboard.</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Dashboard" subtitle={`Welcome back, ${user.name || user.email || 'client'}.`}>
      <div className="portal-grid">
        <DashboardCard title="Welcome" accent="gold">
          <p className="portal-card-copy">{dashboardData.welcomeMessage}</p>
          <p className="portal-card-copy"><strong>{dashboardData.clientName}</strong></p>
          <p className="portal-card-copy"><strong>Program:</strong> {dashboardData.programName}</p>
          <p className="portal-card-copy"><strong>Status:</strong> {dashboardData.clientStatus}</p>
          <p className="portal-card-copy"><strong>Member since:</strong> {dashboardData.memberSince}</p>
        </DashboardCard>

        <ProgressCard percent={dashboardData.progressPercent} programName={dashboardData.programName} status={dashboardData.clientStatus} stage={dashboardData.progressStage} />
        <UpcomingConsultationCard date={dashboardData.consultationDate} status={dashboardData.consultationStatus} summary={dashboardData.consultationSummary} />
        <TaskSummaryCard tasks={dashboardData.tasks} />
        <RecentActivityCard activity={dashboardData.activity} />
        <DashboardCard title="Documents" accent="navy">
          <p className="portal-card-copy">Document Vault coming soon.</p>
        </DashboardCard>
        <DashboardCard title="Need Help?" accent="gold">
          <p className="portal-card-copy"><strong>📞 Business Phone</strong><br />{dashboardData.supportPhone}</p>
          <p className="portal-card-copy"><strong>✉️ Business Email</strong><br />{dashboardData.supportEmail}</p>
          <p className="portal-card-copy"><strong>Business Hours</strong><br />{dashboardData.supportHours}</p>
        </DashboardCard>
      </div>
    </PortalLayout>
  );
}
