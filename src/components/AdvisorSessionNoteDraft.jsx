import { useEffect, useState } from 'react';
import { Clipboard, FileText, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadAssignedClients } from '../lib/therapistAssignments';
import { loadActiveTreatmentPlansForClient } from '../lib/treatmentPlans';
import { createTherapistNote } from '../lib/therapistNotes';
import { generateSessionNoteDraft } from '../lib/sessionNoteDraft';

const REQUIRED_DISCLAIMER = 'AI-generated draft for Advisor review. Verify, edit, and use professional judgment before saving.';

const defaultContext = {
  includeAgenda: true,
  includeAssignedPractices: true,
  includeGrowthGoals: true,
  includeSharedLifeReflections: true,
  includeParts: true,
  includeRecentMood: true
};

const contextToggles = [
  { key: 'includeAgenda', label: 'Pre-session check-in' },
  { key: 'includeAssignedPractices', label: 'Assigned practices' },
  { key: 'includeGrowthGoals', label: 'Growth goals' },
  { key: 'includeSharedLifeReflections', label: 'Shared Life Integration reflections' },
  { key: 'includeParts', label: 'Parts summary' },
  { key: 'includeRecentMood', label: 'Recent mood/check-ins' }
];

function formatDraftError(error) {
  if (!error) return '';
  if (error.code === 'unauthorized') return 'Unauthorized: please sign in again before generating an Advisor note draft.';
  if (error.code === 'forbidden') return 'This client is not assigned to your Advisor account.';
  if (error.code === 'missing_client_id') return 'Select an assigned client before generating a draft.';
  if (error.code === 'openai_api_key_missing') return 'OpenAI API key missing. Ask an administrator to configure OPENAI_API_KEY on the server.';
  return error.message || 'Unable to generate Advisor note draft.';
}

function summarizeDraft(draft) {
  const firstContentLine = draft
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.toLowerCase().startsWith('ai-generated draft'));
  return firstContentLine?.slice(0, 240) || 'AI-generated Advisor Session Note draft';
}

