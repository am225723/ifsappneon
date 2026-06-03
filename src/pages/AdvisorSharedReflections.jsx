import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Eye, Lock, RefreshCw, Share2, ShieldCheck, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadAssignedClients } from '../lib/therapistAssignments';
import { LIFE_REFLECTION_TYPES, getSharedLifeIntegrationReflectionForAdvisor, loadSharedLifeIntegrationReflectionsForAdvisor } from '../lib/lifeIntegration';

const fieldLabels = [
  ['situation', 'Situation'],
  ['part_noticed', 'Part noticed'],
  ['body_sensation', 'Body sensation'],
  ['emotion', 'Emotion'],
  ['need_or_message', 'Need or message'],
  ['self_energy_response', 'Self-energy response'],
  ['next_step', 'Next step']
];

function DetailField({ label, value }) {
  return (
    <div className="rounded-2xl border border-brand-stone-100 bg-white/75 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-stone-500 dark:text-slate-500">{label}</p>
      <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${value ? 'text-brand-stone-800 dark:text-slate-200' : 'text-brand-stone-400 dark:text-slate-500'}`}>{value || 'Not added'}</p>
    </div>
  );
}

export default function AdvisorSharedReflections() {
  const advisor = clientAuth.getCurrentClient();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [reflections, setReflections] = useState([]);
  const [selectedReflection, setSelectedReflection] = useState(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingReflections, setLoadingReflections] = useState(false);
  const [error, setError] = useState('');

  const selectedClient = useMemo(() => clients.find((client) => client.id === selectedClientId) || null, [clients, selectedClientId]);

  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      const rows = advisor?.id ? await loadAssignedClients(advisor.id, 'id, name, email, status, user_role') : [];
      setClients(rows || []);
      setSelectedClientId((current) => current || rows?.[0]?.id || '');
      setLoadingClients(false);
    };
    loadClients();
  }, [advisor?.id]);

  const loadReflections = useCallback(async () => {
    if (!selectedClientId) return;
    setLoadingReflections(true);
    setError('');
    const { data, error: loadError } = await loadSharedLifeIntegrationReflectionsForAdvisor(selectedClientId);
    if (loadError) {
      setError(loadError.message || 'Unable to load shared Life Integration reflections.');
      setReflections([]);
      setSelectedReflection(null);
    } else {
      setReflections(data || []);
      setSelectedReflection((current) => (data || []).find((item) => item.id === current?.id) || (data || [])[0] || null);
    }
    setLoadingReflections(false);
  }, [selectedClientId]);

  useEffect(() => {
    loadReflections();
  }, [loadReflections]);

  const openReflection = async (reflection) => {
    setError('');
    const { data, error: getError } = await getSharedLifeIntegrationReflectionForAdvisor(reflection.id);
    if (getError) {
      setError(getError.message || 'Unable to open this shared reflection.');
      return;
    }
    setSelectedReflection(data);
  };

  return (
    <main className="min-h-screen bg-brand-sanctuary px-4 py-8 dark:bg-brand-midnight sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link to="/therapist-dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-stone-600 transition hover:text-brand-gold-700 dark:text-slate-400 dark:hover:text-brand-gold-500">
          <ArrowLeft className="h-4 w-4" /> Back to Advisor Workspace
        </Link>

        <section className="rounded-[2rem] border border-brand-gold-100 bg-gradient-to-br from-white via-brand-gold-50/60 to-brand-emerald-50 p-8 shadow-2xl shadow-brand-gold-500/10 dark:border-slate-800 dark:from-brand-cardDark dark:via-brand-gold-950/20 dark:to-brand-emerald-950/20">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-emerald-700 dark:text-brand-emerald-100">Advisor review</p>
          <h1 className="mt-3 text-4xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">Shared Life Integration Reflections</h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-brand-stone-600 dark:text-slate-400">Reflections clients have chosen to share from their IFS in Daily Life practices.</p>
          <p className="mt-4 inline-flex items-start gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm leading-relaxed text-brand-stone-600 shadow-sm dark:bg-slate-900/60 dark:text-slate-400"><Lock className="mt-0.5 h-4 w-4 shrink-0" /> This view only includes client-chosen shared reflections for actively assigned clients. Private reflections and archived reflections are not shown here.</p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-5">
            <div className="soft-card p-5">
              <label className="block">
                <span className="text-sm font-semibold text-brand-stone-800 dark:text-slate-200">Assigned client</span>
                <select value={selectedClientId} onChange={(event) => { setSelectedClientId(event.target.value); setSelectedReflection(null); }} className="mt-2 w-full rounded-2xl border border-brand-stone-200 bg-white/80 px-4 py-3 text-sm text-brand-stone-800 outline-none transition focus:border-brand-gold-400 focus:ring-2 focus:ring-brand-gold-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
                  {loadingClients && <option>Loading assigned clients…</option>}
                  {!loadingClients && clients.length === 0 && <option>No assigned clients</option>}
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.name || client.email || 'Assigned client'}</option>)}
                </select>
              </label>
              {selectedClient && <p className="mt-3 inline-flex items-center gap-2 text-xs text-brand-stone-500 dark:text-slate-500"><User className="h-3.5 w-3.5" /> Viewing shared reflections from {selectedClient.name || selectedClient.email || 'assigned client'}</p>}
              <button onClick={loadReflections} disabled={!selectedClientId || loadingReflections} className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-stone-200 px-4 py-2 text-xs font-bold text-brand-stone-700 transition hover:bg-brand-stone-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
            </div>

            {error && <div className="rounded-3xl bg-red-50 p-5 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</div>}

            <div className="space-y-3">
              {loadingReflections && <div className="soft-card p-5 text-sm text-brand-stone-600 dark:text-slate-400">Loading shared reflections…</div>}
              {!loadingReflections && reflections.length === 0 && (
                <div className="soft-card p-8 text-center">
                  <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-brand-emerald-700 dark:text-brand-emerald-100" />
                  <h2 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">No shared reflections for this client</h2>
                  <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">Clients choose whether to share specific Life Integration reflections. This does not imply there are no private reflections.</p>
                </div>
              )}
              {reflections.map((reflection) => {
                const active = selectedReflection?.id === reflection.id;
                return (
                  <button key={reflection.id} onClick={() => openReflection(reflection)} className={`w-full rounded-3xl border p-5 text-left transition ${active ? 'border-brand-emerald-300 bg-brand-emerald-50/70 dark:border-brand-emerald-900 dark:bg-brand-emerald-950/20' : 'border-brand-stone-100 bg-white/80 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-700 dark:text-brand-gold-500">{LIFE_REFLECTION_TYPES[reflection.reflection_type] || 'Life Integration reflection'}</p>
                        <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{reflection.situation || reflection.part_noticed || reflection.next_step || 'Shared reflection'}</h3>
                      </div>
                      <Eye className="h-4 w-4 shrink-0 text-brand-stone-400" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-brand-stone-500 dark:text-slate-500">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {new Date(reflection.created_at).toLocaleDateString()}</span>
                      {(reflection.linked_part_name || reflection.linked_part_alias) && <span>Linked part: {reflection.linked_part_name || reflection.linked_part_alias}</span>}
                      <span className="inline-flex items-center gap-1 text-brand-emerald-700 dark:text-brand-emerald-100"><Share2 className="h-3.5 w-3.5" /> Shared by client</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="soft-card p-6">
            {!selectedReflection ? (
              <div className="flex min-h-[24rem] items-center justify-center text-center text-sm text-brand-stone-500 dark:text-slate-500">Select a shared reflection to review client-entered IFS practice details.</div>
            ) : (
              <div>
                <div className="mb-5 flex flex-col gap-3 border-b border-brand-stone-100 pb-5 dark:border-slate-800 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-emerald-700 dark:text-brand-emerald-100">Client-chosen shared reflection</p>
                    <h2 className="mt-2 text-2xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">{LIFE_REFLECTION_TYPES[selectedReflection.reflection_type] || 'Life Integration reflection'}</h2>
                    <p className="mt-2 text-sm text-brand-stone-500 dark:text-slate-500">Created {new Date(selectedReflection.created_at).toLocaleString()}</p>
                    {(selectedReflection.linked_part_name || selectedReflection.linked_part_alias) && <p className="mt-1 text-sm text-brand-stone-500 dark:text-slate-500">Linked part: {selectedReflection.linked_part_name || selectedReflection.linked_part_alias}</p>}
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-emerald-700 dark:bg-brand-emerald-950/30 dark:text-brand-emerald-100"><Share2 className="h-3.5 w-3.5" /> Shared</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {fieldLabels.map(([name, label]) => <DetailField key={name} label={label} value={selectedReflection[name]} />)}
                </div>
                <div className="mt-5 rounded-3xl bg-brand-gold-50/70 p-5 text-sm leading-relaxed text-brand-stone-600 dark:bg-brand-gold-950/20 dark:text-slate-400">
                  Shared reflections are client-chosen support material for IFS conversation. This view does not include private reflections, archived reflections, Advisor notes, or clinical interpretations.
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
