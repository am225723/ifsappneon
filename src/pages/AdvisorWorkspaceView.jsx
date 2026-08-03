import { Link } from 'react-router-dom';
import AdvisorSessionNoteDraft from '../components/AdvisorSessionNoteDraft.jsx';
import TreatmentPlanManager from '../components/TreatmentPlanManager.jsx';
import TherapistHomeworkBuilder from '../components/TherapistHomeworkBuilder.jsx';
import {
  WOUND_META, woundChip, daysAgoText, severityStyle, RISK_LEVEL_TO_SEV, RISK_LEVEL_LABEL, RISK_LEVEL_RANK,
  PART_CAT_META, partChip, TEMPLATE_OPTIONS, PRACTICE_TYPE_META, LESSON_TITLES, PLAN_PHASES,
  DOC_TYPES, DOC_SOURCES, NAV_CONFIG, CLIENT_TABS, TIMELINE_TYPE_META, TAB_TITLES, NOTIFICATION_PREF_META,
  QUICK_MESSAGES, engagementStatusFor, MOOD_LABELS, RISK_TYPE_TITLE,
  UNBURDENING_MOOD_LABELS, UNBURDENING_TOTAL_STEPS, UNBURDENING_STEP_TITLES,
  RESOURCE_TYPES, HEALING_STAGES,
} from './advisorWorkspaceData.js';
import { resources as RESOURCE_LIBRARY } from '../data/resourceLibraryData.js';
import { MODULE_SEQUENCE as ACCESS_MODULE_SEQUENCE, ASSESSMENT_LABELS, FEATURE_LABELS } from '../data/accessControlData.js';
import { getAvailableTemplates } from '../lib/emailTemplates.js';
import SimpleLineChart from '../components/analytics/SimpleLineChart.jsx';
import ProgressRing from '../components/analytics/ProgressRing.jsx';

// Mirrors partSuggestionEngine.js's type vocabulary ('protector', 'self',
// legacy-import 'unknown', etc.) down onto the workspace's existing
// manager/firefighter/exile part categories for consistent chip styling.
const SUGGESTION_TYPE_TO_CATEGORY = {
  manager: 'manager', protector: 'manager', proactive: 'manager',
  firefighter: 'firefighter', reactive: 'firefighter',
  exile: 'exile', wounded: 'exile', vulnerable: 'exile',
};

