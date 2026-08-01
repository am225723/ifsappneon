import { useEffect, useRef, useState } from 'react';
import { buildView, WorkspaceShell, EmptyCaseload, WorkspaceStatus } from './AdvisorWorkspaceView.jsx';
import {
  WOUND_META, LIGHT, DARK, CLIENTS, TEMPLATE_OPTIONS, PRACTICE_TYPE_META, PLAN_PHASES,
  DOC_SOURCES_DEFAULT, NAV_CONFIG,
} from './advisorWorkspaceData.js';
import {
  loadWorkspaceCaseload, loadWorkspaceCaseloadWithStatus, loadWorkspaceClientDetail, sendWorkspaceMessage, persistTherapistNote,
  claimWorkspaceClient, mergeCaseloadRefresh, generateWorkspaceReport, loadWorkspaceReports,
  loadWorkspaceNotifications, markWorkspaceNotificationRead, markAllWorkspaceNotificationsRead,
  loadWorkspaceLifeReflections, buildClientReportHtml, markWorkspaceAgendaReviewed, loadWorkspaceHealingTimeline,
  loadCaseloadRiskAlerts, loadWorkspaceCurriculumReflections, loadWorkspaceSelfEnergyTrend, mapNoteEntry,
  markWorkspaceHomeworkReviewed, archiveWorkspaceHomework, refreshWorkspaceHomeworkForClient,
  loadWorkspaceUnburdeningRecord, loadWorkspacePartSuggestions, generateWorkspaceModuleInsights,
  loadWorkspaceActiveLiveSessions, loadWorkspaceCoTherapyProgress, loadWorkspacePersonalizedCurriculum,
  loadWorkspaceTasks, createWorkspaceTask, toggleWorkspaceTask,
  deactivateWorkspaceClientAssignment, reactivateWorkspaceClientAssignment, loadWorkspaceDischargedClients,
} from '../lib/advisorWorkspaceLoader.js';
import { loadAdvisorSessionSnapshot } from '../lib/unifiedGuidance.js';
import { generateSessionPrepSummary } from '../lib/sessionPrepSummary.js';
import { pauseLiveActivity, resumeLiveActivity, endLiveSession as endLiveSessionApi } from '../lib/liveSession.js';

const CASELOAD_REFRESH_MS = 45000;

