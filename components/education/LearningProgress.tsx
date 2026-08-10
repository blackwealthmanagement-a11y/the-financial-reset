interface LearningProgressProps {
  percentComplete: number;
  completedCount: number;
  lessonCount: number;
}

export function LearningProgress({ percentComplete, completedCount, lessonCount }: LearningProgressProps) {
  return (
    <section className="portal-card portal-card-gold" aria-label="Learning progress overview">
      <h3>Learning progress</h3>
      <p className="portal-card-copy">{completedCount} of {lessonCount} lessons completed</p>
      <p className="portal-card-copy">{Math.round(percentComplete)}% complete</p>
      <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 999, height: 12, overflow: 'hidden', marginTop: 8 }}>
        <div style={{ width: `${Math.min(100, Math.max(0, percentComplete))}%`, height: '100%', background: '#0f4c81' }} />
      </div>
    </section>
  );
}
