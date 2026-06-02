/* global process */
import { isAdminUser, requireTherapist, requireTherapistAssignment, sql } from './_auth.js';
import { safeCreateInAppNotification } from './_notifications.js';

const REPORT_TYPES = new Set(['clinical_summary', 'client_progress_summary']);
const DEFAULT_SECTIONS = {
  includeTreatmentPlans: true,
  includeTaggedNotes: true,
  includeSessionAgendas: true,
  includeAssignedHomework: true,
  includeParts: true,
  includeMoodEntries: true,
  includeJournals: false,
  includeHealingTimeline: false,
  includeAnalyticsSummary: false,
  includeAiSessionSummary: false,
  includeFullNoteText: false
};

const SECTION_LABELS = {
  includeTreatmentPlans: 'Treatment Plan Goals',
  includeTaggedNotes: 'Tagged Clinical Notes',
  includeSessionAgendas: 'Session Agendas',
  includeAssignedHomework: 'Assigned Homework',
  includeParts: 'Parts Summary',
  includeMoodEntries: 'Mood Summary',
  includeJournals: 'Journal Excerpts',
  includeHealingTimeline: 'Healing Timeline Summary',
  includeAnalyticsSummary: 'Analytics Summary',
  includeAiSessionSummary: 'AI Session Prep Summary',
  includeFullNoteText: 'Full Clinical Note Text'
};

function sendError(res, status, message, code = 'server_error') {
  return res.status(status).json({ error: { code, message } });
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function normalizeDate(value, label) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw Object.assign(new Error(`${label} must use YYYY-MM-DD format`), { statusCode: 400, code: 'invalid_date' });
  }
  return value;
}

function normalizeSections(requestedSections = {}, reportType) {
  const sections = { ...DEFAULT_SECTIONS, ...requestedSections };
  if (reportType === 'client_progress_summary') {
    sections.includeTaggedNotes = false;
    sections.includeJournals = false;
    sections.includeAiSessionSummary = false;
    sections.includeAnalyticsSummary = false;
    sections.includeFullNoteText = false;
  }
  return sections;
}

function includedSectionNames(sections) {
  return Object.entries(sections)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => SECTION_LABELS[key] || key);
}

function truncate(value, max = 450) {
  if (!value) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function listItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value.split('\n').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [value];
}

