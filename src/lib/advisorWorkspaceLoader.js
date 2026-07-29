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
import { loadAssignedHomeworkForClient, markAssignedHomeworkReviewed, archiveAssignedHomework } from './assignedHomework.js';
import { loadTherapistClientSessionAgendas, markSessionAgendaReviewed } from './sessionAgendas.js';
import { loadPartRelationships } from './partRelationships.js';
import { loadNotifications, markNotificationRead, markAllNotificationsRead } from './notifications.js';
import { loadSharedLifeIntegrationReflectionsForAdvisor } from './lifeIntegration.js';
import { normalizeLifeReflection } from './lifeIntegrationDisplay.js';
import { loadHealingTimeline } from './healingTimeline.js';
import { loadCurriculumReflections } from './curriculumReflections.js';
import { summarizeInteractiveResponses } from './interactiveWorksheetSummary.js';
import { buildPartSuggestions } from './partSuggestionEngine.js';
import { loadPartSuggestionState, applySuggestionState } from './partSuggestionState.js';
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
    agendas: [],
    partRelationships: [],
    session: { when: 'No upcoming session scheduled', status: 'none' },
    recentActivity: [],
    qaAnswers: [],
    timeline: [],
    safety: { riskLevel: risk ? 'monitor' : 'none', protective: [], riskFactors: risk ? ['Extended inactivity'] : [], safetyPlan: null, contacts: [], acknowledged: true, ackNote: '' },
    mbc: [],
    assessmentHistory: [],
    betweenSession: {
      homeworkFunnel: { totalAssigned: 0, inProgress: 0, completed: 0, reviewed: 0, completionPct: 0, avgDaysToComplete: null },
      moodEntries: [], moodTrend: [], energyTrend: [], journalWeekly: [], assignments: [], freeformAssignments: [],
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
// tertiaryWounds/protectorTypes are real, populated columns on
// ifs_assessment_results (written by Assessments.jsx on submission,
// already consumed by AI context builders like api/ai-session-summary.js)
// that the analytics endpoint's assessmentTrajectory never selects — merged
// in here from a small dedicated query, matched by the real retake id.
function mapAssessmentHistory(assessmentTrajectory, extrasById) {
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
    const extras = (extrasById || {})[entry.id] || {};
    return {
      id: entry.id || `assessment-${i}`,
      date: entry.date || null,
      dateLabel: relativeDateLabel(entry.date),
      primaryWound: normalizeWound(entry.primaryWound),
      secondaryWound: normalizeWound(entry.secondaryWound),
      subscales,
      tertiaryWounds: Array.isArray(extras.tertiary_wounds) ? extras.tertiary_wounds.filter((w) => normalizeWound(w)) : [],
      protectorTypes: Array.isArray(extras.protector_types) ? extras.protector_types : [],
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

const HOMEWORK_STATUS_LABEL = {
  assigned: 'Assigned', in_progress: 'In progress', completed: 'Completed', reviewed: 'Reviewed', archived: 'Archived',
};

// The homework funnel below is aggregate counts only. This is the real
// per-assignment detail (title, instructions, advisor feedback, dates) from
// the same ifs_assigned_homework rows TherapistHomework.jsx already reads
// and writes, via the already-existing loadAssignedHomeworkForClient — just
// not previously surfaced in the workspace.
export function mapAssignedHomeworkDetail(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 20).map((row) => ({
    id: row.id,
    title: row.title || row.module_id || 'Assigned module',
    status: row.status || 'assigned',
    statusLabel: HOMEWORK_STATUS_LABEL[row.status] || row.status || 'Assigned',
    instructions: row.instructions || '',
    advisorFeedback: row.therapist_feedback || '',
    assignedDateLabel: relativeDateLabel(row.assigned_at),
    completedDateLabel: row.completed_at ? relativeDateLabel(row.completed_at) : '',
  }));
}

// ifs_therapy_homework is a separate, advisor-authored freeform homework
// table (title/description/due date, not tied to a curriculum module) —
// distinct from ifs_assigned_homework above. Its completion_notes and
// structured interactive_responses are the client's actual written
// reflection, already surfaced in TherapistHomework.jsx's "Client's
// Reflection" panel via the shared summarizeInteractiveResponses helper,
// just never wired into the workspace.
function mapFreeformHomework(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 20).map((row) => ({
    id: row.id,
    title: row.title || 'Homework',
    statusLabel: row.completed ? 'Completed' : (HOMEWORK_STATUS_LABEL[row.status] || 'Assigned'),
    description: row.description || '',
    completionNotes: row.completion_notes || '',
    interactiveSummary: summarizeInteractiveResponses(row.interactive_responses || {}),
    dueDateLabel: row.due_date ? relativeDateLabel(row.due_date) : '',
    completedDateLabel: row.completed_at ? relativeDateLabel(row.completed_at) : '',
  }));
}

const AGENDA_STATUS_LABEL = { submitted: 'Submitted', reviewed: 'Reviewed', archived: 'Archived', draft: 'Draft' };

// The Session Prep tab already shows a client's check-in Q&A answers, but
// the structured session agenda they submit alongside it (topics, active
// parts, stuck points, goals for the session, current stress/mood, safety
// concerns) — real data already rendered by the real
// SessionPrepBrief.jsx/TherapistDashboard.jsx via
// loadTherapistClientSessionAgendas — was never surfaced, and "Mark
// reviewed" in the workspace never actually persisted anything to
// ifs_session_agendas.
function mapSessionAgendas(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 10).map((row) => ({
    id: row.id,
    dateLabel: relativeDateLabel(row.session_date || row.session_datetime || row.created_at),
    statusLabel: AGENDA_STATUS_LABEL[row.status] || row.status || 'Submitted',
    reviewed: row.status === 'reviewed',
    topics: row.topics || '',
    activeParts: Array.isArray(row.active_parts) ? row.active_parts : [],
    stuckPoints: row.stuck_points || '',
    goalsForSession: row.goals_for_session || '',
    currentStressLevel: row.current_stress_level ?? null,
    currentMoodLabel: row.current_mood_label || '',
    safetyConcerns: row.safety_concerns || '',
    therapistNotes: row.therapist_notes || '',
  }));
}

