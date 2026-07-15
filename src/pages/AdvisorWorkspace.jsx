import { useEffect, useRef, useState } from 'react';
import { buildView, WorkspaceShell, EmptyCaseload, WorkspaceStatus } from './AdvisorWorkspaceView.jsx';
import {
  WOUND_META, LIGHT, DARK, CLIENTS, TEMPLATE_OPTIONS, PRACTICE_TYPE_META, PLAN_PHASES,
  DOC_SOURCES_DEFAULT, NAV_CONFIG,
} from './advisorWorkspaceData.js';
import {
  loadWorkspaceCaseload, loadWorkspaceCaseloadWithStatus, loadWorkspaceClientDetail, sendWorkspaceMessage, persistTherapistNote,
  claimWorkspaceClient, mergeCaseloadRefresh, generateWorkspaceReport, loadWorkspaceReports,
} from '../lib/advisorWorkspaceLoader.js';

const CASELOAD_REFRESH_MS = 45000;

function todayIso() { return new Date().toISOString().slice(0, 10); }
function sixMonthsAgoIso() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

export const INITIAL_STATE = {
  baseClients: CLIENTS,
  activeTab: 'overview', isDark: false, expandedGroups: {}, viewMode: 'command',
  selectedClientId: 'c1', activeClientTab: 'overview',
  search: '', filterWound: 'all', reviewedIds: {}, sessionPrepOpenId: null,
  noteDraft: { clientId: 'c1', template: 'none', text: '' }, savedNotes: [],
  planClientId: 'c1', practiceForm: { clientId: 'c1', wound: 'abandonment', type: 'journal' },
  generatedPractice: null, assignedPractices: [], assignedLessons: {},
  coTherapyShare: true, coTherapyMessage: '',
  coTherapyThread: [{ author: 'Dr. Patel', text: 'Flagging Jordan’s risk note for joint review before Thursday.', date: 'Yesterday' }],
  reports: [{ title: 'Caseload Summary — June 2026', date: 'Jul 1, 2026' }],
  settingsToggles: { riskAlerts: true, weeklyDigest: true, sessionReminders: false },
  clientMessages: {}, clientMessageDraft: '', activeThreadId: 'c2', readThreads: {},
  safetyOverrides: {}, engagementDismissed: {}, partsClientFilter: 'all',
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
  accessOverrides: {}, settingsAccent: 'amber',
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
  // Generation guard: bumped on therapist change / unmount so stale in-flight
  // detail merges are ignored without cancelling still-valid sibling requests.
  const genRef = useRef(0);
  useEffect(() => () => { genRef.current += 1; }, []);
  // Same capture-and-compare pattern as genRef, scoped to document generation:
  // bumped on every onGenerateDoc call so a slower request for a since-changed
  // client/type/date-range can't overwrite a newer one's preview.
  const docGenRef = useRef(0);
  // setState-compatible merge helper (accepts object or updater fn)
  const set = (patch) => setS((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));

  // Load the therapist's real caseload, resetting demo-only collections.
  useEffect(() => {
    if (!therapistId) { setLoadPhase('ready'); return; }
    genRef.current += 1;
    let cancelled = false;
    setLoadPhase('loading');
    detailRequested.current = new Set();
    (async () => {
      try {
        const clients = await loadWorkspaceCaseload(therapistId);
        if (cancelled) return;
        const firstId = clients[0]?.id || '';
        setS((prev) => ({
          ...prev,
          baseClients: clients,
          extraClients: [], deletedIds: {}, savedNotes: [],
          tasks: [], notifications: [], liveSessions: [], coTherapyThread: [],
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
            savedNotes: [...noteEntries, ...prev.savedNotes.filter((n) => n.clientId !== client.id || n._isLocal)],
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
      loadWorkspaceCaseloadWithStatus(therapistId)
        .then(({ clients, complete }) => {
          if (genRef.current !== gen) return;
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
  const selectClient = (id) => set({ selectedClientId: id, activeTab: 'clients-caseload', activeClientTab: 'overview' });
  const setClientTab = (id) => set({ activeClientTab: id });
  const onSearch = (e) => set({ search: e.target.value });
  const setFilterWound = (w) => set({ filterWound: w });
  const markReviewed = (id) => set((s) => ({ reviewedIds: { ...s.reviewedIds, [id]: true } }));
  const toggleSessionPrep = (id) => set((s) => ({ sessionPrepOpenId: s.sessionPrepOpenId === id ? null : id }));
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
  const toggleSetting = (key) => set((s) => ({ settingsToggles: { ...s.settingsToggles, [key]: !s.settingsToggles[key] } }));
  const draftNoteFor = (clientId) => set((s) => ({ activeTab: 'clinical-notes', noteDraft: { ...s.noteDraft, clientId } }));
  const openPrepFor = (clientId) => set({ activeTab: 'sessions-prep', sessionPrepOpenId: clientId });
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
  const onAssignPractice = () => {
    const { practiceForm, generatedPractice } = S;
    if (!generatedPractice) return;
    const client = allClients().find((c) => c.id === practiceForm.clientId);
    const typeMeta = PRACTICE_TYPE_META[practiceForm.type] || PRACTICE_TYPE_META.journal;
    const entry = { clientName: client ? client.name : 'Client', typeLabel: typeMeta.label, text: generatedPractice, date: 'Just now' };
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
  const addTaskFromMessage = () => {
    const clientId = currentThreadClientId();
    const client = allClients().find((c) => c.id === clientId);
    set((s) => ({ tasks: [{ id: 'task-' + Date.now(), title: 'Follow up on message — ' + (client ? client.name : ''), clientId, priority: 'medium', due: 'Tomorrow', status: 'open', category: 'Follow-up' }, ...s.tasks] }));
  };
  const onAcknowledgeSafety = (clientId) => set((s) => ({ safetyOverrides: { ...s.safetyOverrides, [clientId]: { ...(s.safetyOverrides[clientId] || {}), acknowledged: true } } }));
  const onCreateSafetyPlan = (clientId) => set((s) => ({ safetyOverrides: { ...s.safetyOverrides, [clientId]: { ...(s.safetyOverrides[clientId] || {}), hasPlanOverride: true } } }));
  const setPartsClientFilter = (id) => set({ partsClientFilter: id });
  const setTaskFilter = (f) => set({ taskFilter: f });
  const onNewTaskTitleChange = (e) => set({ newTaskTitle: e.target.value });
  const onNewTaskClientChange = (e) => set({ newTaskClientId: e.target.value });
  const onAddTask = () => {
    const title = S.newTaskTitle.trim();
    if (!title) return;
    set((s) => ({ tasks: [{ id: 'task-' + Date.now(), title, clientId: s.newTaskClientId, priority: 'medium', due: 'This week', status: 'open', category: 'General' }, ...s.tasks], newTaskTitle: '' }));
  };
  const toggleTask = (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: t.status === 'open' ? 'done' : 'open' } : t)) }));
  const onDismissEngagement = (clientId) => set((s) => ({ engagementDismissed: { ...s.engagementDismissed, [clientId]: !s.engagementDismissed[clientId] } }));
  const refreshClientReports = (clientId) => {
    if (isDemo || !clientId) { set({ clientReports: [] }); return; }
    set({ clientReportsLoading: true });
    loadWorkspaceReports(clientId)
      .then((rows) => set({ clientReports: rows, clientReportsLoading: false }))
      .catch(() => set({ clientReportsLoading: false }));
  };
  const onDocClientChange = (e) => {
    const clientId = e.target.value;
    set((s) => ({ docForm: { ...s.docForm, clientId }, generatedDoc: null, docError: '' }));
    refreshClientReports(clientId);
  };
  const onDocTypeChange = (e) => set((s) => ({ docForm: { ...s.docForm, type: e.target.value }, generatedDoc: null, docError: '' }));
  const onDocDateChange = (field) => (e) => set((s) => ({ docForm: { ...s.docForm, [field]: e.target.value }, generatedDoc: null }));
  const toggleDocSource = (key) => set((s) => ({ docSources: { ...s.docSources, [key]: !s.docSources[key] }, generatedDoc: null }));
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

  // Lazily load a client's real report-generation history the first time the
  // Document Creator tab is opened for them (rather than eagerly on mount).
  useEffect(() => {
    if (isDemo || loadPhase !== 'ready' || S.activeTab !== 'clinical-docs' || !S.docForm.clientId) return;
    if (reportsLoadedFor.current === S.docForm.clientId) return;
    reportsLoadedFor.current = S.docForm.clientId;
    refreshClientReports(S.docForm.clientId);
  }, [isDemo, loadPhase, S.activeTab, S.docForm.clientId, refreshClientReports]);

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
  const toggleLiveSession = (id) => set((s) => ({ liveSessions: s.liveSessions.map((l) => (l.id === id ? { ...l, status: l.status === 'active' ? 'paused' : 'active' } : l)) }));
  const endLiveSession = (id) => set((s) => ({ liveSessions: s.liveSessions.filter((l) => l.id !== id) }));
  const onMarkNotifRead = (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  const onMarkAllNotifsRead = () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
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

  if (allClients().length === 0) {
    return <EmptyCaseload theme={theme} onReset={isDemo ? () => set(INITIAL_STATE) : undefined} />;
  }

  const view = buildView({
    S, theme, allClients, buildTreatmentPlan, isAdmin,
    handlers: {
      setTab, setViewMode, toggleTheme, selectClient, setClientTab, onSearch, setFilterWound, markReviewed, toggleSessionPrep, onClaimClient,
      onNoteClientChange, onNoteTemplateChange, onNoteTextChange, onSaveNote, onSignNote, toggleSetting, draftNoteFor, openPrepFor, openPlanFor, openPracticeFor,
      onPlanClientChange, onPracticeClientChange, onPracticeWoundChange, onPracticeTypeChange, onGeneratePractice, onAssignPractice, toggleAssignLesson,
      onCoTherapyMessageChange, onSendCoTherapyMessage, toggleCoTherapyShare, onGenerateReport, isGroupExpanded, toggleGroup,
      onClientMessageChange, onSendClientMessage, setActiveThread, addTaskFromMessage, onAcknowledgeSafety, onCreateSafetyPlan, setPartsClientFilter,
      setTaskFilter, onNewTaskTitleChange, onNewTaskClientChange, onAddTask, toggleTask, onDismissEngagement,
      onDocClientChange, onDocTypeChange, onDocDateChange, toggleDocSource, onGenerateDoc, onOpenGeneratedDoc, toggleNewClientForm, onNewClientFieldChange, onCreateClient,
      onStartDelete, onCancelDelete, onDeleteConfirmChange, onConfirmDelete, onPracticeGuidanceChange, onGeneratePracticeBatch, onUseBatchPractice,
      onDeleteMessage, applyQuickMessage, toggleLiveSession, endLiveSession, onMarkNotifRead, onMarkAllNotifsRead, onOpenNotifClient,
    },
  });

  return <WorkspaceShell view={view} />;
}

export default AdvisorWorkspace;

