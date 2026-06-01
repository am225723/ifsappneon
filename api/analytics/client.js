/* global process */
import { sql, getCurrentAppUserFromClerk, isAdminUser, isTherapistUser, requireTherapistAssignment } from '../_auth.js';

const SUPPORTED_RANGES = new Set(['1M', '3M', '6M', '1Y', 'ALL']);
const RANGE_DAYS = { '1M': 31, '3M': 93, '6M': 186, '1Y': 365 };

function normalizeRange(range) {
  const value = String(range || '3M').toUpperCase();
  return SUPPORTED_RANGES.has(value) ? value : '3M';
}

function sinceForRange(range) {
  if (range === 'ALL') return null;
  return new Date(Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000).toISOString();
}

function toDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function weekStart(value) {
  const date = toDateValue(value);
  if (!date) return 'Unknown';
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - day + 1);
  return utcDate.toISOString().slice(0, 10);
}

function round(value, decimals = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function average(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  return round(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}

function groupByWeek(rows, dateField = 'created_at') {
  return rows.reduce((acc, row) => {
    const label = weekStart(row[dateField]);
    acc[label] = acc[label] || [];
    acc[label].push(row);
    return acc;
  }, {});
}

function countBy(rows, field, fallback = 'unspecified') {
  return rows.reduce((acc, row) => {
    const value = row[field] || fallback;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function toSeries(rowsByWeek, field, label = field) {
  return Object.entries(rowsByWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, rows]) => ({ week, label: week, [label]: average(rows.map((row) => row[field])), entries: rows.length }))
    .filter((point) => point[label] !== null);
}

function moodLabelTrend(rowsByWeek) {
  return Object.entries(rowsByWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, rows]) => {
      const counts = countBy(rows, 'mood');
      const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      return { week, label: week, counts, mostCommon, entries: rows.length };
    });
}

function safeRecent(rows, fields, limit = 5) {
  return rows.slice(0, limit).map((row) => fields.reduce((acc, field) => ({ ...acc, [field]: row[field] ?? null }), {}));
}

async function safeQuery(label, fn, fallback) {
  try {
    return await fn();
  } catch (error) {
    console.warn(`Analytics ${label} query failed:`, error?.message || error);
    return fallback;
  }
}

function aggregateMood(moodRows) {
  const ordered = [...moodRows].sort((a, b) => String(a.date || a.created_at).localeCompare(String(b.date || b.created_at)));
  const rowsByWeek = groupByWeek(ordered.map((row) => ({ ...row, trend_date: row.date || row.created_at })), 'trend_date');
  const numericMood = ordered.every((row) => row.mood === null || row.mood === undefined || Number.isFinite(Number(row.mood)));

  return {
    rawEntries: ordered.map((row) => ({
      id: row.id,
      date: row.date || row.created_at,
      mood: row.mood ?? null,
      energy: row.energy ?? null,
      emotions: row.emotions || []
    })),
    moodTrend: numericMood ? toSeries(rowsByWeek, 'mood', 'mood') : [],
    moodLabelTrend: numericMood ? [] : moodLabelTrend(rowsByWeek),
    stressTrend: toSeries(rowsByWeek, 'stress', 'stress'),
    energyTrend: toSeries(rowsByWeek, 'energy', 'energy'),
    weeklyEntryCounts: Object.entries(rowsByWeek).sort(([a], [b]) => a.localeCompare(b)).map(([week, rows]) => ({ week, label: week, count: rows.length }))
  };
}

function aggregateJournal(rows) {
  const rowsByWeek = groupByWeek(rows, 'created_at');
  return Object.entries(rowsByWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, weekRows]) => ({ week, label: week, count: weekRows.length }));
}

function aggregateAssessments(rows) {
  return rows
    .sort((a, b) => String(a.assessment_date || a.created_at).localeCompare(String(b.assessment_date || b.created_at)))
    .map((row) => ({
      id: row.id,
      date: row.assessment_date || row.created_at,
      assessmentType: row.assessment_type || null,
      primaryWound: row.primary_wound || null,
      secondaryWound: row.secondary_wound || null,
      scores: {
        abandonment: row.abandonment_score ?? null,
        shame: row.shame_score ?? null,
        neglect: row.neglect_score ?? null,
        betrayal: row.betrayal_score ?? null,
        rejection: row.rejection_score ?? null,
        helplessness: row.helplessness_score ?? null
      }
    }));
}

