import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarCheck, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadTherapistClientSessionAgendas, markSessionAgendaReviewed } from '../lib/sessionAgendas';
import { generateSessionPrepSummary } from '../lib/sessionPrepSummary';

function formatDate(value) {
  if (!value) return 'Not specified';
  return new Date(value.includes?.('T') ? value : `${value}T00:00:00`).toLocaleDateString();
}

function AgendaDetail({ label, value }) {
  if (!value && value !== 0) return null;
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-500">{label}</p><p className="text-sm text-blue-950 whitespace-pre-wrap">{value}</p></div>;
}

const AI_DISCLAIMER = 'AI-generated draft for clinician review. Verify against the chart and use clinical judgment.';

function formatAiError(error) {
  if (!error) return '';
  if (error.code === 'unauthorized') return 'Unauthorized: please sign in again before generating an AI summary.';
  if (error.code === 'forbidden') return 'Unauthorized: this client is not assigned to your therapist account.';
  if (error.code === 'missing_client_id') return 'No client selected. Select an active assigned client first.';
  if (error.code === 'no_recent_data') return 'No recent data is available to summarize for this client.';
  if (error.code === 'openai_api_key_missing') return 'OpenAI API key missing. Ask an administrator to configure OPENAI_API_KEY on the server.';
  return error.message || 'Server error: unable to generate AI summary.';
}

