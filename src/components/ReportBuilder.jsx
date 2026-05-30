import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

export default function ReportBuilder({ clientId, therapistId }) {
  const [options, setOptions] = useState({ notes: true, moodTrends: true, partsMap: true });
  const [loading, setLoading] = useState(false);
  const toggle = (key) => setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  const submit = async (event) => {
    event.preventDefault();
    if (!clientId) return;
    setLoading(true);
    const response = await fetch('/api/generate-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: clientId, therapist_id: therapistId, options }) });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ifs-report-${clientId}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  };
  return <form onSubmit={submit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"><h3 className="font-bold text-gray-900">PDF Report Builder</h3>{[['notes', 'Notes'], ['moodTrends', 'Mood Trends'], ['partsMap', 'Parts Map']].map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={options[key]} onChange={() => toggle(key)} /> {label}</label>)}<button disabled={!clientId || loading} className="rounded-lg bg-amber-600 px-4 py-2 text-white font-semibold disabled:bg-gray-400 flex items-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Generate PDF</button></form>;
}
