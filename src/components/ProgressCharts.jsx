import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';

function SvgLineChart({ data }) {
  const points = data.length ? data : [{ label: 'No data', avgMood: 0 }];
  const max = Math.max(10, ...points.map(p => Number(p.avgMood) || 0));
  const width = 640;
  const height = 220;
  const plotted = points.map((p, i) => {
    const x = points.length === 1 ? width / 2 : 40 + (i * (width - 80)) / (points.length - 1);
    const y = height - 35 - ((Number(p.avgMood) || 0) / max) * (height - 70);
    return { ...p, x, y };
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56">
      <line x1="40" y1="185" x2="610" y2="185" stroke="#e5e7eb" />
      <line x1="40" y1="25" x2="40" y2="185" stroke="#e5e7eb" />
      <polyline fill="none" stroke="#d97706" strokeWidth="4" points={plotted.map(p => `${p.x},${p.y}`).join(' ')} />
      {plotted.map(p => <circle key={p.label} cx={p.x} cy={p.y} r="5" fill="#d97706"><title>{`${p.label}: ${p.avgMood || 0}`}</title></circle>)}
      {plotted.filter((_, i) => i % Math.ceil(plotted.length / 6 || 1) === 0).map(p => <text key={p.label} x={p.x} y="205" textAnchor="middle" fontSize="11" fill="#6b7280">{p.label}</text>)}
    </svg>
  );
}

function SvgBarChart({ parts = [] }) {
  const max = Math.max(1, ...parts.map(p => p.count));
  return <div className="space-y-2">{parts.map(part => <div key={part.type} className="grid grid-cols-[120px_1fr_40px] items-center gap-2 text-sm"><span className="truncate text-gray-600">{part.type}</span><div className="h-4 rounded-full bg-gray-100"><div className="h-4 rounded-full bg-emerald-500" style={{ width: `${(part.count / max) * 100}%` }} /></div><span className="font-semibold text-gray-800">{part.count}</span></div>)}</div>;
}

export default function ProgressCharts({ clientId }) {
  const [range, setRange] = useState('6M');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    fetch(`/api/analytics/client?client_id=${encodeURIComponent(clientId)}&range=${range}`)
      .then(res => res.json())
      .then(setData)
      .catch(error => setData({ error: error.message }))
      .finally(() => setLoading(false));
  }, [clientId, range]);

  const weeklyMood = useMemo(() => data?.weeklyMood || [], [data]);
  const partCounts = useMemo(() => data?.partCounts || [], [data]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-600" /><h3 className="font-bold text-gray-900">Longitudinal Analytics</h3>{loading && <Loader2 className="w-4 h-4 animate-spin" />}</div>
        <div className="flex gap-1">{['1M', '3M', '6M'].map(option => <button key={option} onClick={() => setRange(option)} className={`px-3 py-1 rounded-full text-sm ${range === option ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{option}</button>)}</div>
      </div>
      {!clientId ? <p className="text-sm text-gray-500">Select a client to load progress analytics.</p> : data?.error ? <p className="text-sm text-red-600">{data.error}</p> : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div><p className="text-sm font-semibold text-gray-700 mb-2">Average weekly mood</p><SvgLineChart data={weeklyMood} /></div>
          <div><p className="text-sm font-semibold text-gray-700 mb-4">Parts by type</p><SvgBarChart parts={partCounts} /><p className="mt-4 text-xs text-gray-500">Assessments in range: {data?.assessmentResults?.length || 0}</p></div>
        </div>
      )}
    </div>
  );
}
