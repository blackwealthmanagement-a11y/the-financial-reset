interface ProgressRingProps {
  percentComplete: number;
}

export function ProgressRing({ percentComplete }: ProgressRingProps) {
  const safePercent = Math.min(100, Math.max(0, percentComplete));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Progress ring">
      <svg width="96" height="96" viewBox="0 0 100 100" role="img" aria-label={`${safePercent}% complete`}>
        <circle cx="50" cy="50" r={radius} stroke="#e5e7eb" strokeWidth="10" fill="none" />
        <circle cx="50" cy="50" r={radius} stroke="#0f4c81" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 50 50)" />
      </svg>
      <span style={{ position: 'absolute', fontWeight: 700 }}>{Math.round(safePercent)}%</span>
    </div>
  );
}
