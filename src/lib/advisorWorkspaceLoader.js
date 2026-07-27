// Real-data loader + mappers for the Advisor Workspace.
//
// The workspace UI (src/pages/AdvisorWorkspace*) renders from a client shape
// that originated as seeded demo data. This module loads the therapist's real
// caseload and per-client records and maps them into that same shape, so the
// existing view model keeps working unchanged. Fields without a real backend
// source (e.g. MBC measures, structured safety plans) degrade to neutral empty
// states rather than inventing data.

import { loadAssignedClients, loadAssignedClientsWithStatus, assignClientToTherapist } from './therapistAssignments';
import { loadClientAnalytics } from './clientAnalytics';
import { loadTherapistNotesForClient, createTherapistNote } from './therapistNotes';
import { loadActiveTreatmentPlansForClient } from './treatmentPlans';
import { loadNotifications, markNotificationRead, markAllNotificationsRead } from './notifications.js';
import { loadSharedLifeIntegrationReflectionsForAdvisor } from './lifeIntegration.js';
import { normalizeLifeReflection } from './lifeIntegrationDisplay.js';
import { supabase } from './supabase';
import { getClerkToken } from './apiAuth.js';

export const WORKSPACE_WOUNDS = ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'];

const PART_ROLE_TO_CATEGORY = {
  manager: 'manager', protector: 'manager', proactive: 'manager',
  firefighter: 'firefighter', reactive: 'firefighter',
  exile: 'exile', wounded: 'exile', vulnerable: 'exile',
};

const NOTE_TYPE_LABEL = {
  session_note: 'Session Note', prep_note: 'Session Prep', homework_review: 'Homework Review',
  treatment_plan_review: 'Treatment Plan Review', general: 'Note', archived: 'Archived Note',
};

export function initialsFrom(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  return parts.map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function daysSince(value) {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86400000));
}

