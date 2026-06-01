import EmptyAnalyticsState from './EmptyAnalyticsState';

function numericValue(point, valueKey) {
  const value = Number(point?.[valueKey]);
  return Number.isFinite(value) ? value : null;
}

export default function SimpleLineChart({ data = [], valueKey = 'value', labelKey = 'label', color = '#d97706', title = 'Line chart', min, max }) {
  const points = (Array.isArray(data) ? data : []).filter((point) => numericValue(point, valueKey) !== null);
  if (!points.length) return <EmptyAnalyticsState title={`No ${title.toLowerCase()} data`} />;

  const width = 640;
  const height = 240;
  const padding = 38;
  const values = points.map((point) => numericValue(point, valueKey));
  const yMin = Number.isFinite(min) ? min : Math.min(...values, 0);
  const yMax = Number.isFinite(max) ? max : Math.max(...values, 1);
  const spread = Math.max(yMax - yMin, 1);
  const plotted = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : padding + (index * (width - padding * 2)) / (points.length - 1);
    const y = height - padding - ((numericValue(point, valueKey) - yMin) / spread) * (height - padding * 2);
    return { ...point, x, y, value: numericValue(point, valueKey) };
  });
  const path = plotted.map((point) => `${point.x},${point.y}`).join(' ');
  const tickEvery = Math.max(1, Math.ceil(plotted.length / 5));

  return (
    <div className="w-full overflow-hidden" role="img" aria-label={title}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" preserveAspectRatio="none">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" className="text-brand-stone-200 dark:text-slate-700" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="currentColor" className="text-brand-stone-200 dark:text-slate-700" />
        <polyline fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={path} />
        {plotted.map((point, index) => (
          <g key={`${point[labelKey] || point.week || index}-${index}`}>
            <circle cx={point.x} cy={point.y} r="5" fill={color}>
              <title>{`${point[labelKey] || point.week || 'Point'}: ${point.value}`}</title>
            </circle>
            {index % tickEvery === 0 && (
              <text x={point.x} y={height - 12} textAnchor="middle" fontSize="11" fill="currentColor" className="text-brand-stone-500 dark:text-slate-400">
                {String(point[labelKey] || point.week || '').slice(5) || index + 1}
              </text>
            )}
          </g>
        ))}
        <text x={padding - 6} y={padding + 4} textAnchor="end" fontSize="11" fill="currentColor" className="text-brand-stone-500 dark:text-slate-400">{yMax}</text>
        <text x={padding - 6} y={height - padding} textAnchor="end" fontSize="11" fill="currentColor" className="text-brand-stone-500 dark:text-slate-400">{yMin}</text>
      </svg>
    </div>
  );
}
