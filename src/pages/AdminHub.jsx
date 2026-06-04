import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertTriangle, BookOpen, ClipboardCheck, FileText, Heart, Loader2, RefreshCw, Shield, Sparkles, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

export default function AdminHub() {
  const { theme } = useTheme();
  const currentUser = clientAuth.getCurrentClient();
  const role = currentUser?.user_role;
  const isAllowed = role === 'admin' || role === 'supervisor';
  const [therapists, setTherapists] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [expandedTherapistId, setExpandedTherapistId] = useState(null);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [newTherapistId, setNewTherapistId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const textPrimary = theme.isDark ? 'text-white' : 'text-slate-950';
  const textSecondary = theme.isDark ? 'text-slate-300' : 'text-slate-600';
  const cardBg = theme.isDark ? 'bg-slate-900/70 border-slate-700' : 'bg-white border-slate-200';

  const caseloads = useMemo(() => {
    return assignments.reduce((acc, assignment) => {
      const key = assignment.therapist_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(assignment);
      return acc;
    }, {});
  }, [assignments]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: therapistRows, error: therapistError }, { data: assignmentRows, error: assignmentError }] = await Promise.all([
        supabase.from('ifs_clients').select('id, name, email, user_role').in('user_role', ['therapist', 'advisor', 'admin', 'supervisor']).order('name', { ascending: true }),
        supabase.from('ifs_therapist_clients').select('*').eq('status', 'active').order('assigned_at', { ascending: false }),
      ]);
      if (therapistError) throw therapistError;
      if (assignmentError) throw assignmentError;
      setTherapists(therapistRows || []);
      setAssignments(assignmentRows || []);
      if (!expandedTherapistId && therapistRows?.length) setExpandedTherapistId(therapistRows[0].id);
    } catch (err) {
      setError(err.message || 'Unable to load group practice data.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAllowed) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed]);

  if (!isAllowed) return <Navigate to="/" replace />;

  const openReassign = (assignment) => {
    setReassignTarget(assignment);
    setNewTherapistId('');
  };

  const reassignClient = async () => {
    if (!reassignTarget || !newTherapistId) return;
    const nextTherapist = therapists.find(therapist => therapist.id === newTherapistId);
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase
      .from('ifs_therapist_clients')
      .update({
        therapist_id: newTherapistId,
        therapist_name: nextTherapist?.name || null,
        assigned_at: new Date().toISOString(),
      })
      .eq('therapist_id', reassignTarget.therapist_id)
      .eq('client_id', reassignTarget.client_id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message || 'Unable to reassign client.');
      return;
    }
    setReassignTarget(null);
    await loadData();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-amber-600 p-3 text-white shadow-lg">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${textPrimary}`}>Advisor Admin Hub</h1>
            <p className={`text-sm ${textSecondary}`}>Flow-based oversight for Advisor assignments, curriculum support, and client progress.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/my-ifs" className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${cardBg} ${textSecondary}`}>
            <Heart className="h-4 w-4 text-amber-600" />
            My IFS Work
          </Link>
          <button type="button" onClick={loadData} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${cardBg} ${textSecondary}`}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>


      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { to: '/curriculum', label: 'Curriculum & Assessments', desc: 'Review the IFS Path, learning supports, and curriculum tools.', icon: BookOpen },
          { to: '/assessment-builder', label: 'Assessment Generator', desc: 'Create or manage assessment experiences.', icon: ClipboardCheck },
          { to: '/advisor-homework', label: 'Practice Generator', desc: 'Open the Assigned IFS Practice Generator.', icon: Sparkles },
          { to: '/advisor-reports', label: 'Insights & Reports', desc: 'Review client progress and Advisor reports.', icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.to} className={`rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${cardBg}`}>
              <Icon className="mb-4 h-6 w-6 text-amber-600" />
              <h2 className={`font-semibold ${textPrimary}`}>{item.label}</h2>
              <p className={`mt-1 text-sm ${textSecondary}`}>{item.desc}</p>
            </Link>
          );
        })}
      </section>

      <section className={`mb-6 rounded-3xl border p-5 ${cardBg}`}>
        <p className={`text-xs font-semibold uppercase tracking-[0.25em] ${textSecondary}`}>Overview</p>
        <h2 className={`mt-1 text-2xl font-serif ${textPrimary}`}>Advisor assignment flow</h2>
        <p className={`mt-2 text-sm ${textSecondary}`}>Use this hub to keep clients connected to an Advisor, then use Curriculum & Assessments, the Practice Generator, Review Queue, and Insights & Reports for day-to-day support.</p>
      </section>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className={`rounded-3xl border p-10 text-center ${cardBg}`}>
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-amber-600" />
          <p className={textSecondary}>Loading Advisors and caseloads...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {therapists.map((therapist) => {
            const caseload = caseloads[therapist.id] || [];
            const expanded = expandedTherapistId === therapist.id;
            return (
              <section key={therapist.id} className={`overflow-hidden rounded-3xl border ${cardBg} shadow-sm`}>
                <button type="button" onClick={() => setExpandedTherapistId(expanded ? null : therapist.id)} className="flex w-full items-center justify-between gap-3 p-5 text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-100">
                      {therapist.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <h2 className={`font-semibold ${textPrimary}`}>{therapist.name || 'Unnamed Advisor'}</h2>
                      <p className={`text-xs ${textSecondary}`}>{therapist.email || 'Advisor'} · {caseload.length} active client{caseload.length === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                  <Users className={`h-5 w-5 ${textSecondary}`} />
                </button>

                {expanded && (
                  <div className="border-t border-slate-200 p-5 dark:border-slate-700">
                    {caseload.length === 0 ? (
                      <p className={`rounded-2xl bg-slate-50 p-4 text-sm ${textSecondary} dark:bg-slate-800/60`}>No active clients assigned.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {caseload.map((assignment) => (
                          <div key={`${assignment.therapist_id}-${assignment.client_id}`} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className={`font-medium ${textPrimary}`}>{assignment.client_name || assignment.client_id}</p>
                              <p className={`text-xs ${textSecondary}`}>Assigned {assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : 'date unknown'}</p>
                            </div>
                            <button type="button" onClick={() => openReassign(assignment)} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                              Reassign
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {reassignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${cardBg}`}>
            <h2 className={`mb-2 text-xl font-bold ${textPrimary}`}>Reassign client</h2>
            <p className={`mb-4 text-sm ${textSecondary}`}>Move {reassignTarget.client_name || reassignTarget.client_id} to another Advisor.</p>
            <select value={newTherapistId} onChange={(event) => setNewTherapistId(event.target.value)} className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
              <option value="">Choose Advisor...</option>
              {therapists.filter(therapist => therapist.id !== reassignTarget.therapist_id).map((therapist) => (
                <option key={therapist.id} value={therapist.id}>{therapist.name || therapist.email}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReassignTarget(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
              <button type="button" onClick={reassignClient} disabled={!newTherapistId || saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