function relativeDateLabel(value) {
  const d = daysSince(value);
  if (d === null) return '';
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`;
  try {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return `${d} days ago`;
  }
}

// Map a raw ifs_clients row into the workspace client shape with neutral
// defaults for everything that requires a per-client detail load.
export function mapClientRow(row) {
  const lastActiveDays = daysSince(row.last_active);
  const inactiveByStatus = ['inactive', 'discharged', 'paused'].includes(String(row.status || '').toLowerCase());
  const inactiveByTime = lastActiveDays !== null && lastActiveDays >= 14;
  const status = inactiveByStatus || inactiveByTime ? 'inactive' : 'active';
  const effectiveDays = lastActiveDays === null ? 999 : lastActiveDays;

  let risk = null;
  if (effectiveDays >= 9) {
    const detail = lastActiveDays === null ? 'No login or activity has been recorded yet.' : `No login or activity in ${effectiveDays} days.`;
    risk = { type: 'inactivity', level: effectiveDays >= 21 ? 'high' : 'medium', detail, daysAgo: effectiveDays };
  }

  // `assignment_status` is only present when the caseload was loaded with
  // unassigned clients included (see loadWorkspaceCaseload). When present and
  // null, this client has no Advisor assignment yet — e.g. a fresh signup.
  const hasAssignmentStatus = Object.prototype.hasOwnProperty.call(row, 'assignment_status');
  const unassigned = hasAssignmentStatus ? row.assignment_status == null : false;

  return {
    id: row.id,
    name: row.name || 'Unnamed client',
    initial: initialsFrom(row.name),
    email: row.email || '',
    phone: row.phone || '',
    status,
    unassigned,
    supportPriority: 'standard',
    primaryWound: 'abandonment',
    secondaryWound: 'shame',
    progressPct: 0,
    modulesCompleted: 0,
    streak: 0,
    level: 1,
    lastActiveDays: effectiveDays,
    risk,
    scores: { abandonment: 0, shame: 0, neglect: 0, betrayal: 0, helplessness: 0 },
    goals: [],
    pendingReview: null,
    session: { when: 'No upcoming session scheduled', status: 'none' },
    recentActivity: [],
    qaAnswers: [],
    timeline: [],
    safety: { riskLevel: risk ? 'monitor' : 'none', protective: [], riskFactors: risk ? ['Extended inactivity'] : [], safetyPlan: null, contacts: [], acknowledged: true, ackNote: '' },
    mbc: [],
    assessmentHistory: [],
    betweenSession: {
      homeworkFunnel: { totalAssigned: 0, inProgress: 0, completed: 0, reviewed: 0, completionPct: 0, avgDaysToComplete: null },
      moodEntries: [], moodTrend: [], energyTrend: [], journalWeekly: [],
      hasMoodData: false, hasJournalData: false, hasHomeworkData: false,
    },
    parts: [],
    messages: [],
    _detailLoaded: false,
  };
}

function normalizeWound(value) {
  const w = String(value || '').toLowerCase();
  return WORKSPACE_WOUNDS.includes(w) ? w : null;
}

function mapAssessment(assessmentTrajectory) {
  if (!Array.isArray(assessmentTrajectory) || assessmentTrajectory.length === 0) return null;
  const latest = assessmentTrajectory[assessmentTrajectory.length - 1];
  const scores = { abandonment: 0, shame: 0, neglect: 0, betrayal: 0, helplessness: 0 };
  WORKSPACE_WOUNDS.forEach((k) => {
    const v = Number(latest.scores?.[k]);
    scores[k] = Number.isFinite(v) ? v : 0;
  });
  // Rank wounds by score so we always have a sensible primary/secondary even
  // when the stored primary_wound is a wound the workspace doesn't chart.
  const ranked = [...WORKSPACE_WOUNDS].sort((a, b) => scores[b] - scores[a]);
  const primary = normalizeWound(latest.primaryWound) || ranked[0] || 'abandonment';
  const secondary = normalizeWound(latest.secondaryWound) || ranked.find((w) => w !== primary) || 'shame';
  return { scores, primaryWound: primary, secondaryWound: secondary };
}

// The Wound Patterns Assessment (ifs_assessment_results, surfaced by
// api/analytics/client.js as assessmentTrajectory) is the only client-
// repeatable numeric self-report in this app — it's real assessment history,
// not a stand-in for a standardized instrument like PHQ-9/GAD-7, which this
// app never actually administers. Each retake scores five wound subscales
// (5 questions, 1-5 Likert each => 5-25 range per subscale).
function woundSeverityLabel(score) {
  if (score >= 18) return 'High';
  if (score >= 11) return 'Moderate';
  return 'Low';
}

// One entry per real retake, most recent first, with per-subscale severity
// and the change from the immediately preceding retake (null on a client's
// first-ever retake, since there's nothing to compare against).
function mapAssessmentHistory(assessmentTrajectory) {
  if (!Array.isArray(assessmentTrajectory) || assessmentTrajectory.length === 0) return [];
  const newestFirst = [...assessmentTrajectory].reverse();
  return newestFirst.map((entry, i) => {
    const previousEntry = newestFirst[i + 1];
    const subscales = WORKSPACE_WOUNDS.map((wound) => {
      const v = Number(entry.scores?.[wound]);
      const score = Number.isFinite(v) ? v : 0;
      const prevRaw = previousEntry ? Number(previousEntry.scores?.[wound]) : NaN;
      const delta = Number.isFinite(prevRaw) ? score - prevRaw : null;
      return { wound, score, severity: woundSeverityLabel(score), delta };
    });
    return {
      id: entry.id || `assessment-${i}`,
      date: entry.date || null,
      dateLabel: relativeDateLabel(entry.date),
      primaryWound: normalizeWound(entry.primaryWound),
      secondaryWound: normalizeWound(entry.secondaryWound),
      subscales,
    };
  });
}

function mapMbcMeasures(assessmentTrajectory, primaryWound, secondaryWound) {
  if (!Array.isArray(assessmentTrajectory) || assessmentTrajectory.length === 0) return [];
  const latest = assessmentTrajectory[assessmentTrajectory.length - 1];
  const lastAdministered = relativeDateLabel(latest.date);
  const scoreAt = (wound) => {
    const v = Number(latest.scores?.[wound]);
    return Number.isFinite(v) ? v : 0;
  };
  // Primary/secondary wound first (most clinically relevant), then the rest
  // ordered by current severity so the highest-signal measures surface first.
  const head = [primaryWound, secondaryWound].filter((w) => WORKSPACE_WOUNDS.includes(w));
  const tail = WORKSPACE_WOUNDS.filter((w) => !head.includes(w)).sort((a, b) => scoreAt(b) - scoreAt(a));
  const orderedWounds = [...new Set([...head, ...tail])];

  return orderedWounds.map((wound) => {
    const history = assessmentTrajectory.map((entry) => {
      const v = Number(entry.scores?.[wound]);
      return Number.isFinite(v) ? v : 0;
    });
    const current = history[history.length - 1];
    const baseline = history[0];
    const previous = history.length > 1 ? history[history.length - 2] : current;
    return {
      code: wound,
      name: `${wound.charAt(0).toUpperCase()}${wound.slice(1)} Wound Pattern`,
      date: lastAdministered,
      severity: woundSeverityLabel(current),
      baseline, previous, current, history,
    };
  });
}

// Between-session activity from data api/analytics/client.js already computes
// but the workspace previously discarded: the real homework funnel (only
// completionPct/completedCount were ever used elsewhere), raw mood entries,
// weekly mood/energy trend, and weekly journal engagement counts. Note:
// stressTrend is deliberately not surfaced — ifs_mood_entries has no stress
// column, so that series is always empty upstream regardless of real data.
function mapBetweenSession(analytics) {
  const hw = analytics.homeworkSummary || {};
  const availability = analytics.dataAvailability || {};
  return {
    homeworkFunnel: {
      totalAssigned: hw.totalAssigned || 0,
      inProgress: hw.inProgressCount || 0,
      completed: hw.completedCount || 0,
      reviewed: hw.reviewedCount || 0,
      completionPct: hw.completionPercentage || 0,
      avgDaysToComplete: hw.averageDaysToCompletion ?? null,
    },
    moodEntries: (analytics.moodEntries || []).slice(-8).reverse().map((m) => ({
      id: m.id, dateLabel: relativeDateLabel(m.date), mood: m.mood ?? null, energy: m.energy ?? null,
      emotions: Array.isArray(m.emotions) ? m.emotions : [],
    })),
    moodTrend: (analytics.moodTrend || []).map((w) => ({ week: w.week, value: w.mood })),
    energyTrend: (analytics.energyTrend || []).map((w) => ({ week: w.week, value: w.energy })),
    journalWeekly: (analytics.journalEngagement || []).map((w) => ({ week: w.week, count: w.entries })),
    hasMoodData: !!availability.hasMoodData,
    hasJournalData: !!availability.hasJournalData,
    hasHomeworkData: !!availability.hasHomeworkData,
  };
}

function mapParts(partsSummary) {
  const recent = partsSummary?.recentlyUpdated;
  if (!Array.isArray(recent)) return [];
  return recent.map((p, i) => {
    const rawRole = String(p.part_type || p.type || p.role || '').toLowerCase();
    const category = PART_ROLE_TO_CATEGORY[rawRole] || 'manager';
    const resolved = ['unburdened', 'resolved', 'integrated'].includes(String(p.unburdening_status || '').toLowerCase());
    return {
      id: p.id || `part-${i}`,
      name: p.name || p.part_name || 'Unnamed part',
      category,
      description: p.unburdening_status ? `Status: ${p.unburdening_status}.` : 'Identified in the client’s inner-system work.',
      triggers: '—',
      bodyLocation: '—',
      activation: resolved ? 15 : (p.is_active === false ? 30 : 65),
    };
  });
}

// Merges every real per-client event source already loaded for the workspace
// (analytics-derived events, assessment retakes, messages, session notes)
// into one real chronology, sorted newest-first. Previously only 4 thin
// analytics slices ever fed this, discarding messages/notes/assessments
// entirely even though all three are already loaded for the same client.
function mapTimeline(analytics, { assessmentHistory = [], messages = [], noteEntries = [] } = {}) {
  const events = [];
  if (analytics) {
    (analytics.homeworkSummary?.recentAssignments || []).slice(0, 3).forEach((h) => {
      const raw = h.completed_at || h.assigned_at;
      events.push({ type: 'practice', label: `Practice: ${h.title || h.module_id || 'assigned module'} (${h.status || 'assigned'})`, rawDate: raw });
    });
    (analytics.agendaSummary?.recentAgendaDates || []).slice(0, 2).forEach((d) => {
      events.push({ type: 'note', label: 'Session check-in submitted', rawDate: d });
    });
    (analytics.treatmentPlanSummary?.recentCompletedGoals || []).slice(0, 2).forEach((g) => {
      events.push({ type: 'plan', label: `Treatment goal completed: ${g.goal_title || 'goal'}`, rawDate: g.completed_at || g.updated_at });
    });
    (analytics.partsSummary?.recentlyUpdated || []).slice(0, 2).forEach((p) => {
      events.push({ type: 'journal', label: `Part updated: ${p.name || p.part_name || 'part'}`, rawDate: p.updated_at });
    });
  }
  assessmentHistory.slice(0, 3).forEach((entry) => {
    events.push({ id: entry.id ? `assessment-${entry.id}` : null, type: 'assessment', label: 'Wound Patterns Assessment retaken', rawDate: entry.date });
  });
  messages.slice(-6).forEach((m) => {
    events.push({ id: m.id ? `message-${m.id}` : null, type: 'message', label: m.from === 'client' ? 'Client sent a message' : 'Advisor sent a message', rawDate: m.rawDate });
  });
  noteEntries.slice(0, 5).forEach((n) => {
    events.push({ id: n.id ? `note-${n.id}` : null, type: 'note', label: `${n.templateLabel} ${n.status === 'Signed & Locked' ? 'signed' : 'drafted'}`, rawDate: n.rawDate });
  });
  return events
    .filter((e) => e.rawDate)
    .sort((a, b) => String(b.rawDate).localeCompare(String(a.rawDate)))
    .slice(0, 20)
    // Prefer the source entity's own id (stable across re-sorts as new events
    // arrive) over the post-sort index, which shifts whenever an event is
    // added/removed and would otherwise churn React keys for every event
    // that comes after it.
    .map(({ rawDate, id, ...rest }, i) => ({ ...rest, date: relativeDateLabel(rawDate), id: id || `${rest.type}-${rawDate}-${i}` }));
}

function mapGoals(planRows) {
  if (!Array.isArray(planRows)) return [];
  return planRows
    .filter((p) => (p.status || 'active') === 'active')
    .map((p) => {
      const parsed = p.review_date ? new Date(p.review_date).getTime() : NaN;
      const until = Number.isNaN(parsed) ? 30 : Math.max(0, Math.ceil((parsed - Date.now()) / 86400000));
      return { title: p.goal_title || 'Treatment goal', reviewInDays: until };
    });
}

export function mapNoteEntry(note, clientId) {
  return {
    id: note.id,
    clientId,
    clientName: undefined,
    templateLabel: NOTE_TYPE_LABEL[note.note_type] || 'Note',
    text: note.clinical_summary || note.content || '',
    date: relativeDateLabel(note.created_at),
    rawDate: note.created_at || null,
    status: note.status === 'final' ? 'Signed & Locked' : 'Draft',
  };
}

function mapMessages(rows, clientName) {
  if (!Array.isArray(rows)) return [];
  return rows
    .slice()
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((m) => ({
      id: m.id,
      from: m.sender_role === 'therapist' ? 'advisor' : 'client',
      text: m.body || m.content || '',
      date: relativeDateLabel(m.created_at),
      rawDate: m.created_at || null,
      _clientName: clientName,
    }));
}

// Merge a base client with its loaded detail records. Returns the enriched
// client plus the note entries that should be appended to `savedNotes`.
export function deriveWorkspaceDetail(base, { analytics, notes, plans, messages }) {
  const enriched = { ...base, _detailLoaded: true };

  if (analytics) {
    const assessment = mapAssessment(analytics.assessmentTrajectory);
    if (assessment) {
      enriched.scores = assessment.scores;
      enriched.primaryWound = assessment.primaryWound;
      enriched.secondaryWound = assessment.secondaryWound;
      enriched.mbc = mapMbcMeasures(analytics.assessmentTrajectory, assessment.primaryWound, assessment.secondaryWound);
    } else {
      // Don't let a re-derive (e.g. after claiming a client) leak a prior
      // enrichment's mbc through the `{...base}` spread when this pass finds
      // no assessment data.
      enriched.mbc = [];
    }
    // Set unconditionally (not nested under `if (assessment)`) so a client
    // with no retakes on this pass gets an explicit [] rather than an empty
    // trajectory silently leaving a prior enrichment's history in place.
    enriched.assessmentHistory = mapAssessmentHistory(analytics.assessmentTrajectory);
    enriched.betweenSession = mapBetweenSession(analytics);
    const hw = analytics.homeworkSummary;
    if (hw) {
      enriched.progressPct = Number.isFinite(hw.completionPercentage) ? hw.completionPercentage : 0;
      enriched.modulesCompleted = hw.completedCount || 0;
    }
    enriched.parts = mapParts(analytics.partsSummary);

    const agenda = analytics.agendaSummary;
    if (agenda && agenda.totalSubmitted > 0) {
      const pendingCount = Math.max(0, (agenda.totalSubmitted || 0) - (agenda.reviewedAgendas || 0));
      enriched.session = { when: relativeDateLabel(agenda.recentAgendaDates?.[0]) + ' check-in', status: 'submitted' };
      if (pendingCount > 0) enriched.pendingReview = { label: 'Session check-in', daysAgo: daysSince(agenda.recentAgendaDates?.[0]) ?? 0 };
    }
  }

  if (Array.isArray(plans)) enriched.goals = mapGoals(plans);
  if (Array.isArray(messages)) enriched.messages = mapMessages(messages, base.name);

  const noteEntries = Array.isArray(notes) ? notes.map((n) => ({ ...mapNoteEntry(n, base.id), clientName: base.name })) : [];

  // Built last so it can draw on every other real source already loaded for
  // this client (assessment retakes, messages, session notes), merged with
  // the analytics-derived events into one real chronology.
  enriched.timeline = mapTimeline(analytics, { assessmentHistory: enriched.assessmentHistory, messages: enriched.messages, noteEntries });

  return { client: enriched, noteEntries };
}

async function loadClientMessages(therapistId, clientId) {
  try {
    let query = supabase.from('ifs_messages').select('*').eq('client_id', clientId);
    if (therapistId) query = query.eq('therapist_id', therapistId);
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

const CASELOAD_COLUMNS = 'id, name, pin, email, phone, status, last_active, created_at, user_role, access_restrictions, assignment_status';

export async function loadWorkspaceCaseload(therapistId) {
  // includeUnassigned surfaces clients with no Advisor assignment yet (e.g.
  // fresh signups) so they don't silently disappear from the workspace.
  const rows = await loadAssignedClients(therapistId, CASELOAD_COLUMNS, { includeUnassigned: true });
  return (rows || []).map(mapClientRow);
}

// Same as loadWorkspaceCaseload, but reports whether the fetch was a
// complete snapshot. A periodic background refresh must check this before
// merging — applying a degraded/partial result (e.g. one Supabase query in
// the fallback chain failed) would otherwise silently drop clients that are
// already visible in the workspace.
export async function loadWorkspaceCaseloadWithStatus(therapistId) {
  const { data, complete } = await loadAssignedClientsWithStatus(therapistId, CASELOAD_COLUMNS, { includeUnassigned: true });
  return { clients: (data || []).map(mapClientRow), complete };
}

export async function claimWorkspaceClient(therapistId, clientId, names = {}) {
  if (!therapistId || !clientId) return { error: { message: 'Missing therapist or client id' } };
  const { error } = await assignClientToTherapist(therapistId, clientId, 'active', names);
  return { error: error || null };
}

// Merge a freshly-loaded caseload into the previously-loaded one: new clients
// (e.g. a signup that landed after the page opened) are added as-is; clients
// that already had their detail records loaded keep that enrichment and only
// have their base identity/status fields refreshed, so a periodic refresh
// never wipes out analytics, notes, parts, etc. already fetched for them.
export function mergeCaseloadRefresh(prevBaseClients, freshRows) {
  const prevById = new Map((prevBaseClients || []).map((c) => [c.id, c]));
  return (freshRows || []).map((fresh) => {
    const prev = prevById.get(fresh.id);
    if (!prev) return fresh;
    return {
      ...prev,
      name: fresh.name, initial: fresh.initial, email: fresh.email, phone: fresh.phone,
      status: fresh.status, lastActiveDays: fresh.lastActiveDays, risk: fresh.risk, unassigned: fresh.unassigned,
    };
  });
}

export async function loadWorkspaceClientDetail(base, therapistId) {
  const [analyticsRes, notesRes, plansRes, messages] = await Promise.all([
    loadClientAnalytics({ clientId: base.id, range: 'ALL' }).catch(() => ({ data: null })),
    loadTherapistNotesForClient(base.id).catch(() => ({ data: [] })),
    loadActiveTreatmentPlansForClient(base.id).catch(() => ({ data: [] })),
    loadClientMessages(therapistId, base.id),
  ]);
  return deriveWorkspaceDetail(base, {
    analytics: analyticsRes?.data || null,
    notes: notesRes?.data || [],
    plans: plansRes?.data || [],
    messages,
  });
}

export async function persistTherapistNote({ therapistId, clientId, content, status = 'draft' }) {
  if (!therapistId || !clientId || !String(content || '').trim()) {
    return { error: { message: 'Missing note details' } };
  }
  return createTherapistNote({ therapistId, clientId, noteType: 'session_note', content, status });
}

export async function sendWorkspaceMessage(therapistId, clientId, text) {
  const body = String(text || '').trim();
  if (!therapistId || !clientId || !body) return { error: { message: 'Missing message details' } };
  const { error } = await supabase.from('ifs_messages').insert({
    therapist_id: therapistId, client_id: clientId, sender_role: 'therapist', body, is_urgent: false,
  });
  return { error: error || null };
}

// Generates a real clinical/progress report via api/generate-report.js, which
// aggregates the client's actual treatment plans, notes, session agendas,
// homework, parts, mood entries, journals, and module responses into an HTML
// document, and persists an audit row (id, title, sections, date range,
// timestamp) to ifs_generated_reports server-side as part of the same call —
// there is no separate "approve" step to wire up, generating IS saving.
export async function generateWorkspaceReport({ clientId, reportType = 'clinical_summary', dateRangeStart, dateRangeEnd, sections }) {
  if (!clientId) return { data: null, error: { message: 'Select a client before generating a document.' } };
  try {
    const token = await getClerkToken();
    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ clientId, reportType, dateRangeStart, dateRangeEnd, sections, format: 'html_print' }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = json?.error?.message || json?.error || 'Unable to generate document.';
      return { data: null, error: { message } };
    }
    return { data: json.data || null, error: null };
  } catch (error) {
    return { data: null, error: { message: error.message || 'Unable to generate document.' } };
  }
}

// Real generation history for a client — audit metadata only (title, type,
// sections, date range, generated_at). The endpoint deliberately does not
// store the rendered HTML itself, so a past entry can't be "reopened" — only
// regenerated — and this list reflects that honestly rather than offering a
// download link that doesn't work.
export async function loadWorkspaceReports(clientId, limit = 8) {
  if (!clientId) return [];
  try {
    const { data, error } = await supabase
      .from('ifs_generated_reports')
      .select('id, report_type, title, sections_included, date_range_start, date_range_end, generated_at')
      .eq('client_id', clientId)
      .order('generated_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

// ifs_notifications stores priority as low/normal/important; the workspace's
// existing severity chip vocabulary (shared with risk/safety) is low/medium/high.
const NOTIF_PRIORITY_TO_SEV = { important: 'high', normal: 'medium', low: 'low' };

function mapNotification(row) {
  return {
    id: row.id,
    clientId: row.client_id || null,
    type: row.notification_type,
    priority: NOTIF_PRIORITY_TO_SEV[row.priority] || 'medium',
    title: row.title,
    message: row.message || '',
    date: relativeDateLabel(row.created_at),
    read: !!row.read_at,
  };
}

// The Advisor's real notification feed (ifs_notifications) — already
// populated by real client-driven events (homework completed, session
// agenda submitted, reports generated, etc.) and already surfaced
// elsewhere in the app (RecentActivityFeed), just never wired into the
// workspace itself.
export async function loadWorkspaceNotifications(limit = 50) {
  try {
    const { data, error } = await loadNotifications({ filter: 'all', limit });
    if (error) return [];
    return (data || []).map(mapNotification);
  } catch {
    return [];
  }
}

export async function markWorkspaceNotificationRead(notificationId) {
  return markNotificationRead(notificationId);
}

export async function markAllWorkspaceNotificationsRead() {
  return markAllNotificationsRead();
}

// Real, already-Advisor-scoped Life Integration reflections a client has
// shared (ifs_life_integration_reflections via api/life-integration.js's
// list_shared_for_advisor action, already used by the standalone
// AdvisorSharedReflections.jsx page — just not surfaced in the workspace).
export async function loadWorkspaceLifeReflections(clientId) {
  if (!clientId) return [];
  try {
    const { data, error } = await loadSharedLifeIntegrationReflectionsForAdvisor(clientId);
    if (error) return [];
    return (Array.isArray(data) ? data : []).map(normalizeLifeReflection);
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function capitalizeWound(wound) {
  return wound ? `${wound.charAt(0).toUpperCase()}${wound.slice(1)}` : '—';
}

// Builds a printable/exportable HTML report entirely from data the workspace
// has already loaded for the selected client (assessment history, between-
// session activity, goals, parts, notes) — the same real per-client data the
// legacy TherapistDashboard.jsx's PDF/CSV export used to build its report,
// just ported to run off the workspace's already-fetched state instead of
// issuing fresh queries.
export function buildClientReportHtml(client, notes = []) {
  const generatedOn = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const assessmentRows = (client.assessmentHistory || []).slice(0, 6).map((entry) => {
    const cells = WORKSPACE_WOUNDS.map((wound) => {
      const subscale = (entry.subscales || []).find((s) => s.wound === wound);
      return `<td>${subscale ? `${subscale.score} (${escapeHtml(subscale.severity)})` : '—'}</td>`;
    }).join('');
    return `<tr><td>${escapeHtml(entry.dateLabel || entry.date || '—')}</td>${cells}</tr>`;
  }).join('');

  const bs = client.betweenSession || {};
  const hw = bs.homeworkFunnel || {};
  const moodRows = (bs.moodEntries || []).slice(0, 8).map((m) =>
    `<tr><td>${escapeHtml(m.dateLabel)}</td><td>${m.mood ?? '—'}</td><td>${m.energy ?? '—'}</td></tr>`
  ).join('');

  const goalItems = (client.goals || []).map((g) =>
    `<li>${escapeHtml(g.title)} — review in ${escapeHtml(g.reviewInDays)} day(s)</li>`
  ).join('');

  const partItems = (client.parts || []).map((p) =>
    `<li><strong>${escapeHtml(p.name)}</strong> (${escapeHtml(p.category)}) — ${escapeHtml(p.description)}</li>`
  ).join('');

  const noteItems = notes.slice(0, 8).map((n) =>
    `<li><strong>${escapeHtml(n.templateLabel)}</strong> — ${escapeHtml(n.date)} (${escapeHtml(n.status)})${n.text ? `: ${escapeHtml(String(n.text).slice(0, 200))}` : ''}</li>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Client Report — ${escapeHtml(client.name)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 760px; margin: 32px auto; padding: 0 16px; color: #1c1917; line-height: 1.5; }
  h1 { font-size: 22px; margin-bottom: 2px; }
  h2 { font-size: 15px; margin-top: 28px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
  .meta { color: #666; font-size: 13px; }
  .empty { color: #888; font-size: 13px; font-style: italic; }
  .print-btn { float: right; padding: 8px 14px; font-size: 13px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <h1>${escapeHtml(client.name)}</h1>
  <div class="meta">${escapeHtml(client.email || '')} · Report generated ${generatedOn}</div>
  <div class="meta">Primary wound: ${capitalizeWound(client.primaryWound)} · Secondary wound: ${capitalizeWound(client.secondaryWound)}</div>

  <h2>Wound Pattern Assessment History</h2>
  ${assessmentRows
    ? `<table><thead><tr><th>Date</th><th>Abandonment</th><th>Shame</th><th>Neglect</th><th>Betrayal</th><th>Helplessness</th></tr></thead><tbody>${assessmentRows}</tbody></table>`
    : '<div class="empty">No assessment retakes recorded yet.</div>'}

  <h2>Between-Session Activity</h2>
  <div class="meta">Homework: ${hw.completed || 0}/${hw.totalAssigned || 0} completed (${hw.completionPct || 0}%)</div>
  ${moodRows
    ? `<table><thead><tr><th>Date</th><th>Mood</th><th>Energy</th></tr></thead><tbody>${moodRows}</tbody></table>`
    : '<div class="empty">No mood check-ins recorded yet.</div>'}

  <h2>Treatment Goals</h2>
  ${goalItems ? `<ul>${goalItems}</ul>` : '<div class="empty">No active treatment goals.</div>'}

  <h2>Identified Parts</h2>
  ${partItems ? `<ul>${partItems}</ul>` : '<div class="empty">No parts recorded yet.</div>'}

  <h2>Recent Session Notes</h2>
  ${noteItems ? `<ul>${noteItems}</ul>` : '<div class="empty">No session notes recorded yet.</div>'}
</body>
</html>`;
}
