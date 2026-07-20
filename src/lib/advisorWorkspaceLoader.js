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
// not a stand-in for a standardized instrument this app never administers.
// 5 questions per subscale, 1-5 Likert each, so each subscale runs 5-25.
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

function mapTimeline(analytics) {
  const events = [];
  (analytics.homeworkSummary?.recentAssignments || []).slice(0, 3).forEach((h) => {
    events.push({ type: 'practice', label: `Practice: ${h.title || h.module_id || 'assigned module'} (${h.status || 'assigned'})`, date: relativeDateLabel(h.completed_at || h.assigned_at) });
  });
  (analytics.agendaSummary?.recentAgendaDates || []).slice(0, 2).forEach((d) => {
    events.push({ type: 'note', label: 'Session check-in submitted', date: relativeDateLabel(d) });
  });
  (analytics.treatmentPlanSummary?.recentCompletedGoals || []).slice(0, 2).forEach((g) => {
    events.push({ type: 'plan', label: `Treatment goal completed: ${g.goal_title || 'goal'}`, date: relativeDateLabel(g.completed_at || g.updated_at) });
  });
  (analytics.partsSummary?.recentlyUpdated || []).slice(0, 2).forEach((p) => {
    events.push({ type: 'journal', label: `Part updated: ${p.name || p.part_name || 'part'}`, date: relativeDateLabel(p.updated_at) });
  });
  return events;
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
    clientId,
    clientName: undefined,
    templateLabel: NOTE_TYPE_LABEL[note.note_type] || 'Note',
    text: note.clinical_summary || note.content || '',
    date: relativeDateLabel(note.created_at),
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
    }
    // Set unconditionally (not nested under `if (assessment)`) so a client
    // with no retakes on this pass gets an explicit [] rather than an empty
    // trajectory silently leaving a prior enrichment's history in place.
    enriched.assessmentHistory = mapAssessmentHistory(analytics.assessmentTrajectory);
    const hw = analytics.homeworkSummary;
    if (hw) {
      enriched.progressPct = Number.isFinite(hw.completionPercentage) ? hw.completionPercentage : 0;
      enriched.modulesCompleted = hw.completedCount || 0;
    }
    enriched.parts = mapParts(analytics.partsSummary);
    enriched.timeline = mapTimeline(analytics);

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