const RELATIONSHIP_TYPE_LABEL = {
  close_to: 'is close to', protects: 'protects', concerned_about: 'is concerned about',
  polarized_with: 'is polarized with', supports: 'supports', needs_space_from: 'needs space from', unknown: 'relates to',
};

// ifs_part_relationships is a real, actively client-authored table (via
// PartsRelationshipMap.jsx's "Inner System Map") with zero Advisor-side
// consumer anywhere in the app today. from_part_id/to_part_id are resolved
// against the client's full parts list (not just the small "recently
// updated" subset the Parts tab already shows) since a relationship can
// reference a part outside that subset.
function mapPartRelationships(rows, partsRows) {
  if (!Array.isArray(rows)) return [];
  const nameById = new Map((partsRows || []).map((p) => [String(p.id), p.name || p.part_name || 'Unnamed part']));
  return rows.map((row) => ({
    id: row.id,
    fromName: nameById.get(String(row.from_part_id)) || 'Unknown part',
    toName: nameById.get(String(row.to_part_id)) || 'Unknown part',
    typeLabel: RELATIONSHIP_TYPE_LABEL[row.relationship_type] || 'relates to',
    label: row.label || '',
    description: row.description || '',
  }));
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

// The Advisor Workspace's client header ("X day streak" / "X level") and the
// Progress & Analytics "Engagement streaks" leaderboard already read
// streak/level off each client, but mapClientRow hardcodes streak: 0,
// level: 1 forever — nothing ever overrides them. ifs_gamification is the
// same real, already-written table the client-facing app (GamificationHub,
// Milestones, Profile) and the legacy TherapistDashboard.jsx already read.
function mapGamification(row) {
  return {
    streak: Number.isFinite(row?.streak_current) ? row.streak_current : 0,
    level: Number.isFinite(row?.level) ? row.level : 1,
  };
}

// The Advisor Workspace already has two built UI consumers for qaAnswers
// (the "Recent check-in & journal responses" card and the entire Session
// Prep tab), both permanently empty because nothing ever populated the
// field. This is the same real free-text answer data TherapistDashboard.jsx
// already reads: ifs_module_answers (the current, event-sourced answer
// store) plus a fallback merge from ifs_client_progress.responses (older
// rows that predate ifs_module_answers), deduped by module+question.
function mapQaAnswers(moduleAnswerRows, progressRows) {
  const seen = new Set();
  const answers = [];
  const collect = (rows, answersField) => {
    (rows || []).forEach((row) => {
      const entries = row[answersField] && typeof row[answersField] === 'object' ? row[answersField] : {};
      Object.entries(entries).forEach(([question, answer]) => {
        if (typeof answer !== 'string' || !answer.trim()) return;
        const key = `${row.module_id}::${question}`;
        if (seen.has(key)) return;
        seen.add(key);
        answers.push({ question, answer: answer.trim(), rawDate: row.updated_at });
      });
    });
  };
  collect(moduleAnswerRows, 'answers');
  collect(progressRows, 'responses');
  return answers
    .sort((a, b) => String(b.rawDate).localeCompare(String(a.rawDate)))
    .slice(0, 12)
    .map(({ rawDate: _rawDate, ...rest }) => rest);
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
export function deriveWorkspaceDetail(base, { analytics, notes, plans, messages, moduleAnswers, progress, gamification, assignedHomework, freeformHomework, agendas, partRelationships, allParts, assessmentExtras }) {
  const enriched = { ...base, _detailLoaded: true };
  // Set unconditionally (not gated behind a truthiness check) so a pass with
  // no real answers explicitly clears any prior enrichment's qaAnswers
  // rather than letting it leak through the `{...base}` spread above.
  enriched.qaAnswers = mapQaAnswers(moduleAnswers, progress);
  const gam = mapGamification(gamification);
  enriched.streak = gam.streak;
  enriched.level = gam.level;
  enriched.agendas = mapSessionAgendas(agendas);
  enriched.partRelationships = mapPartRelationships(partRelationships, allParts);

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
    const extrasById = Object.fromEntries((assessmentExtras || []).map((row) => [row.id, row]));
    enriched.assessmentHistory = mapAssessmentHistory(analytics.assessmentTrajectory, extrasById);
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

  // Set unconditionally, on top of whatever betweenSession shape this pass
  // produced (or the base default when analytics was unavailable), so a re-
  // derive that finds no assignments explicitly clears a prior enrichment's
  // list rather than leaking it through.
  enriched.betweenSession = {
    ...enriched.betweenSession,
    assignments: mapAssignedHomeworkDetail(assignedHomework),
    freeformAssignments: mapFreeformHomework(freeformHomework),
  };

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

async function loadClientModuleAnswers(clientId) {
  try {
    const { data, error } = await supabase
      .from('ifs_module_answers')
      .select('module_id, answers, updated_at')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

async function loadClientProgressResponses(clientId) {
  try {
    const { data, error } = await supabase
      .from('ifs_client_progress')
      .select('module_id, responses, updated_at')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

async function loadClientGamification(clientId) {
  try {
    const { data, error } = await supabase
      .from('ifs_gamification')
      .select('level, streak_current')
      .eq('client_id', clientId)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
}

async function loadClientFreeformHomework(clientId) {
  try {
    const { data, error } = await supabase
      .from('ifs_therapy_homework')
      .select('id, title, description, status, completed, due_date, completed_at, completion_notes, interactive_responses')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

async function loadClientAllParts(clientId) {
  try {
    const { data, error } = await supabase
      .from('ifs_parts')
      .select('id, name, part_name')
      .eq('client_id', clientId);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

async function loadClientAssessmentExtras(clientId) {
  try {
    const { data, error } = await supabase
      .from('ifs_assessment_results')
      .select('id, tertiary_wounds, protector_types')
      .eq('client_id', clientId)
      .order('assessment_date', { ascending: false })
      .limit(20);
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
  const [analyticsRes, notesRes, plansRes, messages, moduleAnswers, progress, gamification, assignedHomeworkRes, freeformHomework, agendasRes, partRelationshipsRes, allParts, assessmentExtras] = await Promise.all([
    loadClientAnalytics({ clientId: base.id, range: 'ALL' }).catch(() => ({ data: null })),
    loadTherapistNotesForClient(base.id).catch(() => ({ data: [] })),
    loadActiveTreatmentPlansForClient(base.id).catch(() => ({ data: [] })),
    loadClientMessages(therapistId, base.id),
    loadClientModuleAnswers(base.id),
    loadClientProgressResponses(base.id),
    loadClientGamification(base.id),
    loadAssignedHomeworkForClient(base.id).catch(() => ({ data: [] })),
    loadClientFreeformHomework(base.id),
    loadTherapistClientSessionAgendas(therapistId, base.id).catch(() => ({ data: [] })),
    // ifs_part_relationships has no RLS policy scoping reads to the client's
    // assigned Advisor (unlike most other tables here, it has no RLS enabled
    // at all — see migration 034), and loadWorkspaceClientDetail is called
    // for every caseload client including unassigned ones. Fail closed here
    // rather than relying solely on the view layer to hide the result.
    base.unassigned ? Promise.resolve({ data: [] }) : loadPartRelationships({ clientId: base.id }).catch(() => ({ data: [] })),
    loadClientAllParts(base.id),
    loadClientAssessmentExtras(base.id),
  ]);
  return deriveWorkspaceDetail(base, {
    analytics: analyticsRes?.data || null,
    notes: notesRes?.data || [],
    plans: plansRes?.data || [],
    messages,
    moduleAnswers,
    progress,
    gamification,
    assignedHomework: assignedHomeworkRes?.data || [],
    freeformHomework,
    agendas: agendasRes?.data || [],
    partRelationships: partRelationshipsRes?.data || [],
    allParts,
    assessmentExtras,
  });
}

// The Session Prep tab's "Mark reviewed" action previously only flipped a
// local in-memory flag — it never actually persisted anything to
// ifs_session_agendas. This wraps the already-real markSessionAgendaReviewed.
export async function markWorkspaceAgendaReviewed(agendaId) {
  return markSessionAgendaReviewed(agendaId);
}

// markAssignedHomeworkReviewed/archiveAssignedHomework (assignedHomework.js,
// table ifs_assigned_homework) are real, working write actions already used
// by TherapistHomework.jsx — the workspace only ever read this data via
// mapAssignedHomeworkDetail above, with no way to act on it. Assigning a new
// module reuses TherapistHomeworkBuilder.jsx directly (it calls
// assignModuleHomework itself), so no wrapper is needed for that action.
export async function markWorkspaceHomeworkReviewed(homeworkId, feedback) {
  if (!homeworkId) return { error: { message: 'Missing assignment id' } };
  return markAssignedHomeworkReviewed(homeworkId, feedback || '');
}

export async function archiveWorkspaceHomework(homeworkId) {
  if (!homeworkId) return { error: { message: 'Missing assignment id' } };
  return archiveAssignedHomework(homeworkId);
}

// Re-fetches just one client's assigned-homework list after a write action
// above, so the workspace doesn't need a full per-client detail reload to
// reflect a new assignment, a review, or an archive. Returns null (not [])
// on a missing clientId or a failed fetch, distinct from a real empty list,
// so the caller can tell "nothing assigned" apart from "couldn't refresh"
// and avoid wiping the currently-displayed assignments on a transient error.
export async function refreshWorkspaceHomeworkForClient(clientId) {
  if (!clientId) return null;
  try {
    const { data, error } = await loadAssignedHomeworkForClient(clientId);
    if (error) return null;
    return mapAssignedHomeworkDetail(data);
  } catch {
    return null;
  }
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

// AI Module Response Insights (api/ai-module-response-insights.js) — a
// decision-support panel already generated on demand from a client's real
// curriculum module responses, progress rows, and saved curriculum
// reflections (requireTherapistAssignment-gated server-side, same as
// generateWorkspaceReport above), rendered by TherapistDashboard.jsx's
// legacy "Generate module insights" button. Distinct from the Session
// Snapshot (session-level decision support) and Since Last Session
// (last-week activity) panels already in the workspace — this one is
// specifically about patterns across curriculum/module responses. Like
// those, it's never saved as a note and never shown to the client.
export async function generateWorkspaceModuleInsights({ clientId, rangeDays = 60 }) {
  if (!clientId) return { data: null, error: { message: 'Select a client before generating module insights.' } };
  try {
    const token = await getClerkToken();
    const response = await fetch('/api/ai-module-response-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ clientId, rangeDays }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = json?.error?.message || json?.error || 'Unable to generate module response insights.';
      return { data: null, error: { message } };
    }
    return { data: json.data || null, error: null };
  } catch (error) {
    return { data: null, error: { message: error.message || 'Unable to generate module response insights.' } };
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

// api/risk-alerts.js is a real, correctly-scoped (requireTherapist, joined
// through ifs_therapist_clients) caseload-wide risk detector that flags real
// low mood scores (<=2 in the last 7 days) and real "stuck"/"crisis"
// language in session agendas — richer than mapClientRow's inactivity-only
// heuristic. It was built for RiskAlertWidget.jsx, which is never actually
// rendered anywhere in the app; this reuses the real endpoint directly.
function mapRiskAlerts(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const reasons = Array.isArray(row.reasons) ? row.reasons : [];
      const hasConcerningLanguage = reasons.some((r) => /stuck|crisis/i.test(r));
      const hasLowMood = row.lowest_mood != null && row.lowest_mood <= 2;
      return {
        clientId: row.client_id,
        reasons,
        type: hasConcerningLanguage ? 'concerning_language' : (hasLowMood ? 'mood' : 'inactivity'),
        level: hasConcerningLanguage || hasLowMood ? 'high' : 'medium',
        daysAgo: row.last_active ? daysSince(row.last_active) : null,
      };
    })
    .filter((alert) => alert.reasons.length > 0);
}

export async function loadCaseloadRiskAlerts() {
  try {
    const token = await getClerkToken();
    const response = await fetch('/api/risk-alerts', { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) return [];
    return mapRiskAlerts(json.data);
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

// Real, already-Advisor-visible curriculum module reflections
// (loadCurriculumReflections in curriculumReflections.js, table
// ifs_interactive_data) that a client writes per learning module and
// explicitly flags sharedWithAdvisor: true from LearningModuleEnhanced.jsx.
// The workspace's Healing Journey summary already surfaces an aggregate
// count of these (mapHealingTimeline below); this loads the actual
// reflection content, which previously had no Advisor-side consumer.
//
// Unlike its siblings (life reflections, healing timeline), this goes
// through a direct Supabase query rather than a requireTherapistAssignment-
// gated API route, and ifs_interactive_data's RLS policy doesn't itself
// restrict reads to the client's assigned Advisor — so isAssigned must be
// confirmed by the caller (from the already-loaded caseload) before this
// fetches anything, rather than trusting the backend to enforce it.
export async function loadWorkspaceCurriculumReflections(clientId, isAssigned) {
  if (!clientId || !isAssigned) return [];
  try {
    const { data, error } = await loadCurriculumReflections({ clientId });
    if (error) return [];
    return (Array.isArray(data) ? data : []).map((r) => ({
      id: r.id,
      moduleTitle: r.moduleTitle,
      insight: r.insight,
      partNoticed: r.partNoticed,
      selfEnergyQuality: r.selfEnergyQuality,
      nextPractice: r.nextPractice,
      createdAt: r.createdAt,
    }));
  } catch {
    return [];
  }
}

function mapSelfEnergyCheckins(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const data = row.data || {};
      return {
        date: String(row.module_id || '').replace('daily_checkin_', ''),
        selfEnergy: typeof data.selfEnergy === 'number' ? data.selfEnergy : null,
        mood: typeof data.mood === 'number' ? data.mood : null,
        activeParts: Array.isArray(data.activeParts) ? data.activeParts : [],
        intention: typeof data.intention === 'string' ? data.intention : '',
      };
    })
    .filter((c) => c.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Real daily Self-Energy check-ins (DailyCheckin.jsx, table
// ifs_interactive_data, module_id: daily_checkin_<date>) — a 1-10
// Self-leadership rating, discrete mood, the parts noticed active that day,
// and a short daily intention. MoodAnalytics.jsx's advisor mode already
// reads this back and shows a therapist the Self-Energy trend, an
// active-parts frequency chart, and each check-in's intention text (but
// never the longer reflection/partsNotes fields) — this mirrors that same
// boundary, just not previously reachable from the workspace.
//
// Like curriculum reflections, this goes through a direct Supabase query
// (mirroring MoodAnalytics.jsx's own real query) rather than a
// requireTherapistAssignment-gated API route, and ifs_interactive_data's RLS
// policy doesn't itself restrict reads to the client's assigned Advisor — so
// isAssigned must be confirmed by the caller before this fetches anything.
export async function loadWorkspaceSelfEnergyTrend(clientId, isAssigned) {
  if (!clientId || !isAssigned) return [];
  try {
    const { data, error } = await supabase
      .from('ifs_interactive_data')
      .select('module_id, data, updated_at')
      .eq('client_id', clientId)
      .like('module_id', 'daily_checkin_%')
      .order('updated_at', { ascending: true })
      .limit(60);
    if (error) return [];
    return mapSelfEnergyCheckins(data);
  } catch {
    return [];
  }
}

// The client-facing Healing Timeline (/healing-timeline, api/healing-timeline/
// client.js) already computes a richer, weekly-narrative milestone feed —
// summary stats plus per-event title/description/source — from real data
// (parts created, homework, session agendas, treatment goals, journals,
// mood check-ins, Life Integration reflections, curriculum reflections).
// It's distinct from the workspace's existing unified activity timeline (a
// flat, capped, hand-curated feed) and already accepts an arbitrary
// clientId with the same requireTherapistAssignment auth every other
// workspace endpoint uses — it just never had an Advisor-side consumer.
function mapHealingTimeline(raw) {
  if (!raw) return null;
  const summary = raw.summary || {};
  return {
    summary: {
      modulesCompleted: summary.modulesCompleted || 0,
      checkInsSubmitted: summary.checkInsSubmitted || 0,
      goalsCompleted: summary.goalsCompleted || 0,
      partsCreated: summary.partsCreated || 0,
      journalEntries: summary.journalEntries || 0,
      moodCheckIns: summary.moodCheckIns || 0,
      lifeIntegrationReflections: summary.lifeIntegrationReflections || 0,
      curriculumReflections: summary.curriculumReflections || 0,
    },
    timeline: (Array.isArray(raw.timeline) ? raw.timeline : []).map((item) => ({
      id: item.id,
      title: item.title || '',
      description: item.description || '',
      source: item.source || '',
      dateLabel: relativeDateLabel(item.date),
    })),
  };
}

export async function loadWorkspaceHealingTimeline(clientId, range = 'ALL') {
  if (!clientId) return { data: null, error: 'Missing client id' };
  try {
    const { data, error } = await loadHealingTimeline({ clientId, range });
    if (error) return { data: null, error: typeof error === 'string' ? error : 'Unable to load healing timeline.' };
    return { data: mapHealingTimeline(data), error: null };
  } catch {
    return { data: null, error: 'Unable to load healing timeline.' };
  }
}

// The client-facing Unburdening Protocol (/unburdening-protocol) tracks an
// 8-step ceremony (find the part, witness the burden, get permission,
// acknowledge the weight, choose the element, release, fill the space,
// integration) as a single row per client (ifs_interactive_data,
// module_id: 'unburdening_protocol'), upserted/overwritten on each redo.
// Only structured completion metadata is surfaced here — currentStep,
// completion status/timestamp, the chosen release element and quality, the
// body location noticed in step 1, and the post-ceremony mood in step 8.
// The free-text journal fields (the burden description, gratitude letter,
// and integration reflection) are deliberately excluded: unlike the daily
// check-in's short intention text, no existing advisor-facing surface in
// the app shows this raw content, so there's no established precedent to
// mirror.
//
// Same as curriculum reflections and the Self-Energy trend, this queries
// ifs_interactive_data directly rather than through a
// requireTherapistAssignment-gated API route, and that table's RLS policy
// doesn't itself restrict reads to the client's assigned Advisor — so
// isAssigned must be confirmed by the caller before this fetches anything.
function mapUnburdeningRecord(row) {
  if (!row) return null;
  const data = row.data || {};
  const responses = data.responses || {};
  const step1 = responses.step1 || {};
  const step8 = responses.step8 || {};
  return {
    currentStep: typeof data.currentStep === 'number' ? data.currentStep : 1,
    completed: !!data.completedAt,
    completedAt: data.completedAt || null,
    element: data.element || null,
    quality: data.qualityChosen || null,
    bodyLocation: typeof step1.bodyLocation === 'string' ? step1.bodyLocation : null,
    moodAfter: typeof step8.mood === 'number' ? step8.mood : null,
    updatedAt: row.updated_at || null,
  };
}

export async function loadWorkspaceUnburdeningRecord(clientId, isAssigned) {
  if (!clientId || !isAssigned) return null;
  try {
    const { data, error } = await supabase
      .from('ifs_interactive_data')
      .select('data, updated_at')
      .eq('client_id', clientId)
      .eq('module_id', 'unburdening_protocol')
      .maybeSingle();
    if (error) return null;
    return mapUnburdeningRecord(data);
  } catch {
    return null;
  }
}

// AdvisorInnerSystemMap.jsx (/advisor/inner-system-map/:clientId) already
// computes real "Suggested Parts"/relationship suggestions from a client's
// assessments, curriculum/module responses, Life Integration reflections,
// and journal entry titles (buildPartSuggestions in partSuggestionEngine.js)
// — plus persisted accept/dismiss/merge state (ifs_part_suggestion_state,
// via partSuggestionState.js) — but that page has no entry point from the
// unified Workspace. This surfaces a summary (counts + top pending
// suggestions) so an Advisor can see there's something to review without
// leaving the client's Parts tab; reviewing/accepting/dismissing stays on
// the dedicated Inner System Map page rather than duplicating that write
// flow here.
//
// Every suggestion is already a derived, advisor-safe label (e.g. "Part
// carrying shame" / "may be connected to an old wound") computed by the
// same engine the existing page uses — never the raw journal/reflection/
// assessment text itself.
//
// Deliberately omits the legacy "parts_map" import source (an older,
// rarer saved-map signal — buildPartSuggestions treats it as optional)
// to keep this a straightforward read alongside the other
// ifs_interactive_data-backed loaders above.
//
// Same as curriculum reflections / Self-Energy trend / the Unburdening
// record, several of these queries go straight to tables whose RLS
// doesn't itself scope reads to the client's assigned Advisor, so
// isAssigned must be confirmed by the caller before this fetches anything.
export async function loadWorkspacePartSuggestions(clientId, isAssigned) {
  if (!clientId || !isAssigned) return null;
  try {
    const [existingPartsRes, relationshipsRes, interactiveRes, assessmentRes, lifeRes, journalRes, curriculumReflectionRows, stateRes] = await Promise.all([
      supabase.from('ifs_parts').select('id, name, part_name, type, part_type, role').eq('client_id', clientId),
      loadPartRelationships({ clientId }),
      supabase.from('ifs_interactive_data').select('id, client_id, module_id, data, updated_at')
        .eq('client_id', clientId)
        .or('module_id.like.assessment_%,module_id.like.module%')
        .order('updated_at', { ascending: false })
        .limit(80),
      supabase.from('ifs_assessment_results').select('id, client_id, assessment_type, data, results, created_at, updated_at')
        .eq('client_id', clientId).order('updated_at', { ascending: false }).limit(20),
      supabase.from('ifs_life_integration_reflections').select('id, client_id, practice_id, reflection_type, data, responses, summary, created_at, updated_at')
        .eq('client_id', clientId).order('updated_at', { ascending: false }).limit(40),
      supabase.from('ifs_journal_entries').select('id, client_id, title, created_at, updated_at')
        .eq('client_id', clientId).order('updated_at', { ascending: false }).limit(20),
      // The client's own saved curriculum module reflections (loadWorkspaceCurriculumReflections,
      // wired in an earlier PR) are one of buildPartSuggestions's official input
      // sources — distinct from the raw module-response rows already covered by
      // interactiveRows above. Same content already shown verbatim to the
      // Advisor on the Curriculum Reflections tab, so there's no new exposure
      // here — only derived suggestion labels ever reach topSuggestions.
      loadWorkspaceCurriculumReflections(clientId, isAssigned),
      loadPartSuggestionState({ clientId }),
    ]);
    const firstError = [existingPartsRes, relationshipsRes, interactiveRes, assessmentRes, lifeRes, journalRes, stateRes].find((res) => res?.error)?.error;
    if (firstError) return null;
    const existingParts = existingPartsRes?.data || [];
    const existingRelationships = relationshipsRes?.data || [];
    const built = buildPartSuggestions({
      assessmentRows: (assessmentRes?.data || []).map((row) => ({ ...row, module_id: row.assessment_type || row.module_id, data: row.data || row.results || row })),
      interactiveRows: interactiveRes?.data || [],
      lifeIntegrationRows: lifeRes?.data || [],
      journalRows: journalRes?.data || [],
      curriculumReflectionRows: curriculumReflectionRows || [],
      existingParts,
      existingRelationships,
    });
    const applied = applySuggestionState(built, stateRes?.data || []);
    return {
      pendingPartsCount: applied.parts.length,
      pendingRelationshipsCount: applied.relationships.length,
      acceptedCount: applied.acceptedCount,
      mergedCount: applied.mergedCount,
      dismissedCount: applied.dismissedCount,
      topSuggestions: applied.parts.slice(0, 5).map((p) => ({
        id: p.id, name: p.name, role: p.role, type: p.type, sourceLabel: p.sourceLabel || '', confidence: p.confidence || '',
      })),
    };
  } catch {
    return null;
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
  const journalRows = (bs.journalWeekly || []).filter((w) => w.count > 0).slice(-8).map((w) =>
    `<tr><td>${escapeHtml(w.week)}</td><td>${w.count}</td></tr>`
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

  <h2>Journal Engagement</h2>
  ${journalRows
    ? `<table><thead><tr><th>Week</th><th>Entries</th></tr></thead><tbody>${journalRows}</tbody></table>`
    : '<div class="empty">No journal activity recorded yet.</div>'}

  <h2>Treatment Goals</h2>
  ${goalItems ? `<ul>${goalItems}</ul>` : '<div class="empty">No active treatment goals.</div>'}

  <h2>Identified Parts</h2>
  ${partItems ? `<ul>${partItems}</ul>` : '<div class="empty">No parts recorded yet.</div>'}

  <h2>Recent Session Notes</h2>
  ${noteItems ? `<ul>${noteItems}</ul>` : '<div class="empty">No session notes recorded yet.</div>'}
</body>
</html>`;
}
