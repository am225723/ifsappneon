/* global process */
import { sql, requireClientAccess } from '../_auth.js';

const SUPPORTED_RANGES = new Set(['1M', '3M', '6M', '1Y', 'ALL']);
const RANGE_DAYS = { '1M': 31, '3M': 93, '6M': 186, '1Y': 365 };
const COMPLETION_STATUSES = new Set(['completed', 'reviewed']);
const COMPLETED_GOAL_STATUSES = new Set(['completed']);
const CLIENT_SAFE_TONES = new Set(['growth', 'reflection', 'consistency', 'completion', 'connection', 'care']);

function normalizeRange(range) {
  const value = String(range || 'ALL').toUpperCase();
  return SUPPORTED_RANGES.has(value) ? value : 'ALL';
}

function sinceForRange(range) {
  if (range === 'ALL') return null;
  return new Date(Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000).toISOString();
}

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateValue(value) {
  const date = safeDate(value);
  return date ? date.toISOString() : null;
}

function eventInRange(value, since) {
  if (!since) return true;
  const date = safeDate(value);
  const cutoff = safeDate(since);
  return Boolean(date && cutoff && date >= cutoff);
}

function weekStartIso(value) {
  const date = safeDate(value);
  if (!date) return null;
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - day + 1);
  return utcDate.toISOString().slice(0, 10);
}