function todayIso() { return new Date().toISOString().slice(0, 10); }
function sixMonthsAgoIso() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}
function addDaysIso(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const INITIAL_STATE = {
  baseClients: CLIENTS,
  activeTab: 'overview', isDark: false, expandedGroups: {}, viewMode: 'command',
  selectedClientId: 'c1', activeClientTab: 'overview',
  search: '', filterWound: 'all', reviewedIds: {}, sessionPrepOpenId: null,
  noteDraft: { clientId: 'c1', template: 'none', text: '' }, savedNotes: [],
  homeworkFeedbackDraft: {},
  planClientId: 'c1', practiceForm: { clientId: 'c1', wound: 'abandonment', type: 'journal' },
  generatedPractice: null, assignedPractices: [], assignedLessons: {},
  coTherapyShare: true, coTherapyMessage: '',
  coTherapyThread: [{ author: 'Dr. Patel', text: 'Flagging Jordan’s risk note for joint review before Thursday.', date: 'Yesterday' }],
  reports: [{ title: 'Caseload Summary — June 2026', date: 'Jul 1, 2026' }],
  settingsToggles: { riskAlerts: true, weeklyDigest: true, sessionReminders: false },
  clientMessages: {}, clientMessageDraft: '', activeThreadId: 'c2', readThreads: {},
  safetyOverrides: {}, engagementDismissed: {}, engagementExpanded: {}, partsClientFilter: 'all',
  tasks: [
    { id: 't1', title: 'Sign session note — Maya Chen', clientId: 'c1', priority: 'medium', due: 'Today', status: 'open', category: 'Documentation' },
    { id: 't2', title: 'Review safety plan — Jordan Reyes', clientId: 'c2', priority: 'high', due: 'Today', status: 'open', category: 'Safety' },
    { id: 't3', title: 'Outreach call — Sam Okafor (9 days inactive)', clientId: 'c3', priority: 'medium', due: 'Tomorrow', status: 'open', category: 'Engagement' },
    { id: 't4', title: 'Treatment plan review — Maya Chen', clientId: 'c1', priority: 'low', due: 'Jul 20', status: 'open', category: 'Treatment Plan' },
  ],
  taskFilter: 'open', newTaskTitle: '', newTaskClientId: 'c1',
  docForm: { clientId: 'c1', type: 'clinical_summary', dateRangeStart: sixMonthsAgoIso(), dateRangeEnd: todayIso() },
  docSources: { ...DOC_SOURCES_DEFAULT },
  generatedDoc: null, docGenerating: false, docError: '', clientReports: [], clientReportsLoading: false,
  sessionSnapshot: { loading: false, data: null, error: '' },
  changeSummary: { loading: false, data: null, error: '' },
  moduleInsights: { loading: false, data: null, error: '' },
  lifeReflections: [], lifeReflectionsLoading: false,
  healingTimeline: { loading: false, data: null, error: '' },
  curriculumReflections: [], curriculumReflectionsLoading: false,
  personalizedCurriculum: [], personalizedCurriculumLoading: false,
  selfEnergyTrend: [], selfEnergyTrendLoading: false,
  unburdeningRecord: null, unburdeningRecordLoading: false,
  partSuggestions: null, partSuggestionsLoading: false,
  coTherapyProgress: [], coTherapyProgressLoading: false,
  riskAlerts: [],
  accessOverrides: {}, settingsAccent: 'amber',
  resourceSearch: '', resourceType: 'all', resourceWound: 'all', resourceStage: 'all',
  dischargedClients: [],
  extraClients: [], deletedIds: {},
  showNewClientForm: false, newClientForm: { name: '', email: '', phone: '', sendEmail: true }, newClientResult: null,
  deletingClientId: null, deleteConfirmText: '',
  deletedMessageIdx: {},
  practiceGuidance: '', practiceBatchResults: [],
  liveSessions: [
    { id: 'ls1', clientId: 'c1', status: 'active', activity: 'Body Scan Practice', startedAt: '12 min ago' },
    { id: 'ls2', clientId: 'c3', status: 'paused', activity: 'Parts Dialogue', startedAt: '1 hr ago' },
  ],
  notifications: [
    { id: 'n1', clientId: 'c2', type: 'risk', priority: 'high', title: 'Concerning language detected', message: 'Jordan Reyes’ journal entry contains hopelessness language.', date: '2 hrs ago', read: false },
    { id: 'n2', clientId: 'c1', type: 'practice', priority: 'low', title: 'Practice completed', message: 'Maya Chen completed Module 9: Relationships & Attachment Repair.', date: 'Today', read: false },
    { id: 'n3', clientId: 'c3', type: 'engagement', priority: 'medium', title: 'Inactivity flag', message: 'Sam Okafor has not logged in for 9 days.', date: 'Yesterday', read: true },
    { id: 'n4', clientId: 'c2', type: 'message', priority: 'medium', title: 'New client message', message: 'Jordan Reyes sent a new message.', date: 'Yesterday', read: false },
    { id: 'n5', clientId: 'c1', type: 'assessment', priority: 'low', title: 'Assessment completed', message: 'Maya Chen completed a new PHQ-9 assessment.', date: '2 days ago', read: true },
  ],
};

const FONT_LINK_ID = 'aw-google-fonts';

function AdvisorWorkspace({ isAdmin = false, currentClient = null }) {
  const therapistId = currentClient?.id || null;
  // Demo mode (no therapist context) keeps the seeded sample caseload; with a
  // real therapist we load their actual assigned clients.
  const isDemo = !therapistId;
  const [S, setS] = useState(INITIAL_STATE);
  const [loadPhase, setLoadPhase] = useState(isDemo ? 'ready' : 'loading');
  const detailRequested = useRef(new Set());
  const reportsLoadedFor = useRef(null);
  const notificationsLoaded = useRef(false);
  const lifeReflectionsLoadedFor = useRef(null);
  const healingTimelineLoadedFor = useRef(null);
  const curriculumReflectionsLoadedFor = useRef(null);
  const personalizedCurriculumLoadedFor = useRef(null);
  const selfEnergyTrendLoadedFor = useRef(null);
  const unburdeningRecordLoadedFor = useRef(null);
  const partSuggestionsLoadedFor = useRef(null);
  const coTherapyProgressLoadedFor = useRef(null);
  const riskAlertsLoaded = useRef(false);
  const liveSessionsLoaded = useRef(false);
  const tasksLoaded = useRef(false);
  // Tracks temp ids toggled locally before their create request resolved, so
  // that resolution can apply (and persist) the toggle instead of silently
  // reverting the row to the server's initial 'open' status.
  const pendingToggledTaskIds = useRef(new Set());
  // Generation guard: bumped on therapist change / unmount so stale in-flight
  // detail merges are ignored without cancelling still-valid sibling requests.
  const genRef = useRef(0);
  // Same capture-and-compare pattern as genRef, scoped to document generation:
  // bumped whenever the pending request's context changes (new onGenerateDoc
  // call, form edits, therapist switch, unmount) so a slower response can
  // never overwrite a newer selection's preview.
  const docGenRef = useRef(0);
  // Same pattern again, scoped to the AI Session Snapshot: bumped on every
  // onGenerateSnapshot call, client switch, therapist switch, and unmount.
  const snapshotGenRef = useRef(0);
  // Same pattern again, scoped to the Since Last Session change summary.
  const changeSummaryGenRef = useRef(0);
  // Same pattern again, scoped to AI Module Response Insights.
  const moduleInsightsGenRef = useRef(0);
  // Same pattern again, scoped to caseload-assignment lifecycle mutations
  // (deactivate/reactivate): bumped whenever one starts, so a periodic
  // caseload refresh (or a reactivate's own follow-up refresh) that was
  // already in flight when the mutation landed gets discarded instead of
  // silently re-adding a just-deactivated client or dropping a
  // just-reactivated one back out of view.
  const lifecycleGenRef = useRef(0);
  useEffect(() => () => { genRef.current += 1; docGenRef.current += 1; snapshotGenRef.current += 1; changeSummaryGenRef.current += 1; moduleInsightsGenRef.current += 1; }, []);
  // setState-compatible merge helper (accepts object or updater fn)
  const set = (patch) => setS((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));

  // Load the therapist's real caseload, resetting demo-only collections.
  useEffect(() => {
    if (!therapistId) { setLoadPhase('ready'); return; }
    genRef.current += 1;
    docGenRef.current += 1;
    snapshotGenRef.current += 1;
    changeSummaryGenRef.current += 1;
    moduleInsightsGenRef.current += 1;
    let cancelled = false;
    setLoadPhase('loading');
    detailRequested.current = new Set();
    notificationsLoaded.current = false;
    riskAlertsLoaded.current = false;
    liveSessionsLoaded.current = false;
    tasksLoaded.current = false;
    (async () => {
      try {
        // Loaded alongside the active caseload (not lazily on Caseload-tab
        // open) so an Advisor whose entire caseload has been deactivated
        // still has something to render — otherwise the empty-caseload
        // check below would strand them with no way back to Reactivate.
        const [clients, discharged] = await Promise.all([
          loadWorkspaceCaseload(therapistId),
          loadWorkspaceDischargedClients(therapistId),
        ]);
        if (cancelled) return;
        const firstId = clients[0]?.id || '';
        setS((prev) => ({
          ...prev,
          baseClients: clients,
          extraClients: [], deletedIds: {}, savedNotes: [],
          tasks: [], notifications: [], liveSessions: [], coTherapyThread: [], riskAlerts: [], dischargedClients: discharged,
          selectedClientId: firstId, activeThreadId: firstId, planClientId: firstId,
          newTaskClientId: firstId,
          noteDraft: { ...prev.noteDraft, clientId: firstId },
          practiceForm: { ...prev.practiceForm, clientId: firstId },
          docForm: { ...prev.docForm, clientId: firstId },
        }));
        setLoadPhase('ready');
      } catch (error) {
        console.error('Failed to load advisor caseload:', error);
        if (!cancelled) setLoadPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, [therapistId]);

  // Enrich each client with its real detail records (analytics, notes, plans,
  // messages), merging incrementally so the overview and profile fill in as
  // each client resolves. The selected client is prioritised first.
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready') return;
    const pending = (S.baseClients || []).filter((c) => !c._detailLoaded && !detailRequested.current.has(c.id));
    if (pending.length === 0) return;
    const ordered = [...pending].sort((a, b) => (a.id === S.selectedClientId ? -1 : 0) - (b.id === S.selectedClientId ? -1 : 0));
    const gen = genRef.current;
    ordered.forEach((base) => {
      detailRequested.current.add(base.id);
      loadWorkspaceClientDetail(base, therapistId)
        .then(({ client, noteEntries }) => {
          if (genRef.current !== gen) return;
          setS((prev) => ({
            ...prev,
            baseClients: (prev.baseClients || []).map((c) => (c.id === client.id ? client : c)),
            // A _isLocal note saved (e.g. by onAiNoteSaved) before this client's
            // detail resolved may already carry the real persisted id — once
            // noteEntries brings back the server's copy of that same row, drop
            // the local stand-in so it doesn't show twice.
            savedNotes: [
              ...noteEntries,
              ...prev.savedNotes.filter((n) => (n.clientId !== client.id || n._isLocal) && !noteEntries.some((ne) => ne.id != null && ne.id === n.id)),
            ],
          }));
        })
        .catch((error) => console.error('Failed to load client detail:', error));
    });
  }, [isDemo, loadPhase, S.selectedClientId, S.baseClients, therapistId]);

  // Periodically refresh the caseload so clients who sign up after this page
  // is already open (or get assigned by another Advisor/admin) appear without
  // a manual reload. Already-loaded client detail is preserved on merge.
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready') return;
    const gen = genRef.current;
    const interval = setInterval(() => {
      // Captured per-tick (not once outside the interval, like `gen` above):
      // a deactivate/reactivate can land between ticks, and this tick's own
      // in-flight request must still be discarded if one lands *during* it.
      const lifecycleGen = lifecycleGenRef.current;
      loadWorkspaceCaseloadWithStatus(therapistId)
        .then(({ clients, complete }) => {
          if (genRef.current !== gen) return;
          if (lifecycleGenRef.current !== lifecycleGen) {
            // A deactivate/reactivate mutation landed while this refresh was
            // in flight — it's already applied the authoritative state, so
            // this now-stale snapshot must not silently re-add or drop a
            // client out from under it.
            return;
          }
          if (!complete) {
            // A degraded/partial fetch (e.g. the fallback chain hit an error
            // partway through) is not an authoritative snapshot — applying it
            // would silently drop clients already visible in the workspace.
            console.warn('Skipping caseload refresh: fetch was incomplete.');
            return;
          }
          setS((prev) => ({ ...prev, baseClients: mergeCaseloadRefresh(prev.baseClients, clients) }));
        })
        .catch((error) => console.error('Failed to refresh caseload:', error));
    }, CASELOAD_REFRESH_MS);
    return () => clearInterval(interval);
  }, [isDemo, loadPhase, therapistId]);

  // Real caseload-wide risk detection (api/risk-alerts.js — already
  // correctly scoped to this therapist's caseload) flags real low mood
  // scores and real "stuck"/"crisis" language in session agendas, richer
  // than mapClientRow's inactivity-only heuristic. It was built for a
  // widget (RiskAlertWidget) that's never actually rendered anywhere in the
  // app. Kept in its own state slice (not merged into baseClients) so the
  // periodic caseload refresh above — which overwrites each client's risk
  // field from a fresh fetch — can never silently clobber it; the view
  // layer merges these real findings on top when building risk-facing UI.
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || riskAlertsLoaded.current) return;
    riskAlertsLoaded.current = true;
    const gen = genRef.current;
    loadCaseloadRiskAlerts()
      .then((alerts) => {
        if (genRef.current !== gen) return;
        set({ riskAlerts: alerts });
      })
      .catch((error) => console.error('Failed to load risk alerts:', error));
  }, [isDemo, loadPhase, therapistId]);

  // Claim an unassigned client (e.g. a fresh signup) into this Advisor's
  // caseload, then force a fresh detail load now that the assignment exists.
  const onClaimClient = (clientId) => {
    if (!therapistId || !clientId) return;
    const client = allClients().find((c) => c.id === clientId);
    claimWorkspaceClient(therapistId, clientId, { clientName: client?.name })
      .then(({ error }) => {
        if (error) { console.error('Failed to claim client:', error); return; }
        detailRequested.current.delete(clientId);
        set((s) => ({
          baseClients: (s.baseClients || []).map((c) => (c.id === clientId ? { ...c, unassigned: false, _detailLoaded: false } : c)),
        }));
      });
  };

  // Deactivate/reactivate this Advisor's own assignment to a client
  // (discharge vs. active on ifs_therapist_clients). Reversible via
  // Reactivate below, so no confirmation prompt — unlike onConfirmDelete,
  // which permanently removes a client and requires typing their name.
  const onDeactivateClient = (clientId) => {
    if (!therapistId || !clientId) return;
    const client = allClients().find((c) => c.id === clientId);
    lifecycleGenRef.current += 1;
    deactivateWorkspaceClientAssignment(therapistId, clientId)
      .then(({ error }) => {
        if (error) { console.error('Failed to deactivate client assignment:', error); return; }
        const remaining = (S.baseClients || []).filter((c) => c.id !== clientId);
        set((s) => ({
          baseClients: (s.baseClients || []).filter((c) => c.id !== clientId),
          selectedClientId: s.selectedClientId === clientId ? (remaining[0]?.id || '') : s.selectedClientId,
          dischargedClients: [{ id: clientId, name: client?.name || 'Client', dischargedAt: new Date().toISOString() }, ...s.dischargedClients],
        }));
      });
  };
  const onReactivateClient = (clientId) => {
    if (!therapistId || !clientId) return;
    lifecycleGenRef.current += 1;
    const lifecycleGen = lifecycleGenRef.current;
    reactivateWorkspaceClientAssignment(therapistId, clientId)
      .then(({ error }) => {
        if (error) { console.error('Failed to reactivate client assignment:', error); return; }
        set((s) => ({ dischargedClients: s.dischargedClients.filter((d) => d.id !== clientId) }));
        loadWorkspaceCaseloadWithStatus(therapistId).then(({ clients, complete }) => {
          if (lifecycleGenRef.current !== lifecycleGen || !complete) return;
          set((s) => ({ baseClients: mergeCaseloadRefresh(s.baseClients, clients) }));
        });
      });
  };

  useEffect(() => {
    if (!document.getElementById(FONT_LINK_ID)) {
      const link = document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const theme = S.isDark ? DARK : LIGHT;

  const allClients = () => (S.baseClients || []).concat(S.extraClients || []).filter((c) => !S.deletedIds[c.id]);

  // ---- handlers -----------------------------------------------------------
  const setTab = (id) => set({ activeTab: id });
  const setViewMode = (m) => set({ viewMode: m });
  const toggleTheme = () => set((s) => ({ isDark: !s.isDark }));
  const selectClient = (id) => {
    // Generated snapshots/summaries are client-specific decision support, not
    // saved records — never leave a previous client's copy visible for a new one.
    snapshotGenRef.current += 1;
    changeSummaryGenRef.current += 1;
    moduleInsightsGenRef.current += 1;
    lifeReflectionsLoadedFor.current = null;
    healingTimelineLoadedFor.current = null;
    curriculumReflectionsLoadedFor.current = null;
    selfEnergyTrendLoadedFor.current = null;
    unburdeningRecordLoadedFor.current = null;
    partSuggestionsLoadedFor.current = null;
    coTherapyProgressLoadedFor.current = null;
    personalizedCurriculumLoadedFor.current = null;
    set({
      selectedClientId: id, activeTab: 'clients-caseload', activeClientTab: 'overview',
      sessionSnapshot: { loading: false, data: null, error: '' },
      changeSummary: { loading: false, data: null, error: '' },
      moduleInsights: { loading: false, data: null, error: '' },
      lifeReflections: [], lifeReflectionsLoading: false,
      healingTimeline: { loading: false, data: null, error: '' },
      curriculumReflections: [], curriculumReflectionsLoading: false,
      personalizedCurriculum: [], personalizedCurriculumLoading: false,
      selfEnergyTrend: [], selfEnergyTrendLoading: false,
      unburdeningRecord: null, unburdeningRecordLoading: false,
      partSuggestions: null, partSuggestionsLoading: false,
      coTherapyProgress: [], coTherapyProgressLoading: false,
    });
  };
  const setClientTab = (id) => set({ activeClientTab: id });
  const onSearch = (e) => set({ search: e.target.value });
  const setFilterWound = (w) => set({ filterWound: w });
  const markReviewed = (id) => set((s) => ({ reviewedIds: { ...s.reviewedIds, [id]: true } }));
  const toggleSessionPrep = (id) => set((s) => ({ sessionPrepOpenId: s.sessionPrepOpenId === id ? null : id }));
  // Persists a real ifs_session_agendas review (previously "Mark reviewed"
  // in Session Prep only flipped a local flag and never wrote to the DB).
  const onMarkAgendaReviewed = (clientId, agendaId) => {
    set((s) => ({
      baseClients: (s.baseClients || []).map((c) => (c.id !== clientId ? c : {
        ...c,
        agendas: (c.agendas || []).map((a) => (a.id === agendaId ? { ...a, statusLabel: 'Reviewed', reviewed: true } : a)),
      })),
    }));
    markWorkspaceAgendaReviewed(agendaId)
      .then(({ error }) => { if (error) console.error('Failed to mark agenda reviewed:', error); })
      .catch((error) => console.error('Failed to mark agenda reviewed:', error));
  };

  // Real ifs_assigned_homework write actions (assignedHomework.js) already
  // proven by TherapistHomeworkBuilder.jsx (assign) and TherapistHomework.jsx
  // (review/archive) — the workspace previously only ever read this data.
  // Each action re-fetches just that client's assignment list afterward
  // rather than hand-rolling the new state, since the exact resulting
  // status/timestamps are the server's to decide.
  const refreshClientHomework = (clientId) => {
    refreshWorkspaceHomeworkForClient(clientId).then((assignments) => {
      // null means the refresh itself failed (missing id, fetch error) —
      // keep whatever assignments are already displayed rather than wiping
      // them with an empty list a transient failure isn't actually reporting.
      if (assignments === null) { console.error('Failed to refresh homework for client:', clientId); return; }
      set((s) => ({
        baseClients: (s.baseClients || []).map((c) => (c.id !== clientId ? c : {
          ...c,
          betweenSession: { ...c.betweenSession, assignments },
        })),
      }));
    });
  };
  const onHomeworkAssigned = (clientId) => refreshClientHomework(clientId);
  const onHomeworkFeedbackChange = (id, text) => set((s) => ({ homeworkFeedbackDraft: { ...s.homeworkFeedbackDraft, [id]: text } }));
  const onMarkHomeworkReviewed = (clientId, id) => {
    const feedback = S.homeworkFeedbackDraft[id] || '';
    markWorkspaceHomeworkReviewed(id, feedback)
      .then(({ error }) => {
        if (error) { console.error('Failed to mark homework reviewed:', error); return; }
        set((s) => { const draft = { ...s.homeworkFeedbackDraft }; delete draft[id]; return { homeworkFeedbackDraft: draft }; });
        refreshClientHomework(clientId);
      })
      .catch((error) => console.error('Failed to mark homework reviewed:', error));
  };
  const onArchiveHomework = (clientId, id) => {
    archiveWorkspaceHomework(id)
      .then(({ error }) => {
        if (error) { console.error('Failed to archive homework:', error); return; }
        refreshClientHomework(clientId);
      })
      .catch((error) => console.error('Failed to archive homework:', error));
  };
  const onNoteClientChange = (e) => set((s) => ({ noteDraft: { ...s.noteDraft, clientId: e.target.value } }));
  const onNoteTemplateChange = (e) => set((s) => ({ noteDraft: { ...s.noteDraft, template: e.target.value } }));
  const onNoteTextChange = (e) => set((s) => ({ noteDraft: { ...s.noteDraft, text: e.target.value } }));
  const saveNoteInternal = (status) => {
    const noteDraft = S.noteDraft;
    if (!noteDraft.text.trim()) return;
    const client = allClients().find((c) => c.id === noteDraft.clientId);
    const tmpl = TEMPLATE_OPTIONS.find((t) => t.id === noteDraft.template);
    // _isLocal notes survive the detail-load merge below (see loadWorkspaceClientDetail
    // effect) so a note saved while that client's records are still loading isn't wiped.
    const entry = { clientId: noteDraft.clientId, clientName: client ? client.name : 'Client', templateLabel: tmpl ? tmpl.label : 'Note', text: noteDraft.text, date: 'Just now', status, _isLocal: true };
    set((s) => ({ savedNotes: [entry, ...s.savedNotes], noteDraft: { ...s.noteDraft, text: '' } }));
    // Persist to the client's real note record when connected to a therapist.
    if (!isDemo && noteDraft.clientId) {
      persistTherapistNote({ therapistId, clientId: noteDraft.clientId, content: noteDraft.text, status: status === 'Signed & Locked' ? 'final' : 'draft' })
        .catch((error) => console.error('Failed to persist note:', error));
    }
  };
  const onSaveNote = () => saveNoteInternal('Draft');
  const onSignNote = () => saveNoteInternal('Signed & Locked');
  // AdvisorSessionNoteDraft persists via createTherapistNote itself; this just
  // mirrors the saved row into local state so it shows in "Recent notes"
  // immediately. _isLocal: true for the same reason as saveNoteInternal above.
  const onAiNoteSaved = (note) => {
    if (!note) return;
    const client = allClients().find((c) => c.id === note.client_id);
    const entry = { ...mapNoteEntry(note, note.client_id), clientName: client ? client.name : 'Client', _isLocal: true };
    set((s) => ({ savedNotes: [entry, ...s.savedNotes] }));
  };
  const toggleSetting = (key) => set((s) => ({ settingsToggles: { ...s.settingsToggles, [key]: !s.settingsToggles[key] } }));
  const draftNoteFor = (clientId) => set((s) => ({ activeTab: 'clinical-notes', noteDraft: { ...s.noteDraft, clientId } }));
  const openPrepFor = (clientId) => set({ activeTab: 'sessions-prep', sessionPrepOpenId: clientId });
  // Builds a printable HTML report entirely from data already loaded for this
  // client (assessments, mood/homework activity, goals, parts, notes) — the
  // same real data the legacy TherapistDashboard.jsx report generator used,
  // just rendered from the workspace's already-fetched state.
  const onExportReport = (clientId) => {
    const client = allClients().find((c) => c.id === clientId);
    if (!client || client._detailLoaded === false) return;
    const notes = S.savedNotes.filter((n) => n.clientId === clientId);
    const html = buildClientReportHtml(client, notes);
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;
    reportWindow.document.write(html);
    reportWindow.document.close();
  };
  const openPlanFor = (clientId) => set({ activeTab: 'clinical-plans', planClientId: clientId });
  const openPracticeFor = (clientId) => {
    const client = allClients().find((c) => c.id === clientId);
    set((s) => ({ activeTab: 'clinical-practice', practiceForm: { ...s.practiceForm, clientId, wound: client ? client.primaryWound : s.practiceForm.wound }, generatedPractice: null }));
  };
  const onPlanClientChange = (e) => set({ planClientId: e.target.value });
  const onPracticeClientChange = (e) => {
    const client = allClients().find((c) => c.id === e.target.value);
    set((s) => ({ practiceForm: { ...s.practiceForm, clientId: e.target.value, wound: client ? client.primaryWound : s.practiceForm.wound }, generatedPractice: null }));
  };
  const onPracticeWoundChange = (e) => set((s) => ({ practiceForm: { ...s.practiceForm, wound: e.target.value }, generatedPractice: null }));
  const onPracticeTypeChange = (e) => set((s) => ({ practiceForm: { ...s.practiceForm, type: e.target.value }, generatedPractice: null }));
  const onGeneratePractice = () => {
    const { wound, type } = S.practiceForm;
    const meta = WOUND_META[wound] || WOUND_META.abandonment;
    const typeMeta = PRACTICE_TYPE_META[type] || PRACTICE_TYPE_META.journal;
    set({ generatedPractice: typeMeta.tmpl(meta.label.toLowerCase()) });
  };
  const onPracticeDraftChange = (e) => set({ generatedPractice: e.target.value });
  const onRejectPractice = () => set({ generatedPractice: null });
  const onAssignPractice = () => {
    const { practiceForm, generatedPractice } = S;
    const text = generatedPractice?.trim();
    if (!text) return;
    const client = allClients().find((c) => c.id === practiceForm.clientId);
    const typeMeta = PRACTICE_TYPE_META[practiceForm.type] || PRACTICE_TYPE_META.journal;
    const entry = { clientName: client ? client.name : 'Client', typeLabel: typeMeta.label, text, date: 'Just now' };
    set((s) => ({ assignedPractices: [entry, ...s.assignedPractices], generatedPractice: null }));
  };
  const toggleAssignLesson = (idx) => set((s) => ({ assignedLessons: { ...s.assignedLessons, [idx]: !s.assignedLessons[idx] } }));
  const onCoTherapyMessageChange = (e) => set({ coTherapyMessage: e.target.value });
  const onSendCoTherapyMessage = () => {
    const text = S.coTherapyMessage.trim();
    if (!text) return;
    set((s) => ({ coTherapyThread: [...s.coTherapyThread, { author: 'You', text, date: 'Just now' }], coTherapyMessage: '' }));
  };
  const toggleCoTherapyShare = () => set((s) => ({ coTherapyShare: !s.coTherapyShare }));
  const onGenerateReport = () => set((s) => ({ reports: [{ title: 'Caseload Summary — ' + new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), date: 'Today' }, ...s.reports] }));

  const isGroupExpanded = (groupId) => {
    if (S.expandedGroups[groupId] !== undefined) return S.expandedGroups[groupId];
    const g = NAV_CONFIG.find((x) => x.id === groupId);
    return !!(g && g.children && g.children.some((c) => c.id === S.activeTab));
  };
  const toggleGroup = (g) => {
    const expanded = isGroupExpanded(g.id);
    if (!expanded) set((s) => ({ expandedGroups: { ...s.expandedGroups, [g.id]: true }, activeTab: g.children[0].id }));
    else set((s) => ({ expandedGroups: { ...s.expandedGroups, [g.id]: false } }));
  };

  const onClientMessageChange = (e) => set({ clientMessageDraft: e.target.value });
  const currentThreadClientId = () => (S.activeTab === 'messages' ? S.activeThreadId : S.selectedClientId);
  const onSendClientMessage = () => {
    const text = S.clientMessageDraft.trim();
    if (!text) return;
    const clientId = currentThreadClientId();
    set((s) => {
      const extra = s.clientMessages[clientId] || [];
      return { clientMessages: { ...s.clientMessages, [clientId]: [...extra, { from: 'advisor', text, date: 'Just now' }] }, clientMessageDraft: '' };
    });
    // Persist to the real message thread when connected to a therapist session.
    if (!isDemo && clientId) {
      sendWorkspaceMessage(therapistId, clientId, text).catch((error) => console.error('Failed to send message:', error));
    }
  };
  const setActiveThread = (id) => set((s) => ({ activeThreadId: id, activeTab: 'messages', readThreads: { ...s.readThreads, [id]: true } }));
  // Reconciles a just-persisted task with local state once its create
  // request resolves. Looks the temp row up by id rather than assuming it's
  // still there (a concurrent Tasks-tab reload may have already replaced
  // S.tasks wholesale) and, if the row was toggled locally while the create
  // was still in flight (persistence for temp ids is intentionally skipped —
  // see toggleTask), re-applies and persists that toggle now that a real id
  // exists instead of letting the server's initial 'open' status win.
  const resolveCreatedTask = (tempId, task) => {
    const wasToggled = pendingToggledTaskIds.current.has(tempId);
    pendingToggledTaskIds.current.delete(tempId);
    const resolved = wasToggled ? { ...task, status: task.status === 'open' ? 'done' : 'open' } : task;
    set((s) => {
      const existing = s.tasks.some((t) => t.id === tempId);
      return { tasks: existing ? s.tasks.map((t) => (t.id === tempId ? resolved : t)) : [resolved, ...s.tasks] };
    });
    if (wasToggled) {
      toggleWorkspaceTask(resolved.id).catch((error) => console.error('Failed to sync task status:', error));
    }
  };
  const addTaskFromMessage = () => {
    const clientId = currentThreadClientId();
    const client = allClients().find((c) => c.id === clientId);
    const title = 'Follow up on message — ' + (client ? client.name : '');
    const tempId = 'task-' + Date.now();
    set((s) => ({ tasks: [{ id: tempId, title, clientId, priority: 'medium', due: 'Tomorrow', status: 'open', category: 'Follow-up' }, ...s.tasks] }));
    if (!isDemo) {
      createWorkspaceTask({ title, clientId, category: 'Follow-up', priority: 'medium', dueDate: addDaysIso(1) })
        .then((task) => resolveCreatedTask(tempId, task))
        .catch((error) => console.error('Failed to create task:', error));
    }
  };
  const onAcknowledgeSafety = (clientId) => set((s) => ({ safetyOverrides: { ...s.safetyOverrides, [clientId]: { ...(s.safetyOverrides[clientId] || {}), acknowledged: true } } }));
  const onCreateSafetyPlan = (clientId) => set((s) => ({ safetyOverrides: { ...s.safetyOverrides, [clientId]: { ...(s.safetyOverrides[clientId] || {}), hasPlanOverride: true } } }));
  const setPartsClientFilter = (id) => set({ partsClientFilter: id });
  const setTaskFilter = (f) => set({ taskFilter: f });
  const onResourceSearchChange = (e) => set({ resourceSearch: e.target.value });
  const setResourceType = (id) => set({ resourceType: id });
  const setResourceWound = (id) => set({ resourceWound: id });
  const setResourceStage = (id) => set({ resourceStage: id });
  const onNewTaskTitleChange = (e) => set({ newTaskTitle: e.target.value });
  const onNewTaskClientChange = (e) => set({ newTaskClientId: e.target.value });
  const onAddTask = () => {
    const title = S.newTaskTitle.trim();
    if (!title) return;
    const clientId = S.newTaskClientId;
    const tempId = 'task-' + Date.now();
    set((s) => ({ tasks: [{ id: tempId, title, clientId, priority: 'medium', due: 'This week', status: 'open', category: 'General' }, ...s.tasks], newTaskTitle: '' }));
    if (!isDemo) {
      createWorkspaceTask({ title, clientId, category: 'General', priority: 'medium', dueDate: addDaysIso(7) })
        .then((task) => resolveCreatedTask(tempId, task))
        .catch((error) => console.error('Failed to create task:', error));
    }
  };
  const toggleTask = (id) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: t.status === 'open' ? 'done' : 'open' } : t)) }));
    if (isDemo) return;
    if (String(id).startsWith('task-')) {
      // Still pending creation — flag it so resolveCreatedTask re-applies
      // and persists this toggle once the real id comes back, instead of
      // the server's initial 'open' status silently overwriting it.
      if (pendingToggledTaskIds.current.has(id)) pendingToggledTaskIds.current.delete(id);
      else pendingToggledTaskIds.current.add(id);
      return;
    }
    toggleWorkspaceTask(id).catch((error) => console.error('Failed to update task:', error));
  };
  const onDismissEngagement = (clientId) => set((s) => ({ engagementDismissed: { ...s.engagementDismissed, [clientId]: !s.engagementDismissed[clientId] } }));
  const toggleEngagementExpanded = (clientId) => set((s) => ({ engagementExpanded: { ...s.engagementExpanded, [clientId]: !s.engagementExpanded[clientId] } }));
  const refreshClientReports = (clientId) => {
    if (isDemo || !clientId) { set({ clientReports: [] }); return; }
    set({ clientReportsLoading: true });
    loadWorkspaceReports(clientId)
      .then((rows) => set({ clientReports: rows, clientReportsLoading: false }))
      .catch(() => set({ clientReportsLoading: false }));
  };
  // Changing the document context mid-generation must invalidate any request
  // already in flight, so its (now-stale) response can't repopulate the
  // preview for a selection the Advisor has since moved away from.
  const invalidatePendingDoc = () => {
    docGenRef.current += 1;
    set((s) => (s.docGenerating ? { docGenerating: false } : null));
  };
  const onDocClientChange = (e) => {
    const clientId = e.target.value;
    invalidatePendingDoc();
    set((s) => ({ docForm: { ...s.docForm, clientId }, generatedDoc: null, docError: '' }));
    refreshClientReports(clientId);
  };
  const onDocTypeChange = (e) => { invalidatePendingDoc(); set((s) => ({ docForm: { ...s.docForm, type: e.target.value }, generatedDoc: null, docError: '' })); };
  const onDocDateChange = (field) => (e) => { invalidatePendingDoc(); set((s) => ({ docForm: { ...s.docForm, [field]: e.target.value }, generatedDoc: null })); };
  const toggleDocSource = (key) => { invalidatePendingDoc(); set((s) => ({ docSources: { ...s.docSources, [key]: !s.docSources[key] }, generatedDoc: null })); };
  const onGenerateDoc = () => {
    if (isDemo) { set({ docError: 'Document generation requires a signed-in Advisor session.' }); return; }
    const { docForm, docSources } = S;
    if (!docForm.clientId) { set({ docError: 'Select a client first.' }); return; }
    set({ docGenerating: true, docError: '', generatedDoc: null });
    docGenRef.current += 1;
    const gen = docGenRef.current;
    generateWorkspaceReport({
      clientId: docForm.clientId, reportType: docForm.type,
      dateRangeStart: docForm.dateRangeStart, dateRangeEnd: docForm.dateRangeEnd, sections: docSources,
    }).then(({ data, error }) => {
      if (docGenRef.current !== gen) return;
      if (error) { set({ docGenerating: false, docError: error.message || 'Unable to generate document.' }); return; }
      set({ docGenerating: false, generatedDoc: data });
      refreshClientReports(docForm.clientId);
    });
  };
  const onOpenGeneratedDoc = () => {
    if (!S.generatedDoc?.html) return;
    const blob = new Blob([S.generatedDoc.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  // AI Session Snapshot — a decision-support panel generated on demand from
  // real client records (curriculum, parts, assessments, life-integration,
  // assigned practice). It is never saved as a note and never shown to the
  // client; the Advisor must review and act on it themselves.
  const onGenerateSnapshot = () => {
    if (isDemo) { set({ sessionSnapshot: { loading: false, data: null, error: 'Session Snapshot requires a signed-in Advisor session.' } }); return; }
    const clientId = S.selectedClientId;
    if (!clientId) return;
    set({ sessionSnapshot: { loading: true, data: null, error: '' } });
    snapshotGenRef.current += 1;
    const gen = snapshotGenRef.current;
    loadAdvisorSessionSnapshot({ clientId, rangeDays: 30 })
      .then((data) => {
        if (snapshotGenRef.current !== gen) return;
        set({ sessionSnapshot: { loading: false, data: data?.advisor_session_snapshot || null, error: '' } });
      })
      .catch((error) => {
        if (snapshotGenRef.current !== gen) return;
        set({ sessionSnapshot: { loading: false, data: null, error: error.message || 'Unable to generate Advisor Session Snapshot.' } });
      });
  };
  const onCopySnapshot = () => {
    const snapshot = S.sessionSnapshot.data;
    if (!snapshot) return;
    const text = [
      snapshot.snapshot_title,
      snapshot.advisor_review_disclaimer,
      `Curriculum: ${snapshot.curriculum_trajectory?.active_module || 'Not available'} (${snapshot.curriculum_trajectory?.percent_complete || 0}% complete)`,
      snapshot.curriculum_trajectory?.recent_response_synthesis,
      `Assigned practice status: ${snapshot.assigned_practice_status || ''}`,
      `Suggested questions: ${(snapshot.suggested_session_questions || []).join('; ')}`,
      `Attention items: ${(snapshot.attention_items_for_advisor || []).join('; ')}`,
      `Do not over-interpret: ${(snapshot.what_not_to_overinterpret || []).join('; ')}`,
    ].filter(Boolean).join('\n\n');
    navigator.clipboard?.writeText(text);
  };

  // "Since Last Session" change summary — a decision-support panel generated
  // on demand from real client records over the last week (mood, journal,
  // parts, messages, assigned practice, prior session prep). Never saved as
  // a note and never shown to the client.
  const onGenerateChangeSummary = () => {
    if (isDemo) { set({ changeSummary: { loading: false, data: null, error: 'This summary requires a signed-in Advisor session.' } }); return; }
    const clientId = S.selectedClientId;
    if (!clientId) return;
    set({ changeSummary: { loading: true, data: null, error: '' } });
    changeSummaryGenRef.current += 1;
    const gen = changeSummaryGenRef.current;
    generateSessionPrepSummary({ clientId, rangeDays: 7 }).then(({ data, error }) => {
      if (changeSummaryGenRef.current !== gen) return;
      if (error) { set({ changeSummary: { loading: false, data: null, error: error.message || 'Unable to generate a change summary.' } }); return; }
      set({ changeSummary: { loading: false, data, error: '' } });
    });
  };

  // AI Module Response Insights — a decision-support panel generated on
  // demand from a client's real curriculum module responses, progress, and
  // saved curriculum reflections (api/ai-module-response-insights.js, the
  // same one TherapistDashboard.jsx's legacy "Generate module insights"
  // button already calls). Never saved as a note and never shown to the
  // client.
  const onGenerateModuleInsights = () => {
    if (isDemo) { set({ moduleInsights: { loading: false, data: null, error: 'Module insights require a signed-in Advisor session.' } }); return; }
    const clientId = S.selectedClientId;
    if (!clientId) return;
    set({ moduleInsights: { loading: true, data: null, error: '' } });
    moduleInsightsGenRef.current += 1;
    const gen = moduleInsightsGenRef.current;
    generateWorkspaceModuleInsights({ clientId, rangeDays: 60 }).then(({ data, error }) => {
      if (moduleInsightsGenRef.current !== gen) return;
      if (error) { set({ moduleInsights: { loading: false, data: null, error: error.message || 'Unable to generate module response insights.' } }); return; }
      set({ moduleInsights: { loading: false, data, error: '' } });
    });
  };

  // Lazily load a client's real report-generation history the first time the
  // Document Creator tab is opened for them (rather than eagerly on mount).
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeTab !== 'clinical-docs' || !S.docForm.clientId) return;
    if (reportsLoadedFor.current === S.docForm.clientId) return;
    reportsLoadedFor.current = S.docForm.clientId;
    refreshClientReports(S.docForm.clientId);
  }, [isDemo, loadPhase, S.activeTab, S.docForm.clientId, refreshClientReports]);

  // Lazily load the Advisor's real notification feed the first time the
  // Notifications tab is opened (rather than eagerly on mount) — this is the
  // real ifs_notifications feed already populated by client-driven events
  // (homework completed, session agenda submitted, reports generated, etc.),
  // just not previously surfaced in the workspace.
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeTab !== 'notifications' || notificationsLoaded.current) return;
    notificationsLoaded.current = true;
    loadWorkspaceNotifications().then((rows) => set({ notifications: rows }));
  }, [isDemo, loadPhase, S.activeTab]);

  // Lazily load the Advisor's real clinical tasks (ifs_advisor_tasks) the
  // first time the Tasks tab is opened — previously local-only state that
  // reset to the same four demo rows on every reload.
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeTab !== 'tasks' || tasksLoaded.current) return;
    tasksLoaded.current = true;
    // Preserve any task still awaiting its create response (a temp id added
    // in the instant before this load resolves) instead of wholesale
    // replacing S.tasks and dropping it.
    loadWorkspaceTasks().then((rows) => set((s) => ({
      tasks: [...s.tasks.filter((t) => String(t.id).startsWith('task-')), ...rows],
    })));
  }, [isDemo, loadPhase, S.activeTab]);

  // Lazily load the Advisor's real active/paused live guided-session rows
  // (ifs_live_sessions) the first time the Live Sessions tab is opened —
  // this tab's UI has always been fully built, just previously fed by
  // hardcoded demo rows that never reflected any real session.
  const refreshLiveSessions = () => {
    if (isDemo || !therapistId) return;
    // Same stale-response guard as loadCaseloadRiskAlerts below: without it, a
    // request started for one therapist could resolve after a therapist
    // switch and briefly overwrite the new therapist's live sessions with
    // the previous one's.
    const gen = genRef.current;
    loadWorkspaceActiveLiveSessions(therapistId).then((rows) => {
      if (genRef.current !== gen) return;
      set({ liveSessions: rows });
    });
  };
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeTab !== 'sessions-live' || liveSessionsLoaded.current) return;
    liveSessionsLoaded.current = true;
    refreshLiveSessions();
  }, [isDemo, loadPhase, S.activeTab, therapistId]);

  // Lazily load a client's real shared Life Integration reflections the
  // first time the Life Reflections tab is opened for them — the same
  // Advisor-scoped data already shown by the standalone
  // AdvisorSharedReflections.jsx page, just not previously in the workspace.
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeClientTab !== 'lifeReflections' || !S.selectedClientId) return;
    if (lifeReflectionsLoadedFor.current === S.selectedClientId) return;
    lifeReflectionsLoadedFor.current = S.selectedClientId;
    set({ lifeReflectionsLoading: true });
    let isCanceled = false;
    loadWorkspaceLifeReflections(S.selectedClientId).then((rows) => {
      if (!isCanceled) set({ lifeReflections: rows, lifeReflectionsLoading: false });
    });
    return () => {
      isCanceled = true;
    };
  }, [isDemo, loadPhase, S.activeClientTab, S.selectedClientId]);

  // Lazily load a client's real Healing Timeline the first time that tab is
  // opened — the same real, richer milestone feed the client-facing
  // /healing-timeline page already computes, just not previously reachable
  // from the Advisor Workspace.
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeClientTab !== 'healingJourney' || !S.selectedClientId) return;
    if (healingTimelineLoadedFor.current === S.selectedClientId) return;
    healingTimelineLoadedFor.current = S.selectedClientId;
    set({ healingTimeline: { loading: true, data: null, error: '' } });
    let isCanceled = false;
    loadWorkspaceHealingTimeline(S.selectedClientId).then(({ data, error }) => {
      if (!isCanceled) set({ healingTimeline: { loading: false, data, error: error || '' } });
    });
    return () => {
      isCanceled = true;
    };
  }, [isDemo, loadPhase, S.activeClientTab, S.selectedClientId]);

  // Lazily load a client's real Unburdening Protocol completion record
  // alongside the Healing Timeline — structured ceremony metadata only
  // (step reached, completion, chosen element/quality, body location, mood
  // after), never the free-text journal fields. Same unassigned-client
  // guard as curriculum reflections / Self-Energy trend above, for the same
  // reason (open RLS on ifs_interactive_data).
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeClientTab !== 'healingJourney' || !S.selectedClientId) return;
    if (unburdeningRecordLoadedFor.current === S.selectedClientId) return;
    const client = allClients().find((c) => c.id === S.selectedClientId);
    if (!client || client.unassigned) return;
    unburdeningRecordLoadedFor.current = S.selectedClientId;
    set({ unburdeningRecordLoading: true });
    let isCanceled = false;
    loadWorkspaceUnburdeningRecord(S.selectedClientId, true).then((record) => {
      if (!isCanceled) set({ unburdeningRecord: record, unburdeningRecordLoading: false });
    });
    return () => {
      isCanceled = true;
    };
  }, [isDemo, loadPhase, S.activeClientTab, S.selectedClientId, allClients]);

  // Lazily load a client's real Co-Therapy activity completion tracker
  // alongside the Healing Timeline — the standalone advisor-only /co-therapy
  // page's guided in-session activities, just not previously reachable from
  // the workspace. Structured completion facts only (which activity, done
  // or not, when) — never the client's own reflection text or the
  // advisor's per-step session notes from that tool. Same unassigned-client
  // guard as the other ifs_interactive_data-adjacent loaders above.
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeClientTab !== 'healingJourney' || !S.selectedClientId) return;
    if (coTherapyProgressLoadedFor.current === S.selectedClientId) return;
    const client = allClients().find((c) => c.id === S.selectedClientId);
    if (!client || client.unassigned) return;
    coTherapyProgressLoadedFor.current = S.selectedClientId;
    set({ coTherapyProgressLoading: true });
    let isCanceled = false;
    loadWorkspaceCoTherapyProgress(S.selectedClientId, true).then((rows) => {
      if (!isCanceled) set({ coTherapyProgress: rows, coTherapyProgressLoading: false });
    });
    return () => {
      isCanceled = true;
    };
  }, [isDemo, loadPhase, S.activeClientTab, S.selectedClientId, allClients]);

  // Lazily load a client's real Suggested Parts summary the first time the
  // Parts tab is opened — the same real suggestion engine the standalone
  // Inner System Map advisor page already computes, just not previously
  // reachable from the workspace. Same unassigned-client guard as the
  // other ifs_interactive_data-touching loaders above.
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeClientTab !== 'parts' || !S.selectedClientId) return;
    if (partSuggestionsLoadedFor.current === S.selectedClientId) return;
    const client = allClients().find((c) => c.id === S.selectedClientId);
    if (!client || client.unassigned) return;
    partSuggestionsLoadedFor.current = S.selectedClientId;
    set({ partSuggestionsLoading: true });
    let isCanceled = false;
    loadWorkspacePartSuggestions(S.selectedClientId, true).then((summary) => {
      if (!isCanceled) set({ partSuggestions: summary, partSuggestionsLoading: false });
    });
    return () => {
      isCanceled = true;
    };
  }, [isDemo, loadPhase, S.activeClientTab, S.selectedClientId, allClients]);

  // Lazily load a client's real curriculum module reflections the first time
  // that tab is opened — the client's own written insight/part-noticed/
  // self-energy/next-practice per module, explicitly flagged
  // sharedWithAdvisor: true by LearningModuleEnhanced.jsx. The Healing
  // Journey summary above only shows an aggregate count of these; this
  // surfaces the actual reflection content, which previously had no
  // Advisor-side consumer.
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeClientTab !== 'curriculumReflections' || !S.selectedClientId) return;
    if (curriculumReflectionsLoadedFor.current === S.selectedClientId) return;
    // loadWorkspaceCurriculumReflections bypasses a real requireTherapistAssignment
    // check server-side (see its comment in advisorWorkspaceLoader.js), so an
    // unassigned client must never reach it — fail closed here rather than
    // relying solely on the view layer's canView gating to hide the result.
    const client = allClients().find((c) => c.id === S.selectedClientId);
    if (!client || client.unassigned) return;
    curriculumReflectionsLoadedFor.current = S.selectedClientId;
    set({ curriculumReflectionsLoading: true });
    let isCanceled = false;
    loadWorkspaceCurriculumReflections(S.selectedClientId, true).then((rows) => {
      if (!isCanceled) set({ curriculumReflections: rows, curriculumReflectionsLoading: false });
    });
    return () => {
      isCanceled = true;
    };
  }, [isDemo, loadPhase, S.activeClientTab, S.selectedClientId, allClients]);

  // Lazily load a client's real AI-personalized curriculum module sequence
  // alongside the Curriculum Reflections tab — the same real data the
  // legacy TherapistDashboard.jsx's Lesson Editor already reads, just not
  // previously reachable from the workspace. Read-only summary; editing
  // stays on that dedicated tool. Same unassigned-client guard as the other
  // ifs_interactive_data-adjacent loaders above.
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeClientTab !== 'curriculumReflections' || !S.selectedClientId) return;
    if (personalizedCurriculumLoadedFor.current === S.selectedClientId) return;
    const client = allClients().find((c) => c.id === S.selectedClientId);
    if (!client || client.unassigned) return;
    personalizedCurriculumLoadedFor.current = S.selectedClientId;
    set({ personalizedCurriculumLoading: true });
    let isCanceled = false;
    loadWorkspacePersonalizedCurriculum(S.selectedClientId, true).then((rows) => {
      if (!isCanceled) set({ personalizedCurriculum: rows, personalizedCurriculumLoading: false });
    });
    return () => {
      isCanceled = true;
    };
  }, [isDemo, loadPhase, S.activeClientTab, S.selectedClientId, allClients]);

  // Lazily load a client's real daily Self-Energy check-ins the first time
  // the Between Sessions tab is opened — the same real trend/active-parts
  // data MoodAnalytics.jsx's advisor mode already shows, just not previously
  // reachable from the workspace. Same unassigned-client guard as curriculum
  // reflections above, for the same reason (open RLS on ifs_interactive_data).
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeClientTab !== 'betweenSession' || !S.selectedClientId) return;
    if (selfEnergyTrendLoadedFor.current === S.selectedClientId) return;
    const client = allClients().find((c) => c.id === S.selectedClientId);
    if (!client || client.unassigned) return;
    selfEnergyTrendLoadedFor.current = S.selectedClientId;
    set({ selfEnergyTrendLoading: true });
    let isCanceled = false;
    loadWorkspaceSelfEnergyTrend(S.selectedClientId, true).then((rows) => {
      if (!isCanceled) set({ selfEnergyTrend: rows, selfEnergyTrendLoading: false });
    });
    return () => {
      isCanceled = true;
    };
  }, [isDemo, loadPhase, S.activeClientTab, S.selectedClientId, allClients]);

  const toggleNewClientForm = () => set((s) => ({ showNewClientForm: !s.showNewClientForm, newClientResult: null }));
  const onNewClientFieldChange = (field) => (e) => set((s) => ({ newClientForm: { ...s.newClientForm, [field]: field === 'sendEmail' ? e.target.checked : e.target.value } }));
  const onCreateClient = () => {
    const { newClientForm } = S;
    if (!newClientForm.name.trim()) return;
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const id = 'new-' + Date.now();
    const initial = newClientForm.name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const client = {
      id, name: newClientForm.name.trim(), initial, email: newClientForm.email.trim(), phone: newClientForm.phone.trim(), pin,
      status: 'active', supportPriority: 'standard', primaryWound: 'abandonment', secondaryWound: 'shame',
      progressPct: 0, modulesCompleted: 0, streak: 0, level: 1, lastActiveDays: 0, risk: null,
      scores: { abandonment: 0, shame: 0, neglect: 0, betrayal: 0, helplessness: 0 },
      goals: [], pendingReview: null, session: { when: 'No upcoming session scheduled', status: 'none' },
      recentActivity: [], qaAnswers: [], timeline: [{ type: 'note', label: 'Client account created', date: 'Today' }],
      safety: { riskLevel: 'none', protective: [], riskFactors: [], safetyPlan: null, contacts: [], acknowledged: true, ackNote: 'New client — no assessment yet.' },
      mbc: [], parts: [], messages: [],
    };
    set((s) => ({
      extraClients: [...s.extraClients, client],
      newClientResult: { name: client.name, pin, emailSent: newClientForm.sendEmail },
      newClientForm: { name: '', email: '', phone: '', sendEmail: true },
    }));
  };
  const onStartDelete = (id) => set({ deletingClientId: id, deleteConfirmText: '' });
  const onCancelDelete = () => set({ deletingClientId: null, deleteConfirmText: '' });
  const onDeleteConfirmChange = (e) => set({ deleteConfirmText: e.target.value });
  const onConfirmDelete = () => {
    const { deletingClientId } = S;
    const client = allClients().find((c) => c.id === deletingClientId);
    if (!client || S.deleteConfirmText.trim() !== client.name) return;
    const remaining = allClients().filter((c) => c.id !== deletingClientId);
    set((s) => ({ deletedIds: { ...s.deletedIds, [deletingClientId]: true }, deletingClientId: null, deleteConfirmText: '', selectedClientId: remaining[0] ? remaining[0].id : '' }));
  };
  const onPracticeGuidanceChange = (e) => set({ practiceGuidance: e.target.value });
  const onGeneratePracticeBatch = () => {
    const { wound } = S.practiceForm;
    const meta = WOUND_META[wound] || WOUND_META.abandonment;
    const w = meta.label.toLowerCase();
    const guidance = S.practiceGuidance.trim();
    const suffix = guidance ? ` (focus: ${guidance})` : '';
    const batch = Object.keys(PRACTICE_TYPE_META).map((key) => ({ type: key, label: PRACTICE_TYPE_META[key].label, text: PRACTICE_TYPE_META[key].tmpl(w) + suffix }));
    set({ practiceBatchResults: batch });
  };
  const onUseBatchPractice = (item) => set((s) => ({ generatedPractice: item.text, practiceForm: { ...s.practiceForm, type: item.type }, practiceBatchResults: [] }));
  const onDeleteMessage = (clientId, idx) => set((s) => ({ deletedMessageIdx: { ...s.deletedMessageIdx, [clientId]: { ...(s.deletedMessageIdx[clientId] || {}), [idx]: true } } }));
  const applyQuickMessage = (text) => set({ clientMessageDraft: text });
  // Real pause/resume/end actions (api/live-session.js, via src/lib/liveSession.js)
  // — same session-control API the standalone LiveCoTherapy.jsx page already
  // uses. In demo mode these still update local-only seed rows, matching the
  // rest of the workspace's demo-vs-real split.
  const toggleLiveSession = (id) => {
    if (isDemo) { set((s) => ({ liveSessions: s.liveSessions.map((l) => (l.id === id ? { ...l, status: l.status === 'active' ? 'paused' : 'active' } : l)) })); return; }
    const session = (S.liveSessions || []).find((l) => l.id === id);
    if (!session) return;
    const action = session.status === 'active' ? pauseLiveActivity : resumeLiveActivity;
    action({ sessionId: id }).then(({ error }) => { if (!error) refreshLiveSessions(); });
  };
  const endLiveSession = (id) => {
    if (isDemo) { set((s) => ({ liveSessions: s.liveSessions.filter((l) => l.id !== id) })); return; }
    endLiveSessionApi({ sessionId: id }).then(({ error }) => { if (!error) refreshLiveSessions(); });
  };
  const onMarkNotifRead = (id) => {
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    if (!isDemo) {
      markWorkspaceNotificationRead(id)
        .then(({ error }) => { if (error) console.error('Failed to mark notification read:', error); })
        .catch((error) => console.error('Failed to mark notification read:', error));
    }
  };
  const onMarkAllNotifsRead = () => {
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    if (!isDemo) {
      markAllWorkspaceNotificationsRead()
        .then(({ error }) => { if (error) console.error('Failed to mark all notifications read:', error); })
        .catch((error) => console.error('Failed to mark all notifications read:', error));
    }
  };
  const onOpenNotifClient = (clientId, id) => { onMarkNotifRead(id); set({ selectedClientId: clientId, activeTab: 'clients-caseload', activeClientTab: 'overview' }); };

  const buildTreatmentPlan = (client) => {
    const currentPhaseIdx = client.modulesCompleted < 4 ? 0 : (client.modulesCompleted < 9 ? 1 : 2);
    return {
      clientName: client.name,
      phases: PLAN_PHASES.map((ph, i) => ({
        label: ph.label,
        dotStyle: { width: '14px', height: '14px', borderRadius: '50%', background: i <= currentPhaseIdx ? theme.accent2 : theme.border, border: i === currentPhaseIdx ? '3px solid ' + theme.emerald2 : 'none' },
        labelStyle: { fontSize: '12px', fontWeight: i === currentPhaseIdx ? 700 : 500, color: i === currentPhaseIdx ? theme.text : theme.muted },
      })),
      currentPhaseLabel: PLAN_PHASES[currentPhaseIdx].label,
      currentPhaseDesc: PLAN_PHASES[currentPhaseIdx].desc,
      milestones: client.goals.map((g) => ({ title: g.title, reviewLabel: 'Review in ' + g.reviewInDays + 'd', style: { fontSize: '11px', fontWeight: 700, color: g.reviewInDays <= 7 ? theme.riskMedText : theme.muted } })),
    };
  };

  if (!isDemo && loadPhase === 'loading') {
    return <WorkspaceStatus theme={theme} message="Loading your caseload…" spinner />;
  }
  if (!isDemo && loadPhase === 'error') {
    return <WorkspaceStatus theme={theme} message="We couldn’t load your caseload. Please refresh and try again." />;
  }

  // An Advisor whose whole caseload is deactivated (0 active, N discharged)
  // still needs the real workspace shell to reach Caseload Management and
  // Reactivate someone — only show the truly-empty state when there's
  // nothing at all, active or discharged.
  if (allClients().length === 0 && (S.dischargedClients || []).length === 0) {
    return <EmptyCaseload theme={theme} onReset={isDemo ? () => set(INITIAL_STATE) : undefined} />;
  }

  const view = buildView({
    S, theme, allClients, buildTreatmentPlan, isAdmin, isDemo,
    handlers: {
      setTab, setViewMode, toggleTheme, selectClient, setClientTab, onSearch, setFilterWound, markReviewed, toggleSessionPrep, onClaimClient, onMarkAgendaReviewed,
      onDeactivateClient, onReactivateClient,
      onNoteClientChange, onNoteTemplateChange, onNoteTextChange, onSaveNote, onSignNote, onAiNoteSaved, toggleSetting, draftNoteFor, openPrepFor, openPlanFor, openPracticeFor, onExportReport,
      onPlanClientChange, onPracticeClientChange, onPracticeWoundChange, onPracticeTypeChange, onGeneratePractice, onPracticeDraftChange, onRejectPractice, onAssignPractice, toggleAssignLesson,
      onCoTherapyMessageChange, onSendCoTherapyMessage, toggleCoTherapyShare, onGenerateReport, isGroupExpanded, toggleGroup,
      onClientMessageChange, onSendClientMessage, setActiveThread, addTaskFromMessage, onAcknowledgeSafety, onCreateSafetyPlan, setPartsClientFilter,
      setTaskFilter, onNewTaskTitleChange, onNewTaskClientChange, onAddTask, toggleTask, onDismissEngagement, toggleEngagementExpanded,
      onResourceSearchChange, setResourceType, setResourceWound, setResourceStage,
      onDocClientChange, onDocTypeChange, onDocDateChange, toggleDocSource, onGenerateDoc, onOpenGeneratedDoc, toggleNewClientForm, onNewClientFieldChange, onCreateClient,
      onGenerateSnapshot, onCopySnapshot, onGenerateChangeSummary, onGenerateModuleInsights,
      onStartDelete, onCancelDelete, onDeleteConfirmChange, onConfirmDelete, onPracticeGuidanceChange, onGeneratePracticeBatch, onUseBatchPractice,
      onDeleteMessage, applyQuickMessage, toggleLiveSession, endLiveSession, onMarkNotifRead, onMarkAllNotifsRead, onOpenNotifClient,
      onHomeworkAssigned, onHomeworkFeedbackChange, onMarkHomeworkReviewed, onArchiveHomework,
    },
  });

  return <WorkspaceShell view={view} />;
}

export default AdvisorWorkspace;