function daysBetween(start, end) {
  const a = toDateValue(start);
  const b = toDateValue(end);
  if (!a || !b) return null;
  return Math.max(0, round((b.getTime() - a.getTime()) / 86400000, 1));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientId } = req.body || {};
    const range = normalizeRange(req.body?.range);
    const since = sinceForRange(range);

    if (!clientId) return res.status(400).json({ error: 'clientId is required' });

    const appUser = await getCurrentAppUserFromClerk(req);
    if (!isTherapistUser(appUser)) {
      return res.status(403).json({ error: 'Therapist, supervisor, or admin access required' });
    }

    if (!isAdminUser(appUser)) {
      await requireTherapistAssignment(appUser.id, clientId);
    }

    const treatmentReviewCutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [moodRows, partsRows, homeworkRows, agendaRows, treatmentRows, journalRows, assessmentRows] = await Promise.all([
      safeQuery('mood', () => sql`
        SELECT id, mood, energy, emotions, date, created_at
        FROM ifs_mood_entries
        WHERE client_id = ${clientId}
          AND (${since}::text IS NULL OR COALESCE(date, created_at) >= ${since}::timestamptz)
        ORDER BY COALESCE(date, created_at) ASC
      `, []),
      safeQuery('parts', () => sql`
        SELECT id, name, part_name, type, part_type, role, unburdening_status, is_active, created_at, updated_at
        FROM ifs_parts
        WHERE client_id = ${clientId}
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
      `, []),
      safeQuery('homework', () => sql`
        SELECT id, module_id, title, status, assigned_at, started_at, completed_at, reviewed_at, created_at, updated_at
        FROM ifs_assigned_homework
        WHERE client_id = ${clientId}
          AND (${since}::text IS NULL OR created_at >= ${since}::timestamptz)
        ORDER BY COALESCE(assigned_at, created_at) DESC
      `, []),
      safeQuery('agendas', () => sql`
        SELECT id, session_date, session_datetime, current_stress_level, current_mood_label, status, reviewed_at, created_at
        FROM ifs_session_agendas
        WHERE client_id = ${clientId}
          AND (${since}::text IS NULL OR created_at >= ${since}::timestamptz)
        ORDER BY COALESCE(session_datetime, session_date::timestamptz, created_at) DESC
      `, []),
      safeQuery('treatment plans', () => sql`
        SELECT id, goal_title, status, review_date, completed_at, created_at, updated_at
        FROM ifs_treatment_plans
        WHERE client_id = ${clientId}
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
      `, []),
      safeQuery('journals', () => sql`
        SELECT id, mood, mood_intensity, is_breakthrough, shared_with_therapist, created_at
        FROM ifs_journal_entries
        WHERE client_id = ${clientId}
          AND (${since}::text IS NULL OR created_at >= ${since}::timestamptz)
        ORDER BY created_at DESC
      `, []),
      safeQuery('assessments', () => sql`
        SELECT id, assessment_type, primary_wound, secondary_wound, abandonment_score, shame_score, neglect_score,
               betrayal_score, rejection_score, helplessness_score, assessment_date, created_at
        FROM ifs_assessment_results
        WHERE client_id = ${clientId}
          AND (${since}::text IS NULL OR created_at >= ${since}::timestamptz)
        ORDER BY COALESCE(assessment_date, created_at) DESC
        LIMIT 20
      `, [])
    ]);

    const mood = aggregateMood(moodRows);
    const journalEngagement = aggregateJournal(journalRows);

    const partStatusCounts = countBy(partsRows, 'unburdening_status');
    const partRoleCounts = countBy(partsRows.map((row) => ({ ...row, partRole: row.part_type || row.type || row.role })), 'partRole');
    const completedPartStatuses = new Set(['unburdened', 'resolved', 'integrated']);
    const partsSummary = {
      total: partsRows.length,
      active: partsRows.filter((row) => row.is_active !== false).length,
      unburdenedResolvedIntegrated: partsRows.filter((row) => completedPartStatuses.has(String(row.unburdening_status || '').toLowerCase())).length,
      byStatus: partStatusCounts,
      byRole: partRoleCounts,
      recentlyUpdated: safeRecent(partsRows, ['id', 'name', 'part_name', 'type', 'part_type', 'role', 'unburdening_status', 'is_active', 'updated_at'])
    };

    const completedHomework = homeworkRows.filter((row) => ['completed', 'reviewed'].includes(row.status) || row.completed_at);
    const reviewedHomework = homeworkRows.filter((row) => row.status === 'reviewed' || row.reviewed_at);
    const completionDays = homeworkRows.map((row) => daysBetween(row.assigned_at || row.created_at, row.completed_at)).filter((value) => value !== null);
    const homeworkSummary = {
      totalAssigned: homeworkRows.length,
      completedCount: completedHomework.length,
      reviewedCount: reviewedHomework.length,
      inProgressCount: homeworkRows.filter((row) => row.status === 'in_progress').length,
      completionPercentage: homeworkRows.length ? Math.round((completedHomework.length / homeworkRows.length) * 100) : 0,
      averageDaysToCompletion: average(completionDays),
      recentAssignments: safeRecent(homeworkRows, ['id', 'module_id', 'title', 'status', 'assigned_at', 'started_at', 'completed_at', 'reviewed_at'])
    };

    const agendaSummary = {
      totalSubmitted: agendaRows.filter((row) => row.status !== 'draft').length,
      reviewedAgendas: agendaRows.filter((row) => row.status === 'reviewed' || row.reviewed_at).length,
      recentAgendaDates: agendaRows.slice(0, 6).map((row) => row.session_datetime || row.session_date || row.created_at),
      averageStressLevel: average(agendaRows.map((row) => row.current_stress_level)),
      recentMoodLabels: agendaRows.map((row) => row.current_mood_label).filter(Boolean).slice(0, 6),
      statusCounts: countBy(agendaRows, 'status')
    };

    const treatmentPlanSummary = {
      activeGoals: treatmentRows.filter((row) => row.status === 'active').length,
      completedGoals: treatmentRows.filter((row) => row.status === 'completed').length,
      pausedGoals: treatmentRows.filter((row) => row.status === 'paused').length,
      archivedGoals: treatmentRows.filter((row) => row.status === 'archived').length,
      goalsDueForReviewWithin30Days: treatmentRows.filter((row) => row.review_date && row.status === 'active' && row.review_date <= treatmentReviewCutoff).length,
      recentCompletedGoals: safeRecent(treatmentRows.filter((row) => row.status === 'completed'), ['id', 'goal_title', 'status', 'review_date', 'completed_at', 'updated_at']),
      statusCounts: countBy(treatmentRows, 'status')
    };

    const data = {
      clientId,
      range,
      generatedAt: new Date().toISOString(),
      summary: {
        moodEntries: moodRows.length,
        journalEntries: journalRows.length,
        partsTotal: partsRows.length,
        homeworkCompletionRate: homeworkSummary.completionPercentage,
        activeTreatmentGoals: treatmentPlanSummary.activeGoals,
        agendasSubmitted: agendaSummary.totalSubmitted
      },
      moodEntries: mood.rawEntries,
      moodTrend: mood.moodTrend,
      moodLabelTrend: mood.moodLabelTrend,
      stressTrend: mood.stressTrend,
      energyTrend: mood.energyTrend,
      moodEntryCountsByWeek: mood.weeklyEntryCounts,
      journalEngagement,
      journalSummary: {
        totalEntries: journalRows.length,
        mostRecentEntryDate: journalRows[0]?.created_at || null
      },
      partsSummary,
      homeworkSummary,
      agendaSummary,
      treatmentPlanSummary,
      assessmentTrajectory: aggregateAssessments(assessmentRows),
      dataAvailability: {
        hasMoodData: moodRows.length > 0,
        hasJournalData: journalRows.length > 0,
        hasPartsData: partsRows.length > 0,
        hasHomeworkData: homeworkRows.length > 0,
        hasAgendaData: agendaRows.length > 0,
        hasTreatmentPlanData: treatmentRows.length > 0,
        hasAssessmentData: assessmentRows.length > 0
      }
    };

    return res.status(200).json({ data });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: status === 500 ? 'Failed to load analytics.' : error.message });
  }
}
