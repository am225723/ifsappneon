import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, BarChart3, BookOpen, CalendarCheck, ClipboardCheck, FileText, HeartPulse, Loader2, Target, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadAssignedClients } from '../lib/therapistAssignments';
import { loadClientAnalytics } from '../lib/clientAnalytics';
import MetricCard from '../components/analytics/MetricCard';
import SimpleLineChart from '../components/analytics/SimpleLineChart';
import SimpleBarChart from '../components/analytics/SimpleBarChart';
import ProgressRing from '../components/analytics/ProgressRing';
import EmptyAnalyticsState from '../components/analytics/EmptyAnalyticsState';

const RANGES = ['1M', '3M', '6M', '1Y', 'ALL'];

function Section({ title, icon: Icon, children }) {
  return (
    <section className="rounded-3xl border border-brand-stone-200/80 bg-white/85 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/75">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-brand-stone-900 dark:text-white">
        {Icon && <Icon className="h-5 w-5 text-brand-gold-600" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

function statusObjectToBars(counts = {}) {
  return Object.entries(counts || {}).map(([label, count]) => ({ label, count }));
}

export default function LongitudinalAnalytics() {
  const { theme } = useTheme();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [range, setRange] = useState('3M');
  const [analytics, setAnalytics] = useState(null);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadClients() {
      setClientsLoading(true);
      try {
        const therapist = clientAuth.getCurrentClient();
        const rows = therapist?.id ? await loadAssignedClients(therapist.id, 'id, name, email, status, created_at, user_role') : [];
        if (!active) return;
        setClients(rows || []);
        setSelectedClientId((current) => current || rows?.[0]?.id || '');
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load assigned clients.');
      } finally {
        if (active) setClientsLoading(false);
      }
    }
    loadClients();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadAnalytics() {
      if (!selectedClientId) {
        setAnalytics(null);
        return;
      }
      setAnalyticsLoading(true);
      setError('');
      const { data, error: loadError } = await loadClientAnalytics({ clientId: selectedClientId, range });
      if (!active) return;
      if (loadError) {
        setAnalytics(null);
        setError(loadError);
      } else {
        setAnalytics(data);
      }
      setAnalyticsLoading(false);
    }
    loadAnalytics();
    return () => { active = false; };
  }, [selectedClientId, range]);

  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const dataAvailability = analytics?.dataAvailability || {};
  const treatmentBars = useMemo(() => statusObjectToBars(analytics?.treatmentPlanSummary?.statusCounts), [analytics]);
  const agendaBars = useMemo(() => statusObjectToBars(analytics?.agendaSummary?.statusCounts), [analytics]);
  const partStatusBars = useMemo(() => statusObjectToBars(analytics?.partsSummary?.byStatus), [analytics]);
  const partRoleBars = useMemo(() => statusObjectToBars(analytics?.partsSummary?.byRole), [analytics]);

  return (
    <main className={`min-h-screen px-4 py-6 sm:px-6 lg:px-8 ${theme.isDark ? 'bg-brand-midnight' : 'bg-brand-sanctuary'}`}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-brand-stone-200/80 bg-white/85 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/75 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link to="/therapist-dashboard" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-brand-stone-600 hover:text-brand-gold-700 dark:text-slate-400 dark:hover:text-brand-gold-400">
              <ArrowLeft className="h-4 w-4" /> Therapist dashboard
            </Link>
            <h1 className="flex items-center gap-3 text-3xl font-serif font-bold text-brand-stone-900 dark:text-white">
              <BarChart3 className="h-8 w-8 text-brand-gold-600" /> Longitudinal Analytics
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-brand-stone-600 dark:text-slate-400">
              Therapist-facing trends from assigned-client data only. This view avoids raw journal and note content and does not generate AI interpretations.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto] lg:min-w-[520px]">
            <label className="text-sm font-medium text-brand-stone-700 dark:text-slate-300">
              Assigned client
              <select
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                disabled={clientsLoading || clients.length === 0}
                className="mt-1 w-full rounded-2xl border border-brand-stone-200 bg-white px-4 py-3 text-brand-stone-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-gold-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {clients.length === 0 && <option value="">No assigned clients</option>}
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name || client.email || client.id}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-2">
              {RANGES.map((option) => (
                <button
                  key={option}
                  onClick={() => setRange(option)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${range === option ? 'bg-brand-gold-600 text-white shadow-sm' : 'bg-brand-stone-100 text-brand-stone-700 hover:bg-brand-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(clientsLoading || analyticsLoading) && (
          <div className="flex items-center gap-2 rounded-2xl border border-brand-stone-200 bg-white/80 p-4 text-brand-stone-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading analytics…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        )}

        {!clientsLoading && clients.length === 0 && <EmptyAnalyticsState title="No assigned clients" message="Longitudinal analytics only loads active assigned clients for the signed-in therapist." />}

        {analytics && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <MetricCard icon={HeartPulse} label="Mood entries" value={analytics.summary?.moodEntries || 0} detail={selectedClient?.name || 'Selected client'} tone="rose" />
              <MetricCard icon={FileText} label="Journal entries" value={analytics.summary?.journalEntries || 0} detail={`Range: ${analytics.range}`} tone="blue" />
              <MetricCard icon={Users} label="Parts mapped" value={analytics.summary?.partsTotal || 0} detail={`${analytics.partsSummary?.active || 0} active`} tone="emerald" />
              <MetricCard icon={ClipboardCheck} label="Homework completion" value={`${analytics.summary?.homeworkCompletionRate || 0}%`} detail={`${analytics.homeworkSummary?.completedCount || 0}/${analytics.homeworkSummary?.totalAssigned || 0} completed`} tone="amber" />
              <MetricCard icon={Target} label="Active goals" value={analytics.summary?.activeTreatmentGoals || 0} detail={`${analytics.treatmentPlanSummary?.goalsDueForReviewWithin30Days || 0} due for review`} tone="emerald" />
              <MetricCard icon={CalendarCheck} label="Agendas" value={analytics.summary?.agendasSubmitted || 0} detail={`${analytics.agendaSummary?.reviewedAgendas || 0} reviewed`} tone="slate" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Section title="Mood, stress, and energy trends" icon={Activity}>
                <div className="space-y-6">
                  <SimpleLineChart data={analytics.moodTrend || []} valueKey="mood" color="#d97706" title="Mood trend" min={1} max={10} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SimpleLineChart data={analytics.energyTrend || []} valueKey="energy" color="#059669" title="Energy trend" min={1} max={10} />
                    {analytics.stressTrend?.length ? <SimpleLineChart data={analytics.stressTrend} valueKey="stress" color="#e11d48" title="Stress trend" min={1} max={10} /> : <EmptyAnalyticsState title="No stress trend data" message="The current mood schema does not store a numeric stress field." />}
                  </div>
                </div>
              </Section>

              <Section title="Homework follow-through" icon={ClipboardCheck}>
                {dataAvailability.hasHomeworkData ? (
                  <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
                    <ProgressRing value={analytics.homeworkSummary?.completionPercentage || 0} label="Completed" />
                    <SimpleBarChart title="Homework counts" data={[
                      { label: 'Assigned', count: analytics.homeworkSummary?.totalAssigned || 0 },
                      { label: 'In progress', count: analytics.homeworkSummary?.inProgressCount || 0 },
                      { label: 'Completed', count: analytics.homeworkSummary?.completedCount || 0 },
                      { label: 'Reviewed', count: analytics.homeworkSummary?.reviewedCount || 0 }
                    ]} />
                  </div>
                ) : <EmptyAnalyticsState title="No assigned homework in range" />}
              </Section>

              <Section title="Journal engagement" icon={BookOpen}>
                {dataAvailability.hasJournalData ? (
                  <>
                    <SimpleBarChart data={analytics.journalEngagement || []} title="Journal entries per week" />
                    <p className="mt-4 text-sm text-brand-stone-600 dark:text-slate-400">Most recent entry: {analytics.journalSummary?.mostRecentEntryDate ? new Date(analytics.journalSummary.mostRecentEntryDate).toLocaleDateString() : 'None'}</p>
                  </>
                ) : <EmptyAnalyticsState title="No journal entries in range" message="Only counts and dates are shown; raw journal text is not returned by this analytics endpoint." />}
              </Section>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Section title="Session agenda engagement" icon={CalendarCheck}>
                {dataAvailability.hasAgendaData ? <SimpleBarChart data={agendaBars} title="Agenda status counts" /> : <EmptyAnalyticsState title="No session agendas in range" />}
                {analytics.agendaSummary?.averageStressLevel !== null && analytics.agendaSummary?.averageStressLevel !== undefined && <p className="mt-4 text-sm text-brand-stone-600 dark:text-slate-400">Average agenda stress: {analytics.agendaSummary.averageStressLevel}</p>}
              </Section>

              <Section title="Treatment plan progress" icon={Target}>
                {dataAvailability.hasTreatmentPlanData ? <SimpleBarChart data={treatmentBars} title="Treatment goal status counts" color="bg-blue-500" /> : <EmptyAnalyticsState title="No treatment plan goals" />}
              </Section>

              <Section title="Parts summary" icon={Users}>
                {dataAvailability.hasPartsData ? (
                  <div className="space-y-5">
                    <SimpleBarChart data={partStatusBars} title="Parts by status" color="bg-emerald-500" />
                    <SimpleBarChart data={partRoleBars} title="Parts by role" color="bg-amber-500" />
                  </div>
                ) : <EmptyAnalyticsState title="No mapped parts" />}
              </Section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