function renderList(value) {
  const items = listItems(value).map((item) => {
    if (item === null || item === undefined) return '';
    if (typeof item === 'object') return escapeHtml(item.name || item.title || item.label || JSON.stringify(item));
    return escapeHtml(item);
  }).filter(Boolean);
  if (!items.length) return '<span class="muted">—</span>';
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function renderRows(rows, emptyText, renderRow) {
  if (!rows?.length) return `<p class="empty">${escapeHtml(emptyText)}</p>`;
  return rows.map(renderRow).join('');
}

function dateColumnRange(column, start, end, startIndex) {
  const clauses = [];
  const params = [];
  let i = startIndex;
  if (start) {
    params.push(start);
    clauses.push(`${column} >= $${i++}`);
  }
  if (end) {
    params.push(end);
    clauses.push(`${column} <= ($${i++}::date + INTERVAL '1 day')`);
  }
  return { clauses, params, nextIndex: i };
}

async function queryRows(baseSql, clientId, { start, end, dateColumn, limit = 100 } = {}) {
  const range = dateColumnRange(dateColumn, start, end, 2);
  const where = [`client_id = $1`, ...range.clauses].join(' AND ');
  const rows = await sql.query(`${baseSql} WHERE ${where} ORDER BY ${dateColumn} DESC LIMIT ${limit}`, [clientId, ...range.params]);
  return rows;
}

async function loadReportData({ clientId, therapistId, sections, reportType, dateRangeStart, dateRangeEnd }) {
  const [clientRows, therapistRows] = await Promise.all([
    sql`SELECT id, name, user_role, created_at FROM ifs_clients WHERE id = ${clientId} LIMIT 1`,
    sql`SELECT id, name, user_role FROM ifs_clients WHERE id = ${therapistId} LIMIT 1`
  ]);

  const client = clientRows[0];
  if (!client || client.user_role !== 'client') {
    throw Object.assign(new Error('Client not found'), { statusCode: 404, code: 'client_not_found' });
  }

  const queries = {
    treatmentPlans: (sections.includeTreatmentPlans || sections.includeHealingTimeline || sections.includeAnalyticsSummary || reportType === 'client_progress_summary')
      ? queryRows(
        `SELECT id, goal_title, goal_description, target_wounds, target_parts, objectives, interventions, status, review_date, completed_at, created_at FROM ifs_treatment_plans`,
        clientId,
        { start: dateRangeStart, end: dateRangeEnd, dateColumn: 'COALESCE(review_date::timestamptz, created_at)', limit: 100 }
      )
      : Promise.resolve([]),
    taggedNotes: sections.includeTaggedNotes
      ? queryRows(
        `SELECT id, note_type, clinical_summary, content, session_date, tagged_parts, tagged_treatment_goals, created_at FROM ifs_therapist_notes`,
        clientId,
        { start: dateRangeStart, end: dateRangeEnd, dateColumn: 'COALESCE(session_date::timestamptz, created_at)', limit: 50 }
      )
      : Promise.resolve([]),
    sessionAgendas: sections.includeSessionAgendas
      ? queryRows(
        `SELECT id, topics, active_parts, stuck_points, goals_for_session, current_stress_level, current_mood_label, safety_concerns, status, reviewed_at, session_date, session_datetime, created_at FROM ifs_session_agendas`,
        clientId,
        { start: dateRangeStart, end: dateRangeEnd, dateColumn: 'COALESCE(session_datetime, session_date::timestamptz, created_at)', limit: 50 }
      )
      : Promise.resolve([]),
    assignedHomework: (sections.includeAssignedHomework || sections.includeHealingTimeline || sections.includeAnalyticsSummary || reportType === 'client_progress_summary')
      ? queryRows(
        `SELECT id, module_id, title, status, assigned_at, completed_at, reviewed_at, therapist_feedback, created_at FROM ifs_assigned_homework`,
        clientId,
        { start: dateRangeStart, end: dateRangeEnd, dateColumn: 'COALESCE(assigned_at, created_at)', limit: 100 }
      )
      : Promise.resolve([]),
    parts: (sections.includeParts || sections.includeHealingTimeline || sections.includeAnalyticsSummary)
      ? sql.query(
        `SELECT id, name, part_name, type, part_type, role, burdens, unburdening_status, is_active, updated_at, created_at
         FROM ifs_parts
         WHERE client_id = $1
         ORDER BY COALESCE(updated_at, created_at) DESC
         LIMIT 100`,
        [clientId]
      )
      : Promise.resolve([]),
    moodEntries: (sections.includeMoodEntries || sections.includeAnalyticsSummary)
      ? queryRows(
        `SELECT id, mood, energy, notes, date, created_at FROM ifs_mood_entries`,
        clientId,
        { start: dateRangeStart, end: dateRangeEnd, dateColumn: 'COALESCE(date, created_at)', limit: 60 }
      )
      : Promise.resolve([]),
    journals: sections.includeJournals
      ? queryRows(
        `SELECT id, title, content, mood, created_at FROM ifs_journal_entries`,
        clientId,
        { start: dateRangeStart, end: dateRangeEnd, dateColumn: 'created_at', limit: 20 }
      )
      : Promise.resolve([])
  };

  const data = await Promise.all(Object.values(queries));
  return {
    client,
    therapist: therapistRows[0] || null,
    treatmentPlans: data[0],
    taggedNotes: data[1],
    sessionAgendas: data[2],
    assignedHomework: data[3],
    parts: data[4],
    moodEntries: data[5],
    journals: data[6]
  };
}

function renderClinicalSections(data, sections) {
  const sectionsHtml = [];

  if (sections.includeTreatmentPlans) {
    sectionsHtml.push(`<section class="report-section"><h2>Treatment Plan Goals</h2>${renderRows(data.treatmentPlans, 'No treatment plan goals found for this date range.', (goal) => `
      <article class="item-card">
        <div class="item-heading"><strong>${escapeHtml(goal.goal_title || 'Untitled goal')}</strong><span>${escapeHtml(goal.status || 'active')}</span></div>
        <p>${escapeHtml(truncate(goal.goal_description, 600) || 'No goal description recorded.')}</p>
        <div class="two-col"><div><h3>Objectives</h3>${renderList(goal.objectives)}</div><div><h3>Interventions</h3>${renderList(goal.interventions)}</div></div>
        <div class="two-col"><div><h3>Target Parts/Wounds</h3>${renderList([...(listItems(goal.target_parts)), ...(listItems(goal.target_wounds))])}</div><div><h3>Review</h3><p>Review date: ${formatDate(goal.review_date)}<br/>Completed: ${formatDate(goal.completed_at)}</p></div></div>
      </article>`)} </section>`);
  }

  if (sections.includeTaggedNotes) {
    sectionsHtml.push(`<section class="report-section"><h2>Tagged Clinical Notes</h2>${renderRows(data.taggedNotes, 'No tagged clinical notes found for this date range.', (note) => `
      <article class="item-card">
        <div class="item-heading"><strong>${escapeHtml(note.note_type || 'Clinical note')}</strong><span>${formatDate(note.session_date || note.created_at)}</span></div>
        <p>${escapeHtml(truncate(note.clinical_summary, 700) || 'No clinical summary recorded.')}</p>
        <div class="two-col"><div><h3>Tagged parts</h3>${renderList(note.tagged_parts)}</div><div><h3>Tagged goals</h3>${renderList(note.tagged_treatment_goals)}</div></div>
        ${sections.includeFullNoteText ? `<h3>Full note text</h3><p>${escapeHtml(truncate(note.content, 1400) || 'No note body recorded.')}</p>` : ''}
      </article>`)} </section>`);
  }

  if (sections.includeSessionAgendas) {
    sectionsHtml.push(`<section class="report-section"><h2>Session Agendas</h2>${renderRows(data.sessionAgendas, 'No pre-session agendas found for this date range.', (agenda) => `
      <article class="item-card">
        <div class="item-heading"><strong>${formatDate(agenda.session_datetime || agenda.session_date || agenda.created_at)}</strong><span>${escapeHtml(agenda.status || 'submitted')}${agenda.reviewed_at ? ` · reviewed ${formatDate(agenda.reviewed_at)}` : ''}</span></div>
        <p><strong>Topics:</strong> ${escapeHtml(truncate(agenda.topics, 500) || '—')}</p>
        <div class="two-col"><p><strong>Goals:</strong> ${escapeHtml(truncate(agenda.goals_for_session, 450) || '—')}</p><p><strong>Stuck points:</strong> ${escapeHtml(truncate(agenda.stuck_points, 450) || '—')}</p></div>
        <div class="two-col"><p><strong>Mood/stress:</strong> ${escapeHtml(agenda.current_mood_label || '—')} / ${escapeHtml(agenda.current_stress_level ?? '—')}</p><div><strong>Active parts:</strong>${renderList(agenda.active_parts)}</div></div>
        ${agenda.safety_concerns ? `<p class="safety"><strong>Safety-related content:</strong> ${escapeHtml(truncate(agenda.safety_concerns, 500))}</p>` : ''}
      </article>`)} </section>`);
  }

  if (sections.includeAssignedHomework) {
    sectionsHtml.push(`<section class="report-section"><h2>Assigned Homework</h2>${renderRows(data.assignedHomework, 'No assigned homework found for this date range.', (homework) => `
      <article class="item-card">
        <div class="item-heading"><strong>${escapeHtml(homework.title || homework.module_id || 'Assigned module')}</strong><span>${escapeHtml(homework.status || 'assigned')}</span></div>
        <p>Assigned: ${formatDate(homework.assigned_at || homework.created_at)} · Completed: ${formatDate(homework.completed_at)} · Reviewed: ${formatDate(homework.reviewed_at)}</p>
        ${homework.therapist_feedback ? `<p><strong>Therapist feedback:</strong> ${escapeHtml(truncate(homework.therapist_feedback, 500))}</p>` : ''}
      </article>`)} </section>`);
  }

  if (sections.includeParts) {
    sectionsHtml.push(`<section class="report-section"><h2>Parts Summary</h2>${renderRows(data.parts, 'No parts found for this client.', (part) => `
      <article class="item-card compact">
        <div class="item-heading"><strong>${escapeHtml(part.name || part.part_name || 'Unnamed part')}</strong><span>${escapeHtml(part.unburdening_status || (part.is_active === false ? 'inactive' : 'active'))}</span></div>
        <p><strong>Role/type:</strong> ${escapeHtml(truncate(part.role || part.type || part.part_type, 350) || '—')}</p>
        <div><strong>Burdens/status notes:</strong>${renderList(part.burdens)}</div>
      </article>`)} </section>`);
  }

  if (sections.includeMoodEntries) {
    const moods = data.moodEntries || [];
    const avgMood = moods.length ? (moods.reduce((sum, row) => sum + Number(row.mood || 0), 0) / moods.length).toFixed(1) : null;
    const avgEnergy = moods.length ? (moods.reduce((sum, row) => sum + Number(row.energy || 0), 0) / moods.length).toFixed(1) : null;
    sectionsHtml.push(`<section class="report-section"><h2>Mood Summary</h2>
      <p class="summary-line">${moods.length} check-ins${avgMood ? ` · Average mood ${avgMood}/10` : ''}${avgEnergy ? ` · Average energy ${avgEnergy}/10` : ''}</p>
      ${moods.length ? `<table><thead><tr><th>Date</th><th>Mood</th><th>Energy</th><th>Brief note</th></tr></thead><tbody>${moods.map((mood) => `<tr><td>${formatDate(mood.date || mood.created_at)}</td><td>${escapeHtml(mood.mood ?? '—')}</td><td>${escapeHtml(mood.energy ?? '—')}</td><td>${escapeHtml(truncate(mood.notes, 160) || '—')}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">No mood entries found for this date range.</p>'}
    </section>`);
  }

  if (sections.includeJournals) {
    sectionsHtml.push(`<section class="report-section"><h2>Journal Excerpts</h2>${renderRows(data.journals, 'No journal entries found for this date range.', (entry) => `
      <article class="item-card compact">
        <div class="item-heading"><strong>${escapeHtml(entry.title || 'Untitled journal entry')}</strong><span>${formatDate(entry.created_at)}</span></div>
        <p>${escapeHtml(truncate(entry.content, 450) || 'No excerpt available.')}</p>
      </article>`)} </section>`);
  }

  if (sections.includeHealingTimeline) {
    sectionsHtml.push(renderHealingTimelineSummary(data));
  }

  if (sections.includeAnalyticsSummary) {
    sectionsHtml.push(renderAnalyticsSummary(data));
  }

  if (sections.includeAiSessionSummary) {
    sectionsHtml.push(`<section class="report-section"><h2>AI Session Prep Summary</h2><p class="empty">AI-generated session prep summaries are generated on demand from the session prep workflow and are not automatically regenerated or stored in this report. Clinicians must review any AI-generated material before relying on it.</p></section>`);
  }

  return sectionsHtml.join('\n');
}

function renderHealingTimelineSummary(data) {
  const milestones = [
    ...(data.treatmentPlans || [])
      .filter((goal) => goal.status === 'completed' || goal.completed_at)
      .map((goal) => ({
        date: goal.completed_at || goal.review_date || goal.created_at,
        title: goal.goal_title || 'Treatment goal completed',
        detail: 'A treatment-plan goal was marked complete.'
      })),
    ...(data.assignedHomework || [])
      .filter((homework) => ['completed', 'reviewed'].includes(homework.status) || homework.completed_at || homework.reviewed_at)
      .map((homework) => ({
        date: homework.completed_at || homework.reviewed_at || homework.assigned_at || homework.created_at,
        title: homework.title || homework.module_id || 'Homework completed',
        detail: homework.reviewed_at ? 'A therapist-reviewed homework assignment was completed.' : 'A homework assignment was completed.'
      })),
    ...(data.parts || [])
      .filter((part) => ['unburdened', 'resolved', 'integrated'].includes(String(part.unburdening_status || '').toLowerCase()))
      .map((part) => ({
        date: part.updated_at || part.created_at,
        title: part.name || part.part_name || 'Part update',
        detail: `Part status: ${part.unburdening_status}`
      }))
  ]
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 12);

  return `<section class="report-section"><h2>Healing Timeline Summary</h2>
    <p class="summary-line">Client-safe milestones drawn from goals, homework, and parts status. Therapist notes and internal clinical summaries are excluded.</p>
    ${renderRows(milestones, 'No client-safe timeline milestones found for this date range.', (item) => `
      <article class="item-card compact">
        <div class="item-heading"><strong>${escapeHtml(item.title)}</strong><span>${formatDate(item.date)}</span></div>
        <p>${escapeHtml(item.detail)}</p>
      </article>`)}
  </section>`;
}

function renderAnalyticsSummary(data) {
  const moods = data.moodEntries || [];
  const homework = data.assignedHomework || [];
  const goals = data.treatmentPlans || [];
  const completedHomework = homework.filter((row) => ['completed', 'reviewed'].includes(row.status) || row.completed_at).length;
  const activeGoals = goals.filter((row) => row.status === 'active').length;
  const completedGoals = goals.filter((row) => row.status === 'completed' || row.completed_at).length;
  const avgMood = moods.length ? (moods.reduce((sum, row) => sum + Number(row.mood || 0), 0) / moods.length).toFixed(1) : null;
  const avgEnergy = moods.length ? (moods.reduce((sum, row) => sum + Number(row.energy || 0), 0) / moods.length).toFixed(1) : null;

  return `<section class="report-section"><h2>Analytics Summary</h2>
    <p class="summary-line">Compact therapist analytics without chart libraries.</p>
    <div class="metrics">
      <div><strong>${escapeHtml(activeGoals)}</strong><span>Active goals</span></div>
      <div><strong>${escapeHtml(completedGoals)}</strong><span>Completed goals</span></div>
      <div><strong>${escapeHtml(`${completedHomework}/${homework.length}`)}</strong><span>Homework completed/reviewed</span></div>
      <div><strong>${escapeHtml(avgMood ? `${avgMood}/10` : '—')}</strong><span>Average mood</span></div>
      <div><strong>${escapeHtml(avgEnergy ? `${avgEnergy}/10` : '—')}</strong><span>Average energy</span></div>
      <div><strong>${escapeHtml((data.parts || []).length)}</strong><span>Mapped parts</span></div>
    </div>
  </section>`;
}

function renderClientProgressSummary(data, sections = {}) {
  const activeGoals = data.treatmentPlans.filter((goal) => goal.status === 'active');
  const completedGoals = data.treatmentPlans.filter((goal) => goal.status === 'completed');
  const completedHomework = data.assignedHomework.filter((homework) => ['completed', 'reviewed'].includes(homework.status));
  return `
    <section class="report-section"><h2>Strengths-Based Progress Summary</h2>
      <p>This client-safe summary highlights treatment goals and curriculum follow-through without therapist-only clinical note content.</p>
      <div class="metrics"><div><strong>${activeGoals.length}</strong><span>Active goals</span></div><div><strong>${completedGoals.length}</strong><span>Completed goals</span></div><div><strong>${completedHomework.length}/${data.assignedHomework.length}</strong><span>Homework completed/reviewed</span></div></div>
    </section>
    <section class="report-section"><h2>Goals</h2>${renderRows(data.treatmentPlans, 'No shareable goals found.', (goal) => `<article class="item-card"><div class="item-heading"><strong>${escapeHtml(goal.goal_title || 'Goal')}</strong><span>${escapeHtml(goal.status || 'active')}</span></div><p>${escapeHtml(truncate(goal.goal_description, 500) || 'Continuing to build insight, skills, and Self-led care.')}</p><p>Upcoming review: ${formatDate(goal.review_date)}</p></article>`)}</section>
    <section class="report-section"><h2>Homework Follow-Through</h2>${renderRows(data.assignedHomework, 'No homework assignments found.', (homework) => `<article class="item-card compact"><div class="item-heading"><strong>${escapeHtml(homework.title || homework.module_id || 'Assigned module')}</strong><span>${escapeHtml(homework.status || 'assigned')}</span></div><p>Assigned: ${formatDate(homework.assigned_at || homework.created_at)} · Completed: ${formatDate(homework.completed_at)}</p></article>`)}</section>
    ${sections.includeHealingTimeline ? renderHealingTimelineSummary(data) : ''}
  `;
}

function buildHtmlReport({ data, sections, reportType, dateRangeStart, dateRangeEnd, generatedAt, reportId }) {
  const title = reportType === 'client_progress_summary' ? 'Client Progress Summary' : 'Clinical Summary Report';
  const period = `${dateRangeStart ? formatDate(dateRangeStart) : 'Start'} – ${dateRangeEnd ? formatDate(dateRangeEnd) : 'Present'}`;
  const body = reportType === 'client_progress_summary'
    ? renderClientProgressSummary(data, sections)
    : renderClinicalSections(data, sections);

  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 32px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2937; background: #f8fafc; }
  .report-shell { max-width: 960px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 18px; padding: 36px; box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08); }
  header { border-bottom: 3px solid #d97706; padding-bottom: 18px; margin-bottom: 24px; }
  .brand { color: #92400e; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; font-size: 12px; }
  h1 { margin: 8px 0 6px; font-family: Georgia, "Times New Roman", serif; font-size: 30px; color: #111827; }
  h2 { color: #92400e; font-size: 18px; border-bottom: 1px solid #f3d28a; padding-bottom: 8px; margin-top: 28px; }
  h3 { font-size: 13px; color: #374151; margin: 10px 0 4px; }
  .meta-grid, .two-col, .metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .meta-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); background: #fffbeb; border: 1px solid #fde68a; border-radius: 14px; padding: 14px; }
  .meta-grid div, .metrics div { display: flex; flex-direction: column; gap: 3px; }
  .meta-grid span, .metrics span, .muted { color: #6b7280; font-size: 12px; }
  .meta-grid strong, .metrics strong { color: #111827; font-size: 15px; }
  .report-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 24px; }
  .item-card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; margin: 12px 0; background: #fff; }
  .item-card.compact { padding: 12px 14px; }
  .item-heading { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
  .item-heading span { color: #6b7280; font-size: 12px; text-transform: capitalize; }
  p, li, td, th { font-size: 13px; line-height: 1.55; }
  ul { margin: 6px 0 0 18px; padding: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
  th { background: #f9fafb; color: #374151; }
  .empty { color: #6b7280; font-style: italic; background: #f9fafb; border-radius: 12px; padding: 12px; }
  .summary-line { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px; }
  .safety { background: #fff7ed; border-left: 4px solid #f97316; padding: 10px 12px; border-radius: 8px; }
  footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px; }
  .no-print { margin: 0 auto 16px; max-width: 960px; display: flex; justify-content: flex-end; }
  .print-button { border: 0; background: #92400e; color: white; border-radius: 999px; padding: 10px 18px; font-weight: 700; cursor: pointer; }
  @media print {
    body { background: white; padding: 0; }
    .no-print { display: none; }
    .report-shell { box-shadow: none; border: 0; border-radius: 0; padding: 24px; }
    .report-section { break-inside: avoid; page-break-inside: avoid; }
  }
</style></head>
<body>
  <div class="no-print"><button class="print-button" onclick="window.print()">Print / Save as PDF</button></div>
  <main class="report-shell">
    <header><div class="brand">Intrinsic Therapeutic Solutions</div><h1>${escapeHtml(title)}</h1><p>Confidential therapist-facing report generated from assigned-client data.</p></header>
    <section class="report-section"><h2>Client Overview</h2><div class="meta-grid">
      <div><span>Client</span><strong>${escapeHtml(data.client?.name || 'Unknown client')}</strong></div>
      <div><span>Therapist</span><strong>${escapeHtml(data.therapist?.name || 'Current clinician')}</strong></div>
      <div><span>Date range</span><strong>${escapeHtml(period)}</strong></div>
      <div><span>Generated</span><strong>${formatDate(generatedAt)}</strong></div>
    </div><p class="muted">Report ID: ${escapeHtml(reportId || 'pending')}</p></section>
    ${body}
    <footer>Generated metadata is stored for audit purposes. Raw report content is not stored by the report audit table.</footer>
  </main>
</body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed', 'method_not_allowed');

  try {
    const {
      clientId,
      client_id: legacyClientId,
      reportType: rawReportType = 'clinical_summary',
      dateRangeStart: rawDateRangeStart,
      dateRangeEnd: rawDateRangeEnd,
      sections: requestedSections = {},
      format = 'html_print'
    } = req.body || {};

    const requestedClientId = clientId || legacyClientId;
    if (!requestedClientId) return sendError(res, 400, 'clientId is required', 'missing_client_id');

    const reportType = REPORT_TYPES.has(rawReportType) ? rawReportType : 'clinical_summary';
    const dateRangeStart = normalizeDate(rawDateRangeStart, 'dateRangeStart');
    const dateRangeEnd = normalizeDate(rawDateRangeEnd, 'dateRangeEnd');
    if (dateRangeStart && dateRangeEnd && dateRangeStart > dateRangeEnd) {
      return sendError(res, 400, 'dateRangeStart must be before dateRangeEnd', 'invalid_date_range');
    }

    const currentUser = await requireTherapist(req);
    if (!isAdminUser(currentUser) && currentUser.user_role === 'therapist') {
      await requireTherapistAssignment(currentUser.id, requestedClientId);
    }

    const sections = normalizeSections(requestedSections, reportType);
    const data = await loadReportData({
      clientId: requestedClientId,
      therapistId: currentUser.id,
      sections,
      reportType,
      dateRangeStart,
      dateRangeEnd
    });

    const generatedAt = new Date().toISOString();
    const title = reportType === 'client_progress_summary'
      ? `Client Progress Summary - ${data.client.name || 'Client'}`
      : `Clinical Summary Report - ${data.client.name || 'Client'}`;
    const fileName = `${reportType}-${requestedClientId}-${generatedAt.slice(0, 10)}.html`;
    const auditRows = await sql`
      INSERT INTO ifs_generated_reports (
        therapist_id, client_id, generated_by, report_type, title, sections_included,
        date_range_start, date_range_end, format, status, file_name, generated_at
      ) VALUES (
        ${currentUser.id}, ${requestedClientId}, ${currentUser.id}, ${reportType}, ${title},
        ${JSON.stringify(includedSectionNames(sections))}::jsonb, ${dateRangeStart}, ${dateRangeEnd},
        ${format === 'html' ? 'html_print' : format}, 'generated', ${fileName}, ${generatedAt}
      )
      RETURNING id
    `;

    const reportId = auditRows[0]?.id;
    await safeCreateInAppNotification({
      recipientId: currentUser.id,
      actorId: currentUser.id,
      clientId: requestedClientId,
      therapistId: currentUser.id,
      notificationType: 'report_generated',
      title: 'Clinical report generated',
      message: 'A clinical report was generated and audit metadata was saved.',
      entityType: 'generated_report',
      entityId: reportId,
      priority: 'low',
      metadata: { reportType }
    }, 'report generated notification');
    const html = buildHtmlReport({ data, sections, reportType, dateRangeStart, dateRangeEnd, generatedAt, reportId });

    return res.status(200).json({
      data: {
        html,
        reportId,
        reportType,
        title,
        generatedAt,
        sectionsIncluded: includedSectionNames(sections),
        format: 'html_print'
      },
      error: null
    });
  } catch (error) {
    const status = error.statusCode || 500;
    const code = error.code || (status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error');
    return sendError(res, status, error.message || 'Unable to generate report', code);
  }
}
