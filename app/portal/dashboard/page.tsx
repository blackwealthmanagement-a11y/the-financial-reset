'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardCard } from '../../../components/client/DashboardCard';
import { DashboardHero } from '../../../components/client/DashboardHero';
import { DashboardStats } from '../../../components/client/DashboardStats';
import { JourneyTimeline } from '../../../components/client/JourneyTimeline';
import { NextActionCard } from '../../../components/client/NextActionCard';
import { PortalLayout } from '../../../components/client/PortalLayout';
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
        <DashboardHero
          clientName={dashboardData.clientName}
          welcomeMessage={dashboardData.welcomeMessage}
          programName={dashboardData.programName}
          clientStatus={dashboardData.clientStatus}
          memberSince={dashboardData.memberSince}
          progressPercent={dashboardData.progressPercent}
        />
      </div>

      <DashboardStats activity={dashboardData.activity} />
      <NextActionCard activity={dashboardData.activity} />
      <JourneyTimeline data={dashboardData} />

      <div className="portal-grid" style={{ marginTop: 16 }}>
        <UpcomingConsultationCard date={dashboardData.consultationDate} status={dashboardData.consultationStatus} summary={dashboardData.consultationSummary} />
        <TaskSummaryCard tasks={dashboardData.tasks} />
        <RecentActivityCard activity={dashboardData.activity} />
        <DashboardCard title="Need Help?" accent="gold">
          <p className="portal-card-copy"><strong>📞 Business Phone</strong><br />{dashboardData.supportPhone}</p>
          <p className="portal-card-copy"><strong>✉️ Business Email</strong><br />{dashboardData.supportEmail}</p>
          <p className="portal-card-copy"><strong>Business Hours</strong><br />{dashboardData.supportHours}</p>
        </DashboardCard>
      </div>
    </PortalLayout>
  );
}
