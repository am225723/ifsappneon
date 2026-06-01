import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import SimpleLineChart from './analytics/SimpleLineChart';
import SimpleBarChart from './analytics/SimpleBarChart';
import EmptyAnalyticsState from './analytics/EmptyAnalyticsState';
import { loadClientAnalytics } from '../lib/clientAnalytics';

export default function ProgressCharts({ clientId }) {
  const [range, setRange] = useState('6M');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!clientId) return;
      setLoading(true);
      setError('');
      const { data: analytics, error: loadError } = await loadClientAnalytics({ clientId, range });
      if (!active) return;
      setData(analytics);
      setError(loadError || '');
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [clientId, range]);

  const partCounts = useMemo(() => Object.entries(data?.partsSummary?.byRole || {}).map(([label, count]) => ({ label, count })), [data]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-600" />
          <h3 className="font-bold text-gray-900">Longitudinal Analytics</h3>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        <div className="flex gap-1">{['1M', '3M', '6M'].map((option) => <button key={option} onClick={() => setRange(option)} className={`rounded-full px-3 py-1 text-sm ${range === option ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{option}</button>)}</div>
      </div>
      {!clientId ? <p className="text-sm text-gray-500">Select a client to load progress analytics.</p> : error ? <p className="text-sm text-red-600">{error}</p> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Average weekly mood</p>
            <SimpleLineChart data={data?.moodTrend || []} valueKey="mood" title="Average weekly mood" color="#d97706" min={1} max={10} />
          </div>
          <div>
            <p className="mb-4 text-sm font-semibold text-gray-700">Parts by role</p>
            {partCounts.length ? <SimpleBarChart data={partCounts} title="Parts by role" /> : <EmptyAnalyticsState title="No parts data" />}
            <p className="mt-4 text-xs text-gray-500">Assessments in range: {data?.assessmentTrajectory?.length || 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