function AiSummaryContent({ summary }) {
  if (!summary) return null;
  return (
    <div className="space-y-2 text-sm text-slate-800">
      {summary.split('\n').map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;
        const isHeading = /^\d+\.\s/.test(trimmed);
        return (
          <p key={index} className={isHeading ? 'mt-3 font-semibold text-purple-950' : 'whitespace-pre-wrap'}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function SessionPrepBrief({ clientId, therapistId, clients = [], onDraftSessionNote = null }) {
  const therapist = clientAuth.getCurrentClient();
  const resolvedTherapistId = therapistId || therapist?.id;
  const [selectedClientId, setSelectedClientId] = useState(clientId || '');
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    if (clientId) setSelectedClientId(clientId);
  }, [clientId]);

  useEffect(() => {
    setAiSummary(null);
    setAiError('');
  }, [selectedClientId]);

  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const latestAgenda = useMemo(() => agendas.find((agenda) => agenda.status === 'submitted') || agendas[0] || null, [agendas]);

  const loadAgendas = async () => {
    if (!resolvedTherapistId || !selectedClientId) {
      setAgendas([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: loadError } = await loadTherapistClientSessionAgendas(resolvedTherapistId, selectedClientId);
      if (loadError) throw loadError;
      setAgendas(data || []);
      setReviewNotes(data?.[0]?.therapist_notes || '');
    } catch (loadError) {
      console.error('Unable to load session agendas:', loadError);
      setAgendas([]);
      setReviewNotes('');
      setError(loadError.message || 'Unable to load session agendas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgendas();
  }, [resolvedTherapistId, selectedClientId]);

  const handleGenerateAiSummary = async () => {
    setAiError('');
    setAiSummary(null);
    if (!selectedClientId) {
      setAiError('No client selected. Select an active assigned client first.');
      return;
    }

    setAiLoading(true);
    try {
      const { data, error: summaryError } = await generateSessionPrepSummary({ clientId: selectedClientId, rangeDays: 7 });

      if (summaryError) {
        setAiError(formatAiError(summaryError));
        return;
      }

      setAiSummary(data);
    } catch (summaryError) {
      console.error('Unable to generate AI session prep summary:', summaryError);
      setAiError(formatAiError(summaryError));
    } finally {
      setAiLoading(false);
    }
  };

  const markReviewed = async () => {
    if (!latestAgenda?.id) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { error: reviewError } = await markSessionAgendaReviewed(latestAgenda.id, reviewNotes);
      if (reviewError) {
        setError(reviewError.message || 'Unable to mark agenda reviewed.');
        return;
      }
      setMessage('Agenda marked reviewed.');
      await loadAgendas();
    } catch (reviewError) {
      console.error('Unable to mark agenda reviewed:', reviewError);
      setError(reviewError.message || 'Unable to mark agenda reviewed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-950">Session Prep Brief</h3>
            <p className="text-xs text-blue-700">Structured agenda data with an optional on-demand AI summary for clinician review.</p>
          </div>
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
        </div>
        {!clientId && clients.length > 0 && (
          <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950">
            <option value="">Select client...</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      {!selectedClientId ? <p className="text-sm text-blue-700">Select an active assigned client to see their latest pre-session check-in.</p> : loading ? (
        <p className="flex items-center gap-2 text-sm text-blue-700"><Loader2 className="w-4 h-4 animate-spin" /> Loading agendas...</p>
      ) : !latestAgenda ? <p className="text-sm text-blue-700">No submitted pre-session agenda yet{selectedClient?.name ? ` for ${selectedClient.name}` : ''}.</p> : (
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 space-y-3 border border-blue-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Latest submitted agenda</p>
                <p className="text-sm font-semibold text-blue-950">Session date: {formatDate(latestAgenda.session_date)}</p>
                <p className="text-xs text-blue-600">Submitted: {formatDate(latestAgenda.created_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {onDraftSessionNote && (
                  <button
                    type="button"
                    onClick={() => onDraftSessionNote({ clientId: selectedClientId, sessionDate: latestAgenda.session_date || new Date().toISOString().slice(0, 10) })}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Draft Session Note
                  </button>
                )}
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${latestAgenda.status === 'reviewed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{latestAgenda.status}</span>
              </div>
            </div>

            {latestAgenda.safety_concerns && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><p>Client reported safety-related content in this check-in. Review clinically and follow your practice’s safety workflow as appropriate.</p></div>
              </div>
            )}

            <AgendaDetail label="Topics" value={latestAgenda.topics} />
            {latestAgenda.active_parts?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Active parts</p>
                <div className="mt-1 flex flex-wrap gap-1.5">{latestAgenda.active_parts.map((part) => <span key={part.id || part.name} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{part.name || part.part_name}</span>)}</div>
              </div>
            )}
            <AgendaDetail label="Stuck points" value={latestAgenda.stuck_points} />
            <AgendaDetail label="Goals for session" value={latestAgenda.goals_for_session} />
            <AgendaDetail label="Stress level" value={latestAgenda.current_stress_level} />
            <AgendaDetail label="Mood label" value={latestAgenda.current_mood_label} />
            <AgendaDetail label="Safety concerns" value={latestAgenda.safety_concerns} />

            <label className="block text-sm font-medium text-blue-950">Brief therapist note
              <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-blue-200 px-3 py-2 text-sm text-gray-900" placeholder="Optional review note..." />
            </label>
            <button onClick={markReviewed} disabled={saving || latestAgenda.status === 'archived'} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-400 flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark reviewed
            </button>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-blue-950 mb-2">Upcoming/recent agendas</h4>
            <div className="space-y-2">
              {agendas.slice(0, 5).map((agenda) => (
                <div key={agenda.id} className="rounded-lg bg-white border border-blue-100 px-3 py-2 text-sm text-blue-900 flex items-center justify-between gap-3">
                  <span>{formatDate(agenda.session_date)} · {agenda.topics?.slice(0, 80)}</span>
                  <span className="text-xs font-semibold uppercase text-blue-500">{agenda.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-purple-100 bg-white p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="font-semibold text-purple-950">AI Session Prep Summary</h4>
            <p className="text-xs text-purple-700">Generate on demand from scoped agenda, mood, journal, parts, homework, and progress data. This does not replace the structured Session Prep Brief.</p>
          </div>
          <button
            type="button"
            onClick={handleGenerateAiSummary}
            disabled={aiLoading || !selectedClientId}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-400"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {aiLoading ? 'Generating summary...' : 'Generate AI Summary'}
          </button>
        </div>

        <div className="rounded-lg border border-purple-100 bg-purple-50 p-3 text-xs font-medium text-purple-900">
          {AI_DISCLAIMER}
        </div>

        {aiError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{aiError}</div>}
        {aiLoading && <p className="flex items-center gap-2 text-sm text-purple-700"><Loader2 className="w-4 h-4 animate-spin" /> Generating summary...</p>}
        {aiSummary?.summary && (
          <div className="rounded-lg border border-purple-100 bg-white p-4">
            <AiSummaryContent summary={aiSummary.summary} />
            {aiSummary.generatedAt && <p className="mt-4 text-xs text-slate-500">Generated: {new Date(aiSummary.generatedAt).toLocaleString()}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
