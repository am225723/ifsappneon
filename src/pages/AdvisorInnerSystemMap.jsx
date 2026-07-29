import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Copy, Loader2, Shield } from 'lucide-react';
import InnerSystemMapCanvas from '../components/parts/InnerSystemMapCanvas';
import PartSuggestionPanel from '../components/parts/PartSuggestionPanel';
import { normalizeMapPart } from '../components/parts/mapConstants';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadAssignedClients } from '../lib/therapistAssignments';
import { loadPartRelationships } from '../lib/partRelationships';
import { buildPartSuggestions } from '../lib/partSuggestionEngine';
import { applySuggestionState, loadPartSuggestionState } from '../lib/partSuggestionState';

function isElevated(user) {
  return ['admin', 'supervisor'].includes(user?.user_role);
}

export default function AdvisorInnerSystemMap() {
  const { clientId } = useParams();
  const [advisor] = useState(() => clientAuth.getCurrentClientValidated());
  const [client, setClient] = useState(null);
  const [parts, setParts] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [suggestions, setSuggestions] = useState({ parts: [], relationships: [], dismissedParts: [], dismissedRelationships: [], acceptedCount: 0, mergedCount: 0, dismissedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const mappedParts = useMemo(() => parts.map((part, index) => normalizeMapPart(part, index, {})), [parts]);
  const latestUpdated = useMemo(() => [...parts, ...relationships].map((item) => item.updated_at || item.created_at).filter(Boolean).sort().at(-1) || null, [parts, relationships]);

  const loadMap = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!['therapist', 'advisor', 'admin', 'supervisor'].includes(advisor?.user_role)) {
        setError('Advisor access is required for this read-only map.');
        setLoading(false);
        return;
      }
      if (!isElevated(advisor)) {
        const assigned = await loadAssignedClients(advisor.id, 'id,name,user_role,status');
        if (!assigned.some((row) => String(row.id) === String(clientId))) {
          setError('This client is not assigned to your Advisor account.');
          setLoading(false);
          return;
        }
      }

      const [clientRes, partsRes, relationshipsRes, partsMapRes, interactiveRes, assessmentRes, lifeRes, journalRes, stateRes] = await Promise.all([
        supabase.from('ifs_clients').select('id, name, email, status, last_active, user_role').eq('id', clientId).maybeSingle(),
        supabase.from('ifs_parts').select('id, client_id, name, part_name, type, part_type, role, description, x, y, size, color, updated_at, created_at').eq('client_id', clientId).order('updated_at', { ascending: false }),
        loadPartRelationships({ clientId }),
        supabase.from('ifs_interactive_data').select('id, data, updated_at').eq('client_id', clientId).eq('module_id', 'parts_map').maybeSingle(),
        supabase.from('ifs_interactive_data').select('id, client_id, module_id, data, updated_at').eq('client_id', clientId).or('module_id.like.assessment_%,module_id.like.module%').order('updated_at', { ascending: false }).limit(80),
        supabase.from('ifs_assessment_results').select('id, client_id, assessment_type, data, results, created_at, updated_at').eq('client_id', clientId).order('updated_at', { ascending: false }).limit(20),
        supabase.from('ifs_life_integration_reflections').select('id, client_id, practice_id, reflection_type, data, responses, summary, created_at, updated_at').eq('client_id', clientId).order('updated_at', { ascending: false }).limit(40),
        supabase.from('ifs_journal_entries').select('id, client_id, title, created_at, updated_at').eq('client_id', clientId).order('updated_at', { ascending: false }).limit(20),
        loadPartSuggestionState({ clientId })
      ]);

      const firstError = [clientRes, partsRes, relationshipsRes, partsMapRes, interactiveRes, assessmentRes, lifeRes, journalRes, stateRes].find((res) => res.error)?.error;
      if (firstError) throw firstError;
      if (clientRes.data?.user_role !== 'client') throw new Error('Selected record is not a client profile.');

      setClient(clientRes.data);
      setParts(partsRes.data || []);
      setRelationships(relationshipsRes.data || []);
      const built = buildPartSuggestions({
        assessmentRows: (assessmentRes.data || []).map((row) => ({ ...row, module_id: row.assessment_type || row.module_id, data: row.data || row.results || row })),
        interactiveRows: interactiveRes.data || [],
        lifeIntegrationRows: lifeRes.data || [],
        journalRows: journalRes.data || [],
        legacyPartsMap: partsMapRes.data || null,
        existingParts: partsRes.data || [],
        existingRelationships: relationshipsRes.data || []
      });
      setSuggestions(applySuggestionState(built, stateRes.data || []));
    } catch (err) {
      setError(err.message || 'Unable to load the client Inner System Map.');
    }
    setLoading(false);
  }, [advisor, clientId]);

  useEffect(() => { loadMap(); }, [loadMap]);

  const discussionQuestions = [
    `Which part on ${client?.name || 'the client'}'s map seems most active lately?`,
    'Are any protectors trying to help vulnerable parts feel safer?',
    'Which relationship line could be explored collaboratively in session?',
    'Are there Suggested Parts the client may want to review together?'
  ].join('\n');

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <Link to="/therapist-dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-brand-stone-600 hover:text-brand-emerald-700 dark:text-slate-300"><ArrowLeft className="h-4 w-4" /> Back to Advisor Dashboard</Link>
        <section className="rounded-3xl border border-brand-emerald-100 bg-white/85 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950/80">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-emerald-700 dark:text-brand-emerald-100">Client Inner System Map</p>
          <h1 className="mt-2 text-3xl font-serif text-brand-stone-900 dark:text-slate-100">{client?.name || 'Client'} Inner System Map</h1>
          <p className="mt-3 max-w-3xl text-brand-stone-700 dark:text-slate-300">This is the client’s Inner System Map. Use it to understand patterns and prepare questions for session. Changes should be made collaboratively with the client.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-brand-emerald-50 px-3 py-1 text-brand-emerald-900">Read-only client map</span><span className="rounded-full bg-brand-stone-100 px-3 py-1 text-brand-stone-700"><Shield className="mr-1 inline h-3 w-3" /> Assignment scoped</span></div>
        </section>
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {loading ? <div className="rounded-3xl bg-white p-8 text-center text-brand-stone-600"><Loader2 className="mr-2 inline h-5 w-5 animate-spin" /> Loading read-only map…</div> : !error && <>
          <section className="grid gap-3 md:grid-cols-5">
            {[['Parts', parts.length], ['Relationships', relationships.length], ['Suggested Parts', suggestions.parts.length], ['Accepted parts', suggestions.acceptedCount + suggestions.mergedCount], ['Dismissed suggestions', suggestions.dismissedCount]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-slate-950"><p className="text-2xl font-bold text-brand-stone-900 dark:text-slate-100">{value}</p><p className="text-xs text-brand-stone-500 dark:text-slate-400">{label}</p></div>)}
          </section>
          <p className="text-xs text-brand-stone-500 dark:text-slate-400">Latest map update: {latestUpdated ? new Date(latestUpdated).toLocaleString() : 'No saved map updates yet'}</p>
          <div className="grid gap-5 xl:grid-cols-[1fr,380px]">
            <section className="min-h-[560px] rounded-3xl border border-brand-stone-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
              <InnerSystemMapCanvas parts={mappedParts} relationships={relationships} selectedPartId={null} onSelectPart={() => {}} label="Read-only client map" />
              <p className="mt-3 text-xs text-brand-stone-500 dark:text-slate-400">Dragging, editing, deleting, and saving are disabled in this Advisor view.</p>
            </section>
            <aside className="space-y-4">
              <section className="rounded-3xl border border-brand-stone-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                <h2 className="flex items-center gap-2 font-semibold text-brand-stone-900 dark:text-slate-100"><ClipboardList className="h-4 w-4" /> Session discussion ideas</h2>
                <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-brand-stone-50 p-3 text-xs text-brand-stone-700 dark:bg-slate-900 dark:text-slate-300">{discussionQuestions}</pre>
                <button type="button" onClick={async () => { await navigator.clipboard?.writeText(discussionQuestions); setCopied(true); }} className="btn-sanctuary-secondary mt-3 text-xs"><Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy session discussion questions'}</button>
              </section>
              <PartSuggestionPanel suggestions={suggestions.parts} relationshipSuggestions={suggestions.relationships} dismissedSuggestions={suggestions.dismissedParts} dismissedRelationshipSuggestions={suggestions.dismissedRelationships} existingParts={parts} readOnly />
            </aside>
          </div>
        </>}
      </div>
    </div>
  );
}
