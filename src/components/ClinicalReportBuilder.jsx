import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckSquare, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadAssignedClients } from '../lib/therapistAssignments';
import ClinicalReportPreview from './ClinicalReportPreview';

const SECTION_OPTIONS = [
  ['includeTreatmentPlans', 'Treatment Plan Goals', 'Active/completed goals, objectives, interventions, target parts/wounds, and review date.'],
  ['includeTaggedNotes', 'Tagged Clinical Notes', 'Note date/type, clinical summary, tagged parts, and tagged treatment goals.'],
  ['includeSessionAgendas', 'Session Agendas', 'Topics, active parts, stuck points, goals, mood/stress, safety-related content, and review status.'],
  ['includeAssignedHomework', 'Assigned Homework', 'Module title, status, assigned/completed/reviewed dates, and therapist feedback.'],
  ['includeParts', 'Parts Summary', 'Part names plus lightweight roles, burdens, and status.'],
  ['includeMoodEntries', 'Mood Summary', 'Recent mood and energy values in a simple table.'],
  ['includeJournals', 'Journal Excerpts', 'Default-off client journal titles and truncated excerpts.'],
  ['includeHealingTimeline', 'Healing Timeline Summary', 'Optional client-safe milestones from goals, homework, and parts status; excludes therapist notes.'],
  ['includeAnalyticsSummary', 'Analytics Summary', 'Optional compact therapist analytics summary without chart libraries.'],
  ['includeAiSessionSummary', 'AI Session Prep Summary', 'Default-off placeholder for existing on-demand AI prep summaries; does not auto-generate AI content.'],
  ['includeFullNoteText', 'Full Clinical Note Text', 'Default-off full note body excerpts. Use only when clinically appropriate.']
];

