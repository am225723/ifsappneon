import { useEffect, useState } from 'react';
import { buildView, WorkspaceShell, EmptyCaseload } from './AdvisorWorkspaceView.jsx';
import {
  WOUND_META, LIGHT, DARK, CLIENTS, TEMPLATE_OPTIONS, PRACTICE_TYPE_META, PLAN_PHASES,
  DOC_TYPES, NAV_CONFIG,
} from './advisorWorkspaceData.js';

export const INITIAL_STATE = {
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
  docForm: { clientId: 'c1', type: 'progress_summary' }, docSources: { notes: true, assessments: true, plan: true, practices: false },
  generatedDoc: null,
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

function AdvisorWorkspace({ isAdmin = false }) {
  const [S, setS] = useState(INITIAL_STATE);
  // setState-compatible merge helper (accepts object or updater fn)
  const set = (patch) => setS((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));

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

  const allClients = () => CLIENTS.concat(S.extraClients || []).filter((c) => !S.deletedIds[c.id]);

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
    const entry = { clientId: noteDraft.clientId, clientName: client ? client.name : 'Client', templateLabel: tmpl ? tmpl.label : 'Note', text: noteDraft.text, date: 'Just now', status };
    set((s) => ({ savedNotes: [entry, ...s.savedNotes], noteDraft: { ...s.noteDraft, text: '' } }));
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
  const onDocClientChange = (e) => set((s) => ({ docForm: { ...s.docForm, clientId: e.target.value }, generatedDoc: null }));
  const onDocTypeChange = (e) => set((s) => ({ docForm: { ...s.docForm, type: e.target.value }, generatedDoc: null }));
  const toggleDocSource = (key) => set((s) => ({ docSources: { ...s.docSources, [key]: !s.docSources[key] }, generatedDoc: null }));
  const onGenerateDoc = () => {
    const { docForm, docSources } = S;
    const client = allClients().find((c) => c.id === docForm.clientId) || allClients()[0];
    const docType = DOC_TYPES.find((d) => d.id === docForm.type) || DOC_TYPES[0];
    const parts = [`${docType.label} — ${client.name}\nPrepared by Dr. Rivera, Advisor\n`];
    if (docSources.notes) parts.push(`Session notes on file: ${S.savedNotes.filter((n) => n.clientId === client.id).length || 0} recent note(s) reviewed.`);
    if (docSources.assessments) parts.push(`Recent MBC results: ${client.mbc.map((m) => m.name + ' ' + m.current).join('; ')}.`);
    if (docSources.plan) parts.push(`Treatment plan: currently in the ${PLAN_PHASES[client.modulesCompleted < 4 ? 0 : (client.modulesCompleted < 9 ? 1 : 2)].label} phase. Active goal: ${client.goals[0] ? client.goals[0].title : 'none on file'}.`);
    if (docSources.practices) parts.push(`Assigned practices: ${S.assignedPractices.filter((a) => a.clientName === client.name).length} tracked in system.`);
    if (!docSources.notes && !docSources.assessments && !docSources.plan && !docSources.practices) parts.push('No source records selected — select at least one above for a complete draft.');
    parts.push('\nUnsupported fields have been omitted rather than invented; Advisor review is required before finalizing.');
    set({ generatedDoc: parts.join('\n\n') });
  };
  const onApproveDoc = () => {
    if (!S.generatedDoc) return;
    const client = allClients().find((c) => c.id === S.docForm.clientId) || allClients()[0];
    const docType = DOC_TYPES.find((d) => d.id === S.docForm.type) || DOC_TYPES[0];
    set((s) => ({ reports: [{ title: docType.label + ' — ' + client.name, date: 'Today' }, ...s.reports], generatedDoc: null }));
  };
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

  if (allClients().length === 0) {
    return <EmptyCaseload theme={theme} onReset={() => set(INITIAL_STATE)} />;
  }

  const view = buildView({
    S, theme, allClients, buildTreatmentPlan, isAdmin,
    handlers: {
      setTab, setViewMode, toggleTheme, selectClient, setClientTab, onSearch, setFilterWound, markReviewed, toggleSessionPrep,
      onNoteClientChange, onNoteTemplateChange, onNoteTextChange, onSaveNote, onSignNote, toggleSetting, draftNoteFor, openPrepFor, openPlanFor, openPracticeFor,
      onPlanClientChange, onPracticeClientChange, onPracticeWoundChange, onPracticeTypeChange, onGeneratePractice, onAssignPractice, toggleAssignLesson,
      onCoTherapyMessageChange, onSendCoTherapyMessage, toggleCoTherapyShare, onGenerateReport, isGroupExpanded, toggleGroup,
      onClientMessageChange, onSendClientMessage, setActiveThread, addTaskFromMessage, onAcknowledgeSafety, onCreateSafetyPlan, setPartsClientFilter,
      setTaskFilter, onNewTaskTitleChange, onNewTaskClientChange, onAddTask, toggleTask, onDismissEngagement,
      onDocClientChange, onDocTypeChange, toggleDocSource, onGenerateDoc, onApproveDoc, toggleNewClientForm, onNewClientFieldChange, onCreateClient,
      onStartDelete, onCancelDelete, onDeleteConfirmChange, onConfirmDelete, onPracticeGuidanceChange, onGeneratePracticeBatch, onUseBatchPractice,
      onDeleteMessage, applyQuickMessage, toggleLiveSession, endLiveSession, onMarkNotifRead, onMarkAllNotifsRead, onOpenNotifClient,
    },
  });

  return <WorkspaceShell view={view} />;
}

export default AdvisorWorkspace;

