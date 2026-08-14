'use client';

import { useEffect, useState } from 'react';
import { getMyInvoices } from '../services/billing.service';
import { buildRequirementStatuses, getClientDocumentRequirements, getClientDocuments } from '../services/document.service';
import { getPortalConsultations } from '../services/portal-scheduling.service';
import { getPortalLessonProgress, getPortalLessons } from '../services/education.service';
import { browserSupabase } from '../lib/supabase/browser';
import type { PortalDashboardData } from '../types/client';

export type PortalDashboardMetrics = {
  loading: boolean;
  error: boolean;
  outstandingBalanceCents: number;
  openInvoicesCount: number;
  nextInvoice: {
    id: string;
    invoice_number: string;
    total_cents: number;
    status: string;
  } | null;
  documentCount: number;
  documentRequirementAction: 'missing' | 'rejected' | 'none';
  documentActionCategory: string | null;
  rejectedDocumentCategories: string[];
  educationPercent: number;
  completedLessons: number;
  totalLessons: number;
  nextConsultation: {
    start_time: string;
    meeting_type: string | null;
    status: string;
  } | null;
  recentActivityCount: number;
};

const initialMetrics: PortalDashboardMetrics = {
  loading: true,
  error: false,
  outstandingBalanceCents: 0,
  openInvoicesCount: 0,
  nextInvoice: null,
  documentCount: 0,
  documentRequirementAction: 'none',
  documentActionCategory: null,
  rejectedDocumentCategories: [],
  educationPercent: 0,
  completedLessons: 0,
  totalLessons: 0,
  nextConsultation: null,
  recentActivityCount: 0,
};

export function usePortalDashboardMetrics(activity: PortalDashboardData['activity'] = []) {
  const [metrics, setMetrics] = useState<PortalDashboardMetrics>(initialMetrics);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const results = await Promise.allSettled([
        getMyInvoices(),
        getClientDocuments(),
        getPortalLessons(),
        getPortalLessonProgress(),
        getPortalConsultations(),
      ]);

      if (!isMounted) {
        return;
      }

      let nextInvoice: PortalDashboardMetrics['nextInvoice'] = null;
      let outstandingBalance = 0;
      let openInvoicesCount = 0;
      let documentCount = 0;
      let documentRequirementAction: PortalDashboardMetrics['documentRequirementAction'] = 'none';
      let documentActionCategory: string | null = null;
      let rejectedDocumentCategories: string[] = [];
      let nextConsultation: PortalDashboardMetrics['nextConsultation'] = null;
      let educationPercent = 0;
      let completedLessons = 0;
      let totalLessons = 0;

      const billingResult = results[0];
      if (billingResult.status === 'fulfilled' && !billingResult.value.error && Array.isArray(billingResult.value.data)) {
        const invoices = billingResult.value.data;
        const openInvoices = invoices.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'cancelled');
        openInvoicesCount = openInvoices.length;
        outstandingBalance = openInvoices.reduce((sum, invoice) => sum + Number(invoice.total_cents || 0), 0);
        nextInvoice = openInvoices[0]
          ? {
              id: openInvoices[0].id,
              invoice_number: openInvoices[0].invoice_number,
              total_cents: Number(openInvoices[0].total_cents || 0),
              status: openInvoices[0].status,
            }
          : null;
      }

      const documentsResult = results[1];
      if (documentsResult.status === 'fulfilled' && !documentsResult.value.error && Array.isArray(documentsResult.value.data)) {
        const documents = documentsResult.value.data;
        documentCount = documents.length;

        let clientId: string | null = null;
        if (browserSupabase) {
          const { data: { session } } = await browserSupabase.auth.getSession();
          if (session?.user?.id) {
            const { data: clientRecord } = await browserSupabase.from('clients').select('id').eq('auth_user_id', session.user.id).maybeSingle();
            clientId = clientRecord?.id || null;
          }
        }

        if (clientId) {
          const { data: requirements } = await getClientDocumentRequirements(clientId);
          const requirementStatuses = buildRequirementStatuses(requirements || [], documents);
          const rejectedItem = requirementStatuses.find((item) => item.status === 'rejected' || item.rejected);
          const missingItem = requirementStatuses.find((item) => item.status === 'missing');

          if (rejectedItem) {
            documentRequirementAction = 'rejected';
            documentActionCategory = rejectedItem.category;
          } else if (missingItem) {
            documentRequirementAction = 'missing';
            documentActionCategory = missingItem.category;
          }

          rejectedDocumentCategories = [...new Set(
            requirementStatuses
              .filter((item) => item.status === 'rejected' || item.rejected)
              .map((item) => item.category)
          )];
        } else {
          rejectedDocumentCategories = [...new Set(
            documents
              .filter((document) => document.status === 'rejected')
              .map((document) => document.category || 'documents')
          )];
        }
      }

      const lessonsResult = results[2];
      const lessonProgressResult = results[3];
      if (lessonsResult.status === 'fulfilled' && !lessonsResult.value.error) {
        const lessons = Array.isArray(lessonsResult.value.data) ? lessonsResult.value.data : [];
        totalLessons = lessons.length;
      }
      if (lessonProgressResult.status === 'fulfilled' && !lessonProgressResult.value.error) {
        const progress = Array.isArray(lessonProgressResult.value.data) ? lessonProgressResult.value.data : [];
        completedLessons = progress.filter((item) => item.completed).length;
      }
      if (totalLessons > 0) {
        educationPercent = Math.round((completedLessons / totalLessons) * 100);
      }

      const consultationResult = results[4];
      if (consultationResult.status === 'fulfilled' && !consultationResult.value.error && Array.isArray(consultationResult.value.data)) {
        const upcoming = consultationResult.value.data
          .filter((event) => event.status === 'scheduled' && new Date(event.start_time).getTime() > Date.now())
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        nextConsultation = upcoming[0]
          ? {
              start_time: upcoming[0].start_time,
              meeting_type: upcoming[0].meeting_type || null,
              status: upcoming[0].status,
            }
          : null;
      }

      setMetrics({
        loading: false,
        error: results.some((result) => result.status === 'rejected'),
        outstandingBalanceCents: outstandingBalance,
        openInvoicesCount,
        nextInvoice,
        documentCount,
        documentRequirementAction,
        documentActionCategory,
        rejectedDocumentCategories,
        educationPercent,
        completedLessons,
        totalLessons,
        nextConsultation,
        recentActivityCount: Array.isArray(activity) ? activity.length : 0,
      });
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [activity]);

  return metrics;
}