// Computes every derived value the UI needs (mirrors the design's renderVals()).
export function buildView({ S, theme, allClients, buildTreatmentPlan, handlers: H, isAdmin = false, isDemo = false }) {
  const {
    activeTab, isDark, viewMode, selectedClientId, activeClientTab, search, filterWound, reviewedIds,
    sessionPrepOpenId, noteDraft, savedNotes, planClientId, practiceForm, generatedPractice, assignedPractices,
    assignedLessons, coTherapyShare, coTherapyMessage, coTherapyThread, reports, notificationPrefs, notificationPrefsSaving, clientMessages,
    clientMessageDraft, activeThreadId, safetyOverrides, engagementDismissed, engagementExpanded, partsClientFilter, tasks, taskFilter, messageSearch,
    newTaskTitle, newTaskClientId, docForm, docSources, generatedDoc, docGenerating, docError, docExporting, docExportError, clientReports, clientReportsLoading, caseloadReports, caseloadReportsLoading, deletedMessageIdx,
    sessionSnapshot, changeSummary, moduleInsights, lifeReflections, lifeReflectionsLoading, healingTimeline, riskAlerts,
    curriculumReflections, curriculumReflectionsLoading, homeworkFeedbackDraft, selfEnergyTrend, selfEnergyTrendLoading,
    unburdeningRecord, unburdeningRecordLoading, partSuggestions, partSuggestionsLoading,
    coTherapyProgress, coTherapyProgressLoading, personalizedCurriculum, personalizedCurriculumLoading,
    resourceSearch, resourceType, resourceWound, resourceStage, dischargedClients,
    practiceGenerating, practiceError,
    accessControlClientId, accessControlFullAccess, accessControlForm, accessControlSaving, accessControlSaved,
    teamTherapists, teamAssignments, teamLoading,
    reassignTherapistId, reassignClientId, reassignClientName, reassignToTherapistId, reassignSaving,
    editClientId, editClientForm, editClientSaving, editClientError,
    emailClientId, emailTemplateId, emailPreview, emailLoading, emailSending, emailSent, emailError,
  } = S;

  const rootStyle = {
    '--bg': theme.bg, '--surface': theme.surface, '--surface-2': theme.surface2, '--surface-3': theme.surface3,
    '--border': theme.border, '--text': theme.text, '--text-2': theme.text2, '--muted': theme.muted,
    '--accent': theme.accent, '--accent-2': theme.accent2, '--emerald': theme.emerald, '--emerald-2': theme.emerald2,
    '--risk-high-bg': theme.riskHighBg, '--risk-high-text': theme.riskHighText, '--risk-high-border': theme.riskHighBorder,
    '--risk-med-bg': theme.riskMedBg, '--risk-med-text': theme.riskMedText, '--risk-med-border': theme.riskMedBorder,
    '--risk-low-bg': theme.riskLowBg, '--risk-low-text': theme.riskLowText, '--risk-low-border': theme.riskLowBorder,
    '--shadow': theme.shadow,
    display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14.5px',
  };
  const primaryBtnStyle = { background: `linear-gradient(135deg, ${theme.accent2}, ${theme.emerald2})`, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' };
  const secondaryBtnStyle = { background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '10px 18px', borderRadius: '12px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' };
  const selectStyle = { flex: 1, padding: '9px 10px', borderRadius: '10px', border: '1px solid ' + theme.border, background: theme.surface2, color: theme.text, fontFamily: 'inherit', fontSize: '13px' };
  const disclaimerStyle = { fontSize: '12px', color: theme.riskMedText, background: theme.riskMedBg, border: '1px solid ' + theme.riskMedBorder, padding: '10px 14px', borderRadius: '12px', lineHeight: 1.5 };
  const modeBtnStyle = (active) => ({ flex: 1, padding: '8px 6px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11.5px', fontWeight: 700, background: active ? theme.surface : 'transparent', color: active ? theme.text : theme.muted, boxShadow: active ? theme.shadow : 'none' });
  const modeToggle = { onCommand: () => H.setViewMode('command'), onJourney: () => H.setViewMode('journey'), commandStyle: modeBtnStyle(viewMode === 'command'), journeyStyle: modeBtnStyle(viewMode === 'journey') };
  // Real caseload-wide risk alerts (mood/agenda-language, richer than the
  // inactivity-only heuristic baked into each client's base `risk` field)
  // are kept in their own state slice — see AdvisorWorkspace.jsx — and
  // merged on top here rather than mutating the underlying client records.
  const riskAlertsById = new Map((riskAlerts || []).map((a) => [a.clientId, a]));
  function withRiskAlert(client) {
    const alert = riskAlertsById.get(client.id);
    if (!alert) return client;
    // Augment, never downgrade or erase: a client can independently already
    // carry a higher-severity base risk (e.g. 21+ days inactive) than what
    // this particular alert reports (e.g. a medium inactivity flag) — take
    // the higher of the two levels and merge/dedupe the reason lists rather
    // than replacing them outright.
    const alertSafetyLevel = alert.level === 'high' ? 'high' : 'monitor';
    const existingSafetyLevel = client.safety?.riskLevel || 'none';
    const mergedSafetyLevel = (RISK_LEVEL_RANK[alertSafetyLevel] ?? 0) >= (RISK_LEVEL_RANK[existingSafetyLevel] ?? 0) ? alertSafetyLevel : existingSafetyLevel;
    const mergedFactors = [...new Set([...(client.safety?.riskFactors || []), ...alert.reasons])];
    const mergedRiskLevel = client.risk?.level === 'high' || alert.level === 'high' ? 'high' : 'medium';
    const existingDetail = client.risk?.detail;
    const mergedDetail = existingDetail && !alert.reasons.includes(existingDetail) ? [existingDetail, ...alert.reasons].join(' · ') : alert.reasons.join(' · ');
    return {
      ...client,
      risk: { type: alert.type, level: mergedRiskLevel, detail: mergedDetail, daysAgo: alert.daysAgo ?? client.risk?.daysAgo ?? null },
      safety: { ...client.safety, riskLevel: mergedSafetyLevel, riskFactors: mergedFactors },
    };
  }
  const ALL_CLIENTS = allClients().map(withRiskAlert);
  // Caseload workflows (stats, review, safety, tasks, MBC, curriculum, etc. —
  // including their nav badges) only cover clients actually assigned to this
  // Advisor. Unassigned clients (e.g. fresh signups) still show up in the raw
  // client picker with a Claim action, but shouldn't count toward or clutter
  // a caseload that isn't theirs yet.
  const assignedClients = ALL_CLIENTS.filter((c) => !c.unassigned);

  function getSafety(client) {
    const override = safetyOverrides[client.id] || {};
    const acknowledged = override.acknowledged !== undefined ? override.acknowledged : client.safety.acknowledged;
    const hasPlan = !!client.safety.safetyPlan || !!override.hasPlanOverride;
    return { ...client.safety, acknowledged, hasPlan };
  }
  function reviewCount() {
    let n = 0;
    assignedClients.forEach((c) => { if (c.risk && !reviewedIds['risk-' + c.id]) n++; if (c.pendingReview && !reviewedIds['practice-' + c.id]) n++; });
    return n;
  }
  const badgeCount = reviewCount();
  const safetyBadge = assignedClients.filter((c) => (c.safety.riskLevel === 'high' || c.safety.riskLevel === 'urgent') && !getSafety(c).acknowledged).length;
  const readThreads = S.readThreads || {};
  const hasUnreadFor = (c) => (c.messages || []).some((m) => m.from === 'client') && !readThreads[c.id];
  const unreadMessages = ALL_CLIENTS.filter(hasUnreadFor).length;
  const openTasksCount = tasks.filter((t) => t.status === 'open').length;
  const notifUnreadCount = S.notifications.filter((n) => !n.read).length;

  const navConfig = isAdmin ? NAV_CONFIG : NAV_CONFIG.filter((g) => g.id !== 'admin');
  const navRows = [];
  navConfig.forEach((g) => {
    const hasChildren = !!g.children;
    const groupActive = hasChildren ? g.children.some((c) => c.id === activeTab) : activeTab === g.id;
    const expanded = hasChildren ? H.isGroupExpanded(g.id) : false;
    const badgeCountFor = { review: badgeCount, safety: safetyBadge, messages: unreadMessages, tasks: openTasksCount, notifications: notifUnreadCount }[g.id] || 0;
    navRows.push({
      id: g.id, label: g.label, onClick: hasChildren ? () => H.toggleGroup(g) : () => H.setTab(g.id),
      swatchStyle: { width: '8px', height: '8px', borderRadius: '2px', background: g.swatch, flexShrink: 0 },
      style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: groupActive ? 700 : 500, background: (!hasChildren && groupActive) ? 'var(--surface-2)' : 'transparent', color: (groupActive || expanded) ? 'var(--text)' : 'var(--muted)' },
      showBadge: badgeCountFor > 0, badgeCount: badgeCountFor,
      badgeStyle: { background: 'var(--risk-high-text)', color: '#fff', fontSize: '10.5px', fontWeight: 700, padding: '1px 7px', borderRadius: '999px' },
      showChevron: hasChildren, chevronChar: expanded ? '▾' : '▸', chevronStyle: { color: 'var(--muted)', fontSize: '12px' },
    });
    if (hasChildren && expanded) {
      g.children.forEach((c) => {
        const active = activeTab === c.id;
        navRows.push({
          id: c.id, label: c.label, onClick: () => H.setTab(c.id),
          swatchStyle: { width: '6px', height: '6px', borderRadius: '50%', background: active ? theme.accent2 : 'transparent', border: active ? 'none' : '1px solid var(--border)', flexShrink: 0 },
          style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 12px 7px 30px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: active ? 700 : 500, background: active ? 'var(--surface-2)' : 'transparent', color: active ? 'var(--text)' : 'var(--muted)' },
          showBadge: false, badgeCount: 0, badgeStyle: {}, showChevron: false, chevronChar: '', chevronStyle: {},
        });
      });
    }
  });

  const [topbarTitle, topbarSubtitle] = TAB_TITLES[activeTab] || TAB_TITLES.overview;
  const themeToggleStyle = { width: '44px', height: '24px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: isDark ? theme.accent2 : theme.border, position: 'relative', padding: '3px', display: 'flex', justifyContent: isDark ? 'flex-end' : 'flex-start', flexShrink: 0 };
  const themeKnobStyle = { width: '18px', height: '18px', borderRadius: '50%', background: '#fff' };

  const enrichedClients = ALL_CLIENTS.map((c) => ({ ...c, lastActiveText: daysAgoText(c.lastActiveDays) }));
  const needsAttentionRaw = assignedClients.filter((c) => c.risk && !reviewedIds['risk-' + c.id]).map((c) => ({
    id: c.id, name: c.name, detail: c.risk.detail,
    sevDot: { width: '9px', height: '9px', borderRadius: '50%', background: c.risk.level === 'high' ? 'var(--risk-high-text)' : 'var(--risk-med-text)', flexShrink: 0 },
    sevChip: severityStyle(theme, c.risk.level), sevLabel: c.risk.level === 'high' ? 'High' : 'Medium', onClick: () => H.selectClient(c.id),
  }));
  const unassignedCount = enrichedClients.filter((c) => c.unassigned).length;
  const stats = {
    caseload: assignedClients.filter((c) => c.status === 'active').length, needsAttention: needsAttentionRaw.length,
    upcomingSessions: assignedClients.filter((c) => c.session.status === 'submitted').length,
    pendingReviews: assignedClients.filter((c) => c.pendingReview && !reviewedIds['practice-' + c.id]).length,
    unassigned: unassignedCount, unreadMessages, openTasks: openTasksCount,
  };
  const quickActions = [
    { label: '+ Add client', onClick: () => H.setTab('clients-caseload') },
    { label: '+ Create session note', onClick: () => H.setTab('clinical-notes') },
    { label: '+ Assign practice', onClick: () => H.setTab('clinical-practice') },
    { label: '+ Create treatment plan', onClick: () => H.setTab('clinical-plans') },
    { label: '+ Generate document', onClick: () => H.setTab('clinical-docs') },
    { label: 'Review safety alerts', onClick: () => H.setTab('safety') },
  ].map((q) => ({ ...q, style: secondaryBtnStyle }));

  const todaysSessions = assignedClients.filter((c) => c.session.status !== 'none').map((c) => ({
    id: c.id, name: c.name, time: c.session.when, statusLabel: 'Check-in ready', statusStyle: severityStyle(theme, 'low'),
    onClick: () => H.openPrepFor(c.id),
  }));
  const caseloadSnapshot = assignedClients.map((c) => ({
    id: c.id, initial: c.initial, name: c.name, woundChip: woundChip(c.primaryWound, isDark, true), woundLabel: WOUND_META[c.primaryWound].label,
    barStyle: { width: c.progressPct + '%', height: '100%', borderRadius: '4px', background: `linear-gradient(90deg, ${theme.accent2}, ${theme.emerald2})` },
    progressLabel: c.progressPct + '% through curriculum', onClick: () => H.selectClient(c.id),
  }));

  const woundFilterList = [{ id: 'all', label: 'All' }].concat(Object.keys(WOUND_META).map((k) => ({ id: k, label: WOUND_META[k].label })));
  const woundFilters = woundFilterList.map((f) => ({
    id: f.id, label: f.label, onClick: () => H.setFilterWound(f.id),
    style: { padding: '6px 12px', borderRadius: '999px', border: '1px solid ' + (filterWound === f.id ? theme.accent2 : theme.border), background: filterWound === f.id ? theme.accent2 : 'transparent', color: filterWound === f.id ? '#fff' : theme.text2, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  }));
  const clientListFiltered = enrichedClients
    .filter((c) => filterWound === 'all' || c.primaryWound === filterWound)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .map((c) => {
      const selected = c.id === selectedClientId;
      const safety = getSafety(c);
      const hasElevatedSafety = safety.riskLevel === 'high' || safety.riskLevel === 'urgent';
      return {
        id: c.id, name: c.name, initial: c.initial, lastActiveText: c.lastActiveText, email: c.email, level: c.level,
        woundChip: woundChip(c.primaryWound, isDark, true), woundLabel: WOUND_META[c.primaryWound].label, hasRisk: !!c.risk,
        hasElevatedSafety, safetyChip: severityStyle(theme, safety.riskLevel === 'urgent' ? 'high' : 'medium'), safetyLabel: safety.riskLevel === 'urgent' ? 'Urgent safety' : 'Safety risk',
        unassigned: !!c.unassigned, unassignedChip: severityStyle(theme, 'medium'),
        rowStyle: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', cursor: 'pointer', background: selected ? 'var(--surface-2)' : 'transparent', border: '1px solid ' + (selected ? theme.border : (c.unassigned ? theme.riskMedBorder : 'transparent')) },
        onClick: () => H.selectClient(c.id),
        onClaim: () => H.onClaimClient(c.id),
        onDeactivate: (e) => { e.stopPropagation(); H.onDeactivateClient(c.id); },
      };
    });

  // Clients this Advisor has deactivated (ifs_therapist_clients status =
  // 'discharged') — kept in a separate state slice rather than baseClients
  // so they never leak into caseload-wide stats, needs-attention, etc.
  const deactivatedClients = (dischargedClients || []).map((d) => ({
    id: d.id, name: d.name,
    dischargedLabel: d.dischargedAt ? `Deactivated ${new Date(d.dischargedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Deactivated',
    onReactivate: () => H.onReactivateClient(d.id),
  }));

  const hasSelectedClient = enrichedClients.some((c) => c.id === selectedClientId);
  const rawSelected = enrichedClients.find((c) => c.id === selectedClientId) || enrichedClients[0];
  const clientTabs = CLIENT_TABS.map((t) => ({
    id: t.id, label: t.label, onClick: () => H.setClientTab(t.id),
    style: { padding: '9px 14px', border: 'none', borderBottom: '2px solid ' + (activeClientTab === t.id ? theme.accent2 : 'transparent'), background: 'transparent', color: activeClientTab === t.id ? theme.text : theme.muted, fontWeight: activeClientTab === t.id ? 700 : 500, fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit' },
  }));

  let selectedClient = null;
  if (rawSelected) {
    // Write-oriented actions (notes, session prep, treatment plans, practice
    // generation, safety acknowledgment, deletion) are only available once a
    // client has been claimed — an Advisor shouldn't be able to write
    // clinical content for a client that isn't (yet) theirs.
    const canWrite = !rawSelected.unassigned;
    const rawSafety = getSafety(rawSelected);
    const rawExtraMsgs = clientMessages[rawSelected.id] || [];
    const allMsgs = [...rawSelected.messages, ...rawExtraMsgs];
    // Demo seed clients don't carry betweenSession (it's a real-mode-only
    // derived field) — fall back to a neutral empty shape rather than crash.
    const rawBS = rawSelected.betweenSession || {
      homeworkFunnel: { totalAssigned: 0, inProgress: 0, completed: 0, reviewed: 0, completionPct: 0, avgDaysToComplete: null },
      moodEntries: [], moodTrend: [], energyTrend: [], journalWeekly: [], assignments: [], freeformAssignments: [],
      hasMoodData: false, hasJournalData: false, hasHomeworkData: false,
    };
    const funnelSteps = [
      { label: 'Assigned', value: rawBS.homeworkFunnel.totalAssigned },
      { label: 'In progress', value: rawBS.homeworkFunnel.inProgress },
      { label: 'Completed', value: rawBS.homeworkFunnel.completed },
      { label: 'Reviewed', value: rawBS.homeworkFunnel.reviewed },
    ];
    const funnelMax = Math.max(...funnelSteps.map((f) => f.value), 1);
    const activePartsCounts = {};
    selfEnergyTrend.forEach((c) => (c.activeParts || []).forEach((p) => { activePartsCounts[p] = (activePartsCounts[p] || 0) + 1; }));
    const activePartsTop = Object.entries(activePartsCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const activePartsMax = activePartsTop[0]?.[1] || 1;
    const titleCase = (s) => String(s).replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    selectedClient = {
      id: rawSelected.id, name: rawSelected.name, initial: rawSelected.initial, email: rawSelected.email, phone: rawSelected.phone,
      statusLabel: rawSelected.status === 'active' ? 'Active' : 'Inactive', statusChip: severityStyle(theme, rawSelected.status === 'active' ? 'low' : 'medium'),
      unassigned: !!rawSelected.unassigned, onClaim: () => H.onClaimClient(rawSelected.id),
      woundChip: woundChip(rawSelected.primaryWound, isDark, false), woundLabel: WOUND_META[rawSelected.primaryWound].label,
      secondaryChip: woundChip(rawSelected.secondaryWound, isDark, true), secondaryLabel: WOUND_META[rawSelected.secondaryWound].label,
      lastActiveText: rawSelected.lastActiveText.toLowerCase(), streak: rawSelected.streak, level: rawSelected.level, modulesLabel: rawSelected.modulesCompleted + '/12',
      progressPct: rawSelected.progressPct,
      progressLabel: rawSelected.progressPct + '% complete · ' + rawSelected.modulesCompleted + ' of 12 modules',
      assessmentBars: Object.keys(WOUND_META).map((k) => ({
        label: WOUND_META[k].label, scoreLabel: rawSelected.scores[k] + '/20',
        barStyle: { width: Math.round((rawSelected.scores[k] / 20) * 100) + '%', height: '100%', borderRadius: '4px', background: k === rawSelected.primaryWound ? theme.accent2 : (k === rawSelected.secondaryWound ? theme.emerald2 : theme.muted) },
      })),
      goals: rawSelected.goals.map((g) => ({ title: g.title, reviewLabel: 'Review in ' + g.reviewInDays + 'd', style: { fontSize: '11px', fontWeight: 700, color: g.reviewInDays <= 7 ? theme.riskMedText : theme.muted } })),
      qaAnswers: Array.isArray(rawSelected.qaAnswers) ? rawSelected.qaAnswers : [],
      noQaAnswers: !Array.isArray(rawSelected.qaAnswers) || rawSelected.qaAnswers.length === 0,
      sessionPrepAgendas: (Array.isArray(rawSelected.agendas) ? rawSelected.agendas : []).map((a) => ({
        id: a.id, dateLabel: a.dateLabel, statusLabel: a.statusLabel, reviewed: a.reviewed,
        topics: a.topics, activeParts: a.activeParts, stuckPoints: a.stuckPoints, goalsForSession: a.goalsForSession,
        currentStressLevel: a.currentStressLevel, currentMoodLabel: a.currentMoodLabel, safetyConcerns: a.safetyConcerns,
        onMarkReviewed: () => H.onMarkAgendaReviewed(rawSelected.id, a.id),
      })),
      noSessionPrepAgendas: !Array.isArray(rawSelected.agendas) || rawSelected.agendas.length === 0,
      onDraftNoteFromPrep: () => H.draftNoteFor(rawSelected.id),
      timeline: rawSelected.timeline.map((e, i) => { const m = TIMELINE_TYPE_META[e.type] || TIMELINE_TYPE_META.note; return { id: e.id || `${e.type}-${i}`, label: e.label, date: e.date, typeLabel: m.label, typeChip: { fontSize: '10px', fontWeight: 700, color: m.color, background: isDark ? 'rgba(255,255,255,0.08)' : m.color + '14', padding: '3px 7px', borderRadius: '6px', whiteSpace: 'nowrap', height: 'fit-content' } }; }),
      clientNotes: savedNotes.filter((n) => n.clientId === rawSelected.id).map((n) => ({ ...n, statusStyle: severityStyle(theme, n.status === 'Signed & Locked' ? 'low' : 'medium'), statusLabel: n.status })),
      noNotes: !savedNotes.some((n) => n.clientId === rawSelected.id),
      plan: buildTreatmentPlan(rawSelected),
      mbc: rawSelected.mbc.map((m) => {
        const change = m.current - m.previous;
        return {
          ...m, sevChip: severityStyle(theme, m.current > m.baseline ? 'high' : (m.current === m.baseline ? 'medium' : 'low')),
          changeLabel: (change > 0 ? '+' : '') + change + ' pts', changeStyle: { fontSize: '15px', fontWeight: 700, color: change > 0 ? theme.riskHighText : (change < 0 ? theme.emerald2 : theme.muted) },
          historyPoints: m.history.map((v, i) => ({ label: 'T' + (i + 1), value: v })),
        };
      }),
      assessmentHistory: (rawSelected.assessmentHistory || []).map((entry) => ({
        id: entry.id,
        dateLabel: entry.dateLabel || (entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'),
        primaryLabel: entry.primaryWound ? WOUND_META[entry.primaryWound].label : null,
        secondaryLabel: entry.secondaryWound ? WOUND_META[entry.secondaryWound].label : null,
        subscales: entry.subscales.map((s) => ({
          wound: s.wound, label: WOUND_META[s.wound].label, scoreLabel: s.score + '/25',
          sevChip: severityStyle(theme, s.severity === 'High' ? 'high' : (s.severity === 'Moderate' ? 'medium' : 'low')), severityLabel: s.severity,
          barStyle: { width: Math.round((s.score / 25) * 100) + '%', height: '100%', borderRadius: '4px', background: s.wound === rawSelected.primaryWound ? theme.accent2 : (s.wound === rawSelected.secondaryWound ? theme.emerald2 : theme.muted) },
          deltaLabel: s.delta == null ? 'First retake' : (s.delta > 0 ? `+${s.delta} pts` : `${s.delta} pts`),
          deltaStyle: { fontSize: '11px', fontWeight: 700, color: s.delta == null ? theme.muted : (s.delta > 0 ? theme.riskHighText : (s.delta < 0 ? theme.emerald2 : theme.muted)) },
        })),
        tertiaryLabels: (entry.tertiaryWounds || []).map((w) => WOUND_META[w]?.label).filter(Boolean),
        protectorTypes: entry.protectorTypes || [],
        onRemind: canWrite ? () => H.onCreateTaskFromAssessment(rawSelected.id, entry.dateLabel || 'this assessment') : undefined,
      })),
      noAssessmentHistory: !(rawSelected.assessmentHistory || []).length,
      betweenSession: {
        funnelRows: funnelSteps.map((f) => ({ ...f, barStyle: { width: Math.round((f.value / funnelMax) * 100) + '%', height: '100%', borderRadius: '4px', background: theme.accent2 } })),
        completionPct: rawBS.homeworkFunnel.completionPct,
        avgDaysToComplete: rawBS.homeworkFunnel.avgDaysToComplete,
        hasHomeworkData: rawBS.hasHomeworkData,
        moodRows: rawBS.moodEntries.map((m) => ({
          id: m.id, dateLabel: m.dateLabel,
          moodLabel: m.mood != null ? (MOOD_LABELS[m.mood] || `${m.mood}/5`) : '—',
          energyLabel: m.energy != null ? `${m.energy}/10` : '—',
          emotionsLabel: m.emotions.length ? m.emotions.join(', ') : '—',
        })),
        noMoodEntries: rawBS.moodEntries.length === 0,
        hasMoodData: rawBS.hasMoodData,
        moodTrendPoints: rawBS.moodTrend.map((w) => ({ week: w.week, value: w.value || 0 })),
        energyTrendPoints: rawBS.energyTrend.map((w) => ({ week: w.week, value: w.value || 0 })),
        journalWeeklyPoints: rawBS.journalWeekly.map((w) => ({ week: w.week, value: w.count || 0 })),
        hasJournalData: rawBS.hasJournalData,
        assignmentRows: (rawBS.assignments || []).map((a) => ({
          id: a.id, title: a.title, status: a.status, statusLabel: a.statusLabel, instructions: a.instructions, advisorFeedback: a.advisorFeedback,
          statusChip: severityStyle(theme, a.status === 'completed' || a.status === 'reviewed' ? 'low' : 'medium'),
          dateLabel: a.completedDateLabel ? `Completed ${a.completedDateLabel}` : `Assigned ${a.assignedDateLabel}`,
          canReview: a.status === 'completed',
        })),
        noAssignments: !(rawBS.assignments || []).length,
        freeformAssignmentRows: (rawBS.freeformAssignments || []).map((a) => ({
          id: a.id, title: a.title, statusLabel: a.statusLabel, description: a.description, completionNotes: a.completionNotes,
          interactiveLines: (a.interactiveSummary || []).flatMap((section) => section.lines.map((line) => `${section.title}: ${line}`)),
          dateLabel: a.completedDateLabel ? `Completed ${a.completedDateLabel}` : (a.dueDateLabel ? `Due ${a.dueDateLabel}` : ''),
        })),
        noFreeformAssignments: !(rawBS.freeformAssignments || []).length,
        selfEnergyTrendLoading: !!selfEnergyTrendLoading,
        hasSelfEnergyData: canWrite && selfEnergyTrend.length > 0,
        selfEnergyTrendPoints: canWrite ? selfEnergyTrend.map((c) => ({
          week: c.date ? new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
          value: c.selfEnergy || 0,
        })) : [],
        activePartsRows: canWrite ? activePartsTop.map(([name, count]) => ({
          name: titleCase(name), count,
          barStyle: { width: Math.round((count / activePartsMax) * 100) + '%', height: '100%', borderRadius: '4px', background: '#6366f1' },
        })) : [],
        noActiveParts: canWrite && activePartsTop.length === 0,
        recentCheckins: canWrite ? selfEnergyTrend.slice(-7).reverse().map((c, i) => ({
          id: `${c.date}-${i}`,
          dateLabel: c.date ? new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
          selfEnergyLabel: c.selfEnergy != null ? `${c.selfEnergy}/10` : '—',
          moodLabel: c.mood != null ? (MOOD_LABELS[c.mood] || `${c.mood}/5`) : '—',
          intention: c.intention || '',
          activePartsLabels: (c.activeParts || []).slice(0, 4).map(titleCase),
          extraPartsCount: Math.max(0, (c.activeParts || []).length - 4),
        })) : [],
        noCheckins: canWrite && !selfEnergyTrendLoading && selfEnergyTrend.length === 0,
      },
      snapshot: {
        loading: !!sessionSnapshot.loading,
        error: sessionSnapshot.error || '',
        hasData: !!sessionSnapshot.data,
        data: sessionSnapshot.data,
        onGenerate: canWrite ? H.onGenerateSnapshot : undefined,
        onCopy: sessionSnapshot.data ? H.onCopySnapshot : undefined,
      },
      changeSummary: {
        loading: !!changeSummary.loading,
        error: changeSummary.error || '',
        data: changeSummary.data,
        onGenerate: canWrite ? H.onGenerateChangeSummary : undefined,
      },
      moduleInsights: {
        loading: !!moduleInsights.loading,
        error: moduleInsights.error || '',
        data: moduleInsights.data,
        onGenerate: canWrite ? H.onGenerateModuleInsights : undefined,
      },
      lifeReflections: {
        loading: !!lifeReflectionsLoading,
        canView: canWrite,
        rows: canWrite ? lifeReflections.map((r) => ({
          id: r.id,
          label: r.label,
          summary: r.summary,
          dateLabel: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
          linkedPartName: r.linkedPartName || '',
          fields: [
            ['Situation', r.situation], ['Part noticed', r.part_noticed], ['Body sensation', r.body_sensation],
            ['Emotion', r.emotion], ['Need or message', r.need_or_message], ['Self-energy response', r.self_energy_response],
            ['Next step', r.next_step],
          ].filter(([, v]) => v),
        })) : [],
        noReflections: canWrite && !lifeReflectionsLoading && lifeReflections.length === 0,
      },
      healingTimeline: {
        loading: !!healingTimeline.loading,
        error: healingTimeline.error || '',
        canView: canWrite,
        summary: healingTimeline.data?.summary || null,
        rows: canWrite ? (healingTimeline.data?.timeline || []) : [],
        noEvents: canWrite && !healingTimeline.loading && !healingTimeline.error && (healingTimeline.data?.timeline || []).length === 0,
      },
      unburdening: {
        loading: !!unburdeningRecordLoading,
        canView: canWrite,
        hasRecord: canWrite && !!unburdeningRecord,
        noRecord: canWrite && !unburdeningRecordLoading && !unburdeningRecord,
        stepLabel: canWrite && unburdeningRecord ? `Step ${unburdeningRecord.currentStep} of ${UNBURDENING_TOTAL_STEPS}` : '',
        stepTitle: canWrite && unburdeningRecord ? (UNBURDENING_STEP_TITLES[unburdeningRecord.currentStep - 1] || '') : '',
        progressPct: canWrite && unburdeningRecord ? Math.round((unburdeningRecord.currentStep / UNBURDENING_TOTAL_STEPS) * 100) : 0,
        completed: canWrite && !!unburdeningRecord?.completed,
        statusChip: severityStyle(theme, unburdeningRecord?.completed ? 'low' : 'medium'),
        completedDateLabel: unburdeningRecord?.completedAt ? new Date(unburdeningRecord.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
        element: unburdeningRecord?.element ? titleCase(unburdeningRecord.element) : '',
        quality: unburdeningRecord?.quality || '',
        bodyLocation: unburdeningRecord?.bodyLocation || '',
        moodAfterLabel: unburdeningRecord?.moodAfter != null ? (UNBURDENING_MOOD_LABELS[unburdeningRecord.moodAfter] || `${unburdeningRecord.moodAfter}/5`) : '',
      },
      coTherapyProgress: {
        loading: !!coTherapyProgressLoading,
        canView: canWrite,
        rows: canWrite ? coTherapyProgress.map((a) => ({
          id: a.id,
          title: a.activityTitle,
          completed: a.completed,
          statusLabel: a.completed ? 'Completed' : 'In progress',
          statusChip: severityStyle(theme, a.completed ? 'low' : 'medium'),
          dateLabel: a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        })) : [],
        noActivity: canWrite && !coTherapyProgressLoading && coTherapyProgress.length === 0,
      },
      curriculumReflections: {
        loading: !!curriculumReflectionsLoading,
        canView: canWrite,
        rows: canWrite ? curriculumReflections.map((r) => ({
          id: r.id,
          moduleTitle: r.moduleTitle,
          dateLabel: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
          fields: [
            ['Insight', r.insight], ['Part noticed', r.partNoticed],
            ['Self-energy quality', r.selfEnergyQuality], ['Next practice', r.nextPractice],
          ].filter(([, v]) => v),
        })) : [],
        noReflections: canWrite && !curriculumReflectionsLoading && curriculumReflections.length === 0,
      },
      personalizedCurriculum: {
        loading: !!personalizedCurriculumLoading,
        canView: canWrite,
        rows: canWrite ? personalizedCurriculum.map((m) => ({
          id: m.id,
          order: m.order,
          title: m.title,
          description: m.description,
          woundLabel: m.woundFocus ? titleCase(m.woundFocus) : '',
          durationLabel: m.estimatedMinutes ? `${m.estimatedMinutes} min` : '',
          difficultyLabel: m.difficultyLevel ? titleCase(m.difficultyLevel) : '',
        })) : [],
        noModules: canWrite && !personalizedCurriculumLoading && personalizedCurriculum.length === 0,
      },
      parts: rawSelected.parts.map((p) => ({ ...p, catChip: partChip(p.category, isDark), catLabel: PART_CAT_META[p.category].label, barStyle: { width: p.activation + '%', height: '100%', borderRadius: '4px', background: PART_CAT_META[p.category].color } })),
      partRelationships: canWrite && Array.isArray(rawSelected.partRelationships) ? rawSelected.partRelationships : [],
      noPartRelationships: !canWrite || !Array.isArray(rawSelected.partRelationships) || rawSelected.partRelationships.length === 0,
      partSuggestions: {
        loading: !!partSuggestionsLoading,
        canView: canWrite,
        hasData: canWrite && !!partSuggestions,
        noData: canWrite && !partSuggestionsLoading && !partSuggestions,
        pendingPartsCount: partSuggestions?.pendingPartsCount || 0,
        pendingRelationshipsCount: partSuggestions?.pendingRelationshipsCount || 0,
        hasPending: canWrite && !!partSuggestions && (partSuggestions.pendingPartsCount > 0 || partSuggestions.pendingRelationshipsCount > 0),
        topSuggestions: canWrite && partSuggestions ? partSuggestions.topSuggestions.map((s) => {
          const cat = SUGGESTION_TYPE_TO_CATEGORY[s.type] || 'manager';
          return { id: s.id, name: s.name, role: s.role, sourceLabel: s.sourceLabel, catChip: partChip(cat, isDark), catLabel: PART_CAT_META[cat].label };
        }) : [],
        reviewLink: `/advisor/inner-system-map/${rawSelected.id}`,
      },
      clientPractices: assignedPractices.filter((a) => a.clientName === rawSelected.name),
      noPractices: !assignedPractices.some((a) => a.clientName === rawSelected.name),
      safety: {
        levelLabel: RISK_LEVEL_LABEL[rawSafety.riskLevel], levelChip: severityStyle(theme, RISK_LEVEL_TO_SEV[rawSafety.riskLevel]),
        protective: rawSafety.protective, riskFactors: rawSafety.riskFactors,
        hasPlan: rawSafety.hasPlan, noPlan: !rawSafety.hasPlan,
        planSteps: rawSafety.safetyPlan ? rawSafety.safetyPlan.steps : ['Safety plan created — add steps with the client next session.'],
        planReview: rawSafety.safetyPlan ? rawSafety.safetyPlan.reviewDate : 'TBD',
        contacts: rawSafety.contacts, noContacts: rawSafety.contacts.length === 0,
        ackStatusText: rawSafety.acknowledged ? 'Acknowledged by Dr. Rivera' : 'Awaiting Advisor acknowledgment',
        ackBtnLabel: rawSafety.acknowledged ? 'Acknowledged' : 'Acknowledge review',
        ackBtnStyle: rawSafety.acknowledged ? secondaryBtnStyle : primaryBtnStyle,
        onAcknowledge: canWrite ? () => H.onAcknowledgeSafety(rawSelected.id) : undefined,
        onCreatePlan: canWrite ? () => H.onCreateSafetyPlan(rawSelected.id) : undefined,
        onAddToNote: canWrite ? () => H.draftNoteFor(rawSelected.id) : undefined,
        onCreateTask: canWrite ? () => H.onCreateTaskFromSafety(rawSelected.id) : undefined,
      },
      messages: allMsgs.map((m, idx) => ({ idx, authorLabel: m.from === 'client' ? rawSelected.name : 'You', text: m.text, date: m.date, readTick: m.from === 'advisor' ? '✓✓' : '', onDelete: () => H.onDeleteMessage(rawSelected.id, idx, m.id), bubbleStyle: { alignSelf: m.from === 'advisor' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '10px 14px', borderRadius: '14px', background: m.from === 'advisor' ? theme.accent2 : theme.surface2, color: m.from === 'advisor' ? '#fff' : theme.text } })).filter((m) => !((deletedMessageIdx[rawSelected.id] || {})[m.idx])),
      canWrite,
      onDraftNote: canWrite ? () => H.draftNoteFor(rawSelected.id) : undefined,
      onOpenPrep: canWrite ? () => H.openPrepFor(rawSelected.id) : undefined,
      // _detailLoaded is only ever explicitly false while the real per-client
      // detail fetch is in flight (advisorWorkspaceLoader.mapClientRow); demo
      // seed clients never set it, so treat "undefined" as already-ready.
      onExportReport: canWrite && rawSelected._detailLoaded !== false ? () => H.onExportReport(rawSelected.id) : undefined,
      exportReportLoading: canWrite && rawSelected._detailLoaded === false,
      onOpenPlan: canWrite ? () => H.openPlanFor(rawSelected.id) : undefined,
      onOpenPractice: canWrite ? () => H.openPracticeFor(rawSelected.id) : undefined,
      onStartDelete: canWrite ? () => H.onStartDelete(rawSelected.id) : undefined,
    };
  }

  const reviewItems = [];
  assignedClients.forEach((c) => {
    if (c.risk && !reviewedIds['risk-' + c.id]) reviewItems.push({ id: 'risk-' + c.id, sevChip: severityStyle(theme, c.risk.level), sevLabel: c.risk.level === 'high' ? 'High' : 'Medium', title: RISK_TYPE_TITLE[c.risk.type] || RISK_TYPE_TITLE.inactivity, detail: c.risk.detail, clientName: c.name, when: daysAgoText(c.risk.daysAgo), actionLabel: 'Mark reviewed', onResolve: () => H.markReviewed('risk-' + c.id), onOpenClient: () => H.selectClient(c.id) });
    if (c.pendingReview && !reviewedIds['practice-' + c.id]) reviewItems.push({ id: 'practice-' + c.id, sevChip: severityStyle(theme, 'low'), sevLabel: 'Practice', title: c.pendingReview.label + ' submitted', detail: 'Awaiting your review and feedback.', clientName: c.name, when: daysAgoText(c.pendingReview.daysAgo), actionLabel: 'Mark reviewed', onResolve: () => H.markReviewed('practice-' + c.id), onOpenClient: () => H.selectClient(c.id) });
  });
  const reviewQueueEmpty = reviewItems.length === 0;

  const safetyRows = assignedClients.map((c) => {
    const s = getSafety(c);
    return {
      id: c.id, initial: c.initial, name: c.name, riskFactorsSummary: s.riskFactors.length ? s.riskFactors.slice(0, 2).join('; ') : 'No active risk factors',
      levelLabel: RISK_LEVEL_LABEL[s.riskLevel], levelChip: severityStyle(theme, RISK_LEVEL_TO_SEV[s.riskLevel]),
      ackStatusText: s.acknowledged ? 'Acknowledged' : 'Awaiting acknowledgment', ackBtnLabel: s.acknowledged ? 'Acknowledged' : 'Acknowledge',
      ackBtnStyle: s.acknowledged ? secondaryBtnStyle : primaryBtnStyle, onAcknowledge: () => H.onAcknowledgeSafety(c.id),
      onOpenClient: () => { H.selectClient(c.id); H.setClientTab('safety'); },
    };
  }).sort((a, b) => (a.levelLabel === 'High' ? -1 : 1) - (b.levelLabel === 'High' ? -1 : 1));

  const prepList = assignedClients.filter((c) => c.session.status !== 'none').map((c) => ({
    id: c.id, initial: c.initial, name: c.name, time: c.session.when, statusStyle: severityStyle(theme, 'low'), statusLabel: 'Submitted',
    isExpanded: sessionPrepOpenId === c.id, qaAnswers: Array.isArray(c.qaAnswers) ? c.qaAnswers : [], onToggle: () => H.toggleSessionPrep(c.id), onDraftNote: () => H.draftNoteFor(c.id),
    agendas: (Array.isArray(c.agendas) ? c.agendas : []).map((a) => ({
      id: a.id, dateLabel: a.dateLabel, statusLabel: a.statusLabel, reviewed: a.reviewed,
      topics: a.topics, activeParts: a.activeParts, stuckPoints: a.stuckPoints, goalsForSession: a.goalsForSession,
      currentStressLevel: a.currentStressLevel, currentMoodLabel: a.currentMoodLabel, safetyConcerns: a.safetyConcerns,
      onMarkReviewed: () => H.onMarkAgendaReviewed(c.id, a.id),
    })),
  }));

  // Never fall back to an unassigned client for co-therapy — an Advisor
  // shouldn't be able to open a shared-case thread for a client that isn't
  // (yet) theirs.
  const coTherapyClient = assignedClients.find((c) => c.id === 'c2') || assignedClients[0] || null;
  const hasCoTherapyClient = !!coTherapyClient;
  const coTherapy = coTherapyClient ? {
    collabName: 'Dr. Patel · Clinical Supervisor', collabInitial: 'DP', clientName: coTherapyClient.name, thread: coTherapyThread,
    onToggleShare: H.toggleCoTherapyShare,
    shareTrackStyle: { width: '40px', height: '22px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: coTherapyShare ? theme.emerald2 : theme.border, position: 'relative', padding: '3px', display: 'flex', justifyContent: coTherapyShare ? 'flex-end' : 'flex-start' },
    shareKnobStyle: { width: '16px', height: '16px', borderRadius: '50%', background: '#fff' }, onRequestConsult: () => H.onSendCoTherapyMessage(),
  } : null;

  // Searches both the client name and every message in the thread — a
  // thread whose name doesn't match but contains a matching message still
  // surfaces, with that message shown as the preview instead of the last
  // one, so it's clear why the thread matched.
  const messageSearchLower = (messageSearch || '').trim().toLowerCase();
  const threadList = enrichedClients
    .map((c) => {
      // Same index-based delete map onDeleteMessage/activeThread already use
      // (built over this identical [...c.messages, ...clientMessages] order)
      // — a deleted message must not resurface via search or as a preview.
      const deletedIdx = deletedMessageIdx[c.id] || {};
      const all = [...c.messages, ...(clientMessages[c.id] || [])].filter((_, idx) => !deletedIdx[idx]);
      const last = all[all.length - 1];
      const hasUnread = hasUnreadFor(c);
      const nameMatches = !messageSearchLower || c.name.toLowerCase().includes(messageSearchLower);
      const matchingMessage = messageSearchLower && !nameMatches
        ? [...all].reverse().find((m) => m.text.toLowerCase().includes(messageSearchLower))
        : null;
      return {
        id: c.id, initial: c.initial, name: c.name,
        preview: matchingMessage ? matchingMessage.text : (last ? last.text : ''),
        hasUnread, onClick: () => H.setActiveThread(c.id),
        hasMessages: all.length > 0,
        rowStyle: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '14px', cursor: 'pointer', background: activeThreadId === c.id ? theme.surface2 : 'transparent' },
        matches: nameMatches || !!matchingMessage,
      };
    })
    .filter((t) => t.hasMessages && t.matches);
  const noThreadsMatchSearch = messageSearchLower.length > 0 && threadList.length === 0;
  const activeThreadClient = enrichedClients.find((c) => c.id === activeThreadId) || enrichedClients[0];
  const activeThreadMsgs = [...activeThreadClient.messages, ...(clientMessages[activeThreadClient.id] || [])];
  const activeThreadDeleted = deletedMessageIdx[activeThreadClient.id] || {};
  const activeThread = {
    name: activeThreadClient.name,
    messages: activeThreadMsgs.map((m, idx) => ({ idx, authorLabel: m.from === 'client' ? activeThreadClient.name : 'You', text: m.text, date: m.date, readTick: m.from === 'advisor' ? '✓✓' : '', onDelete: () => H.onDeleteMessage(activeThreadClient.id, idx, m.id), bubbleStyle: { alignSelf: m.from === 'advisor' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '10px 14px', borderRadius: '14px', background: m.from === 'advisor' ? theme.accent2 : theme.surface2, color: m.from === 'advisor' ? '#fff' : theme.text } })).filter((m) => !activeThreadDeleted[m.idx]),
    onAddToNote: () => H.draftNoteFor(activeThreadClient.id), onAddToTask: H.addTaskFromMessage,
  };

  const TASK_FILTER_LIST = [{ id: 'open', label: 'Open' }, { id: 'done', label: 'Completed' }, { id: 'all', label: 'All' }];
  const taskFilters = TASK_FILTER_LIST.map((f) => ({ id: f.id, label: f.label, onClick: () => H.setTaskFilter(f.id), style: { padding: '6px 12px', borderRadius: '999px', border: '1px solid ' + (taskFilter === f.id ? theme.accent2 : theme.border), background: taskFilter === f.id ? theme.accent2 : 'transparent', color: taskFilter === f.id ? '#fff' : theme.text2, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' } }));
  const taskRows = tasks.filter((t) => taskFilter === 'all' || t.status === taskFilter).map((t) => {
    const client = enrichedClients.find((c) => c.id === t.clientId);
    const done = t.status === 'done';
    return {
      id: t.id, title: t.title, client: client ? client.name : '', category: t.category, due: t.due,
      onToggle: () => H.toggleTask(t.id), checkChar: done ? '✓' : '', checkStyle: { width: '20px', height: '20px', borderRadius: '6px', border: '1.5px solid ' + (done ? theme.emerald2 : theme.border), background: done ? theme.emerald2 : 'transparent', color: '#fff', cursor: 'pointer', fontSize: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
      onArchive: () => H.onArchiveTask(t.id),
      titleStyle: { fontSize: '13.5px', fontWeight: 600, color: done ? theme.muted : theme.text, textDecoration: done ? 'line-through' : 'none' },
      priorityLabel: t.priority, priorityChip: severityStyle(theme, t.priority === 'high' ? 'high' : (t.priority === 'medium' ? 'medium' : 'low')),
      rowStyle: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', background: theme.surface, border: '1px solid ' + theme.border, boxShadow: theme.shadow },
    };
  });
  const noTasks = taskRows.length === 0;

  // Curated IFS reading/exercise/media library (src/data/resourceLibraryData.js)
  // — previously only reachable from the standalone /resource-library page,
  // never surfaced inside the workspace an Advisor actually works from.
  const resourceTypeFilters = RESOURCE_TYPES.map((t) => ({
    id: t.id, label: t.label, onClick: () => H.setResourceType(t.id),
    style: { padding: '6px 12px', borderRadius: '999px', border: '1px solid ' + (resourceType === t.id ? theme.accent2 : theme.border), background: resourceType === t.id ? theme.accent2 : 'transparent', color: resourceType === t.id ? '#fff' : theme.text2, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  }));
  const resourceWoundFilters = [{ id: 'all', label: 'All wounds' }, ...Object.keys(WOUND_META).map((w) => ({ id: w, label: WOUND_META[w].label }))].map((w) => ({
    id: w.id, label: w.label, onClick: () => H.setResourceWound(w.id),
    style: { padding: '6px 12px', borderRadius: '999px', border: '1px solid ' + (resourceWound === w.id ? theme.emerald2 : theme.border), background: resourceWound === w.id ? theme.emerald2 : 'transparent', color: resourceWound === w.id ? '#fff' : theme.text2, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  }));
  const resourceStageFilters = [{ id: 'all', label: 'All stages' }, ...HEALING_STAGES].map((s) => ({
    id: s.id, label: s.label, onClick: () => H.setResourceStage(s.id),
    style: { padding: '6px 12px', borderRadius: '999px', border: '1px solid ' + (resourceStage === s.id ? theme.accent2 : theme.border), background: resourceStage === s.id ? theme.accent2 : 'transparent', color: resourceStage === s.id ? '#fff' : theme.text2, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  }));
  const resourceSearchLower = (resourceSearch || '').trim().toLowerCase();
  const resourceRows = RESOURCE_LIBRARY.filter((r) => {
    const matchesSearch = !resourceSearchLower
      || r.title.toLowerCase().includes(resourceSearchLower)
      || r.author.toLowerCase().includes(resourceSearchLower)
      || r.description.toLowerCase().includes(resourceSearchLower);
    const matchesType = resourceType === 'all' || r.type === resourceType;
    const matchesWound = resourceWound === 'all' || r.wounds.includes(resourceWound);
    const matchesStage = resourceStage === 'all' || r.stage === resourceStage;
    return matchesSearch && matchesType && matchesWound && matchesStage;
  }).map((r) => ({
    id: r.id, title: r.title, author: r.author, description: r.description,
    typeLabel: RESOURCE_TYPES.find((t) => t.id === r.type)?.label || r.type,
    stageLabel: HEALING_STAGES.find((s) => s.id === r.stage)?.label || r.stage,
    woundChips: r.wounds.map((w) => ({ id: w, label: WOUND_META[w]?.label || w, style: woundChip(w, isDark, true) })),
    isAppLink: !!r.appLink, href: r.appLink || r.link,
  }));
  const noResources = resourceRows.length === 0;

  const clientOptions = assignedClients.map((c) => ({ id: c.id, name: c.name }));
  const currentTemplate = TEMPLATE_OPTIONS.find((t) => t.id === noteDraft.template) || TEMPLATE_OPTIONS[0];
  const allGoals = assignedClients.flatMap((c) => c.goals.map((g) => ({ clientName: c.name, title: g.title, reviewLabel: 'Review in ' + g.reviewInDays + 'd', style: { fontSize: '11px', fontWeight: 700, color: g.reviewInDays <= 7 ? theme.riskMedText : theme.muted, whiteSpace: 'nowrap' } })));
  // Never fall back to an unassigned client for treatment-plan creation.
  const planClient = assignedClients.find((c) => c.id === planClientId) || assignedClients[0] || null;
  const hasPlanClient = !!planClient;
  const treatmentPlan = planClient ? buildTreatmentPlan(planClient) : null;

  const woundOptions = Object.keys(WOUND_META).map((k) => ({ id: k, label: WOUND_META[k].label }));
  const practiceTypeOptions = Object.keys(PRACTICE_TYPE_META).map((k) => ({ id: k, label: PRACTICE_TYPE_META[k].label }));

  const lessons = LESSON_TITLES.map((title, i) => {
    const num = i + 1;
    const completedCount = assignedClients.filter((c) => c.modulesCompleted >= num).length;
    const total = Math.max(1, assignedClients.length);
    const assigned = !!assignedLessons[i];
    return { number: num, title, completionLabel: completedCount + '/' + assignedClients.length + ' completed', barStyle: { width: Math.round((completedCount / total) * 100) + '%', height: '100%', borderRadius: '4px', background: theme.emerald2 }, assignLabel: assigned ? 'Assigned to caseload' : 'Assign to caseload', onToggleAssign: () => H.toggleAssignLesson(i), assignBtnStyle: { marginTop: '4px', background: assigned ? theme.emerald2 : 'var(--surface-2)', color: assigned ? '#fff' : theme.text2, border: '1px solid ' + (assigned ? theme.emerald2 : theme.border), padding: '8px 14px', borderRadius: '10px', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit' } };
  });

  const mbcCaseloadRows = assignedClients.map((c) => {
    const primary = c.mbc[0];
    const change = primary ? primary.current - primary.previous : 0;
    return { id: c.id, name: c.name, onClick: () => { H.selectClient(c.id); H.setClientTab('mbc'); }, summary: primary ? `${primary.name}: ${primary.current} (${primary.severity})` : 'No measures on file', trendLabel: change > 0 ? 'Worsening' : (change < 0 ? 'Improving' : 'Stable'), trendChip: severityStyle(theme, change > 0 ? 'high' : (change < 0 ? 'low' : 'medium')) };
  });

  const partsClientFilters = [{ id: 'all', label: 'All clients' }].concat(assignedClients.map((c) => ({ id: c.id, label: c.name }))).map((f) => ({ id: f.id, label: f.label, onClick: () => H.setPartsClientFilter(f.id), style: { padding: '6px 12px', borderRadius: '999px', border: '1px solid ' + (partsClientFilter === f.id ? theme.accent2 : theme.border), background: partsClientFilter === f.id ? theme.accent2 : 'transparent', color: partsClientFilter === f.id ? '#fff' : theme.text2, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' } }));
  const partsAllRows = assignedClients.filter((c) => partsClientFilter === 'all' || c.id === partsClientFilter).flatMap((c) => c.parts.map((p) => ({ ...p, clientName: c.name, catChip: partChip(p.category, isDark), catLabel: PART_CAT_META[p.category].label, barStyle: { width: p.activation + '%', height: '100%', borderRadius: '4px', background: PART_CAT_META[p.category].color } })));

  const docTypeOptions = DOC_TYPES;
  const docSourceRows = DOC_SOURCES.map((s) => ({ id: s.id, label: s.label, desc: s.desc, checked: !!docSources[s.id], onToggle: () => H.toggleDocSource(s.id) }));
  const clientReportRows = (clientReports || []).map((r) => ({
    id: r.id,
    title: r.title || (DOC_TYPES.find((t) => t.id === r.report_type)?.label || 'Report'),
    date: r.generated_at ? new Date(r.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
    sectionsSummary: Array.isArray(r.sections_included) ? r.sections_included.join(', ') : '',
  }));
  const noClientReports = !clientReportsLoading && clientReportRows.length === 0;
  const caseloadReportRows = (caseloadReports || []).map((r) => ({
    id: r.id,
    title: r.title || (DOC_TYPES.find((t) => t.id === r.report_type)?.label || 'Report'),
    clientName: ALL_CLIENTS.find((c) => c.id === r.client_id)?.name || 'Unknown client',
    date: r.generated_at ? new Date(r.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
    sectionsSummary: Array.isArray(r.sections_included) ? r.sections_included.join(', ') : '',
  }));
  const noCaseloadReports = !caseloadReportsLoading && caseloadReportRows.length === 0;

  const total = Math.max(1, assignedClients.length);
  const woundDistribution = Object.keys(WOUND_META).map((k) => { const count = assignedClients.filter((c) => c.primaryWound === k).length; return { label: WOUND_META[k].label, count, barStyle: { width: Math.round((count / total) * 100) + '%', height: '100%', borderRadius: '5px', background: theme.accent2 } }; });
  const maxStreak = Math.max(1, ...assignedClients.map((c) => c.streak));
  const engagementList = [...assignedClients].sort((a, b) => b.streak - a.streak).map((c) => ({ name: c.name, streakLabel: c.streak + ' days', barStyle: { width: Math.round((c.streak / maxStreak) * 100) + '%', height: '100%', borderRadius: '5px', background: theme.emerald2 } }));
  const moodPattern = [6, 6.5, 5, 6, 7, 7.5];
  const moodTrend = moodPattern.map((v, i) => ({ label: 'Wk ' + (i + 1), barStyle: { width: '60%', height: Math.round((v / 10) * 100) + '%', borderRadius: '6px 6px 0 0', background: `linear-gradient(180deg, ${theme.accent2}, ${theme.emerald2})` } }));
  const mostImproved = [...assignedClients].sort((a, b) => b.progressPct - a.progressPct)[0];
  const leastEngaged = [...assignedClients].sort((a, b) => b.lastActiveDays - a.lastActiveDays)[0];
  const insightBulletsRaw = [
    { text: `${needsAttentionRaw.length} client${needsAttentionRaw.length === 1 ? '' : 's'} currently flagged for risk — review before their next session.`, level: needsAttentionRaw.length > 0 ? 'high' : 'low' },
  ];
  if (mostImproved) insightBulletsRaw.push({ text: `${mostImproved.name} is furthest along at ${mostImproved.progressPct}% through the curriculum.`, level: 'low' });
  if (leastEngaged) insightBulletsRaw.push({ text: `${leastEngaged.name} has been inactive for ${leastEngaged.lastActiveDays} days — consider a check-in nudge.`, level: leastEngaged.lastActiveDays >= 7 ? 'medium' : 'low' });
  insightBulletsRaw.push({ text: `Caseload average Self-Energy trended up from ${moodPattern[0]}/10 to ${moodPattern[moodPattern.length - 1]}/10 over 6 weeks.`, level: 'low' });
  if (unassignedCount > 0) insightBulletsRaw.unshift({ text: `${unassignedCount} client${unassignedCount === 1 ? '' : 's'} signed up and ${unassignedCount === 1 ? 'is' : 'are'} waiting to be added to a caseload — see Clients → Caseload.`, level: 'medium' });
  const insightBullets = insightBulletsRaw.map((b) => ({ text: b.text, dotStyle: { width: '8px', height: '8px', borderRadius: '50%', marginTop: '4px', flexShrink: 0, background: b.level === 'high' ? theme.riskHighText : (b.level === 'medium' ? theme.riskMedText : theme.emerald2) } }));

  const engagementRows = assignedClients.filter((c) => !engagementDismissed[c.id]).map((c) => {
    const status = engagementStatusFor(c.lastActiveDays);
    const sev = status === 'Highly engaged' || status === 'Engaged' ? 'low' : (status === 'Reduced engagement' ? 'medium' : 'high');
    const activitySummary = c.lastActiveDays >= 900 ? 'No activity recorded' : `${c.lastActiveDays}d since last activity`;
    const expanded = !!engagementExpanded[c.id];
    // Every bullet below reads off fields the workspace already loads for
    // this client (real streak/level, homework completion, pending review,
    // risk detection) — no new data source, just previously-hidden detail
    // behind the one-line summary chip.
    const evidence = [
      { label: 'Last activity', value: c.lastActiveDays >= 900 ? 'No activity recorded' : daysAgoText(c.lastActiveDays) },
      { label: 'Practice streak', value: c.streak > 0 ? `${c.streak} day${c.streak === 1 ? '' : 's'} (level ${c.level})` : 'No active streak' },
      { label: 'Homework completion', value: `${c.progressPct}% (${c.modulesCompleted} module${c.modulesCompleted === 1 ? '' : 's'} completed)` },
      { label: 'Pending review', value: c.pendingReview ? `${c.pendingReview.label} · ${daysAgoText(c.pendingReview.daysAgo)}` : 'None' },
      { label: 'Risk flag', value: c.risk ? `${RISK_TYPE_TITLE[c.risk.type] || c.risk.type} (${c.risk.level})` : 'None detected' },
    ];
    return {
      id: c.id, initial: c.initial, name: c.name, indicatorsSummary: `${activitySummary} · ${c.pendingReview ? '1 pending review' : 'no pending items'}`,
      statusLabel: status, statusChip: severityStyle(theme, sev), onOutreach: () => H.setActiveThread(c.id), dismissLabel: 'Dismiss flag', onDismiss: () => H.onDismissEngagement(c.id),
      expanded, evidence, expandLabel: expanded ? 'Hide details' : 'View details', onToggleExpand: () => H.toggleEngagementExpanded(c.id),
    };
  });

  const settingsTogglesList = Object.keys(NOTIFICATION_PREF_META).map((key) => {
    const on = notificationPrefs[key];
    return { key, label: NOTIFICATION_PREF_META[key].label, desc: NOTIFICATION_PREF_META[key].desc, onClick: () => H.toggleSetting(key), trackStyle: { width: '40px', height: '22px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: on ? theme.emerald2 : theme.border, position: 'relative', padding: '3px', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start' }, knobStyle: { width: '16px', height: '16px', borderRadius: '50%', background: '#fff' } };
  });

  const accessToggleTrackStyle = (on, disabled) => ({
    width: '40px', height: '22px', borderRadius: '999px', border: 'none', cursor: disabled ? 'default' : 'pointer',
    background: on ? theme.emerald2 : theme.border, position: 'relative', padding: '3px',
    display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', opacity: disabled ? 0.5 : 1,
  });
  const accessToggleKnobStyle = { width: '16px', height: '16px', borderRadius: '50%', background: '#fff' };
  const accessControlClientOptions = assignedClients.map((c) => ({ id: c.id, name: c.name }));
  const accessControlClient = ALL_CLIENTS.find((c) => c.id === accessControlClientId) || null;
  const accessControlEffectiveForm = accessControlForm || { modules: [], assessments: [], features: {} };
  const accessControlModuleRows = ACCESS_MODULE_SEQUENCE.map((m) => {
    const on = accessControlFullAccess || accessControlEffectiveForm.modules.includes(m.id);
    return {
      key: m.id, label: `${m.order}. ${m.title}`, onClick: () => H.toggleAccessControlModule(m.id),
      disabled: accessControlFullAccess, trackStyle: accessToggleTrackStyle(on, accessControlFullAccess), knobStyle: accessToggleKnobStyle,
    };
  });
  const accessControlAssessmentRows = Object.keys(ASSESSMENT_LABELS).map((key) => {
    const on = accessControlFullAccess || accessControlEffectiveForm.assessments.includes(key);
    return {
      key, label: ASSESSMENT_LABELS[key], onClick: () => H.toggleAccessControlAssessment(key),
      disabled: accessControlFullAccess, trackStyle: accessToggleTrackStyle(on, accessControlFullAccess), knobStyle: accessToggleKnobStyle,
    };
  });
  const accessControlFeatureRows = Object.keys(FEATURE_LABELS).map((key) => {
    const on = accessControlFullAccess || accessControlEffectiveForm.features[key] !== false;
    return {
      key, label: FEATURE_LABELS[key], onClick: () => H.toggleAccessControlFeature(key),
      disabled: accessControlFullAccess, trackStyle: accessToggleTrackStyle(on, accessControlFullAccess), knobStyle: accessToggleKnobStyle,
    };
  });
  const accessControlFullAccessTrackStyle = accessToggleTrackStyle(accessControlFullAccess, false);

  // Same ifs_clients (staff roles) + active ifs_therapist_clients rows
  // AdminHub.jsx's loadData already queries — grouped by therapist here into
  // an expandable caseload list with a Reassign action per client.
  const teamRows = (teamTherapists || []).map((t) => {
    const caseload = (teamAssignments || []).filter((a) => a.therapist_id === t.id);
    return {
      id: t.id, name: t.name || 'Unnamed Advisor', email: t.email || '', caseloadCount: caseload.length,
      clients: caseload.map((a) => ({
        key: `${a.therapist_id}-${a.client_id}`, clientId: a.client_id, name: a.client_name || a.client_id,
        assignedLabel: a.assigned_at ? new Date(a.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'date unknown',
        onReassign: () => H.onSelectReassignTarget(t.id, a.client_id, a.client_name || a.client_id),
      })),
    };
  });
  const noTeamRows = !teamLoading && teamRows.length === 0;
  const hasReassignTarget = !!(reassignTherapistId && reassignClientId);
  const reassignTargetOptions = (teamTherapists || []).filter((t) => t.id !== reassignTherapistId).map((t) => ({ id: t.id, name: t.name || t.email || 'Unnamed Advisor' }));

  const emailTemplateOptions = getAvailableTemplates();

  const deletingClient = S.deletingClientId ? ALL_CLIENTS.find((c) => c.id === S.deletingClientId) : null;
  const deleteConfirmMatches = !!(deletingClient && S.deleteConfirmText.trim() === deletingClient.name);

  const liveSessionRows = S.liveSessions.map((l) => {
    const client = ALL_CLIENTS.find((c) => c.id === l.clientId);
    return {
      id: l.id, initial: client ? client.initial : '?', name: client ? client.name : 'Unknown client', activity: l.activity, startedAt: l.startedAt,
      statusLabel: l.status === 'active' ? 'Active' : 'Paused', statusChip: severityStyle(theme, l.status === 'active' ? 'low' : 'medium'),
      toggleLabel: l.status === 'active' ? 'Pause' : 'Resume', onToggle: () => H.toggleLiveSession(l.id), onEnd: () => H.endLiveSession(l.id),
      onOpenClient: () => H.selectClient(l.clientId),
    };
  });
  const noLiveSessions = liveSessionRows.length === 0;

  const NOTIF_DOT_META = {
    // Demo-data categories.
    risk: theme.riskHighText, practice: theme.emerald2, engagement: theme.riskMedText, message: '#0d9488', assessment: '#2563eb',
    // Real ifs_notifications.notification_type values.
    homework_assigned: theme.emerald2, homework_started: theme.emerald2, homework_completed: theme.emerald2, homework_reviewed: theme.emerald2,
    session_agenda_submitted: '#0d9488', session_agenda_reviewed: '#0d9488',
    treatment_goal_created: '#2563eb', treatment_goal_updated: '#2563eb', treatment_goal_completed: '#2563eb',
    live_session_started: theme.riskMedText, live_session_joined: theme.riskMedText, live_session_ended: theme.riskMedText,
    report_generated: '#2563eb', therapist_note_created: theme.muted, general_update: theme.muted,
  };
  const notificationRows = [...S.notifications].sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1)).map((n) => {
    const client = ALL_CLIENTS.find((c) => c.id === n.clientId);
    return {
      id: n.id, title: n.title, message: n.message, date: n.date,
      typeDot: { width: '9px', height: '9px', borderRadius: '50%', marginTop: '4px', background: NOTIF_DOT_META[n.type] || theme.muted, flexShrink: 0 },
      priorityChip: severityStyle(theme, n.priority), priorityLabel: n.priority,
      rowStyle: { background: n.read ? 'var(--surface)' : 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '12px', boxShadow: 'var(--shadow)' },
      clientName: client ? client.name : '',
      onOpenClient: client ? () => H.onOpenNotifClient(n.clientId, n.id) : undefined,
      onMarkRead: () => H.onMarkNotifRead(n.id), showMarkRead: !n.read,
    };
  });
  const noNotifications = notificationRows.length === 0;

  const practiceBatchRows = S.practiceBatchResults.map((item) => ({ ...item, onUse: () => H.onUseBatchPractice(item) }));
  const quickMessages = QUICK_MESSAGES.map((text) => ({ text, onClick: () => H.applyQuickMessage(text) }));

  return {
    rootStyle, navRows, topbarTitle, topbarSubtitle, search, onSearch: H.onSearch, toggleTheme: H.toggleTheme, themeToggleStyle, themeKnobStyle,
    modeToggle, isDark,
    isOverview: activeTab === 'overview', isClientsCaseload: activeTab === 'clients-caseload', isClientsAnalytics: activeTab === 'clients-analytics' || activeTab === 'insights-overview', isClientsEngagement: activeTab === 'clients-engagement',
    isSafety: activeTab === 'safety', isReview: activeTab === 'review', isSessionsPrep: activeTab === 'sessions-prep', isSessionsCotherapy: activeTab === 'sessions-cotherapy',
    isSessionsLive: activeTab === 'sessions-live',
    isMessages: activeTab === 'messages', isNotifications: activeTab === 'notifications', isTasks: activeTab === 'tasks',
    isClientTabSnapshot: activeClientTab === 'snapshot', isClientTabChangeSummary: activeClientTab === 'changeSummary',
    isClientTabModuleInsights: activeClientTab === 'moduleInsights',
    isClientTabBetweenSession: activeClientTab === 'betweenSession', isClientTabLifeReflections: activeClientTab === 'lifeReflections',
    isClientTabHealingJourney: activeClientTab === 'healingJourney', isClientTabCurriculumReflections: activeClientTab === 'curriculumReflections',
    isClinicalNotes: activeTab === 'clinical-notes', isClinicalPlans: activeTab === 'clinical-plans', isClinicalMbc: activeTab === 'clinical-mbc', isClinicalParts: activeTab === 'clinical-parts',
    isClinicalPractice: activeTab === 'clinical-practice', isClinicalPracticeInteractive: activeTab === 'clinical-practice-interactive',
    isClinicalLessons: activeTab === 'clinical-lessons', isClinicalCurriculumBuilder: activeTab === 'clinical-curriculum-builder', isClinicalDocs: activeTab === 'clinical-docs',
    isClinicalResources: activeTab === 'clinical-resources',
    isInsightsReports: activeTab === 'insights-reports', isAdminAccess: activeTab === 'admin-access', isAdminTeam: activeTab === 'admin-team', isAdminAudit: activeTab === 'admin-audit', isSettings: activeTab === 'settings',
    isJourney: viewMode === 'journey', isCommandMode: viewMode === 'command',
    disclaimerStyle,
    stats, quickActions, needsAttention: needsAttentionRaw, noAttentionNeeded: needsAttentionRaw.length === 0,
    todaysSessions, caseloadSnapshot, goToReview: () => H.setTab('review'), goToClients: () => H.setTab('clients-caseload'),
    goToMessages: () => H.setTab('messages'), goToTasks: () => H.setTab('tasks'),
    woundFilters, clientListFiltered, hasSelectedClient, selectedClient, clientTabs,
    deactivatedClients, hasDeactivatedClients: deactivatedClients.length > 0,
    isClientTabOverview: activeClientTab === 'overview', isClientTabSessionPrep: activeClientTab === 'sessionPrep', isClientTabAssessments: activeClientTab === 'assessments', isClientTabTimeline: activeClientTab === 'timeline', isClientTabNotes: activeClientTab === 'notes',
    isClientTabPlan: activeClientTab === 'plan', isClientTabMbc: activeClientTab === 'mbc', isClientTabParts: activeClientTab === 'parts',
    isClientTabPractices: activeClientTab === 'practices', isClientTabSafety: activeClientTab === 'safety', isClientTabMessages: activeClientTab === 'messages',
    primaryBtnStyle, secondaryBtnStyle, selectStyle,
    reviewItems, reviewQueueEmpty, safetyRows,
    prepList, coTherapy, hasCoTherapyClient, coTherapyMessage, onCoTherapyMessageChange: H.onCoTherapyMessageChange, onSendCoTherapyMessage: H.onSendCoTherapyMessage,
    clientMessageDraft, onClientMessageChange: H.onClientMessageChange, onSendClientMessage: H.onSendClientMessage,
    threadList, activeThread, messageSearch, onMessageSearchChange: H.onMessageSearchChange, noThreadsMatchSearch,
    taskFilters, taskRows, noTasks, newTaskTitle, newTaskClientId, onNewTaskTitleChange: H.onNewTaskTitleChange, onNewTaskClientChange: H.onNewTaskClientChange, onAddTask: H.onAddTask,
    resourceSearch, onResourceSearchChange: H.onResourceSearchChange, resourceTypeFilters, resourceWoundFilters, resourceStageFilters, resourceRows, noResources,
    noteDraft: { ...noteDraft, placeholder: currentTemplate.placeholder }, clientOptions, templateOptions: TEMPLATE_OPTIONS,
    onNoteClientChange: H.onNoteClientChange, onNoteTemplateChange: H.onNoteTemplateChange, onNoteTextChange: H.onNoteTextChange, onSaveNote: H.onSaveNote, onSignNote: H.onSignNote, onAiNoteSaved: H.onAiNoteSaved, isDemo,
    homeworkFeedbackDraft, onHomeworkAssigned: H.onHomeworkAssigned, onHomeworkFeedbackChange: H.onHomeworkFeedbackChange,
    onMarkHomeworkReviewed: H.onMarkHomeworkReviewed, onArchiveHomework: H.onArchiveHomework,
    savedNotes: savedNotes.map((n) => ({ ...n, statusStyle: severityStyle(theme, n.status === 'Signed & Locked' ? 'low' : 'medium'), statusLabel: n.status })), allGoals,
    planClientId, onPlanClientChange: H.onPlanClientChange, treatmentPlan, hasPlanClient,
    practiceForm, woundOptions, practiceTypeOptions, onPracticeClientChange: H.onPracticeClientChange, onPracticeWoundChange: H.onPracticeWoundChange, onPracticeTypeChange: H.onPracticeTypeChange,
    onGeneratePractice: H.onGeneratePractice, hasGeneratedPractice: generatedPractice != null, generatedPractice,
    practiceGenerating, practiceError,
    onPracticeDraftChange: H.onPracticeDraftChange, onRejectPractice: H.onRejectPractice,
    onAssignPractice: H.onAssignPractice, assignedPractices, noAssignedPractices: assignedPractices.length === 0,
    lessons, mbcCaseloadRows, partsClientFilters, partsAllRows,
    docForm, docTypeOptions, docSourceRows,
    onDocClientChange: H.onDocClientChange, onDocTypeChange: H.onDocTypeChange, onDocDateChange: H.onDocDateChange,
    onGenerateDoc: H.onGenerateDoc, onOpenGeneratedDoc: H.onOpenGeneratedDoc,
    onDownloadGeneratedDocHtml: H.onDownloadGeneratedDocHtml, onDownloadGeneratedDocPdf: H.onDownloadGeneratedDocPdf,
    docExporting: !!docExporting, docExportError: docExportError || '',
    hasGeneratedDoc: !!generatedDoc, generatedDoc, docGenerating: !!docGenerating, docError,
    clientReportRows, noClientReports, clientReportsLoading: !!clientReportsLoading,
    caseloadReportRows, noCaseloadReports, caseloadReportsLoading: !!caseloadReportsLoading, onExportCaseloadReportsCsv: H.onExportCaseloadReportsCsv,
    woundDistribution, engagementList, moodTrend, insightBullets, reports, onGenerateReport: H.onGenerateReport,
    engagementRows,
    settingsToggles: settingsTogglesList, notificationPrefsSaving: !!notificationPrefsSaving,
    showNewClientForm: S.showNewClientForm, newClientForm: S.newClientForm, newClientResult: S.newClientResult, onToggleNewClientForm: H.toggleNewClientForm,
    onExportCaseloadCsv: H.onExportCaseloadCsv,
    onNewClientNameChange: H.onNewClientFieldChange('name'), onNewClientEmailChange: H.onNewClientFieldChange('email'), onNewClientPhoneChange: H.onNewClientFieldChange('phone'), onNewClientSendEmailChange: H.onNewClientFieldChange('sendEmail'), onCreateClient: H.onCreateClient,
    deletingClientId: S.deletingClientId, deletingClientName: deletingClient ? deletingClient.name : '', deleteConfirmText: S.deleteConfirmText, deleteConfirmMatches, notDeleteConfirmMatches: !deleteConfirmMatches, deleteConfirmOpacity: deleteConfirmMatches ? 1 : 0.5,
    onCancelDelete: H.onCancelDelete, onDeleteConfirmChange: H.onDeleteConfirmChange, onConfirmDelete: H.onConfirmDelete,
    liveSessionRows, noLiveSessions,
    notificationRows, noNotifications, notifUnreadCount, onMarkAllNotifsRead: H.onMarkAllNotifsRead,
    practiceGuidance: S.practiceGuidance, onPracticeGuidanceChange: H.onPracticeGuidanceChange, onGeneratePracticeBatch: H.onGeneratePracticeBatch, practiceBatchRows, hasPracticeBatch: practiceBatchRows.length > 0,
    quickMessages,
    accessControlClientOptions, accessControlClientId, hasAccessControlClient: !!accessControlClient,
    accessControlClientName: accessControlClient ? accessControlClient.name : '',
    onAccessControlClientChange: H.onAccessControlClientChange,
    accessControlFullAccess, accessControlFullAccessTrackStyle, accessControlFullAccessKnobStyle: accessToggleKnobStyle,
    onToggleAccessControlFullAccess: H.toggleAccessControlFullAccess,
    accessControlModuleRows, accessControlAssessmentRows, accessControlFeatureRows,
    accessControlSaving: !!accessControlSaving, accessControlSaved,
    onSaveAccessControl: H.onSaveAccessControl,
    teamRows, noTeamRows, teamLoading: !!teamLoading, onRefreshTeam: H.onRefreshTeam,
    hasReassignTarget, reassignClientName, reassignToTherapistId, reassignTargetOptions, reassignSaving: !!reassignSaving,
    onCancelReassign: H.onCancelReassign, onReassignToTherapistChange: H.onReassignToTherapistChange, onSaveReassignment: H.onSaveReassignment,
    editClientId, editClientForm, editClientSaving: !!editClientSaving, editClientError: editClientError || '',
    onStartEditClient: H.onStartEditClient, onCancelEditClient: H.onCancelEditClient, onEditClientFieldChange: H.onEditClientFieldChange, onSaveEditClient: H.onSaveEditClient,
    emailClientId, emailTemplateId, emailTemplateOptions, emailPreview, emailLoading: !!emailLoading, emailSending: !!emailSending, emailSent: !!emailSent, emailError: emailError || '',
    onOpenEmailClient: H.onOpenEmailClient, onCloseEmailClient: H.onCloseEmailClient, onEmailTemplateChange: H.onEmailTemplateChange, onSendClientEmail: H.onSendClientEmail,
    newClientCreating: !!S.newClientCreating,
  };
}

const AW_CSS = `
.aw-root ::-webkit-scrollbar { width: 8px; height: 8px; }
.aw-root ::-webkit-scrollbar-thumb { background: rgba(120,113,108,0.35); border-radius: 8px; }
.aw-nav:hover { background: var(--surface-2) !important; color: var(--text) !important; }
.aw-primary:hover { filter: brightness(1.08); }
.aw-row:hover { background: var(--surface-2); }
`;

function Btn({ hoverClass = '', style, children, ...rest }) {
  return <button className={hoverClass} style={style} {...rest}>{children}</button>;
}

function ImportPanel({ title, desc, to, linkLabel }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', boxShadow: 'var(--shadow)', textAlign: 'center', maxWidth: '640px' }}>
      <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: '18px', color: 'var(--text)' }}>{title}</div>
      <div style={{ fontSize: '13.5px', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>{desc}</div>
      {to && (
        <Link to={to} style={{ display: 'inline-block', marginTop: '18px', background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '10px 18px', borderRadius: '12px', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}>
          {linkLabel || 'Open tool'} →
        </Link>
      )}
    </div>
  );
}

export function WorkspaceShell({ view: v }) {
  return (
    <div className="aw-root" style={v.rootStyle}>
      <style>{AW_CSS}</style>

      <aside style={{ width: '264px', flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '22px 14px', gap: '18px', height: '100vh', position: 'sticky', top: 0, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2px 8px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent), var(--emerald))', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: '16px', color: 'var(--text)', lineHeight: 1.15 }}>Luminous Self</span>
            <span style={{ fontSize: '10.5px', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Advisor Workspace</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '2px', padding: '3px', borderRadius: '12px', background: 'var(--surface-2)', flexShrink: 0 }}>
          <button onClick={v.modeToggle.onCommand} style={v.modeToggle.commandStyle}>Command Center</button>
          <button onClick={v.modeToggle.onJourney} style={v.modeToggle.journeyStyle}>My IFS Journey</button>
        </div>
        {v.isCommandMode && (
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {v.navRows.map((item) => (
              <button key={item.id} className="aw-nav" onClick={item.onClick} style={item.style}>
                <div style={item.swatchStyle} />
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                {item.showBadge && <span style={item.badgeStyle}>{item.badgeCount}</span>}
                {item.showChevron && <span style={item.chevronStyle}>{item.chevronChar}</span>}
              </button>
            ))}
          </nav>
        )}
        {v.isJourney && (
          <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '8px 10px', lineHeight: 1.5 }}>Your personal parts-work practice — separate from your caseload.</div>
        )}
        <div style={{ marginTop: 'auto', padding: '12px', borderRadius: '16px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>DR</div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Dr. Rivera</span>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Advisor</span>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: '21px', color: 'var(--text)' }}>{v.topbarTitle}</span>
            <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{v.topbarSubtitle}</span>
          </div>
          <div style={{ flex: 1 }} />
          <input value={v.search} onChange={v.onSearch} placeholder="Search clients..." style={{ width: '220px', padding: '9px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '13.5px', fontFamily: 'inherit' }} />
          <button onClick={v.toggleTheme} style={v.themeToggleStyle}><div style={v.themeKnobStyle} /></button>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 48px' }}>
          {v.isJourney && <ImportPanel title="My IFS Journey" desc="Your personal parts-work practice space, kept separate from your caseload. Continue your own Self-energy practice, journaling, and parts mapping." to="/my-ifs" linkLabel="Open My IFS Work" />}
          {v.isCommandMode && <CommandCenter v={v} />}
        </main>
      </div>
    </div>
  );
}

const CARD = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '22px', boxShadow: 'var(--shadow)' };
const FR = { fontFamily: "'Fraunces',serif", fontWeight: 600, color: 'var(--text)' };

function CommandCenter({ v }) {
  return (
    <>
      {v.isOverview && <Overview v={v} />}
      {v.isClientsCaseload && <ClientsCaseload v={v} />}
      {v.isReview && <ReviewView v={v} />}
      {v.isSafety && <SafetyView v={v} />}
      {v.isMessages && <MessagesView v={v} />}
      {v.isTasks && <TasksView v={v} />}
      {v.isNotifications && <NotificationsView v={v} />}
      {v.isSessionsPrep && <SessionsPrepView v={v} />}
      {v.isSessionsCotherapy && <CoTherapyView v={v} />}
      {v.isSessionsLive && <LiveView v={v} />}
      {v.isClinicalNotes && <ClinicalNotesView v={v} />}
      {v.isClinicalPlans && <PlansView v={v} />}
      {v.isClinicalMbc && <MbcView v={v} />}
      {v.isClinicalParts && <PartsView v={v} />}
      {v.isClinicalPractice && <PracticeView v={v} />}
      {v.isClinicalLessons && <LessonsView v={v} />}
      {v.isClinicalResources && <ResourceLibraryView v={v} />}
      {v.isClinicalDocs && <DocsView v={v} />}
      {v.isClientsAnalytics && <AnalyticsView v={v} />}
      {v.isClientsEngagement && <EngagementView v={v} />}
      {v.isSettings && <SettingsView v={v} />}
      {v.isClinicalPracticeInteractive && <ImportPanel title="Interactive Practice Builder" desc="Build guided, multi-step interactive modules — more than static prompts — and assign them to clients." to="/curriculum" linkLabel="Open Curriculum" />}
      {v.isClinicalCurriculumBuilder && <ImportPanel title="Custom Curriculum" desc="Design and assign an individualized curriculum path per client from the module library." to="/assessment-builder" linkLabel="Open Builder" />}
      {v.isInsightsReports && <CaseloadReportsView v={v} />}
      {v.isAdminAccess && <AccessControlView v={v} />}
      {v.isAdminTeam && <AdminTeamView v={v} />}
      {v.isAdminAudit && <ImportPanel title="Audit & Consent Log" desc="Chronological record of clinical actions and consent events." to="/admin-hub" linkLabel="Open Admin Hub" />}
    </>
  );
}

function Overview({ v }) {
  const statCards = [
    { key: 'caseload', color: 'var(--accent)', value: v.stats.caseload, label: 'Active caseload' },
    { key: 'needs', color: 'var(--risk-high-text)', value: v.stats.needsAttention, label: 'Need attention' },
    { key: 'upcoming', color: 'var(--emerald)', value: v.stats.upcomingSessions, label: 'Upcoming sessions' },
    { key: 'pending', color: 'var(--risk-med-text)', value: v.stats.pendingReviews, label: 'Pending reviews' },
    { key: 'messages', color: 'var(--accent-2)', value: v.stats.unreadMessages, label: 'Unread messages', onClick: () => v.goToMessages() },
    { key: 'tasks', color: 'var(--emerald-2)', value: v.stats.openTasks, label: 'Open tasks', onClick: () => v.goToTasks() },
  ];
  const hasUnassigned = (v.stats.unassigned || 0) > 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hasUnassigned ? statCards.length + 1 : statCards.length},1fr)`, gap: '16px' }}>
        {statCards.map((s) => {
          const Tag = s.onClick ? 'button' : 'div';
          return (
            <Tag key={s.key} type={s.onClick ? 'button' : undefined} onClick={s.onClick} style={{ ...CARD, borderRadius: '18px', padding: '18px 20px', textAlign: 'left', cursor: s.onClick ? 'pointer' : 'default', font: 'inherit' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color, marginBottom: '10px' }} />
              <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Fraunces',serif" }}>{s.value}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
            </Tag>
          );
        })}
        {hasUnassigned && (
          <button type="button" onClick={v.goToClients} style={{ ...CARD, borderRadius: '18px', padding: '18px 20px', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--risk-med-text)', marginBottom: '10px' }} />
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Fraunces',serif" }}>{v.stats.unassigned}</div>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>New — awaiting claim</div>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {v.quickActions.map((q) => (<button key={q.label} onClick={q.onClick} style={q.style}>{q.label}</button>))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '18px', alignItems: 'start' }}>
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ ...FR, fontSize: '16px' }}>Needs attention</span>
            <button onClick={v.goToReview} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>View review queue →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {v.needsAttention.map((row) => (
              <div key={row.id} className="aw-row" onClick={row.onClick} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', cursor: 'pointer' }}>
                <div style={row.sevDot} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>{row.name}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '1px' }}>{row.detail}</div>
                </div>
                <span style={row.sevChip}>{row.sevLabel}</span>
              </div>
            ))}
            {v.noAttentionNeeded && <div style={{ padding: '14px', fontSize: '13px', color: 'var(--muted)' }}>Nothing urgent right now.</div>}
          </div>
        </div>

        <div style={CARD}>
          <span style={{ ...FR, fontSize: '16px' }}>Today &amp; upcoming</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
            {v.todaysSessions.map((row) => (
              <div key={row.id} onClick={row.onClick} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', cursor: 'pointer', background: 'var(--surface-2)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{row.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{row.time}</div>
                </div>
                <span style={row.statusStyle}>{row.statusLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ ...FR, fontSize: '16px' }}>Caseload at a glance</span>
          <button onClick={v.goToClients} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Open Clients →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
          {v.caseloadSnapshot.map((c) => (
            <div key={c.id} onClick={c.onClick} style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', cursor: 'pointer', background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>{c.initial}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  <span style={c.woundChip}>{c.woundLabel}</span>
                </div>
              </div>
              <div style={{ height: '6px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden' }}><div style={c.barStyle} /></div>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '5px' }}>{c.progressLabel}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientsCaseload({ v }) {
  const sc = v.selectedClient;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={v.onToggleNewClientForm} style={{ ...v.secondaryBtnStyle, flex: 1 }}>+ New client</button>
          <button onClick={v.onExportCaseloadCsv} style={v.secondaryBtnStyle}>Export CSV</button>
        </div>
        {v.showNewClientForm && (
          <div style={{ ...CARD, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input value={v.newClientForm.name} onChange={v.onNewClientNameChange} placeholder="Full name" style={inp()} />
            <input value={v.newClientForm.email} onChange={v.onNewClientEmailChange} placeholder="Email" style={inp()} />
            <input value={v.newClientForm.phone} onChange={v.onNewClientPhoneChange} placeholder="Phone" style={inp()} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-2)', cursor: 'pointer' }}>
              <input type="checkbox" checked={v.newClientForm.sendEmail} onChange={v.onNewClientSendEmailChange} />Send welcome email with PIN
            </label>
            <button className="aw-primary" onClick={v.onCreateClient} disabled={v.newClientCreating || !v.newClientForm.name.trim()} style={v.primaryBtnStyle}>{v.newClientCreating ? 'Creating…' : 'Create client'}</button>
            {v.newClientResult && (
              <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--surface-2)', fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                {v.newClientResult.name} created · PIN: <strong>{v.newClientResult.pin}</strong>
                {v.newClientResult.emailSent && <> · Welcome email sent.</>}
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {v.woundFilters.map((f) => (<button key={f.id} onClick={f.onClick} style={f.style}>{f.label}</button>))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {v.clientListFiltered.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button type="button" onClick={c.onClick} style={{ ...c.rowStyle, flex: 1, minWidth: 0, textAlign: 'left', font: 'inherit' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent-2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>{c.initial}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                  {c.email && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                    {c.unassigned ? (
                      <span style={c.unassignedChip}>Unassigned</span>
                    ) : (
                      <span style={c.woundChip}>{c.woundLabel}</span>
                    )}
                    <span style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>Lvl {c.level}</span>
                    {c.hasElevatedSafety && <span style={c.safetyChip}>{c.safetyLabel}</span>}
                    <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{c.lastActiveText}</span>
                  </div>
                </div>
                {c.hasRisk && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--risk-high-text)', flexShrink: 0 }} />}
              </button>
              {c.unassigned && (
                <button type="button" onClick={c.onClaim} title="Add this client to my caseload" style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>Claim</button>
              )}
              {!v.isDemo && !c.unassigned && (
                <button type="button" onClick={c.onDeactivate} title="Deactivate this client's assignment to your caseload" style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>Deactivate</button>
              )}
            </div>
          ))}
        </div>

        {v.hasDeactivatedClients && (
          <div style={{ ...CARD, borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>Deactivated ({v.deactivatedClients.length})</span>
            {v.deactivatedClients.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{d.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{d.dischargedLabel}</div>
                </div>
                <button type="button" onClick={d.onReactivate} style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, padding: '7px 10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>Reactivate</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {v.hasSelectedClient && sc && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--accent-2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '18px', flexShrink: 0 }}>{sc.initial}</div>
                <div>
                  <div style={{ ...FR, fontSize: '20px' }}>{sc.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
                    <span style={sc.woundChip}>{sc.woundLabel}</span>
                    <span style={sc.secondaryChip}>{sc.secondaryLabel}</span>
                    <span style={sc.statusChip}>{sc.statusLabel}</span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{sc.email} · {sc.phone}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="aw-primary" onClick={sc.onDraftNote} disabled={!sc.canWrite} style={{ ...v.primaryBtnStyle, opacity: sc.canWrite ? 1 : 0.5, cursor: sc.canWrite ? 'pointer' : 'not-allowed' }}>Draft session note</button>
                <button onClick={sc.onOpenPrep} disabled={!sc.canWrite} style={{ ...v.secondaryBtnStyle, opacity: sc.canWrite ? 1 : 0.5, cursor: sc.canWrite ? 'pointer' : 'not-allowed' }}>Session prep</button>
                <button onClick={sc.onExportReport} disabled={!sc.onExportReport} title={sc.exportReportLoading ? 'Client detail is still loading — try again in a moment.' : undefined} style={{ ...v.secondaryBtnStyle, opacity: sc.onExportReport ? 1 : 0.5, cursor: sc.onExportReport ? 'pointer' : 'not-allowed' }}>{sc.exportReportLoading ? 'Export report (loading…)' : 'Export report'}</button>
                <button onClick={() => v.onStartEditClient(sc.id)} disabled={!sc.canWrite} style={{ ...v.secondaryBtnStyle, opacity: sc.canWrite ? 1 : 0.5, cursor: sc.canWrite ? 'pointer' : 'not-allowed' }}>Edit</button>
                <button onClick={() => v.onOpenEmailClient(sc.id)} disabled={!sc.canWrite} style={{ ...v.secondaryBtnStyle, opacity: sc.canWrite ? 1 : 0.5, cursor: sc.canWrite ? 'pointer' : 'not-allowed' }}>Email</button>
              </div>
            </div>
            {v.editClientId === sc.id && (
              <div style={{ marginTop: '14px', padding: '14px', borderRadius: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}>Edit client</span>
                <input value={v.editClientForm.name} onChange={v.onEditClientFieldChange('name')} placeholder="Full name" style={inp()} />
                <input value={v.editClientForm.email} onChange={v.onEditClientFieldChange('email')} placeholder="Email" style={inp()} />
                <input value={v.editClientForm.phone} onChange={v.onEditClientFieldChange('phone')} placeholder="Phone" style={inp()} />
                {v.editClientError && <div style={{ fontSize: '12px', color: 'var(--risk-high-text)' }}>{v.editClientError}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={v.onCancelEditClient} style={v.secondaryBtnStyle}>Cancel</button>
                  <button className="aw-primary" onClick={v.onSaveEditClient} disabled={v.editClientSaving || !v.editClientForm.name.trim()} style={v.primaryBtnStyle}>{v.editClientSaving ? 'Saving…' : 'Save changes'}</button>
                </div>
              </div>
            )}
            {v.emailClientId === sc.id && (
              <div style={{ marginTop: '14px', padding: '14px', borderRadius: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}>Email {sc.name}</span>
                  <button onClick={v.onCloseEmailClient} style={v.secondaryBtnStyle}>Close</button>
                </div>
                {v.emailError && <div style={{ fontSize: '12px', color: 'var(--risk-high-text)' }}>{v.emailError}</div>}
                {v.emailTemplateOptions.length > 0 && !v.emailError.includes('does not have an email') && (
                  <>
                    <select value={v.emailTemplateId} onChange={v.onEmailTemplateChange} style={v.selectStyle}>
                      {v.emailTemplateOptions.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
                    </select>
                    {v.emailLoading && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Loading preview…</div>}
                    {v.emailPreview && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                        <iframe srcDoc={v.emailPreview.html} title="Email preview" style={{ width: '100%', height: '260px', border: 'none', background: '#fff' }} sandbox="allow-same-origin" />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button className="aw-primary" onClick={v.onSendClientEmail} disabled={!v.emailPreview || v.emailSending || v.isDemo} style={v.primaryBtnStyle}>{v.emailSending ? 'Sending…' : 'Send email'}</button>
                      {v.emailSent && <span style={{ fontSize: '12px', color: 'var(--emerald-2)', fontWeight: 600 }}>Sent!</span>}
                      {v.isDemo && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Sign in to send.</span>}
                    </div>
                  </>
                )}
              </div>
            )}
            {sc.unassigned && (
              <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '14px', background: 'var(--risk-med-bg)', border: '1px solid var(--risk-med-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--risk-med-text)' }}>This client isn’t assigned to an Advisor yet — clinical detail is limited until claimed.</span>
                <button type="button" onClick={sc.onClaim} style={v.primaryBtnStyle}>Add to my caseload</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '22px', marginTop: '18px', flexWrap: 'wrap' }}>
              <div><span style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text)' }}>{sc.streak}</span><span style={{ fontSize: '12px', color: 'var(--muted)' }}> day streak</span></div>
              <div><span style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text)' }}>{sc.level}</span><span style={{ fontSize: '12px', color: 'var(--muted)' }}> level</span></div>
              <div><span style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text)' }}>{sc.modulesLabel}</span><span style={{ fontSize: '12px', color: 'var(--muted)' }}> modules</span></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
            {v.clientTabs.map((t) => (<button key={t.id} onClick={t.onClick} style={t.style}>{t.label}</button>))}
          </div>

          {v.isClientTabOverview && <ClientOverviewTab v={v} sc={sc} />}
          {v.isClientTabSessionPrep && <ClientSessionPrepTab v={v} sc={sc} />}
          {v.isClientTabAssessments && <AssessmentHistoryTab history={sc.assessmentHistory} empty={sc.noAssessmentHistory} secondaryBtnStyle={v.secondaryBtnStyle} />}
          {v.isClientTabSnapshot && <SnapshotTab snapshot={sc.snapshot} primaryBtnStyle={v.primaryBtnStyle} secondaryBtnStyle={v.secondaryBtnStyle} />}
          {v.isClientTabChangeSummary && <ChangeSummaryTab changeSummary={sc.changeSummary} primaryBtnStyle={v.primaryBtnStyle} />}
          {v.isClientTabModuleInsights && <ModuleInsightsTab moduleInsights={sc.moduleInsights} primaryBtnStyle={v.primaryBtnStyle} />}
          {v.isClientTabBetweenSession && (
            <BetweenSessionTab
              bs={sc.betweenSession} clientId={sc.id} isDemo={v.isDemo} unassigned={sc.unassigned}
              feedbackDraft={v.homeworkFeedbackDraft} onFeedbackChange={v.onHomeworkFeedbackChange}
              onMarkReviewed={v.onMarkHomeworkReviewed} onArchive={v.onArchiveHomework}
              onAssigned={() => v.onHomeworkAssigned(sc.id)}
            />
          )}
          {v.isClientTabLifeReflections && <LifeReflectionsTab lr={sc.lifeReflections} onClaim={sc.onClaim} />}
          {v.isClientTabHealingJourney && <HealingJourneyTab ht={sc.healingTimeline} ub={sc.unburdening} ct={sc.coTherapyProgress} onClaim={sc.onClaim} />}
          {v.isClientTabCurriculumReflections && <CurriculumReflectionsTab cr={sc.curriculumReflections} pc={sc.personalizedCurriculum} onClaim={sc.onClaim} />}
          {v.isClientTabTimeline && (
            <div style={CARD}>
              <span style={{ ...FR, fontSize: '15px' }}>Unified timeline</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {sc.timeline.map((e) => (
                  <div key={e.id} style={{ display: 'flex', gap: '12px' }}>
                    <span style={e.typeChip}>{e.typeLabel}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', color: 'var(--text)' }}>{e.label}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>{e.date}</div>
                    </div>
                  </div>
                ))}
                {sc.timeline.length === 0 && <div style={{ fontSize: '13px', color: 'var(--muted)' }}>No activity recorded yet.</div>}
              </div>
            </div>
          )}
          {v.isClientTabNotes && (
            <div style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ ...FR, fontSize: '15px' }}>Session notes</span>
                <button onClick={sc.onDraftNote} disabled={!sc.canWrite} style={{ ...v.secondaryBtnStyle, opacity: sc.canWrite ? 1 : 0.5, cursor: sc.canWrite ? 'pointer' : 'not-allowed' }}>New note</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                {sc.clientNotes.map((n, i) => (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}><span>{n.templateLabel}</span><span style={{ color: 'var(--muted)', fontWeight: 500 }}>{n.date}</span></div>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}>{n.text}</div>
                    <span style={n.statusStyle}>{n.statusLabel}</span>
                  </div>
                ))}
                {sc.noNotes && <div style={{ padding: '14px', fontSize: '13px', color: 'var(--muted)' }}>No notes yet for this client.</div>}
              </div>
            </div>
          )}
          {v.isClientTabPlan && <PlanCard plan={sc.plan} onOpen={sc.onOpenPlan} secondaryBtnStyle={v.secondaryBtnStyle} />}
          {v.isClientTabMbc && <MbcCards mbc={sc.mbc} />}
          {v.isClientTabParts && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <PartsGrid parts={sc.parts} cols={2} showClient={false} />
              {sc.partSuggestions.canView && (
                <div style={CARD}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ ...FR, fontSize: '15px' }}>Suggested parts</span>
                    <Link to={sc.partSuggestions.reviewLink} target="_blank" rel="noreferrer" style={{ fontSize: '11px', fontWeight: 700, padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', textDecoration: 'none' }}>Review in Inner System Map</Link>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Signals noticed in this client's assessments, module responses, and reflections — reviewed and accepted or dismissed collaboratively with the client on their Inner System Map.</div>
                  {sc.partSuggestions.loading && <div style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>Loading suggested parts…</div>}
                  {sc.partSuggestions.noData && <div style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>No pending suggestions right now.</div>}
                  {sc.partSuggestions.hasData && !sc.partSuggestions.loading && (
                    <>
                      <div style={{ display: 'flex', gap: '18px', marginTop: '12px', flexWrap: 'wrap' }}>
                        <div><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Pending parts</span><div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>{sc.partSuggestions.pendingPartsCount}</div></div>
                        <div><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Pending relationships</span><div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>{sc.partSuggestions.pendingRelationshipsCount}</div></div>
                      </div>
                      {!sc.partSuggestions.hasPending ? (
                        <p style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>No pending suggestions right now.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                          {sc.partSuggestions.topSuggestions.map((s) => (
                            <div key={s.id} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '4px' }}>{s.role}</div>
                                {s.sourceLabel && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Source: {s.sourceLabel}</div>}
                              </div>
                              <span style={s.catChip}>{s.catLabel}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              <div style={CARD}>
                <span style={{ ...FR, fontSize: '15px' }}>Part relationships</span>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>How this client has mapped their parts to each other in their Inner System Map.</div>
                {sc.noPartRelationships ? (
                  <p style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>No part relationships mapped yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                    {sc.partRelationships.map((r) => (
                      <div key={r.id} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text)' }}><strong>{r.fromName}</strong> {r.typeLabel} <strong>{r.toName}</strong></div>
                        {r.label && <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '4px' }}>{r.label}</div>}
                        {r.description && <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '4px', lineHeight: 1.5 }}>{r.description}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {v.isClientTabPractices && (
            <div style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ ...FR, fontSize: '15px' }}>Assigned practices</span>
                <button onClick={sc.onOpenPractice} disabled={!sc.canWrite} style={{ ...v.secondaryBtnStyle, opacity: sc.canWrite ? 1 : 0.5, cursor: sc.canWrite ? 'pointer' : 'not-allowed' }}>Generate new</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                {sc.clientPractices.map((a, i) => (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}><span>{a.typeLabel}</span><span style={{ color: 'var(--muted)', fontWeight: 500 }}>{a.date}</span></div>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}>{a.text}</div>
                  </div>
                ))}
                {sc.noPractices && <div style={{ padding: '14px', fontSize: '13px', color: 'var(--muted)' }}>No practices assigned yet.</div>}
              </div>
            </div>
          )}
          {v.isClientTabSafety && <ClientSafetyTab v={v} sc={sc} />}
          {v.isClientTabMessages && <ClientMessagesTab v={v} sc={sc} />}
        </div>
      )}
    </div>
  );
}

function inp() {
  return { padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit' };
}

function ClientOverviewTab({ v, sc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ ...CARD, borderRadius: '20px', padding: '20px' }}>
          <span style={{ ...FR, fontSize: '15px' }}>Wound assessment</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '14px' }}>
            {sc.assessmentBars.map((b, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-2)', marginBottom: '3px' }}><span>{b.label}</span><span>{b.scoreLabel}</span></div>
                <div style={{ height: '7px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden' }}><div style={b.barStyle} /></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...CARD, borderRadius: '20px', padding: '20px' }}>
          <span style={{ ...FR, fontSize: '15px' }}>Curriculum progress</span>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <ProgressRing value={sc.progressPct} label="Complete" size={96} strokeWidth={9} color="#059669" />
            <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{sc.progressLabel}</div>
          </div>
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Growth goals</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {sc.goals.map((g, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>{g.title}</span>
                  <span style={g.style}>{g.reviewLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ ...CARD, borderRadius: '20px', padding: '20px' }}>
        <span style={{ ...FR, fontSize: '15px' }}>Recent check-in &amp; journal responses</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
          {sc.qaAnswers.map((qa, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-2)' }}>{qa.question}</div>
              <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '4px', lineHeight: 1.5 }}>“{qa.answer}”</div>
            </div>
          ))}
          {sc.noQaAnswers && <div style={{ fontSize: '13px', color: 'var(--muted)' }}>No check-in or module responses recorded yet.</div>}
        </div>
      </div>
      <div style={{ border: '1px solid var(--risk-high-border)', borderRadius: '20px', padding: '20px', background: 'var(--risk-high-bg)' }}>
        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--risk-high-text)' }}>Danger zone</span>
        <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '4px' }}>Removes this client from your caseload. This deactivates their assignment to you — no records are deleted.</div>
        <button onClick={sc.onStartDelete} disabled={!sc.canWrite} style={{ marginTop: '10px', background: 'var(--risk-high-text)', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: sc.canWrite ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: sc.canWrite ? 1 : 0.5 }}>Remove client</button>
        {v.deletingClientId && (
          <div style={{ marginTop: '14px', padding: '14px', borderRadius: '14px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12.5px', color: 'var(--text-2)' }}>Type <strong>{v.deletingClientName}</strong> to confirm removal.</div>
            <input value={v.deleteConfirmText} onChange={v.onDeleteConfirmChange} placeholder="Client name" style={{ ...inp(), width: '100%', marginTop: '8px' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={v.onCancelDelete} style={v.secondaryBtnStyle}>Cancel</button>
              <button onClick={v.onConfirmDelete} disabled={v.notDeleteConfirmMatches} style={{ background: 'var(--risk-high-text)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', opacity: v.deleteConfirmOpacity }}>Remove from caseload</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Same submitted-agenda + check-in/module-response data the global Sessions
// → Session Prep view already renders (SessionsPrepView below), just scoped
// to this one client's own tab instead of requiring a trip to the global list.
// Shared by ClientSessionPrepTab and SessionsPrepView (below) — same mapped
// agenda shape, same card, rendered in two places so a therapist can reach a
// client's session prep either per-client or from the global list.
function SessionAgendaCard({ a, secondaryBtnStyle }) {
  return (
    <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>Session agenda · {a.dateLabel}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: a.reviewed ? 'var(--emerald-2)' : 'var(--muted)' }}>{a.statusLabel}</span>
          {!a.reviewed && <button onClick={a.onMarkReviewed} style={secondaryBtnStyle}>Mark reviewed</button>}
        </div>
      </div>
      {a.safetyConcerns && (
        <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '12px', background: 'var(--risk-high-bg)', border: '1px solid var(--risk-high-border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--risk-high-text)' }}>Safety concerns flagged</div>
          <div style={{ fontSize: '12.5px', color: 'var(--risk-high-text)', marginTop: '4px', lineHeight: 1.5 }}>{a.safetyConcerns}</div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', fontSize: '12.5px', color: 'var(--text-2)' }}>
        {a.topics && <div><strong>Topics:</strong> {a.topics}</div>}
        {a.activeParts.length > 0 && <div><strong>Active parts:</strong> {a.activeParts.join(', ')}</div>}
        {a.stuckPoints && <div><strong>Stuck points:</strong> {a.stuckPoints}</div>}
        {a.goalsForSession && <div><strong>Goals for session:</strong> {a.goalsForSession}</div>}
        {(a.currentStressLevel != null || a.currentMoodLabel) && (
          <div>
            {a.currentStressLevel != null && <><strong>Stress:</strong> {a.currentStressLevel}/10 </>}
            {a.currentMoodLabel && <><strong>Mood:</strong> {a.currentMoodLabel}</>}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientSessionPrepTab({ v, sc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {sc.sessionPrepAgendas.map((a) => (<SessionAgendaCard key={a.id} a={a} secondaryBtnStyle={v.secondaryBtnStyle} />))}
      {sc.noSessionPrepAgendas && <div style={{ fontSize: '13px', color: 'var(--muted)' }}>No session agendas submitted yet.</div>}
      {sc.qaAnswers.map((qa, i) => (
        <div key={i} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-2)' }}>{qa.question}</div>
          <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '4px', lineHeight: 1.5 }}>“{qa.answer}”</div>
        </div>
      ))}
      {sc.noQaAnswers && <div style={{ fontSize: '13px', color: 'var(--muted)' }}>No check-in or module responses recorded yet.</div>}
      <button className="aw-primary" onClick={sc.onDraftNoteFromPrep} disabled={!sc.canWrite} style={{ ...v.primaryBtnStyle, alignSelf: 'flex-start', opacity: sc.canWrite ? 1 : 0.5, cursor: sc.canWrite ? 'pointer' : 'not-allowed' }}>Draft session note from this</button>
    </div>
  );
}

function PlanCard({ plan, onOpen, secondaryBtnStyle }) {
  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {plan.phases.map((ph, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={ph.dotStyle} /><span style={ph.labelStyle}>{ph.label}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '10px', padding: '14px 16px', borderRadius: '14px', background: 'var(--surface-2)' }}>
        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-2)' }}>Current phase · {plan.currentPhaseLabel}</div>
        <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '4px', lineHeight: 1.5 }}>{plan.currentPhaseDesc}</div>
      </div>
      <div style={{ marginTop: '18px' }}>
        <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Milestones this phase</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          {plan.milestones.map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '10px 14px', borderRadius: '12px', background: 'var(--surface-2)' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>{g.title}</span><span style={g.style}>{g.reviewLabel}</span>
            </div>
          ))}
        </div>
      </div>
      {onOpen && <button onClick={onOpen} style={{ ...secondaryBtnStyle, marginTop: '16px' }}>Open full plan editor</button>}
    </div>
  );
}

function AssessmentHistoryTab({ history, empty, secondaryBtnStyle }) {
  if (empty) {
    return (
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '15px' }}>Assessments</span>
        <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--muted)' }}>This client hasn't retaken the Wound Patterns Assessment yet. Retakes appear here as a full history once submitted.</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {history.map((entry, i) => (
        <div key={entry.id} style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ ...FR, fontSize: '14px' }}>Wound Patterns Assessment</span>
              <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}> · {entry.dateLabel}</span>
              {i === 0 && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, color: 'var(--accent-2)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Most recent</span>}
            </div>
            {entry.primaryLabel && <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Primary: {entry.primaryLabel}{entry.secondaryLabel ? ` · Secondary: ${entry.secondaryLabel}` : ''}</span>}
            {entry.onRemind && <button onClick={entry.onRemind} style={secondaryBtnStyle}>Remind me to review</button>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
            {entry.subscales.map((s) => (
              <div key={s.wound}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{s.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={s.deltaStyle}>{s.deltaLabel}</span>
                    <span style={s.sevChip}>{s.severityLabel}</span>
                    <span style={{ color: 'var(--muted)' }}>{s.scoreLabel}</span>
                  </div>
                </div>
                <div style={{ height: '6px', borderRadius: '4px', background: 'var(--surface-2)', marginTop: '4px', overflow: 'hidden' }}><div style={s.barStyle} /></div>
              </div>
            ))}
          </div>
          {(entry.tertiaryLabels.length > 0 || entry.protectorTypes.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              {entry.tertiaryLabels.length > 0 && <div style={{ fontSize: '12px', color: 'var(--text-2)' }}><strong>Tertiary wounds:</strong> {entry.tertiaryLabels.join(', ')}</div>}
              {entry.protectorTypes.length > 0 && <div style={{ fontSize: '12px', color: 'var(--text-2)' }}><strong>Protector types:</strong> {entry.protectorTypes.join(', ')}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SnapshotSection({ title, children }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 16px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      <div style={{ marginTop: '8px' }}>{children}</div>
    </div>
  );
}

function SnapshotList({ items }) {
  if (!items?.length) return <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: 0 }}>No clear pattern in available app data.</p>;
  return (
    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {items.map((item, i) => (<li key={i} style={{ fontSize: '12.5px', color: 'var(--text-2)' }}>{item}</li>))}
    </ul>
  );
}

function SnapshotTab({ snapshot, primaryBtnStyle, secondaryBtnStyle }) {
  const s = snapshot.data;
  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <span style={{ ...FR, fontSize: '15px' }}>AI Session Snapshot</span>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', maxWidth: '52ch' }}>Generate a single-screen pre-session summary for Advisor review. It is not saved as a note and is not shown to the client.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {snapshot.onCopy && <button onClick={snapshot.onCopy} style={secondaryBtnStyle}>Copy snapshot</button>}
          <button
            className="aw-primary"
            onClick={snapshot.onGenerate}
            disabled={!snapshot.onGenerate || snapshot.loading}
            style={{ ...primaryBtnStyle, opacity: !snapshot.onGenerate || snapshot.loading ? 0.6 : 1, cursor: !snapshot.onGenerate || snapshot.loading ? 'not-allowed' : 'pointer' }}
          >
            {snapshot.loading ? 'Generating…' : 'Generate snapshot'}
          </button>
        </div>
      </div>

      {!snapshot.onGenerate && <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted)' }}>Add this client to your caseload to generate a snapshot.</div>}
      {snapshot.error && <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--risk-high-text)' }}>{snapshot.error}</div>}

      {s && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--accent-2)' }}>Advisor review</div>
            <div style={{ ...FR, fontSize: '16px', marginTop: '4px' }}>{s.snapshot_title}</div>
            <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '10px', background: 'var(--surface-2)', fontSize: '11.5px', color: 'var(--text-2)' }}>{s.advisor_review_disclaimer}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: '12px' }}>
            <SnapshotSection title="Curriculum trajectory">
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-2)' }}>{s.curriculum_trajectory?.active_module || 'Available data is limited'} · {s.curriculum_trajectory?.percent_complete || 0}% complete</p>
              {s.curriculum_trajectory?.recent_response_synthesis && <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: 'var(--text-2)' }}>{s.curriculum_trajectory.recent_response_synthesis}</p>}
            </SnapshotSection>
            <SnapshotSection title="Assigned practice status">
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-2)' }}>{s.assigned_practice_status || 'Review current assigned IFS practices.'}</p>
            </SnapshotSection>
            <SnapshotSection title="Parts / inner-system themes">
              <SnapshotList items={[...(s.parts_and_inner_system_themes?.active_parts_or_protectors || []), ...(s.parts_and_inner_system_themes?.relationship_patterns || []), ...(s.parts_and_inner_system_themes?.possible_polarizations_to_explore || [])]} />
            </SnapshotSection>
            <SnapshotSection title="Assessment / Self-energy themes">
              <SnapshotList items={[...(s.assessment_and_self_energy_themes?.assessment_patterns || []), ...(s.assessment_and_self_energy_themes?.self_energy_strengths || []), ...(s.assessment_and_self_energy_themes?.self_energy_growth_edges || [])]} />
            </SnapshotSection>
            <SnapshotSection title="Life-integration themes">
              <SnapshotList items={[...(s.life_integration_themes?.recent_daily_life_patterns || []), ...(s.life_integration_themes?.triggers_needs_or_boundaries || [])]} />
            </SnapshotSection>
            <SnapshotSection title="Suggested session questions"><SnapshotList items={s.suggested_session_questions} /></SnapshotSection>
            <SnapshotSection title="Attention items for Advisor"><SnapshotList items={s.attention_items_for_advisor} /></SnapshotSection>
            <SnapshotSection title="What not to over-interpret"><SnapshotList items={s.what_not_to_overinterpret} /></SnapshotSection>
          </div>
        </div>
      )}
    </div>
  );
}

// The API returns free-form text with numbered section headings (e.g. "1.
// Recent themes") — render those lines as headings, everything else as body
// text, mirroring how this same backend's output is rendered elsewhere in
// the app (SessionPrepBrief.jsx's AiSummaryContent).
function ChangeSummaryContent({ text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {String(text || '').split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} style={{ height: '8px' }} />;
        const isHeading = /^\d+\.\s/.test(trimmed);
        return (
          <p key={i} style={{ margin: isHeading ? '10px 0 0' : 0, fontSize: isHeading ? '13px' : '12.5px', fontWeight: isHeading ? 700 : 400, color: isHeading ? 'var(--text)' : 'var(--text-2)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

function ChangeSummaryTab({ changeSummary, primaryBtnStyle }) {
  const d = changeSummary.data;
  const sourceCount = d?.dataSources
    ? Object.entries(d.dataSources).filter(([k, v]) => k !== 'unavailableSources' && k !== 'sparse' && (typeof v === 'boolean' ? v : v > 0)).length
    : 0;
  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <span style={{ ...FR, fontSize: '15px' }}>Since Last Session</span>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', maxWidth: '52ch' }}>Generate a summary of what's changed for this client over the last week — mood, journal, parts, messages, and assigned practice — for Advisor review ahead of your next session.</div>
        </div>
        <button
          className="aw-primary"
          onClick={changeSummary.onGenerate}
          disabled={!changeSummary.onGenerate || changeSummary.loading}
          style={{ ...primaryBtnStyle, opacity: !changeSummary.onGenerate || changeSummary.loading ? 0.6 : 1, cursor: !changeSummary.onGenerate || changeSummary.loading ? 'not-allowed' : 'pointer' }}
        >
          {changeSummary.loading ? 'Generating…' : 'Generate summary'}
        </button>
      </div>

      {!changeSummary.onGenerate && <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted)' }}>Add this client to your caseload to generate a summary.</div>}
      {changeSummary.error && <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--risk-high-text)' }}>{changeSummary.error}</div>}

      {d && (
        <div style={{ marginTop: '16px' }}>
          {d.disclaimer && <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--surface-2)', fontSize: '11.5px', color: 'var(--text-2)' }}>{d.disclaimer}</div>}
          <div style={{ marginTop: '14px' }}><ChangeSummaryContent text={d.summary} /></div>
          <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--muted)' }}>
            Generated {d.generatedAt ? new Date(d.generatedAt).toLocaleString() : '—'} · {sourceCount} data source{sourceCount === 1 ? '' : 's'} referenced
          </div>
        </div>
      )}
    </div>
  );
}

function ModuleInsightsTab({ moduleInsights, primaryBtnStyle }) {
  const d = moduleInsights.data;
  const sourceCount = d?.dataSources ? Object.values(d.dataSources).filter((v) => v > 0).length : 0;
  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <span style={{ ...FR, fontSize: '15px' }}>AI Module Insights</span>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', maxWidth: '52ch' }}>Generate patterns across this client's curriculum module responses, progress, and saved reflections — for Advisor review ahead of your next session. Not saved as a note and not shown to the client.</div>
        </div>
        <button
          className="aw-primary"
          onClick={moduleInsights.onGenerate}
          disabled={!moduleInsights.onGenerate || moduleInsights.loading}
          style={{ ...primaryBtnStyle, opacity: !moduleInsights.onGenerate || moduleInsights.loading ? 0.6 : 1, cursor: !moduleInsights.onGenerate || moduleInsights.loading ? 'not-allowed' : 'pointer' }}
        >
          {moduleInsights.loading ? 'Generating…' : 'Generate insights'}
        </button>
      </div>

      {!moduleInsights.onGenerate && <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted)' }}>Add this client to your caseload to generate module insights.</div>}
      {moduleInsights.error && <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--risk-high-text)' }}>{moduleInsights.error}</div>}

      {d && (
        <div style={{ marginTop: '16px' }}>
          {d.disclaimer && <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--surface-2)', fontSize: '11.5px', color: 'var(--text-2)' }}>{d.disclaimer}</div>}
          <div style={{ marginTop: '14px' }}><ChangeSummaryContent text={d.insights} /></div>
          <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--muted)' }}>
            Generated {d.generatedAt ? new Date(d.generatedAt).toLocaleString() : '—'} · {sourceCount} data source{sourceCount === 1 ? '' : 's'} referenced
          </div>
        </div>
      )}
    </div>
  );
}

// Same SimpleLineChart /analytics (LongitudinalAnalytics.jsx) already uses,
// swapped in for what used to be a plain CSS bar-height sparkline — same
// underlying trend data, just a richer line chart with axes and points.
function TrendChart({ title, points, color, min, max, noDataLabel }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 16px' }}>
      <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {points.length === 0 ? (
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--muted)' }}>{noDataLabel}</p>
      ) : (
        <div style={{ marginTop: '12px' }}>
          <SimpleLineChart data={points} labelKey="week" valueKey="value" color={color} min={min} max={max} title={title} />
        </div>
      )}
    </div>
  );
}

function BetweenSessionTab({ bs, clientId, isDemo, unassigned, feedbackDraft, onFeedbackChange, onMarkReviewed, onArchive, onAssigned }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '15px' }}>Assigned practice funnel</span>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>How far this client's assigned homework has moved since it was assigned.</div>
        {bs.hasHomeworkData ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginTop: '16px' }}>
              {bs.funnelRows.map((f) => (
                <div key={f.label}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{f.label}</div>
                  <div style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>{f.value}</div>
                  <div style={{ height: '6px', borderRadius: '4px', background: 'var(--surface-2)', marginTop: '6px', overflow: 'hidden' }}><div style={f.barStyle} /></div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--muted)' }}>
              {bs.completionPct}% completion rate{bs.avgDaysToComplete != null ? ` · ${bs.avgDaysToComplete} days average to complete` : ''}
            </div>
          </>
        ) : (
          <p style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>No practices assigned yet.</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: '14px' }}>
        <TrendChart title="Weekly mood (1–5)" points={bs.moodTrendPoints} color="#d97706" min={1} max={5} noDataLabel="No mood check-ins recorded yet." />
        <TrendChart title="Weekly energy (1–10)" points={bs.energyTrendPoints} color="#059669" min={1} max={10} noDataLabel="No energy check-ins recorded yet." />
        <TrendChart title="Weekly journal entries" points={bs.journalWeeklyPoints} color="#0d9488" min={0} noDataLabel="No journal entries recorded yet." />
        <TrendChart
          title="Self-Energy (1–10)" points={bs.selfEnergyTrendPoints} color="#10b981" min={1} max={10}
          noDataLabel={bs.selfEnergyTrendLoading ? 'Loading Self-Energy check-ins…' : 'No Self-Energy check-ins recorded yet.'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: '14px' }}>
        <div style={CARD}>
          <span style={{ ...FR, fontSize: '15px' }}>Active parts (daily check-ins)</span>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Parts this client has noticed as active during their daily Self-Energy check-ins.</div>
          {bs.noActiveParts ? (
            <p style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>No active parts recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              {bs.activePartsRows.map((p) => (
                <div key={p.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text)' }}><span>{p.name}</span><span style={{ color: 'var(--muted)' }}>{p.count}×</span></div>
                  <div style={{ height: '6px', borderRadius: '4px', background: 'var(--surface-2)', marginTop: '4px', overflow: 'hidden' }}><div style={p.barStyle} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={CARD}>
          <span style={{ ...FR, fontSize: '15px' }}>Recent Self-Energy check-ins</span>
          {bs.noCheckins ? (
            <p style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>No check-ins recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
              {bs.recentCheckins.map((c) => (
                <div key={c.id} style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.dateLabel}</span>
                    <span style={{ color: 'var(--muted)' }}>{c.moodLabel} · Self: {c.selfEnergyLabel}</span>
                  </div>
                  {c.intention && <p style={{ margin: '4px 0 0', fontSize: '11.5px', fontStyle: 'italic', color: 'var(--muted)' }}>&quot;{c.intention}&quot;</p>}
                  {c.activePartsLabels.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {c.activePartsLabels.map((label) => (<span key={label} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'var(--surface-2)', color: 'var(--text-2)' }}>{label}</span>))}
                      {c.extraPartsCount > 0 && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>+{c.extraPartsCount} more</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={CARD}>
        <span style={{ ...FR, fontSize: '15px' }}>Recent assignments</span>
        {bs.noAssignments ? (
          <p style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>No curriculum modules assigned yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            {bs.assignmentRows.map((a) => (
              <div key={a.id} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{a.title}</span>
                  <span style={a.statusChip}>{a.statusLabel}</span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '3px' }}>{a.dateLabel}</div>
                {a.instructions && <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}>{a.instructions}</div>}
                {a.advisorFeedback && <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}><strong>Advisor feedback:</strong> {a.advisorFeedback}</div>}
                {!isDemo && !unassigned && a.canReview && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      value={feedbackDraft[a.id] || ''} onChange={(e) => onFeedbackChange(a.id, e.target.value)}
                      placeholder="Feedback for the client (optional)"
                      style={{ flex: 1, minWidth: '160px', padding: '7px 10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '12px', fontFamily: 'inherit' }}
                    />
                    <button type="button" onClick={() => onMarkReviewed(clientId, a.id)} style={{ fontSize: '11px', fontWeight: 700, padding: '7px 10px', borderRadius: '10px', border: 'none', background: 'var(--emerald-2)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Mark reviewed</button>
                  </div>
                )}
                {!isDemo && !unassigned && (
                  <button type="button" onClick={() => onArchive(clientId, a.id)} style={{ marginTop: '8px', fontSize: '11px', fontWeight: 600, padding: '6px 10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>Archive</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!isDemo && !unassigned && (
        <TherapistHomeworkBuilder clientId={clientId} onAssigned={onAssigned} />
      )}

      <div style={CARD}>
        <span style={{ ...FR, fontSize: '15px' }}>Custom homework</span>
        {bs.noFreeformAssignments ? (
          <p style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>No custom homework assigned yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            {bs.freeformAssignmentRows.map((a) => (
              <div key={a.id} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{a.title}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>{a.statusLabel}</span>
                </div>
                {a.dateLabel && <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '3px' }}>{a.dateLabel}</div>}
                {a.description && <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}>{a.description}</div>}
                {a.completionNotes && <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}><strong>Client's reflection:</strong> {a.completionNotes}</div>}
                {a.interactiveLines.length > 0 && (
                  <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                    {a.interactiveLines.map((line, i) => <li key={i}>{line}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={CARD}>
        <span style={{ ...FR, fontSize: '15px' }}>Recent check-ins</span>
        {bs.noMoodEntries ? (
          <p style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>No mood check-ins recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            {bs.moodRows.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', borderRadius: '12px', background: 'var(--surface-2)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{m.dateLabel}</span>
                <span style={{ fontSize: '12.5px', color: 'var(--text)', fontWeight: 600 }}>{m.moodLabel}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Energy {m.energyLabel}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{m.emotionsLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LifeReflectionsTab({ lr, onClaim }) {
  if (!lr.canView) {
    return (
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '15px' }}>Life Reflections</span>
        <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '14px', background: 'var(--risk-med-bg)', border: '1px solid var(--risk-med-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--risk-med-text)' }}>Add this client to your caseload to view reflections they've shared.</span>
          {onClaim && <button type="button" onClick={onClaim} style={{ fontSize: '11px', fontWeight: 700, padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>Add to my caseload</button>}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '2px 2px 0' }}>
        Reflections this client has chosen to share from their IFS in Daily Life practices. Archived reflections and other clients' data are never shown here.
      </div>
      {lr.loading && <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Loading shared reflections…</div>}
      {lr.noReflections && <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No shared reflections yet for this client.</div>}
      {lr.rows.map((r) => (
        <div key={r.id} style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ ...FR, fontSize: '14px' }}>{r.label}</span>
              <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}> · {r.dateLabel}</span>
            </div>
            {r.linkedPartName && <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Linked part: {r.linkedPartName}</span>}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '8px', lineHeight: 1.5 }}>{r.summary}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: '10px', marginTop: '14px' }}>
            {r.fields.map(([label, value]) => (
              <div key={label} style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--surface-2)' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text)', marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CurriculumReflectionsTab({ cr, pc, onClaim }) {
  if (!cr.canView) {
    return (
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '15px' }}>Curriculum Reflections</span>
        <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '14px', background: 'var(--risk-med-bg)', border: '1px solid var(--risk-med-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--risk-med-text)' }}>Add this client to your caseload to view their module reflections.</span>
          {onClaim && <button type="button" onClick={onClaim} style={{ fontSize: '11px', fontWeight: 700, padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>Add to my caseload</button>}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {pc.loading && <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Loading personalized curriculum…</div>}
      {pc.rows.length > 0 && (
        <div style={CARD}>
          <span style={{ ...FR, fontSize: '15px' }}>Personalized Curriculum</span>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>The AI-tailored module sequence generated from this client's Wound Patterns Assessment.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            {pc.rows.map((m) => (
              <div key={m.id} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{m.order}. {m.title}</span>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--muted)' }}>
                    {m.woundLabel && <span>{m.woundLabel}</span>}
                    {m.durationLabel && <span>· {m.durationLabel}</span>}
                    {m.difficultyLabel && <span>· {m.difficultyLabel}</span>}
                  </div>
                </div>
                {m.description && <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}>{m.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '2px 2px 0' }}>
        Reflections this client wrote while completing curriculum modules, flagged as visible to their Advisor.
      </div>
      {cr.loading && <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Loading curriculum reflections…</div>}
      {cr.noReflections && <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No shared curriculum reflections yet for this client.</div>}
      {cr.rows.map((r) => (
        <div key={r.id} style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ ...FR, fontSize: '14px' }}>{r.moduleTitle}</span>
            <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{r.dateLabel}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: '10px', marginTop: '14px' }}>
            {r.fields.map(([label, value]) => (
              <div key={label} style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--surface-2)' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text)', marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const HEALING_SUMMARY_LABELS = [
  ['modulesCompleted', 'Modules completed'], ['checkInsSubmitted', 'Check-ins submitted'], ['goalsCompleted', 'Goals completed'],
  ['partsCreated', 'Parts created'], ['journalEntries', 'Journal entries'], ['moodCheckIns', 'Mood check-ins'],
  ['lifeIntegrationReflections', 'Life Integration reflections'], ['curriculumReflections', 'Curriculum reflections'],
];

function HealingJourneyTab({ ht, ub, ct, onClaim }) {
  if (!ht.canView) {
    return (
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '15px' }}>Healing Journey</span>
        <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '14px', background: 'var(--risk-med-bg)', border: '1px solid var(--risk-med-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--risk-med-text)' }}>Add this client to your caseload to view their healing journey.</span>
          {onClaim && <button type="button" onClick={onClaim} style={{ fontSize: '11px', fontWeight: 700, padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>Add to my caseload</button>}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '2px 2px 0' }}>
        A gentler, milestone-oriented view of this client's progress — the same real activity the client sees on their own Healing Timeline.
      </div>
      {ub.loading && <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Loading Unburdening Protocol status…</div>}
      {ub.noRecord && <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>This client hasn't started the Unburdening Protocol ceremony yet.</div>}
      {ub.hasRecord && (
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ ...FR, fontSize: '13px' }}>Unburdening Protocol</span>
            <span style={ub.statusChip}>{ub.completed ? 'Completed' : 'In progress'}</span>
          </div>
          <div style={{ marginTop: '10px', height: '6px', borderRadius: '4px', background: 'var(--surface-2)', overflow: 'hidden' }}>
            <div style={{ width: ub.progressPct + '%', height: '100%', borderRadius: '4px', background: 'var(--emerald-2)' }} />
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '6px' }}>
            {ub.stepLabel}{ub.stepTitle ? ` · ${ub.stepTitle}` : ''}{ub.completedDateLabel ? ` · Completed ${ub.completedDateLabel}` : ''}
          </div>
          {(ub.element || ub.quality || ub.bodyLocation || ub.moodAfterLabel) && (
            <div style={{ display: 'flex', gap: '18px', marginTop: '12px', flexWrap: 'wrap' }}>
              {ub.element && <div><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Element</span><div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{ub.element}</div></div>}
              {ub.quality && <div><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Quality invited in</span><div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{ub.quality}</div></div>}
              {ub.bodyLocation && <div><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Body location</span><div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{ub.bodyLocation}</div></div>}
              {ub.moodAfterLabel && <div><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Mood after</span><div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{ub.moodAfterLabel}</div></div>}
            </div>
          )}
        </div>
      )}
      {ct.loading && <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Loading Co-Therapy activity progress…</div>}
      {ct.noActivity && <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No Co-Therapy in-session activities recorded yet.</div>}
      {ct.rows.length > 0 && (
        <div style={CARD}>
          <span style={{ ...FR, fontSize: '13px' }}>Co-Therapy Activities</span>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Guided in-session activities completed together on the Co-Therapy tool.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            {ct.rows.map((a) => (
              <div key={a.id} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: 'var(--text)' }}>{a.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{a.dateLabel}</span>
                  <span style={a.statusChip}>{a.statusLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {ht.loading && <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Loading healing timeline…</div>}
      {ht.error && <div style={{ ...CARD, textAlign: 'center', color: 'var(--risk-high-text)', fontSize: '13px' }}>{ht.error}</div>}
      {ht.summary && (
        <div style={{ ...CARD, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '14px' }}>
          {HEALING_SUMMARY_LABELS.map(([key, label]) => (
            <div key={key}>
              <div style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text)' }}>{ht.summary[key]}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}
      {ht.noEvents && <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No milestones recorded yet for this client.</div>}
      {ht.rows.map((e) => (
        <div key={e.id} style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{e.title}</span>
            <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{e.dateLabel}</span>
          </div>
          {e.description && <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}>{e.description}</div>}
          {e.source && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>{e.source}</div>}
        </div>
      ))}
    </div>
  );
}

function MbcCards({ mbc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {mbc.map((m) => (
        <div key={m.code} style={{ ...CARD, borderRadius: '18px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div><span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{m.name}</span><span style={{ fontSize: '11.5px', color: 'var(--muted)' }}> · last administered {m.date}</span></div>
            <span style={m.sevChip}>{m.severity}</span>
          </div>
          <div style={{ display: 'flex', gap: '22px', marginTop: '12px', flexWrap: 'wrap' }}>
            <div><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Baseline</span><div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>{m.baseline}</div></div>
            <div><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Previous</span><div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>{m.previous}</div></div>
            <div><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Current</span><div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>{m.current}</div></div>
            <div><span style={{ fontSize: '11px', color: 'var(--muted)' }}>Change</span><div style={m.changeStyle}>{m.changeLabel}</div></div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <SimpleLineChart data={m.historyPoints} labelKey="label" valueKey="value" color="#7c3aed" title={m.name + ' score history'} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PartsGrid({ parts, cols, showClient }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: '14px' }}>
      {parts.map((p, i) => (
        <div key={p.id || i} style={{ ...CARD, borderRadius: '18px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {showClient && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{p.clientName}</div>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{p.name}</span>
            <span style={p.catChip}>{p.catLabel}</span>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-2)', lineHeight: 1.5 }}>{p.description}</div>
          {!showClient && <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Triggers: {p.triggers}</div>}
          {!showClient && <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Body: {p.bodyLocation}</div>}
          <div style={{ marginTop: '4px' }}>
            {!showClient && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '3px' }}><span>Activation</span><span>{p.activation}%</span></div>}
            <div style={{ height: '6px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden' }}><div style={p.barStyle} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientSafetyTab({ v, sc }) {
  const s = sc.safety;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={v.disclaimerStyle}>Automated flags are decision support, not a diagnosis. Advisor review and acknowledgment is required.</div>
      <div style={{ ...CARD, borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...FR, fontSize: '15px' }}>Risk level</span><span style={s.levelChip}>{s.levelLabel}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>Protective factors</span>
            <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-2)', lineHeight: 1.7 }}>{s.protective.map((pf, i) => (<li key={i}>{pf}</li>))}</ul>
          </div>
          <div>
            <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>Risk factors</span>
            <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-2)', lineHeight: 1.7 }}>{s.riskFactors.map((rf, i) => (<li key={i}>{rf}</li>))}</ul>
          </div>
        </div>
        {s.hasPlan && (
          <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-2)' }}>Safety plan · review {s.planReview}</div>
            <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.7 }}>{s.planSteps.map((st, i) => (<li key={i}>{st}</li>))}</ul>
          </div>
        )}
        {s.noPlan && (
          <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>No safety plan on file.</span>
            <button onClick={s.onCreatePlan} disabled={!sc.canWrite} style={{ ...v.secondaryBtnStyle, opacity: sc.canWrite ? 1 : 0.5, cursor: sc.canWrite ? 'pointer' : 'not-allowed' }}>Create safety plan</button>
          </div>
        )}
        <div>
          <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>Emergency contacts</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
            {s.contacts.map((ec, i) => (<div key={i} style={{ fontSize: '12.5px', color: 'var(--text)' }}>{ec.name} ({ec.relation}) · {ec.phone}</div>))}
            {s.noContacts && <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>None on file.</span>}
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{s.ackStatusText}</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={s.onAddToNote} disabled={!sc.canWrite} style={{ ...v.secondaryBtnStyle, opacity: sc.canWrite ? 1 : 0.5, cursor: sc.canWrite ? 'pointer' : 'not-allowed' }}>Add to note</button>
            <button onClick={s.onCreateTask} disabled={!sc.canWrite} style={{ ...v.secondaryBtnStyle, opacity: sc.canWrite ? 1 : 0.5, cursor: sc.canWrite ? 'pointer' : 'not-allowed' }}>Create task</button>
            <button onClick={s.onAcknowledge} disabled={!sc.canWrite} style={{ ...s.ackBtnStyle, opacity: sc.canWrite ? 1 : 0.5, cursor: sc.canWrite ? 'pointer' : 'not-allowed' }}>{s.ackBtnLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientMessagesTab({ v, sc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={v.disclaimerStyle}>Messages are checked during business hours and are not monitored for emergencies. In a crisis, call 911 or a local crisis line.</div>
      <div style={{ ...CARD, borderRadius: '20px', padding: '20px' }}>
        <span style={{ ...FR, fontSize: '15px' }}>Messages with {sc.name}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px', maxHeight: '260px', overflowY: 'auto' }}>
          {sc.messages.map((m) => (<MessageBubble key={m.idx} m={m} />))}
        </div>
        {sc.canWrite ? (
          <>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
              {v.quickMessages.map((q, i) => (<button key={i} onClick={q.onClick} style={chipBtn()}>{q.text}</button>))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input value={v.clientMessageDraft} onChange={v.onClientMessageChange} placeholder="Message this client..." style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '13.5px', fontFamily: 'inherit' }} />
              <button className="aw-primary" onClick={v.onSendClientMessage} style={v.primaryBtnStyle}>Send</button>
            </div>
          </>
        ) : (
          <div style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)' }}>Add this client to your caseload to send a message.</div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ m }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={m.bubbleStyle}>
        <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.75 }}>{m.authorLabel} · {m.date} {m.readTick}</div>
        <div style={{ fontSize: '13px', marginTop: '3px', lineHeight: 1.5 }}>{m.text}</div>
      </div>
      <button onClick={m.onDelete} title="Delete message" style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', border: 'none', background: 'var(--surface-2)', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer', lineHeight: 1 }}>×</button>
    </div>
  );
}

function chipBtn() {
  return { fontSize: '11px', padding: '5px 10px', borderRadius: '999px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' };
}

function ReviewView({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '820px' }}>
      {v.reviewItems.map((item) => (
        <div key={item.id} style={{ ...CARD, borderRadius: '18px', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <span style={item.sevChip}>{item.sevLabel}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{item.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '3px', lineHeight: 1.5 }}>{item.detail}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '6px' }}>{item.clientName} · {item.when}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={item.onOpenClient} style={v.secondaryBtnStyle}>Open client</button>
            <button className="aw-primary" onClick={item.onResolve} style={v.primaryBtnStyle}>{item.actionLabel}</button>
          </div>
        </div>
      ))}
      {v.reviewQueueEmpty && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>Review queue is clear. Nice work.</div>}
    </div>
  );
}

function SafetyView({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '820px' }}>
      <div style={v.disclaimerStyle}>Automated flags are decision support requiring Advisor review — never an independent diagnosis. Critical alerts require acknowledgment before dismissal.</div>
      {v.safetyRows.map((s) => (
        <div key={s.id} style={{ ...CARD, borderRadius: '18px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={avatar(38)}>{s.initial}</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{s.riskFactorsSummary}</div>
              </div>
            </div>
            <span style={s.levelChip}>{s.levelLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{s.ackStatusText}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={s.onOpenClient} style={v.secondaryBtnStyle}>Open safety tab</button>
              <button onClick={s.onAcknowledge} style={s.ackBtnStyle}>{s.ackBtnLabel}</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function avatar(size) {
  return { width: size + 'px', height: size + 'px', borderRadius: '50%', background: 'var(--accent-2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 };
}

function MessagesView({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={v.disclaimerStyle}>Messages are checked during business hours and are not monitored for emergencies. In a crisis, call 911 or a local crisis line.</div>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input value={v.messageSearch} onChange={v.onMessageSearchChange} placeholder="Search threads and messages..." style={inp()} />
          {v.noThreadsMatchSearch && <div style={{ padding: '14px', textAlign: 'center', color: 'var(--muted)', fontSize: '12.5px' }}>No threads or messages match.</div>}
          {v.threadList.map((t) => (
            <div key={t.id} onClick={t.onClick} style={t.rowStyle}>
              <div style={avatar(36)}>{t.initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.preview}</div>
              </div>
              {t.hasUnread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-2)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
        <div style={{ ...CARD, borderRadius: '20px', padding: '20px' }}>
          <span style={{ ...FR, fontSize: '15px' }}>{v.activeThread.name}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px', maxHeight: '320px', overflowY: 'auto' }}>
            {v.activeThread.messages.map((m) => (<MessageBubble key={m.idx} m={m} />))}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
            {v.quickMessages.map((q, i) => (<button key={i} onClick={q.onClick} style={chipBtn()}>{q.text}</button>))}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input value={v.clientMessageDraft} onChange={v.onClientMessageChange} placeholder="Write a message..." style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '13.5px', fontFamily: 'inherit' }} />
            <button className="aw-primary" onClick={v.onSendClientMessage} style={v.primaryBtnStyle}>Send</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button onClick={v.activeThread.onAddToNote} style={v.secondaryBtnStyle}>Add to session note</button>
            <button onClick={v.activeThread.onAddToTask} style={v.secondaryBtnStyle}>Convert to task</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TasksView({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '820px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {v.taskFilters.map((f) => (<button key={f.id} onClick={f.onClick} style={f.style}>{f.label}</button>))}
      </div>
      <div style={{ ...CARD, borderRadius: '18px', padding: '18px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input value={v.newTaskTitle} onChange={v.onNewTaskTitleChange} placeholder="New task title..." style={{ ...inp(), flex: 1, minWidth: '180px' }} />
        <select value={v.newTaskClientId} onChange={v.onNewTaskClientChange} style={{ ...v.selectStyle, flex: 'none', width: '160px' }}>
          {v.clientOptions.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
        </select>
        <button className="aw-primary" onClick={v.onAddTask} style={v.primaryBtnStyle}>Add task</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {v.taskRows.map((t) => (
          <div key={t.id} style={t.rowStyle}>
            <button onClick={t.onToggle} style={t.checkStyle}>{t.checkChar}</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={t.titleStyle}>{t.title}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>{t.client} · {t.category} · due {t.due}</div>
            </div>
            <span style={t.priorityChip}>{t.priorityLabel}</span>
            <button onClick={t.onArchive} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 10px', color: 'var(--muted)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Archive</button>
          </div>
        ))}
        {v.noTasks && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No tasks match this filter.</div>}
      </div>
    </div>
  );
}

function NotificationsView({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '820px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={v.onMarkAllNotifsRead} style={v.secondaryBtnStyle}>Mark all as read</button>
      </div>
      {v.notificationRows.map((n) => (
        <div key={n.id} style={n.rowStyle}>
          <div style={n.typeDot} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>{n.title}</span>
              <span style={n.priorityChip}>{n.priorityLabel}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '3px', lineHeight: 1.5 }}>{n.message}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '5px' }}>{n.clientName} · {n.date}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {n.onOpenClient && <button onClick={n.onOpenClient} style={v.secondaryBtnStyle}>Open client</button>}
            {n.showMarkRead && <button onClick={n.onMarkRead} style={v.secondaryBtnStyle}>Mark read</button>}
          </div>
        </div>
      ))}
      {v.noNotifications && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>No notifications.</div>}
    </div>
  );
}

function SessionsPrepView({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '820px' }}>
      {v.prepList.map((p) => (
        <div key={p.id} style={{ ...CARD, borderRadius: '18px', padding: 0, overflow: 'hidden' }}>
          <div onClick={p.onToggle} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', cursor: 'pointer' }}>
            <div style={avatar(38)}>{p.initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{p.time}</div>
            </div>
            <span style={p.statusStyle}>{p.statusLabel}</span>
          </div>
          {p.isExpanded && (
            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {p.agendas.map((a) => (<SessionAgendaCard key={a.id} a={a} secondaryBtnStyle={v.secondaryBtnStyle} />))}
              {p.qaAnswers.map((qa, i) => (
                <div key={i} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-2)' }}>{qa.question}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '4px', lineHeight: 1.5 }}>“{qa.answer}”</div>
                </div>
              ))}
              {p.qaAnswers.length === 0 && <div style={{ fontSize: '13px', color: 'var(--muted)' }}>No check-in or module responses recorded yet.</div>}
              <button className="aw-primary" onClick={p.onDraftNote} style={{ ...v.primaryBtnStyle, alignSelf: 'flex-start' }}>Draft session note from this</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CoTherapyView({ v }) {
  if (!v.hasCoTherapyClient) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>Add a client to your caseload to start a co-therapy thread.</div>;
  }
  const c = v.coTherapy;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px', alignItems: 'start', maxWidth: '1000px' }}>
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ ...avatar(40), background: 'var(--emerald-2)' }}>{c.collabInitial}</div>
          <div>
            <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text)' }}>{c.collabName}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Shared case: {c.clientName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px', maxHeight: '280px', overflowY: 'auto' }}>
          {c.thread.map((m, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}><span>{m.author}</span><span style={{ color: 'var(--muted)', fontWeight: 500 }}>{m.date}</span></div>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px', lineHeight: 1.5 }}>{m.text}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <input value={v.coTherapyMessage} onChange={v.onCoTherapyMessageChange} placeholder="Write a note to your collaborator..." style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '13.5px', fontFamily: 'inherit' }} />
          <button className="aw-primary" onClick={v.onSendCoTherapyMessage} style={v.primaryBtnStyle}>Send</button>
        </div>
      </div>
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '15px' }}>Collaboration settings</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid var(--border)', marginTop: '12px' }}>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>Share session notes</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Give {c.collabName} read access to your notes for this client</div>
          </div>
          <button onClick={c.onToggleShare} style={c.shareTrackStyle}><div style={c.shareKnobStyle} /></button>
        </div>
        <button onClick={c.onRequestConsult} style={{ ...v.secondaryBtnStyle, marginTop: '16px', width: '100%' }}>Request supervisor consultation</button>
      </div>
    </div>
  );
}

function LiveView({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '820px' }}>
      {v.liveSessionRows.map((l) => (
        <div key={l.id} style={{ ...CARD, borderRadius: '18px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={avatar(38)}>{l.initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{l.name}</div>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{l.activity} · started {l.startedAt}</div>
          </div>
          <span style={l.statusChip}>{l.statusLabel}</span>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={l.onOpenClient} style={v.secondaryBtnStyle}>Open client</button>
            <button onClick={l.onToggle} style={v.secondaryBtnStyle}>{l.toggleLabel}</button>
            <button className="aw-primary" onClick={l.onEnd} style={v.primaryBtnStyle}>End session</button>
          </div>
        </div>
      ))}
      {v.noLiveSessions && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>No live sessions in progress right now.</div>}
    </div>
  );
}

function ClinicalNotesView({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px', alignItems: 'start' }}>
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '16px' }}>New advisor note</span>
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
          <select value={v.noteDraft.clientId} onChange={v.onNoteClientChange} style={v.selectStyle}>
            {v.clientOptions.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
          </select>
          <select value={v.noteDraft.template} onChange={v.onNoteTemplateChange} style={v.selectStyle}>
            {v.templateOptions.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
          </select>
        </div>
        <textarea value={v.noteDraft.text} onChange={v.onNoteTextChange} placeholder={v.noteDraft.placeholder} style={{ width: '100%', minHeight: '160px', marginTop: '12px', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'inherit', fontSize: '13.5px', lineHeight: 1.6, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <button className="aw-primary" onClick={v.onSaveNote} style={v.primaryBtnStyle}>Save as draft</button>
          <button onClick={v.onSignNote} style={v.secondaryBtnStyle}>Sign &amp; lock</button>
        </div>
        <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>Recent notes</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {v.savedNotes.map((n, i) => (
              <div key={i} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}><span>{n.clientName}</span><span style={{ color: 'var(--muted)', fontWeight: 500 }}>{n.date}</span></div>
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>{n.templateLabel}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}>{n.text}</div>
                <span style={n.statusStyle}>{n.statusLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '16px' }}>Growth goals across caseload</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
          {v.allGoals.map((g, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{g.clientName}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '2px' }}>{g.title}</div>
              </div>
              <span style={g.style}>{g.reviewLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    {v.isDemo ? (
      <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
        AI-Assisted Advisor Note Draft requires a signed-in Advisor session.
      </div>
    ) : (
      <AdvisorSessionNoteDraft assignedClients={v.clientOptions} initialClientId={v.noteDraft.clientId} onSaved={v.onAiNoteSaved} />
    )}
    </div>
  );
}

function PlansView({ v }) {
  if (!v.hasPlanClient) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>Add a client to your caseload to create a treatment plan.</div>;
  }
  return (
    <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <select value={v.planClientId} onChange={v.onPlanClientChange} style={{ ...v.selectStyle, maxWidth: '260px' }}>
        {v.clientOptions.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
      </select>
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '16px' }}>{v.treatmentPlan.clientName}'s treatment plan</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: '20px' }}>
          {v.treatmentPlan.phases.map((ph, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
              <div style={ph.dotStyle} /><span style={ph.labelStyle}>{ph.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '10px', padding: '14px 16px', borderRadius: '14px', background: 'var(--surface-2)' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-2)' }}>Current phase · {v.treatmentPlan.currentPhaseLabel}</div>
          <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '4px', lineHeight: 1.5 }}>{v.treatmentPlan.currentPhaseDesc}</div>
        </div>
        <div style={{ marginTop: '18px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Milestones this phase</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {v.treatmentPlan.milestones.map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '10px 14px', borderRadius: '12px', background: 'var(--surface-2)' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>{g.title}</span><span style={g.style}>{g.reviewLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {v.isDemo ? (
        <div style={{ ...CARD, textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
          Creating and editing treatment plans requires a signed-in Advisor session.
        </div>
      ) : (
        <TreatmentPlanManager initialClientId={v.planClientId} assignedClients={v.clientOptions} />
      )}
    </div>
  );
}

function MbcView({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={v.disclaimerStyle}>Raw scores and automated severity bands are shown separately from Advisor interpretation. Confirm clinical concerns before acting.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
        {v.mbcCaseloadRows.map((r) => (
          <div key={r.id} onClick={r.onClick} style={{ ...CARD, borderRadius: '18px', padding: '16px 18px', cursor: 'pointer' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{r.summary}</div>
            <span style={r.trendChip}>{r.trendLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartsView({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {v.partsClientFilters.map((f) => (<button key={f.id} onClick={f.onClick} style={f.style}>{f.label}</button>))}
      </div>
      <PartsGrid parts={v.partsAllRows} cols={3} showClient />
    </div>
  );
}

function PracticeView({ v }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px', alignItems: 'start' }}>
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '16px' }}>✨ AI practice generator</span>
        <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' }}>Generate a tailored homework suggestion, review it, then assign it to a client.</div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          <select value={v.practiceForm.clientId} onChange={v.onPracticeClientChange} style={v.selectStyle}>{v.clientOptions.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}</select>
          <select value={v.practiceForm.wound} onChange={v.onPracticeWoundChange} style={v.selectStyle}>{v.woundOptions.map((w) => (<option key={w.id} value={w.id}>{w.label}</option>))}</select>
          <select value={v.practiceForm.type} onChange={v.onPracticeTypeChange} style={v.selectStyle}>{v.practiceTypeOptions.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}</select>
        </div>
        <input value={v.practiceGuidance} onChange={v.onPracticeGuidanceChange} placeholder="Additional guidance (optional) — e.g. focus on inner critic, something gentle..." style={{ ...inp(), width: '100%', marginTop: '10px', padding: '10px 14px', borderRadius: '12px' }} />
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
          <button className="aw-primary" onClick={v.onGeneratePractice} disabled={v.practiceGenerating} style={{ ...v.primaryBtnStyle, opacity: v.practiceGenerating ? 0.6 : 1, cursor: v.practiceGenerating ? 'not-allowed' : 'pointer' }}>{v.practiceGenerating ? 'Generating…' : '✨ Generate one'}</button>
          <button onClick={v.onGeneratePracticeBatch} disabled={v.practiceGenerating} style={{ ...v.secondaryBtnStyle, opacity: v.practiceGenerating ? 0.6 : 1, cursor: v.practiceGenerating ? 'not-allowed' : 'pointer' }}>{v.practiceGenerating ? 'Generating…' : 'Generate set of 4'}</button>
        </div>
        {v.practiceError && <div style={{ fontSize: '12px', color: 'var(--risk-high-text)', marginTop: '10px' }}>{v.practiceError}</div>}
        {v.hasGeneratedPractice && (
          <div style={{ marginTop: '16px', padding: '16px', borderRadius: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <textarea value={v.generatedPractice || ''} onChange={v.onPracticeDraftChange} rows={5} aria-label="Generated practice draft" style={{ ...inp(), width: '100%', resize: 'vertical', fontSize: '13px', lineHeight: 1.6 }} />
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>AI-generated draft — edit as needed, then approve, regenerate, or reject.</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button onClick={v.onAssignPractice} style={v.secondaryBtnStyle}>Approve &amp; assign to client</button>
              <button onClick={v.onGeneratePractice} disabled={v.practiceGenerating} style={{ ...v.secondaryBtnStyle, opacity: v.practiceGenerating ? 0.6 : 1, cursor: v.practiceGenerating ? 'not-allowed' : 'pointer' }}>{v.practiceGenerating ? 'Regenerating…' : '🔁 Regenerate'}</button>
              <button onClick={v.onRejectPractice} style={v.secondaryBtnStyle}>Reject</button>
            </div>
          </div>
        )}
        {v.hasPracticeBatch && (
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {v.practiceBatchRows.map((b, i) => (
              <div key={i} onClick={b.onUse} style={{ padding: '14px', borderRadius: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--accent-2)' }}>{b.label}</span>
                <span style={{ fontSize: '12.5px', color: 'var(--text-2)', lineHeight: 1.5 }}>{b.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '16px' }}>Assigned practices</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
          {v.assignedPractices.map((a, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}><span>{a.clientName}</span><span style={{ color: 'var(--muted)', fontWeight: 500 }}>{a.date}</span></div>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>{a.typeLabel}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}>{a.text}</div>
            </div>
          ))}
          {v.noAssignedPractices && <div style={{ padding: '14px', fontSize: '13px', color: 'var(--muted)' }}>No practices assigned yet.</div>}
        </div>
      </div>
    </div>
  );
}

function LessonsView({ v }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '14px', maxWidth: '900px' }}>
      {v.lessons.map((l) => (
        <div key={l.number} style={{ ...CARD, borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.04em' }}>MODULE {l.number}</span>
            <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{l.completionLabel}</span>
          </div>
          <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text)' }}>{l.title}</span>
          <div style={{ height: '6px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', marginTop: '2px' }}><div style={l.barStyle} /></div>
          <button onClick={l.onToggleAssign} style={l.assignBtnStyle}>{l.assignLabel}</button>
        </div>
      ))}
    </div>
  );
}

function ResourceLibraryView({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '980px' }}>
      <input value={v.resourceSearch} onChange={v.onResourceSearchChange} placeholder="Search resources by title, author, or description..." style={{ ...inp(), width: '100%' }} />
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {v.resourceTypeFilters.map((f) => (<button key={f.id} onClick={f.onClick} style={f.style}>{f.label}</button>))}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {v.resourceWoundFilters.map((f) => (<button key={f.id} onClick={f.onClick} style={f.style}>{f.label}</button>))}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {v.resourceStageFilters.map((f) => (<button key={f.id} onClick={f.onClick} style={f.style}>{f.label}</button>))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '14px' }}>
        {v.resourceRows.map((r) => {
          const cardBody = (
            <div style={{ ...CARD, borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{r.typeLabel}</span>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {r.woundChips.map((w) => (<span key={w.id} style={w.style}>{w.label}</span>))}
                </div>
              </div>
              <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text)' }}>{r.title}</span>
              <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>by {r.author}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{r.description}</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'capitalize' }}>{r.stageLabel}</span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: r.isAppLink ? 'var(--accent)' : 'var(--emerald)' }}>{r.isAppLink ? 'Open in app →' : 'Learn more →'}</span>
              </div>
            </div>
          );
          return r.isAppLink
            ? <Link key={r.id} to={r.href} style={{ textDecoration: 'none' }}>{cardBody}</Link>
            : <a key={r.id} href={r.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{cardBody}</a>;
        })}
        {v.noResources && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', gridColumn: '1 / -1' }}>No resources match these filters.</div>}
      </div>
    </div>
  );
}

// Same ifs_generated_reports table the per-client Document Creator already
// reads (loadWorkspaceReports), just not filtered to one client — this tab
// previously only linked out to /reports with no real data of its own.
function CaseloadReportsView({ v }) {
  return (
    <div style={{ maxWidth: '820px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ ...FR, fontSize: '16px' }}>Recent reports across your caseload</span>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Generated from the Document Creator, most recent first.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={v.onExportCaseloadReportsCsv} disabled={v.noCaseloadReports} style={{ ...v.secondaryBtnStyle, opacity: v.noCaseloadReports ? 0.5 : 1, cursor: v.noCaseloadReports ? 'not-allowed' : 'pointer' }}>Export CSV</button>
          <Link to="/reports" style={{ fontSize: '12px', fontWeight: 700, padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', textDecoration: 'none' }}>Open Report Generator →</Link>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {v.caseloadReportsLoading && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Loading…</div>}
        {v.caseloadReportRows.map((r) => (
          <div key={r.id} style={{ ...CARD, borderRadius: '16px', padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>{r.title}</span>
              <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{r.date}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '4px' }}>{r.clientName}{r.sectionsSummary ? ' · ' + r.sectionsSummary : ''}</div>
          </div>
        ))}
        {v.noCaseloadReports && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No reports generated yet. Create one from Document Creator or the Report Generator.</div>}
      </div>
    </div>
  );
}

function DocsView({ v }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '20px', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ ...FR, fontSize: '16px' }}>Document Creator</span>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>1. Client</div>
            <select value={v.docForm.clientId} onChange={v.onDocClientChange} style={{ ...v.selectStyle, width: '100%' }}>{v.clientOptions.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}</select>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>2. Document type</div>
            <select value={v.docForm.type} onChange={v.onDocTypeChange} style={{ ...v.selectStyle, width: '100%' }}>{v.docTypeOptions.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}</select>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>3. Date range</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="date" value={v.docForm.dateRangeStart || ''} onChange={v.onDocDateChange('dateRangeStart')} style={{ ...inp(), flex: 1 }} />
              <input type="date" value={v.docForm.dateRangeEnd || ''} onChange={v.onDocDateChange('dateRangeEnd')} style={{ ...inp(), flex: 1 }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>4. Source records</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {v.docSourceRows.map((s) => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={s.checked} onChange={s.onToggle} style={{ marginTop: '2px' }} />
                  <span><span style={{ color: 'var(--text)', fontWeight: 600 }}>{s.label}</span><br /><span style={{ fontSize: '11.5px' }}>{s.desc}</span></span>
                </label>
              ))}
            </div>
          </div>
          <button className="aw-primary" onClick={v.onGenerateDoc} disabled={v.docGenerating} style={{ ...v.primaryBtnStyle, opacity: v.docGenerating ? 0.6 : 1, cursor: v.docGenerating ? 'not-allowed' : 'pointer' }}>{v.docGenerating ? 'Generating…' : 'Generate document'}</button>
          {v.docError && <div style={{ fontSize: '12px', color: 'var(--risk-high-text)' }}>{v.docError}</div>}
        </div>
        <div style={{ ...CARD }}>
          <span style={{ ...FR, fontSize: '14px' }}>Recently generated for this client</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {v.clientReportsLoading && <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Loading…</div>}
            {v.clientReportRows.map((r) => (
              <div key={r.id} style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--surface-2)' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>{r.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{r.date}</div>
              </div>
            ))}
            {v.noClientReports && <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>No documents generated yet for this client.</div>}
          </div>
        </div>
      </div>
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '16px' }}>Preview</span>
        {v.hasGeneratedDoc ? (
          <>
            <div style={{ marginTop: '12px', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', height: '520px' }}>
              <iframe title="Generated document preview" srcDoc={v.generatedDoc.html} sandbox="" style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>Generated from real client records — already saved to this client's document history. Advisor review is required before sharing or printing.</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="aw-primary" onClick={v.onOpenGeneratedDoc} style={v.primaryBtnStyle}>Open / Print</button>
              <button onClick={v.onDownloadGeneratedDocPdf} disabled={v.docExporting} style={v.secondaryBtnStyle}>{v.docExporting ? 'Exporting PDF…' : 'Download PDF'}</button>
              <button onClick={v.onDownloadGeneratedDocHtml} style={v.secondaryBtnStyle}>Download HTML</button>
              <button onClick={v.onGenerateDoc} disabled={v.docGenerating} style={v.secondaryBtnStyle}>Regenerate</button>
            </div>
            {v.docExportError && <div style={{ fontSize: '12px', color: 'var(--risk-high-text)', marginTop: '8px' }}>{v.docExportError}</div>}
          </>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>Select sources and generate a document to preview it here.</div>
        )}
      </div>
    </div>
  );
}

function AnalyticsView({ v }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px', alignItems: 'start' }}>
      <div style={CARD}>
        <span style={{ ...FR, fontSize: '16px' }}>Auto-generated insights</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
          {v.insightBullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
              <div style={b.dotStyle} /><div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{b.text}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '18px' }}>
          <span style={{ ...FR, fontSize: '15px' }}>Primary wound distribution</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            {v.woundDistribution.map((w, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-2)', marginBottom: '4px' }}><span>{w.label}</span><span>{w.count}</span></div>
                <div style={{ height: '8px', borderRadius: '5px', background: 'var(--border)', overflow: 'hidden' }}><div style={w.barStyle} /></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: '18px' }}>
          <span style={{ ...FR, fontSize: '15px' }}>Caseload average Self-Energy, last 6 weeks</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '110px', marginTop: '16px' }}>
            {v.moodTrend.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={m.barStyle} /><span style={{ fontSize: '10.5px', color: 'var(--muted)' }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={CARD}>
          <span style={{ ...FR, fontSize: '15px' }}>Engagement streaks</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {v.engagementList.map((e, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-2)', marginBottom: '4px' }}><span>{e.name}</span><span>{e.streakLabel}</span></div>
                <div style={{ height: '8px', borderRadius: '5px', background: 'var(--border)', overflow: 'hidden' }}><div style={e.barStyle} /></div>
              </div>
            ))}
          </div>
        </div>
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...FR, fontSize: '15px' }}>Exportable reports</span>
            <button onClick={v.onGenerateReport} style={v.secondaryBtnStyle}>Generate report</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            {v.reports.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>{r.title}</span><span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{r.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EngagementView({ v }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '900px' }}>
      {v.engagementRows.map((e) => (
        <div key={e.id} style={{ ...CARD, borderRadius: '18px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={avatar(38)}>{e.initial}</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{e.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{e.indicatorsSummary}</div>
              </div>
            </div>
            <span style={e.statusChip}>{e.statusLabel}</span>
          </div>
          {e.expanded && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '10px' }}>
              {e.evidence.map((ev) => (
                <div key={ev.label}>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{ev.label}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '2px' }}>{ev.value}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
            <button onClick={e.onToggleExpand} style={v.secondaryBtnStyle}>{e.expandLabel}</button>
            <button onClick={e.onOutreach} style={v.secondaryBtnStyle}>Send check-in</button>
            <button onClick={e.onDismiss} style={v.secondaryBtnStyle}>{e.dismissLabel}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AccessControlView({ v }) {
  return (
    <div style={{ maxWidth: '640px', ...CARD, display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ ...FR, fontSize: '16px' }}>Client Access</span>
      <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '14px' }}>
        Control which modules, assessments, and features a client can reach in their own portal.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <select value={v.accessControlClientId} onChange={(e) => v.onAccessControlClientChange(e.target.value)} style={v.selectStyle}>
          <option value="">Select a client…</option>
          {v.accessControlClientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {v.hasAccessControlClient && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 4px', borderTop: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>Full access</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>When on, {v.accessControlClientName} can reach every module, assessment, and feature.</div>
            </div>
            <button onClick={v.onToggleAccessControlFullAccess} style={v.accessControlFullAccessTrackStyle}><div style={v.accessControlFullAccessKnobStyle} /></button>
          </div>

          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>Modules</div>
          {v.accessControlModuleRows.map((m) => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>{m.label}</div>
              <button onClick={m.onClick} disabled={m.disabled} style={m.trackStyle}><div style={m.knobStyle} /></button>
            </div>
          ))}

          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>Assessments</div>
          {v.accessControlAssessmentRows.map((a) => (
            <div key={a.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>{a.label}</div>
              <button onClick={a.onClick} disabled={a.disabled} style={a.trackStyle}><div style={a.knobStyle} /></button>
            </div>
          ))}

          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>Features</div>
          {v.accessControlFeatureRows.map((f) => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>{f.label}</div>
              <button onClick={f.onClick} disabled={f.disabled} style={f.trackStyle}><div style={f.knobStyle} /></button>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
            <button onClick={v.onSaveAccessControl} disabled={v.accessControlSaving || v.isDemo} style={v.primaryBtnStyle}>{v.accessControlSaving ? 'Saving…' : 'Save access'}</button>
            {v.accessControlSaved && <span style={{ fontSize: '12.5px', color: 'var(--emerald-2)', fontWeight: 600 }}>{v.accessControlSaved}</span>}
            {v.isDemo && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Sign in to save changes.</span>}
          </div>
        </>
      )}
    </div>
  );
}

function AdminTeamView({ v }) {
  return (
    <div style={{ maxWidth: '820px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ ...FR, fontSize: '16px' }}>Team & Caseloads</span>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Reassign clients across Advisors and supervisors.</div>
        </div>
        <button onClick={v.onRefreshTeam} disabled={v.teamLoading} style={v.secondaryBtnStyle}>{v.teamLoading ? 'Loading…' : 'Refresh'}</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {v.teamRows.map((t) => (
          <div key={t.id} style={{ ...CARD, borderRadius: '18px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{t.email} · {t.caseloadCount} active client{t.caseloadCount === 1 ? '' : 's'}</div>
              </div>
            </div>
            {t.clients.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                {t.clients.map((c) => (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text)' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Assigned {c.assignedLabel}</div>
                    </div>
                    <button onClick={c.onReassign} style={v.secondaryBtnStyle}>Reassign</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {v.noTeamRows && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>No staff accounts found.</div>}
      </div>
      {v.hasReassignTarget && (
        <div style={{ ...CARD, borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>Move {v.reassignClientName} to another Advisor</span>
          <select value={v.reassignToTherapistId} onChange={v.onReassignToTherapistChange} style={{ ...v.selectStyle, width: '100%' }}>
            <option value="">Choose Advisor…</option>
            {v.reassignTargetOptions.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
          </select>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={v.onCancelReassign} style={v.secondaryBtnStyle}>Cancel</button>
            <button onClick={v.onSaveReassignment} disabled={!v.reassignToTherapistId || v.reassignSaving || v.isDemo} style={v.primaryBtnStyle}>{v.reassignSaving ? 'Saving…' : 'Save reassignment'}</button>
            {v.isDemo && <span style={{ fontSize: '12px', color: 'var(--muted)', alignSelf: 'center' }}>Sign in to save changes.</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView({ v }) {
  return (
    <div style={{ maxWidth: '560px', ...CARD, display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ ...FR, fontSize: '16px' }}>Notifications</span>
        {v.notificationPrefsSaving && <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Saving…</span>}
      </div>
      {v.settingsToggles.map((s) => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 4px', borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>{s.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{s.desc}</div>
          </div>
          <button onClick={s.onClick} style={s.trackStyle}><div style={s.knobStyle} /></button>
        </div>
      ))}
    </div>
  );
}

export function EmptyCaseload({ theme, onReset }) {
  return (
    <div className="aw-root" style={{ minHeight: '100vh', background: theme.bg, color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '32px' }}>
      <div style={{ maxWidth: '440px', textAlign: 'center', background: theme.surface, border: '1px solid ' + theme.border, borderRadius: '20px', padding: '32px', boxShadow: theme.shadow }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: '18px', color: theme.text }}>Your caseload is empty</div>
        <div style={{ fontSize: '13.5px', color: theme.muted, marginTop: '8px', lineHeight: 1.6 }}>
          There are no clients in this workspace. Add a client from the Caseload view to get started.
        </div>
        {onReset && (
          <button type="button" onClick={onReset} style={{ marginTop: '18px', background: `linear-gradient(135deg, ${theme.accent2}, ${theme.emerald2})`, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Restore sample caseload
          </button>
        )}
      </div>
    </div>
  );
}

export function WorkspaceStatus({ theme, message, spinner = false }) {
  return (
    <div className="aw-root" style={{ minHeight: '100vh', background: theme.bg, color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '32px' }}>
      <style>{'@keyframes aw-spin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ textAlign: 'center' }}>
        {spinner && (
          <div style={{ width: '32px', height: '32px', margin: '0 auto 16px', borderRadius: '50%', border: '3px solid ' + theme.border, borderTopColor: theme.accent2, animation: 'aw-spin 0.8s linear infinite' }} />
        )}
        <div style={{ fontSize: '14px', color: theme.muted, maxWidth: '360px', lineHeight: 1.6 }}>{message}</div>
      </div>
    </div>
  );
}