function weekEndIso(weekStart) {
  const date = safeDate(`${weekStart}T00:00:00.000Z`);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

function makeItem({ id, date, type, title, description, source, icon, tone, metadata = {} }) {
  const normalizedDate = dateValue(date);
  if (!normalizedDate) return null;
  return {
    id: String(id),
    date: normalizedDate,
    type,
    title,
    description,
    source,
    icon,
    tone: CLIENT_SAFE_TONES.has(tone) ? tone : 'growth',
    metadata
  };
}

function sourceAvailability(rows) {
  return Array.isArray(rows) && rows.length > 0;
}

async function safeQuery(label, fn, fallback = []) {
  try {
    return await fn();
  } catch (error) {
    console.warn(`Healing timeline ${label} query failed:`, error?.message || error);
    return fallback;
  }
}

function buildPartsItems(partsRows, since) {
  const ordered = [...partsRows]
    .filter((row) => row.created_at)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

  const items = [];
  ordered.forEach((part, index) => {
    if (!eventInRange(part.created_at, since)) return;
    items.push(makeItem({
      id: `part-created-${part.id}-${part.created_at}`,
      date: part.created_at,
      type: index === 0 ? 'first_part_created' : 'part_created',
      title: index === 0 ? 'You began mapping your inner system.' : 'You added a new part to your system map.',
      description: index === 0
        ? 'This marks the beginning of seeing your inner world with more clarity and care.'
        : 'Each part you notice can help you understand your needs with more compassion.',
      source: 'Parts Work',
      icon: 'heart',
      tone: 'growth',
      metadata: { partId: part.id, milestone: index === 0 ? 'first-part' : 'new-part' }
    }));

    const status = String(part.unburdening_status || '').toLowerCase();
    if (part.updated_at && part.updated_at !== part.created_at && ['unburdened', 'resolved', 'integrated'].includes(status) && eventInRange(part.updated_at, since)) {
      items.push(makeItem({
        id: `part-status-${part.id}-${part.updated_at}`,
        date: part.updated_at,
        type: 'part_status_progress',
        title: 'A part moved into a new place of ease.',
        description: 'Your system map reflects meaningful movement and care over time.',
        source: 'Parts Work',
        icon: 'sparkles',
        tone: 'growth',
        metadata: { partId: part.id, status }
      }));
    }
  });

  return items;
}

function buildHomeworkItems(homeworkRows, since) {
  const items = [];
  homeworkRows.forEach((homework) => {
    const assignedDate = homework.assigned_at || homework.created_at;
    if (assignedDate && eventInRange(assignedDate, since)) {
      items.push(makeItem({
        id: `homework-assigned-${homework.id}-${assignedDate}`,
        date: assignedDate,
        type: 'homework_assigned',
        title: 'Your therapist assigned a new module for support between sessions.',
        description: 'This gave you another resource to return to at your own pace.',
        source: 'Homework',
        icon: 'book-open',
        tone: 'care',
        metadata: { homeworkId: homework.id, moduleId: homework.module_id }
      }));
    }

    if (homework.started_at && eventInRange(homework.started_at, since)) {
      items.push(makeItem({
        id: `homework-started-${homework.id}-${homework.started_at}`,
        date: homework.started_at,
        type: 'homework_started',
        title: 'You started an assigned module.',
        description: 'Beginning is a meaningful step toward bringing support into everyday life.',
        source: 'Homework',
        icon: 'play-circle',
        tone: 'connection',
        metadata: { homeworkId: homework.id, moduleId: homework.module_id }
      }));
    }

    if (homework.completed_at && eventInRange(homework.completed_at, since)) {
      items.push(makeItem({
        id: `homework-completed-${homework.id}-${homework.completed_at}`,
        date: homework.completed_at,
        type: 'homework_completed',
        title: 'You completed an assigned module.',
        description: 'You followed through with practice and reflection between sessions.',
        source: 'Homework',
        icon: 'check-circle',
        tone: 'completion',
        metadata: { homeworkId: homework.id, moduleId: homework.module_id }
      }));
    }

    if (homework.reviewed_at && eventInRange(homework.reviewed_at, since)) {
      items.push(makeItem({
        id: `homework-reviewed-${homework.id}-${homework.reviewed_at}`,
        date: homework.reviewed_at,
        type: 'homework_reviewed',
        title: 'Your therapist reviewed your completed module.',
        description: 'Your between-session work became part of the shared care process.',
        source: 'Homework',
        icon: 'clipboard-check',
        tone: 'connection',
        metadata: { homeworkId: homework.id, moduleId: homework.module_id }
      }));
    }
  });
  return items;
}

function buildAgendaItems(agendaRows, since) {
  const items = [];
  agendaRows.forEach((agenda) => {
    if (agenda.status !== 'draft' && agenda.created_at && eventInRange(agenda.created_at, since)) {
      items.push(makeItem({
        id: `agenda-submitted-${agenda.id}-${agenda.created_at}`,
        date: agenda.created_at,
        type: 'agenda_submitted',
        title: 'You prepared for a session by sharing what felt important.',
        description: 'Your check-in helped create a clearer starting point for support.',
        source: 'Check-In',
        icon: 'calendar-check',
        tone: 'reflection',
        metadata: { agendaId: agenda.id, status: agenda.status }
      }));
    }

    if (agenda.reviewed_at && eventInRange(agenda.reviewed_at, since)) {
      items.push(makeItem({
        id: `agenda-reviewed-${agenda.id}-${agenda.reviewed_at}`,
        date: agenda.reviewed_at,
        type: 'agenda_reviewed',
        title: 'Your therapist reviewed your pre-session check-in.',
        description: 'What you shared was brought into the circle of care for your session.',
        source: 'Check-In',
        icon: 'message-circle-heart',
        tone: 'connection',
        metadata: { agendaId: agenda.id }
      }));
    }
  });
  return items;
}

function buildTreatmentPlanItems(treatmentRows, since) {
  const today = new Date();
  const items = [];
  treatmentRows.forEach((goal) => {
    if (goal.created_at && eventInRange(goal.created_at, since)) {
      items.push(makeItem({
        id: `goal-created-${goal.id}-${goal.created_at}`,
        date: goal.created_at,
        type: 'goal_created',
        title: 'A new therapy goal was added to your care plan.',
        description: 'Your care plan captured a direction for support and growth.',
        source: 'Goal',
        icon: 'target',
        tone: 'care',
        metadata: { goalId: goal.id, status: goal.status }
      }));
    }

    if ((goal.status === 'completed' || goal.completed_at) && goal.completed_at && eventInRange(goal.completed_at, since)) {
      items.push(makeItem({
        id: `goal-completed-${goal.id}-${goal.completed_at}`,
        date: goal.completed_at,
        type: 'goal_completed',
        title: 'You completed a therapy goal.',
        description: 'This is a meaningful marker of progress in your care plan.',
        source: 'Goal',
        icon: 'badge-check',
        tone: 'completion',
        metadata: { goalId: goal.id }
      }));
    }

    const reviewDate = safeDate(goal.review_date);
    if (reviewDate && reviewDate <= today && eventInRange(goal.review_date, since)) {
      items.push(makeItem({
        id: `goal-review-${goal.id}-${goal.review_date}`,
        date: goal.review_date,
        type: 'goal_review_reached',
        title: 'You reached a planned goal review point.',
        description: 'Review moments can help you notice what is changing and what support still matters.',
        source: 'Goal',
        icon: 'calendar-days',
        tone: 'reflection',
        metadata: { goalId: goal.id, status: goal.status }
      }));
    }
  });
  return items;
}

function buildJournalItems(journalRows, since) {
  const ordered = [...journalRows]
    .filter((row) => row.created_at)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const items = [];

  ordered.forEach((entry, index) => {
    if (!eventInRange(entry.created_at, since)) return;
    items.push(makeItem({
      id: `journal-${entry.id}-${entry.created_at}`,
      date: entry.created_at,
      type: index === 0 ? 'first_journal_entry' : 'journal_entry',
      title: index === 0 ? 'You began making space for reflection.' : 'You made space for reflection.',
      description: index === 0
        ? 'Your first reflection created a place to listen inward with care.'
        : 'Taking time to reflect can support more clarity and self-connection.',
      source: 'Reflection',
      icon: 'pen-line',
      tone: 'reflection',
      metadata: { journalEntryId: entry.id, milestone: index === 0 ? 'first-reflection' : 'reflection' }
    }));
  });

  return items;
}

function buildMoodItems(moodRows, since) {
  const rowsByWeek = moodRows.reduce((acc, row) => {
    const date = row.date || row.created_at;
    if (!eventInRange(date, since)) return acc;
    const week = weekStartIso(date);
    if (!week) return acc;
    acc[week] = acc[week] || [];
    acc[week].push(row);
    return acc;
  }, {});

  return Object.entries(rowsByWeek).map(([week, rows]) => {
    const count = rows.length;
    const weekEnd = weekEndIso(week);
    const date = rows.map((row) => row.date || row.created_at).sort().at(-1) || week;
    const title = count >= 5 ? 'You checked in consistently this week.' : `You completed ${count} mood check-in${count === 1 ? '' : 's'}.`;
    const description = count >= 5
      ? `You completed ${count} mood check-ins between ${week} and ${weekEnd}.`
      : 'Each check-in is a gentle moment of noticing your inner experience.';

    return makeItem({
      id: `mood-week-${week}`,
      date,
      type: 'mood_checkins',
      title,
      description,
      source: 'Mood',
      icon: 'smile',
      tone: count >= 5 ? 'consistency' : 'reflection',
      metadata: { weekStart: week, weekEnd, count }
    });
  });
}

function buildProgressItems(progressRows, since) {
  const orderedCompleted = [...progressRows]
    .filter((row) => (row.completed || row.is_completed || row.completed_at) && (row.completed_at || row.updated_at || row.created_at))
    .sort((a, b) => String(a.completed_at || a.updated_at || a.created_at).localeCompare(String(b.completed_at || b.updated_at || b.created_at)));

  const items = [];
  orderedCompleted.forEach((progress, index) => {
    const date = progress.completed_at || progress.updated_at || progress.created_at;
    if (!eventInRange(date, since)) return;
    items.push(makeItem({
      id: `progress-completed-${progress.id || progress.module_id}-${date}`,
      date,
      type: index === 0 ? 'first_module_completed' : 'module_progress_completed',
      title: index === 0 ? 'You completed your first curriculum module.' : 'You completed a curriculum module.',
      description: 'This reflects steady engagement with your learning and practice.',
      source: 'Progress',
      icon: 'sparkles',
      tone: 'completion',
      metadata: { progressId: progress.id, moduleId: progress.module_id, milestone: index === 0 ? 'first-module' : 'module-completed' }
    }));
  });

  return items;
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

    await requireClientAccess(req, clientId);

    const [partsRows, homeworkRows, agendaRows, treatmentRows, journalRows, moodRows, progressRows] = await Promise.all([
      safeQuery('parts', () => sql`
        SELECT id, name, part_name, unburdening_status, created_at, updated_at
        FROM ifs_parts
        WHERE client_id = ${clientId}
        ORDER BY created_at ASC
      `),
      safeQuery('assigned homework', () => sql`
        SELECT id, module_id, title, status, assigned_at, started_at, completed_at, reviewed_at, created_at, updated_at
        FROM ifs_assigned_homework
        WHERE client_id = ${clientId}
        ORDER BY COALESCE(assigned_at, created_at) ASC
      `),
      safeQuery('session agendas', () => sql`
        SELECT id, status, reviewed_at, created_at
        FROM ifs_session_agendas
        WHERE client_id = ${clientId}
        ORDER BY created_at ASC
      `),
      safeQuery('treatment plans', () => sql`
        SELECT id, status, review_date, completed_at, created_at, updated_at
        FROM ifs_treatment_plans
        WHERE client_id = ${clientId}
        ORDER BY created_at ASC
      `),
      safeQuery('journals', () => sql`
        SELECT id, is_breakthrough, created_at
        FROM ifs_journal_entries
        WHERE client_id = ${clientId}
        ORDER BY created_at ASC
      `),
      safeQuery('moods', () => sql`
        SELECT id, date, created_at
        FROM ifs_mood_entries
        WHERE client_id = ${clientId}
        ORDER BY COALESCE(date, created_at) ASC
      `),
      safeQuery('client progress', () => sql`
        SELECT id, module_id, completed, is_completed, completed_at, created_at, updated_at
        FROM ifs_client_progress
        WHERE client_id = ${clientId}
        ORDER BY COALESCE(completed_at, updated_at, created_at) ASC
      `)
    ]);

    const timeline = [
      ...buildPartsItems(partsRows, since),
      ...buildHomeworkItems(homeworkRows, since),
      ...buildAgendaItems(agendaRows, since),
      ...buildTreatmentPlanItems(treatmentRows, since),
      ...buildJournalItems(journalRows, since),
      ...buildMoodItems(moodRows, since),
      ...buildProgressItems(progressRows, since)
    ]
      .filter(Boolean)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 120);

    const completedHomework = homeworkRows.filter((row) => COMPLETION_STATUSES.has(String(row.status || '').toLowerCase()) || row.completed_at)
      .filter((row) => eventInRange(row.completed_at || row.updated_at || row.created_at, since));
    const submittedAgendas = agendaRows.filter((row) => row.status !== 'draft' && eventInRange(row.created_at, since));
    const completedGoals = treatmentRows.filter((row) => COMPLETED_GOAL_STATUSES.has(String(row.status || '').toLowerCase()) || row.completed_at)
      .filter((row) => eventInRange(row.completed_at || row.updated_at || row.created_at, since));
    const partsCreated = partsRows.filter((row) => eventInRange(row.created_at, since));
    const journalEntries = journalRows.filter((row) => eventInRange(row.created_at, since));
    const moodCheckIns = moodRows.filter((row) => eventInRange(row.date || row.created_at, since));

    const data = {
      timeline,
      summary: {
        totalMilestones: timeline.length,
        modulesCompleted: completedHomework.length + progressRows.filter((row) => (row.completed || row.is_completed || row.completed_at) && eventInRange(row.completed_at || row.updated_at || row.created_at, since)).length,
        checkInsSubmitted: submittedAgendas.length,
        goalsCompleted: completedGoals.length,
        partsCreated: partsCreated.length,
        journalEntries: journalEntries.length,
        moodCheckIns: moodCheckIns.length
      },
      dataAvailability: {
        parts: sourceAvailability(partsRows),
        homework: sourceAvailability(homeworkRows),
        agendas: sourceAvailability(agendaRows),
        treatmentPlans: sourceAvailability(treatmentRows),
        journals: sourceAvailability(journalRows),
        moods: sourceAvailability(moodRows),
        progress: sourceAvailability(progressRows)
      },
      range,
      generatedAt: new Date().toISOString()
    };

    return res.status(200).json({ data });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ error: status === 500 ? 'Failed to load healing timeline.' : error.message });
  }
}