export default function AdvisorSessionNoteDraft({ initialClientId = '', assignedClients = null, initialSessionDate = '', onSaved = null }) {
  const advisor = clientAuth.getCurrentClient();
  const [clients, setClients] = useState(assignedClients || []);
  const [clientId, setClientId] = useState(initialClientId);
  const [sessionDate, setSessionDate] = useState(initialSessionDate || new Date().toISOString().slice(0, 10));
  const [advisorBullets, setAdvisorBullets] = useState('');
  const [context, setContext] = useState(defaultContext);
  const [draft, setDraft] = useState('');
  const [draftMetadata, setDraftMetadata] = useState(null);
  const [parts, setParts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [taggedParts, setTaggedParts] = useState([]);
  const [taggedGoals, setTaggedGoals] = useState([]);
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (assignedClients) {
      setClients(assignedClients);
      return;
    }
    if (!advisor?.id) return;
    loadAssignedClients(advisor.id).then((rows) => setClients(rows || []));
  }, [assignedClients, advisor?.id]);

  useEffect(() => {
    if (initialClientId) setClientId(initialClientId);
  }, [initialClientId]);

  useEffect(() => {
    if (initialSessionDate) setSessionDate(initialSessionDate);
  }, [initialSessionDate]);

  useEffect(() => {
    setTaggedParts([]);
    setTaggedGoals([]);
    setDraft('');
    setDraftMetadata(null);
    setClinicalSummary('');
    if (!clientId) {
      setParts([]);
      setGoals([]);
      return;
    }

    Promise.all([
      supabase.from('ifs_parts').select('id, part_name, name, part_type').eq('client_id', clientId).order('updated_at', { ascending: false }),
      loadActiveTreatmentPlansForClient(clientId)
    ]).then(([{ data: partRows }, { data: goalRows }]) => {
      setParts(partRows || []);
      setGoals((goalRows || []).filter((goal) => goal.status === 'active'));
    });
  }, [clientId]);

  const toggleContext = (key) => setContext((prev) => ({ ...prev, [key]: !prev[key] }));

  const togglePart = (part) => {
    const tag = { id: part.id, name: part.part_name || part.name || 'Part' };
    setTaggedParts((prev) => prev.some((item) => item.id === tag.id) ? prev.filter((item) => item.id !== tag.id) : [...prev, tag]);
  };

  const toggleGoal = (goal) => {
    const tag = { id: goal.id, goal_title: goal.goal_title || goal.title || 'Growth Goal' };
    setTaggedGoals((prev) => prev.some((item) => item.id === tag.id) ? prev.filter((item) => item.id !== tag.id) : [...prev, tag]);
  };

  const handleGenerate = async () => {
    setError('');
    setMessage('');
    if (!clientId) {
      setError('Select an assigned client before generating a draft.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: draftError } = await generateSessionNoteDraft({
        clientId,
        sessionDate,
        advisorBullets,
        includeAgenda: context.includeAgenda,
        includeAssignedPractices: context.includeAssignedPractices,
        includeGrowthGoals: context.includeGrowthGoals,
        includeSharedLifeReflections: context.includeSharedLifeReflections,
        includeParts: context.includeParts,
        includeRecentMood: context.includeRecentMood
      });

      if (draftError) {
        setError(formatDraftError(draftError));
        return;
      }

      setDraft(data?.draft || '');
      setDraftMetadata(data || null);
      setClinicalSummary(summarizeDraft(data?.draft || ''));
      setMessage('Advisor note draft generated. Review and edit it before saving.');
    } catch (draftError) {
      console.error('Unable to generate Advisor note draft:', draftError);
      setError(formatDraftError(draftError));
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    setError('');
    setMessage('');
    if (!advisor?.id || !clientId || !draft.trim()) {
      setError('Advisor, assigned client, and edited draft content are required before saving.');
      return;
    }

    setSaving(true);
    const { data, error: saveError } = await createTherapistNote({
      therapistId: advisor.id,
      clientId,
      noteType: 'session_note',
      clinicalSummary,
      content: draft,
      sessionDate,
      taggedParts,
      taggedTreatmentGoals: taggedGoals,
      status: 'draft',
      aiGenerated: Boolean(draftMetadata),
      aiGenerationMetadata: draftMetadata ? {
        generatedAt: draftMetadata.generatedAt,
        dataSources: draftMetadata.dataSources,
        disclaimer: draftMetadata.disclaimer
      } : {}
    });
    setSaving(false);

    if (saveError) {
      setError(saveError.message || 'Unable to save Advisor note.');
      return;
    }

    onSaved?.(data);
    setMessage('Advisor Note saved.');
  };

  const copyDraft = async () => {
    if (!draft.trim()) return;
    await navigator.clipboard?.writeText(draft);
    setMessage('Advisor note draft copied to clipboard.');
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-white p-5 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900"><Sparkles className="h-5 w-5 text-amber-600" /> AI-Assisted Advisor Note Draft</h3>
          <p className="text-sm text-gray-600">Draft a note from Advisor-entered bullets and selected IFS context. Review and edit before saving.</p>
          <p className="mt-1 text-xs font-medium text-amber-700">{REQUIRED_DISCLAIMER}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Draft only</span>
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4 rounded-lg bg-amber-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">Client
              <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                <option value="">Select assigned client...</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">Session date
              <input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            </label>
          </div>

          <label className="block text-sm font-medium text-gray-700">Advisor-entered bullets
            <textarea
              value={advisorBullets}
              onChange={(event) => setAdvisorBullets(event.target.value)}
              rows={8}
              placeholder="Add session observations, parts discussed, IFS practices used, client responses, assigned practice, and next steps. Do not rely on AI to infer missing facts."
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Context checkboxes</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {contextToggles.map((toggle) => (
                <label key={toggle.key} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-700">
                  <input type="checkbox" checked={context[toggle.key]} onChange={() => toggleContext(toggle.key)} className="mt-1" />
                  <span>{toggle.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="button" onClick={handleGenerate} disabled={loading || !clientId} className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-400">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating Advisor note draft...' : 'Generate Draft'}
          </button>
        </div>

        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-gray-900"><FileText className="h-4 w-4 text-amber-600" /> Draft Editor</h4>
              <p className="text-xs text-gray-500">Edit, verify, and confirm the note before saving. Generated output is not auto-saved.</p>
            </div>
            {draftMetadata?.generatedAt && <span className="text-xs text-gray-400">Generated {new Date(draftMetadata.generatedAt).toLocaleString()}</span>}
          </div>

          <input value={clinicalSummary} onChange={(event) => setClinicalSummary(event.target.value)} placeholder="Brief Advisor note summary" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={16} placeholder="Generated Advisor note draft will appear here for editing before save." className="w-full rounded-lg border px-3 py-2 text-sm leading-relaxed" />

          {draftMetadata?.dataSources && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              <p className="font-semibold text-gray-700">Included scoped data sources</p>
              <p>Pre-session check-in: {draftMetadata.dataSources.latestPreSessionAgenda ? 'yes' : 'no'} · Assigned practices: {draftMetadata.dataSources.assignedPractices} · Growth goals: {draftMetadata.dataSources.growthGoals} · Shared Life Integration reflections: {draftMetadata.dataSources.sharedLifeReflections} · Parts: {draftMetadata.dataSources.partsSummary} · Recent mood/check-ins: {draftMetadata.dataSources.recentMood}</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Confirm tagged parts</p>
              <div className="flex flex-wrap gap-2">{parts.length ? parts.map((part) => <button type="button" key={part.id} onClick={() => togglePart(part)} className={`rounded-full px-2 py-1 text-xs ${taggedParts.some((item) => item.id === part.id) ? 'bg-amber-600 text-white' : 'border bg-white text-gray-600'}`}>{part.part_name || part.name}</button>) : <span className="text-xs text-gray-500">No parts found.</span>}</div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Confirm Growth Goals</p>
              <div className="flex flex-wrap gap-2">{goals.length ? goals.map((goal) => <button type="button" key={goal.id} onClick={() => toggleGoal(goal)} className={`rounded-full px-2 py-1 text-xs ${taggedGoals.some((item) => item.id === goal.id) ? 'bg-emerald-600 text-white' : 'border bg-white text-gray-600'}`}>{goal.goal_title}</button>) : <span className="text-xs text-gray-500">No active Growth Goals found.</span>}</div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={saveNote} disabled={saving || !draft.trim()} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-gray-400">{saving ? 'Saving...' : 'Save as Advisor Note'}</button>
            <button type="button" onClick={copyDraft} disabled={!draft.trim()} className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-gray-700 disabled:text-gray-400"><Clipboard className="h-4 w-4" /> Copy Draft</button>
          </div>
        </div>
      </div>
    </div>
  );
}
