import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export default function SessionPrepSummary({ clientId, therapistId }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!clientId) return;
    setLoading(true);
    setSummary('');
    const response = await fetch('/api/ai-session-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: clientId, therapist_id: therapistId }) });
    if (!response.body) {
      const json = await response.json().catch(() => ({}));
      setSummary(json.summary || json.error || 'Unable to generate summary.');
      setLoading(false);
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setSummary(prev => prev + decoder.decode(value, { stream: true }));
    }
    setLoading(false);
  };

  return <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-600" /><h3 className="font-semibold text-amber-950">AI Session Prep Summary</h3></div><button onClick={generate} disabled={!clientId || loading} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white disabled:bg-gray-400 flex items-center gap-2">{loading && <Loader2 className="w-4 h-4 animate-spin" />} Summarize</button></div>{summary && <div className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-gray-700">{summary}</div>}</div>;
}
