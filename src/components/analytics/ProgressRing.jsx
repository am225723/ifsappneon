export default function ProgressRing({ value = 0, label = 'Progress', size = 132, strokeWidth = 12, color = '#059669' }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="inline-flex flex-col items-center gap-2" role="img" aria-label={`${label}: ${safeValue}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-brand-stone-100 dark:text-slate-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-brand-stone-900 dark:fill-white text-2xl font-bold">
          {safeValue}%
        </text>
      </svg>
      <span className="text-sm font-medium text-brand-stone-600 dark:text-slate-400">{label}</span>
    </div>
  );
}
