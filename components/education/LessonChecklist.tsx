interface LessonChecklistProps {
  lessons: Array<{ id: string; title: string; completed?: boolean }>;
}

export function LessonChecklist({ lessons }: LessonChecklistProps) {
  return (
    <section className="portal-card portal-card-navy" aria-label="Lesson checklist">
      <h3>Lesson checklist</h3>
      <ul>
        {lessons.map((lesson) => (
          <li key={lesson.id} style={{ marginBottom: 8 }}>
            <strong>{lesson.title}</strong>
            <span style={{ marginLeft: 8 }}>{lesson.completed ? '✓ Completed' : '○ In progress'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
