import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateSessionPrepSummary } from '../lib/sessionPrepSummary';

const AI_DISCLAIMER = 'AI-generated draft for clinician review. Verify against the chart and use clinical judgment.';

function formatError(error) {
  if (!error) return '';
  if (error.code === 'unauthorized') return 'Unauthorized: please sign in again before generating an AI summary.';
  if (error.code === 'forbidden') return 'Unauthorized: this client is not assigned to your therapist account.';
  if (error.code === 'openai_api_key_missing') return 'OpenAI API key missing. Ask an administrator to configure OPENAI_API_KEY on the server.';
  if (error.code === 'no_recent_data') return 'No recent data is available to summarize for this client.';
  return error.message || 'Unable to generate summary.';
}

export default function SessionPrepSummary({ clientId, rangeDays = 7 }) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!clientId) {
      setError('No client selected. Select an active assigned client first.');
      return;
    }

    setLoading(true);
    setSummary('');
    setError('');
    const { data, error: summaryError } = await generateSessionPrepSummary({ clientId, rangeDays });
    setLoading(false);

    if (summaryError) {
      setError(formatError(summaryError));
      return;
    }

    setSummary(data?.summary || 'No summary returned.');
  };

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-amber-950">AI Session Prep Summary</h3>
        </div>
        <button onClick={generate} disabled={!clientId || loading} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white disabled:bg-gray-400 flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Generating summary...' : 'Generate AI Summary'}
        </button>
      </div>
      <div className="rounded-lg border border-amber-100 bg-white/80 p-3 text-xs font-medium text-amber-900">{AI_DISCLAIMER}</div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {summary && <div className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-gray-700">{summary}</div>}
    </div>
  );
}
