import { Link } from 'react-router-dom';
import {
  WOUND_META, woundChip, daysAgoText, severityStyle, RISK_LEVEL_TO_SEV, RISK_LEVEL_LABEL,
  PART_CAT_META, partChip, TEMPLATE_OPTIONS, PRACTICE_TYPE_META, LESSON_TITLES, PLAN_PHASES,
  DOC_TYPES, DOC_SOURCES, NAV_CONFIG, CLIENT_TABS, TIMELINE_TYPE_META, TAB_TITLES, TOGGLE_META,
  QUICK_MESSAGES, engagementStatusFor,
} from './advisorWorkspaceData.js';

// Computes every derived value the UI needs (mirrors the design's renderVals()).
export function buildView({ S, theme, allClients, buildTreatmentPlan, handlers: H, isAdmin = false }) {
  const {
    activeTab, isDark, viewMode, selectedClientId, activeClientTab, search, filterWound, reviewedIds,
    sessionPrepOpenId, noteDraft, savedNotes, planClientId, practiceForm, generatedPractice, assignedPractices,
    assignedLessons, coTherapyShare, coTherapyMessage, coTherapyThread, reports, settingsToggles, clientMessages,
    clientMessageDraft, activeThreadId, safetyOverrides, engagementDismissed, partsClientFilter, tasks, taskFilter,
    newTaskTitle, newTaskClientId, docForm, docSources, generatedDoc, docGenerating, docError, clientReports, clientReportsLoading, deletedMessageIdx,
    sessionSnapshot,
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
  const ALL_CLIENTS = allClients();
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
    unassigned: unassignedCount,
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
      return {
        id: c.id, name: c.name, initial: c.initial, lastActiveText: c.lastActiveText,
        woundChip: woundChip(c.primaryWound, isDark, true), woundLabel: WOUND_META[c.primaryWound].label, hasRisk: !!c.risk,
        unassigned: !!c.unassigned, unassignedChip: severityStyle(theme, 'medium'),
        rowStyle: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', cursor: 'pointer', background: selected ? 'var(--surface-2)' : 'transparent', border: '1px solid ' + (selected ? theme.border : (c.unassigned ? theme.riskMedBorder : 'transparent')) },
        onClick: () => H.selectClient(c.id),
        onClaim: () => H.onClaimClient(c.id),
      };
    });

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
    selectedClient = {
      id: rawSelected.id, name: rawSelected.name, initial: rawSelected.initial, email: rawSelected.email, phone: rawSelected.phone,
      statusLabel: rawSelected.status === 'active' ? 'Active' : 'Inactive', statusChip: severityStyle(theme, rawSelected.status === 'active' ? 'low' : 'medium'),
      unassigned: !!rawSelected.unassigned, onClaim: () => H.onClaimClient(rawSelected.id),
      woundChip: woundChip(rawSelected.primaryWound, isDark, false), woundLabel: WOUND_META[rawSelected.primaryWound].label,
      secondaryChip: woundChip(rawSelected.secondaryWound, isDark, true), secondaryLabel: WOUND_META[rawSelected.secondaryWound].label,
      lastActiveText: rawSelected.lastActiveText.toLowerCase(), streak: rawSelected.streak, level: rawSelected.level, modulesLabel: rawSelected.modulesCompleted + '/12',
      progressBarStyle: { width: rawSelected.progressPct + '%', height: '100%', borderRadius: '6px', background: `linear-gradient(90deg, ${theme.accent2}, ${theme.emerald2})` },
      progressLabel: rawSelected.progressPct + '% complete · ' + rawSelected.modulesCompleted + ' of 12 modules',
      assessmentBars: Object.keys(WOUND_META).map((k) => ({
        label: WOUND_META[k].label, scoreLabel: rawSelected.scores[k] + '/20',
        barStyle: { width: Math.round((rawSelected.scores[k] / 20) * 100) + '%', height: '100%', borderRadius: '4px', background: k === rawSelected.primaryWound ? theme.accent2 : (k === rawSelected.secondaryWound ? theme.emerald2 : theme.muted) },
      })),
      goals: rawSelected.goals.map((g) => ({ title: g.title, reviewLabel: 'Review in ' + g.reviewInDays + 'd', style: { fontSize: '11px', fontWeight: 700, color: g.reviewInDays <= 7 ? theme.riskMedText : theme.muted } })),
      qaAnswers: rawSelected.qaAnswers,
      timeline: rawSelected.timeline.map((e) => { const m = TIMELINE_TYPE_META[e.type] || TIMELINE_TYPE_META.note; return { label: e.label, date: e.date, typeLabel: m.label, typeChip: { fontSize: '10px', fontWeight: 700, color: m.color, background: isDark ? 'rgba(255,255,255,0.08)' : m.color + '14', padding: '3px 7px', borderRadius: '6px', whiteSpace: 'nowrap', height: 'fit-content' } }; }),
      clientNotes: savedNotes.filter((n) => n.clientId === rawSelected.id).map((n) => ({ ...n, statusStyle: severityStyle(theme, n.status === 'Signed & Locked' ? 'low' : 'medium'), statusLabel: n.status })),
      noNotes: !savedNotes.some((n) => n.clientId === rawSelected.id),
      plan: buildTreatmentPlan(rawSelected),
      mbc: rawSelected.mbc.map((m) => {
        const change = m.current - m.previous;
        const max = Math.max(...m.history, 1);
        return {
          ...m, sevChip: severityStyle(theme, m.current > m.baseline ? 'high' : (m.current === m.baseline ? 'medium' : 'low')),
          changeLabel: (change > 0 ? '+' : '') + change + ' pts', changeStyle: { fontSize: '15px', fontWeight: 700, color: change > 0 ? theme.riskHighText : (change < 0 ? theme.emerald2 : theme.muted) },
          sparkline: m.history.map((v) => ({ style: { flex: 1, height: Math.max(6, Math.round((v / max) * 36)) + 'px', borderRadius: '3px 3px 0 0', background: theme.accent2 + '55' } })),
        };
      }),
      snapshot: {
        loading: !!sessionSnapshot.loading,
        error: sessionSnapshot.error || '',
        hasData: !!sessionSnapshot.data,
        data: sessionSnapshot.data,
        onGenerate: canWrite ? H.onGenerateSnapshot : undefined,
        onCopy: sessionSnapshot.data ? H.onCopySnapshot : undefined,
      },
      parts: rawSelected.parts.map((p) => ({ ...p, catChip: partChip(p.category, isDark), catLabel: PART_CAT_META[p.category].label, barStyle: { width: p.activation + '%', height: '100%', borderRadius: '4px', background: PART_CAT_META[p.category].color } })),
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
      },
      messages: allMsgs.map((m, idx) => ({ idx, authorLabel: m.from === 'client' ? rawSelected.name : 'You', text: m.text, date: m.date, readTick: m.from === 'advisor' ? '✓✓' : '', onDelete: () => H.onDeleteMessage(rawSelected.id, idx), bubbleStyle: { alignSelf: m.from === 'advisor' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '10px 14px', borderRadius: '14px', background: m.from === 'advisor' ? theme.accent2 : theme.surface2, color: m.from === 'advisor' ? '#fff' : theme.text } })).filter((m) => !((deletedMessageIdx[rawSelected.id] || {})[m.idx])),
      canWrite,
      onDraftNote: canWrite ? () => H.draftNoteFor(rawSelected.id) : undefined,
      onOpenPrep: canWrite ? () => H.openPrepFor(rawSelected.id) : undefined,
      onOpenPlan: canWrite ? () => H.openPlanFor(rawSelected.id) : undefined,
      onOpenPractice: canWrite ? () => H.openPracticeFor(rawSelected.id) : undefined,
      onStartDelete: canWrite ? () => H.onStartDelete(rawSelected.id) : undefined,
    };
  }

  const reviewItems = [];
  assignedClients.forEach((c) => {
    if (c.risk && !reviewedIds['risk-' + c.id]) reviewItems.push({ id: 'risk-' + c.id, sevChip: severityStyle(theme, c.risk.level), sevLabel: c.risk.level === 'high' ? 'High' : 'Medium', title: c.risk.type === 'concerning_language' ? 'Concerning language detected' : 'Extended inactivity', detail: c.risk.detail, clientName: c.name, when: daysAgoText(c.risk.daysAgo), actionLabel: 'Mark reviewed', onResolve: () => H.markReviewed('risk-' + c.id), onOpenClient: () => H.selectClient(c.id) });
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
    isExpanded: sessionPrepOpenId === c.id, qaAnswers: c.qaAnswers, onToggle: () => H.toggleSessionPrep(c.id), onDraftNote: () => H.draftNoteFor(c.id),
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

  const threadList = enrichedClients.filter((c) => c.messages.length > 0 || (clientMessages[c.id] || []).length > 0).map((c) => {
    const all = [...c.messages, ...(clientMessages[c.id] || [])];
    const last = all[all.length - 1];
    const hasUnread = hasUnreadFor(c);
    return { id: c.id, initial: c.initial, name: c.name, preview: last ? last.text : '', hasUnread, onClick: () => H.setActiveThread(c.id), rowStyle: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '14px', cursor: 'pointer', background: activeThreadId === c.id ? theme.surface2 : 'transparent' } };
  });
  const activeThreadClient = enrichedClients.find((c) => c.id === activeThreadId) || enrichedClients[0];
  const activeThreadMsgs = [...activeThreadClient.messages, ...(clientMessages[activeThreadClient.id] || [])];
  const activeThreadDeleted = deletedMessageIdx[activeThreadClient.id] || {};
  const activeThread = {
    name: activeThreadClient.name,
    messages: activeThreadMsgs.map((m, idx) => ({ idx, authorLabel: m.from === 'client' ? activeThreadClient.name : 'You', text: m.text, date: m.date, readTick: m.from === 'advisor' ? '✓✓' : '', onDelete: () => H.onDeleteMessage(activeThreadClient.id, idx), bubbleStyle: { alignSelf: m.from === 'advisor' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '10px 14px', borderRadius: '14px', background: m.from === 'advisor' ? theme.accent2 : theme.surface2, color: m.from === 'advisor' ? '#fff' : theme.text } })).filter((m) => !activeThreadDeleted[m.idx]),
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
      titleStyle: { fontSize: '13.5px', fontWeight: 600, color: done ? theme.muted : theme.text, textDecoration: done ? 'line-through' : 'none' },
      priorityLabel: t.priority, priorityChip: severityStyle(theme, t.priority === 'high' ? 'high' : (t.priority === 'medium' ? 'medium' : 'low')),
      rowStyle: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', background: theme.surface, border: '1px solid ' + theme.border, boxShadow: theme.shadow },
    };
  });
  const noTasks = taskRows.length === 0;

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
    return { id: c.id, initial: c.initial, name: c.name, indicatorsSummary: `${activitySummary} · ${c.pendingReview ? '1 pending review' : 'no pending items'}`, statusLabel: status, statusChip: severityStyle(theme, sev), onOutreach: () => H.setActiveThread(c.id), dismissLabel: 'Dismiss flag', onDismiss: () => H.onDismissEngagement(c.id) };
  });

  const settingsTogglesList = Object.keys(TOGGLE_META).map((key) => {
    const on = settingsToggles[key];
    return { key, label: TOGGLE_META[key].label, desc: TOGGLE_META[key].desc, onClick: () => H.toggleSetting(key), trackStyle: { width: '40px', height: '22px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: on ? theme.emerald2 : theme.border, position: 'relative', padding: '3px', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start' }, knobStyle: { width: '16px', height: '16px', borderRadius: '50%', background: '#fff' } };
  });

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

  const NOTIF_DOT_META = { risk: theme.riskHighText, practice: theme.emerald2, engagement: theme.riskMedText, message: '#0d9488', assessment: '#2563eb' };
  const notificationRows = [...S.notifications].sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1)).map((n) => {
    const client = ALL_CLIENTS.find((c) => c.id === n.clientId);
    return {
      id: n.id, title: n.title, message: n.message, date: n.date,
      typeDot: { width: '9px', height: '9px', borderRadius: '50%', marginTop: '4px', background: NOTIF_DOT_META[n.type] || theme.muted, flexShrink: 0 },
      priorityChip: severityStyle(theme, n.priority), priorityLabel: n.priority,
      rowStyle: { background: n.read ? 'var(--surface)' : 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '12px', boxShadow: 'var(--shadow)' },
      clientName: client ? client.name : '',
      onOpenClient: () => H.onOpenNotifClient(n.clientId, n.id), onMarkRead: () => H.onMarkNotifRead(n.id), showMarkRead: !n.read,
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
    isClientTabSnapshot: activeClientTab === 'snapshot',
    isClinicalNotes: activeTab === 'clinical-notes', isClinicalPlans: activeTab === 'clinical-plans', isClinicalMbc: activeTab === 'clinical-mbc', isClinicalParts: activeTab === 'clinical-parts',
    isClinicalPractice: activeTab === 'clinical-practice', isClinicalPracticeInteractive: activeTab === 'clinical-practice-interactive',
    isClinicalLessons: activeTab === 'clinical-lessons', isClinicalCurriculumBuilder: activeTab === 'clinical-curriculum-builder', isClinicalDocs: activeTab === 'clinical-docs',
    isInsightsReports: activeTab === 'insights-reports', isAdminAccess: activeTab === 'admin-access', isAdminTeam: activeTab === 'admin-team', isAdminAudit: activeTab === 'admin-audit', isSettings: activeTab === 'settings',
    isJourney: viewMode === 'journey', isCommandMode: viewMode === 'command',
    disclaimerStyle,
    stats, quickActions, needsAttention: needsAttentionRaw, noAttentionNeeded: needsAttentionRaw.length === 0,
    todaysSessions, caseloadSnapshot, goToReview: () => H.setTab('review'), goToClients: () => H.setTab('clients-caseload'),
    woundFilters, clientListFiltered, hasSelectedClient, selectedClient, clientTabs,
    isClientTabOverview: activeClientTab === 'overview', isClientTabTimeline: activeClientTab === 'timeline', isClientTabNotes: activeClientTab === 'notes',
    isClientTabPlan: activeClientTab === 'plan', isClientTabMbc: activeClientTab === 'mbc', isClientTabParts: activeClientTab === 'parts',
    isClientTabPractices: activeClientTab === 'practices', isClientTabSafety: activeClientTab === 'safety', isClientTabMessages: activeClientTab === 'messages',
    primaryBtnStyle, secondaryBtnStyle, selectStyle,
    reviewItems, reviewQueueEmpty, safetyRows,
    prepList, coTherapy, hasCoTherapyClient, coTherapyMessage, onCoTherapyMessageChange: H.onCoTherapyMessageChange, onSendCoTherapyMessage: H.onSendCoTherapyMessage,
    clientMessageDraft, onClientMessageChange: H.onClientMessageChange, onSendClientMessage: H.onSendClientMessage,
    threadList, activeThread,
    taskFilters, taskRows, noTasks, newTaskTitle, newTaskClientId, onNewTaskTitleChange: H.onNewTaskTitleChange, onNewTaskClientChange: H.onNewTaskClientChange, onAddTask: H.onAddTask,
    noteDraft: { ...noteDraft, placeholder: currentTemplate.placeholder }, clientOptions, templateOptions: TEMPLATE_OPTIONS,
    onNoteClientChange: H.onNoteClientChange, onNoteTemplateChange: H.onNoteTemplateChange, onNoteTextChange: H.onNoteTextChange, onSaveNote: H.onSaveNote, onSignNote: H.onSignNote,
    savedNotes: savedNotes.map((n) => ({ ...n, statusStyle: severityStyle(theme, n.status === 'Signed & Locked' ? 'low' : 'medium'), statusLabel: n.status })), allGoals,
    planClientId, onPlanClientChange: H.onPlanClientChange, treatmentPlan, hasPlanClient,
    practiceForm, woundOptions, practiceTypeOptions, onPracticeClientChange: H.onPracticeClientChange, onPracticeWoundChange: H.onPracticeWoundChange, onPracticeTypeChange: H.onPracticeTypeChange,
    onGeneratePractice: H.onGeneratePractice, hasGeneratedPractice: !!generatedPractice, generatedPractice, onAssignPractice: H.onAssignPractice, assignedPractices, noAssignedPractices: assignedPractices.length === 0,
    lessons, mbcCaseloadRows, partsClientFilters, partsAllRows,
    docForm, docTypeOptions, docSourceRows,
    onDocClientChange: H.onDocClientChange, onDocTypeChange: H.onDocTypeChange, onDocDateChange: H.onDocDateChange,
    onGenerateDoc: H.onGenerateDoc, onOpenGeneratedDoc: H.onOpenGeneratedDoc,
    hasGeneratedDoc: !!generatedDoc, generatedDoc, docGenerating: !!docGenerating, docError,
    clientReportRows, noClientReports, clientReportsLoading: !!clientReportsLoading,
    woundDistribution, engagementList, moodTrend, insightBullets, reports, onGenerateReport: H.onGenerateReport,
    engagementRows,
    settingsToggles: settingsTogglesList,
    showNewClientForm: S.showNewClientForm, newClientForm: S.newClientForm, newClientResult: S.newClientResult, onToggleNewClientForm: H.toggleNewClientForm,
    onNewClientNameChange: H.onNewClientFieldChange('name'), onNewClientEmailChange: H.onNewClientFieldChange('email'), onNewClientPhoneChange: H.onNewClientFieldChange('phone'), onNewClientSendEmailChange: H.onNewClientFieldChange('sendEmail'), onCreateClient: H.onCreateClient,
    deletingClientId: S.deletingClientId, deletingClientName: deletingClient ? deletingClient.name : '', deleteConfirmText: S.deleteConfirmText, deleteConfirmMatches, notDeleteConfirmMatches: !deleteConfirmMatches, deleteConfirmOpacity: deleteConfirmMatches ? 1 : 0.5,
    onCancelDelete: H.onCancelDelete, onDeleteConfirmChange: H.onDeleteConfirmChange, onConfirmDelete: H.onConfirmDelete,
    liveSessionRows, noLiveSessions,
    notificationRows, noNotifications, notifUnreadCount, onMarkAllNotifsRead: H.onMarkAllNotifsRead,
    practiceGuidance: S.practiceGuidance, onPracticeGuidanceChange: H.onPracticeGuidanceChange, onGeneratePracticeBatch: H.onGeneratePracticeBatch, practiceBatchRows, hasPracticeBatch: practiceBatchRows.length > 0,
    quickMessages,
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
      {v.isClinicalDocs && <DocsView v={v} />}
      {v.isClientsAnalytics && <AnalyticsView v={v} />}
      {v.isClientsEngagement && <EngagementView v={v} />}
      {v.isSettings && <SettingsView v={v} />}
      {v.isClinicalPracticeInteractive && <ImportPanel title="Interactive Practice Builder" desc="Build guided, multi-step interactive modules — more than static prompts — and assign them to clients." to="/curriculum" linkLabel="Open Curriculum" />}
      {v.isClinicalCurriculumBuilder && <ImportPanel title="Custom Curriculum" desc="Design and assign an individualized curriculum path per client from the module library." to="/assessment-builder" linkLabel="Open Builder" />}
      {v.isInsightsReports && <ImportPanel title="Report Generator" desc="Create and export multiple report types across your caseload — progress summaries, treatment plan overviews, and more." to="/reports" linkLabel="Open Reports" />}
      {v.isAdminAccess && <ImportPanel title="Access Control" desc="Manage roles and client access across your team." to="/admin-hub" linkLabel="Open Admin Hub" />}
      {v.isAdminTeam && <ImportPanel title="Team & Caseloads" desc="Reassign clients across Advisors and supervisors." to="/admin-hub" linkLabel="Open Admin Hub" />}
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
  ];
  const hasUnassigned = (v.stats.unassigned || 0) > 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hasUnassigned ? 5 : 4},1fr)`, gap: '16px' }}>
        {statCards.map((s) => (
          <div key={s.key} style={{ ...CARD, borderRadius: '18px', padding: '18px 20px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color, marginBottom: '10px' }} />
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Fraunces',serif" }}>{s.value}</div>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
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
        <button onClick={v.onToggleNewClientForm} style={{ ...v.secondaryBtnStyle, width: '100%' }}>+ New client</button>
        {v.showNewClientForm && (
          <div style={{ ...CARD, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input value={v.newClientForm.name} onChange={v.onNewClientNameChange} placeholder="Full name" style={inp()} />
            <input value={v.newClientForm.email} onChange={v.onNewClientEmailChange} placeholder="Email" style={inp()} />
            <input value={v.newClientForm.phone} onChange={v.onNewClientPhoneChange} placeholder="Phone" style={inp()} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-2)', cursor: 'pointer' }}>
              <input type="checkbox" checked={v.newClientForm.sendEmail} onChange={v.onNewClientSendEmailChange} />Send welcome email with PIN
            </label>
            <button className="aw-primary" onClick={v.onCreateClient} style={v.primaryBtnStyle}>Create client</button>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                    {c.unassigned ? (
                      <span style={c.unassignedChip}>Unassigned</span>
                    ) : (
                      <span style={c.woundChip}>{c.woundLabel}</span>
                    )}
                    <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{c.lastActiveText}</span>
                  </div>
                </div>
                {c.hasRisk && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--risk-high-text)', flexShrink: 0 }} />}
              </button>
              {c.unassigned && (
                <button type="button" onClick={c.onClaim} title="Add this client to my caseload" style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>Claim</button>
              )}
            </div>
          ))}
        </div>
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
              </div>
            </div>
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
          {v.isClientTabSnapshot && <SnapshotTab snapshot={sc.snapshot} primaryBtnStyle={v.primaryBtnStyle} secondaryBtnStyle={v.secondaryBtnStyle} />}
          {v.isClientTabTimeline && (
            <div style={CARD}>
              <span style={{ ...FR, fontSize: '15px' }}>Unified timeline</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {sc.timeline.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px' }}>
                    <span style={e.typeChip}>{e.typeLabel}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', color: 'var(--text)' }}>{e.label}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>{e.date}</div>
                    </div>
                  </div>
                ))}
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
          {v.isClientTabParts && <PartsGrid parts={sc.parts} cols={2} showClient={false} />}
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
          <div style={{ marginTop: '16px' }}>
            <div style={{ height: '10px', borderRadius: '6px', background: 'var(--border)', overflow: 'hidden' }}><div style={sc.progressBarStyle} /></div>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '6px' }}>{sc.progressLabel}</div>
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
        </div>
      </div>
      <div style={{ border: '1px solid var(--risk-high-border)', borderRadius: '20px', padding: '20px', background: 'var(--risk-high-bg)' }}>
        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--risk-high-text)' }}>Danger zone</span>
        <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '4px' }}>Permanently remove this client and all associated records.</div>
        <button onClick={sc.onStartDelete} disabled={!sc.canWrite} style={{ marginTop: '10px', background: 'var(--risk-high-text)', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: sc.canWrite ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: sc.canWrite ? 1 : 0.5 }}>Delete client</button>
        {v.deletingClientId && (
          <div style={{ marginTop: '14px', padding: '14px', borderRadius: '14px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12.5px', color: 'var(--text-2)' }}>Type <strong>{v.deletingClientName}</strong> to confirm deletion.</div>
            <input value={v.deleteConfirmText} onChange={v.onDeleteConfirmChange} placeholder="Client name" style={{ ...inp(), width: '100%', marginTop: '8px' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={v.onCancelDelete} style={v.secondaryBtnStyle}>Cancel</button>
              <button onClick={v.onConfirmDelete} disabled={v.notDeleteConfirmMatches} style={{ background: 'var(--risk-high-text)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', opacity: v.deleteConfirmOpacity }}>Permanently delete</button>
            </div>
          </div>
        )}
      </div>
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
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '36px', marginTop: '14px' }}>
            {m.sparkline.map((s, i) => (<div key={i} style={s.style} />))}
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
          <button onClick={s.onAcknowledge} disabled={!sc.canWrite} style={{ ...s.ackBtnStyle, opacity: sc.canWrite ? 1 : 0.5, cursor: sc.canWrite ? 'pointer' : 'not-allowed' }}>{s.ackBtnLabel}</button>
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
            <button onClick={n.onOpenClient} style={v.secondaryBtnStyle}>Open client</button>
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
              {p.qaAnswers.map((qa, i) => (
                <div key={i} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--surface-2)' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-2)' }}>{qa.question}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '4px', lineHeight: 1.5 }}>“{qa.answer}”</div>
                </div>
              ))}
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
          <button className="aw-primary" onClick={v.onGeneratePractice} style={v.primaryBtnStyle}>✨ Generate one</button>
          <button onClick={v.onGeneratePracticeBatch} style={v.secondaryBtnStyle}>Generate set of 4</button>
        </div>
        {v.hasGeneratedPractice && (
          <div style={{ marginTop: '16px', padding: '16px', borderRadius: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{v.generatedPractice}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>AI-generated draft — requires Advisor review before assigning.</div>
            <button onClick={v.onAssignPractice} style={{ ...v.secondaryBtnStyle, marginTop: '10px' }}>Approve &amp; assign to client</button>
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
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button className="aw-primary" onClick={v.onOpenGeneratedDoc} style={v.primaryBtnStyle}>Open / Print</button>
              <button onClick={v.onGenerateDoc} disabled={v.docGenerating} style={v.secondaryBtnStyle}>Regenerate</button>
            </div>
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
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
            <button onClick={e.onOutreach} style={v.secondaryBtnStyle}>Send check-in</button>
            <button onClick={e.onDismiss} style={v.secondaryBtnStyle}>{e.dismissLabel}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsView({ v }) {
  return (
    <div style={{ maxWidth: '560px', ...CARD, display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ ...FR, fontSize: '16px', marginBottom: '10px' }}>Notifications</span>
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
