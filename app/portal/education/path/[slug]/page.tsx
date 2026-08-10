'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { PortalLayout } from '../../../../../components/client/PortalLayout';
import { LessonChecklist } from '../../../../../components/education/LessonChecklist';
import { ProgressRing } from '../../../../../components/education/ProgressRing';
import { RecommendedLearning } from '../../../../../components/education/RecommendedLearning';
import { getLearningPath, getClientLearningProgress } from '../../../../../services/education.service';

interface LearningPathLesson {
  id: string;
  title: string;
  slug: string;
  completed?: boolean;
}

interface LearningPathRecord {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  lessons: LearningPathLesson[];
  percentComplete?: number;
  estimatedCompletion?: string;
}

export default function PortalLearningPathPage() {
  const params = useParams();
  const [path, setPath] = useState<LearningPathRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  useEffect(() => {
    async function loadPath() {
      if (!slug) return;
      setLoading(true);
      try {
        const [pathData, progressData] = await Promise.all([getLearningPath(slug), getClientLearningProgress()]);
        const progressMap = new Map((progressData?.data || []).map((entry: { lesson_id: string; completed: boolean }) => [entry.lesson_id, entry.completed]));
        const lessons = (pathData?.data?.lessons || []).map((lesson: LearningPathLesson) => ({ ...lesson, completed: Boolean(progressMap.get(lesson.id)) }));
        setPath({
          id: pathData?.data?.id,
          title: pathData?.data?.title,
          slug: pathData?.data?.slug,
          description: pathData?.data?.description,
          lessons,
          percentComplete: pathData?.data?.percentComplete || 0,
          estimatedCompletion: pathData?.data?.estimatedCompletion || 'Continue learning'
        });
      } finally {
        setLoading(false);
      }
    }

    loadPath();
  }, [slug]);

  const completedCount = useMemo(() => (path?.lessons || []).filter((lesson) => lesson.completed).length, [path?.lessons]);

  return (
    <PortalLayout title="Learning paths" subtitle="Follow a guided path through the education hub.">
      {loading ? <p className="portal-card-copy">Loading learning path…</p> : null}
      {path ? (
        <div className="portal-grid">
          <section className="portal-card portal-card-gold">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <p className="eyebrow">Path</p>
                <h2>{path.title}</h2>
                <p className="portal-card-copy">{path.description}</p>
              </div>
              <ProgressRing percentComplete={path.percentComplete || 0} />
            </div>
            <p className="portal-card-copy">{completedCount} of {path.lessons.length} lessons completed</p>
            <p className="portal-card-copy">Estimated completion: {path.estimatedCompletion}</p>
            <Link className="button secondary" href="/portal/education" style={{ marginTop: 12 }}>Back to portal education</Link>
          </section>
          <LessonChecklist lessons={path.lessons} />
          <RecommendedLearning title="Continue learning" href={`/portal/education`} description="Pick up where you left off and stay consistent." />
        </div>
      ) : null}
    </PortalLayout>
  );
}