const DEFAULT_SECTIONS = {
  includeTreatmentPlans: true,
  includeTaggedNotes: true,
  includeSessionAgendas: true,
  includeAssignedHomework: true,
  includeParts: true,
  includeMoodEntries: true,
  includeJournals: false,
  includeHealingTimeline: false,
  includeAnalyticsSummary: false,
  includeAiSessionSummary: false,
  includeFullNoteText: false
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function sixMonthsAgoIso() {
  const date = new Date();
  date.setMonth(date.getMonth() - 6);
  return date.toISOString().slice(0, 10);
}

async function getAuthToken() {
  try {
    const clerk = window.Clerk;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    console.warn('Unable to read Clerk token for report generation:', error);
  }
  return null;
}

export default function ClinicalReportBuilder() {
  const therapist = clientAuth.getCurrentClient();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [reportType, setReportType] = useState('clinical_summary');
  const [dateRangeStart, setDateRangeStart] = useState(sixMonthsAgoIso());
  const [dateRangeEnd, setDateRangeEnd] = useState(todayIso());
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadClients() {
      if (!therapist?.id) {
        setIsLoadingClients(false);
        return;
      }
      setIsLoadingClients(true);
      const rows = await loadAssignedClients(therapist.id, 'id, name, user_role, status, created_at');
      if (!isMounted) return;
      const activeClients = (rows || []).filter((client) => client.user_role === 'client');
      setClients(activeClients);
      setSelectedClientId((current) => current || activeClients[0]?.id || '');
      setIsLoadingClients(false);
    }
    loadClients();
    return () => {
      isMounted = false;
    };
  }, [therapist?.id]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const effectiveSections = useMemo(() => {
    if (reportType !== 'client_progress_summary') return sections;
    return {
      ...sections,
      includeTaggedNotes: false,
      includeJournals: false,
      includeAiSessionSummary: false,
      includeAnalyticsSummary: false,
      includeFullNoteText: false
    };
  }, [reportType, sections]);

  const toggleSection = (key) => {
    setSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const generatePreview = async () => {
    if (!selectedClientId) {
      setError('Select an assigned client before generating a report.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setReport(null);

    try {
      const token = await getAuthToken();
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          reportType,
          dateRangeStart: dateRangeStart || null,
          dateRangeEnd: dateRangeEnd || null,
          sections: effectiveSections,
          format: 'html_print'
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Unable to generate report.');
      }
      setReport(payload.data);
    } catch (err) {
      setError(err.message || 'Unable to generate report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const printCurrentReport = () => {
    if (!report?.html) return;
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return;
    printWindow.document.write(report.html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-brand-gold-100 via-white to-brand-emerald-50 p-6 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-gold-800 dark:bg-slate-800 dark:text-brand-gold-300">
            <ShieldCheck className="h-4 w-4" />
            Assignment-secured reporting
          </div>
          <h1 className="mt-3 text-3xl font-serif font-semibold text-brand-stone-950 dark:text-white">Clinical Report Builder</h1>
          <p className="mt-2 max-w-3xl text-sm text-brand-stone-700 dark:text-slate-300">Build a modular therapist-facing report from assigned-client data, save audit metadata, and export with the browser print dialog. Raw report HTML is returned for preview and is not stored in the audit table.</p>
        </div>
        <button
          type="button"
          onClick={printCurrentReport}
          disabled={!report?.html}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-gold-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-gold-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          Print / Export
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-brand-stone-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-brand-gold-700" />
            <h2 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">Report Setup</h2>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-brand-stone-700 dark:text-slate-300">Assigned client</span>
              <select
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                disabled={isLoadingClients}
                className="w-full rounded-2xl border border-brand-stone-300 bg-white px-4 py-3 text-brand-stone-900 focus:border-brand-gold-600 focus:outline-none focus:ring-2 focus:ring-brand-gold-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">{isLoadingClients ? 'Loading assigned clients…' : 'Select a client'}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name || 'Unnamed client'}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-brand-stone-700 dark:text-slate-300">Report type</span>
              <select
                value={reportType}
                onChange={(event) => setReportType(event.target.value)}
                className="w-full rounded-2xl border border-brand-stone-300 bg-white px-4 py-3 text-brand-stone-900 focus:border-brand-gold-600 focus:outline-none focus:ring-2 focus:ring-brand-gold-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="clinical_summary">Clinical Summary</option>
                <option value="client_progress_summary">Client-Safe Progress Summary</option>
              </select>
            </label>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-stone-700 dark:text-slate-300">
                <Calendar className="h-4 w-4" />
                Date range
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(event) => setDateRangeStart(event.target.value)}
                  className="rounded-2xl border border-brand-stone-300 bg-white px-4 py-3 text-brand-stone-900 focus:border-brand-gold-600 focus:outline-none focus:ring-2 focus:ring-brand-gold-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(event) => setDateRangeEnd(event.target.value)}
                  className="rounded-2xl border border-brand-stone-300 bg-white px-4 py-3 text-brand-stone-900 focus:border-brand-gold-600 focus:outline-none focus:ring-2 focus:ring-brand-gold-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-brand-stone-800 dark:text-slate-200">Sections</h3>
              <div className="space-y-3">
                {SECTION_OPTIONS.map(([key, label, description]) => {
                  const disabled = reportType === 'client_progress_summary' && ['includeTaggedNotes', 'includeJournals', 'includeAiSessionSummary', 'includeAnalyticsSummary', 'includeFullNoteText'].includes(key);
                  return (
                    <label key={key} className={`flex gap-3 rounded-2xl border p-3 transition ${disabled ? 'border-brand-stone-100 bg-brand-stone-50 opacity-60 dark:border-slate-800 dark:bg-slate-950' : 'border-brand-stone-200 hover:border-brand-gold-300 dark:border-slate-700 dark:hover:border-brand-gold-700'}`}>
                      <input
                        type="checkbox"
                        checked={Boolean(effectiveSections[key])}
                        disabled={disabled}
                        onChange={() => toggleSection(key)}
                        className="mt-1 h-4 w-4 rounded border-brand-stone-300 text-brand-gold-700 focus:ring-brand-gold-600"
                      />
                      <span>
                        <span className="block text-sm font-medium text-brand-stone-900 dark:text-slate-100">{label}</span>
                        <span className="block text-xs leading-5 text-brand-stone-600 dark:text-slate-400">{description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {selectedClient && (
              <div className="rounded-2xl bg-brand-stone-50 p-3 text-xs text-brand-stone-600 dark:bg-slate-800 dark:text-slate-400">
                Selected client: <span className="font-semibold text-brand-stone-900 dark:text-slate-100">{selectedClient.name || selectedClient.id}</span>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</div>
            )}

            {report?.reportId && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                Audit metadata saved. Report ID: {report.reportId}
              </div>
            )}

            <button
              type="button"
              onClick={generatePreview}
              disabled={isGenerating || isLoadingClients || !selectedClientId}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gold-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-gold-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {isGenerating ? 'Generating securely…' : 'Generate Preview'}
            </button>
          </div>
        </section>

        <ClinicalReportPreview html={report?.html} title={report?.title || 'Clinical report preview'} />
      </div>
    </div>
  );
}
