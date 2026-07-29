// ---------------------------------------------------------------------------
// Advisor Workspace — faithful implementation of the "Therapist Dashboard"
// Claude Design handoff (design project 1fda9d41). Self-contained visual
// system with its own light/dark theming, sidebar navigation, and demo data.
// ---------------------------------------------------------------------------

export const WOUND_META = {
  abandonment: { label: 'Abandonment', hue: 250 },
  shame: { label: 'Shame', hue: 75 },
  neglect: { label: 'Neglect', hue: 190 },
  betrayal: { label: 'Betrayal', hue: 20 },
  helplessness: { label: 'Helplessness', hue: 295 },
};

export const LIGHT = {
  bg: '#faf9f5', surface: '#ffffff', surface2: '#f6f3ed', surface3: '#efeae1', border: '#e7e2d9',
  text: '#1c1917', text2: '#44403c', muted: '#78716c', accent: '#b45309', accent2: '#d97706',
  emerald: '#047857', emerald2: '#059669',
  riskHighBg: '#fef2f2', riskHighText: '#b91c1c', riskHighBorder: '#fecaca',
  riskMedBg: '#fffbeb', riskMedText: '#b45309', riskMedBorder: '#fde68a',
  riskLowBg: '#ecfdf5', riskLowText: '#047857', riskLowBorder: '#a7f3d0',
  shadow: '0 12px 32px -4px rgba(120,80,40,0.08), 0 4px 12px -2px rgba(120,80,40,0.04)',
};
export const DARK = {
  bg: '#0b0f19', surface: '#141b2d', surface2: '#182339', surface3: '#1d2942', border: '#26314a',
  text: '#f1efe9', text2: '#d6d2c7', muted: '#9a978d', accent: '#f2b64d', accent2: '#e0a53a',
  emerald: '#34d399', emerald2: '#10b981',
  riskHighBg: '#3a1414', riskHighText: '#fca5a5', riskHighBorder: '#5c1f1f',
  riskMedBg: '#3a2c10', riskMedText: '#fbbf24', riskMedBorder: '#5c451a',
  riskLowBg: '#0f2e22', riskLowText: '#6ee7b7', riskLowBorder: '#1f4b39',
  shadow: '0 12px 32px -4px rgba(0,0,0,0.4), 0 4px 12px -2px rgba(0,0,0,0.3)',
};

export function woundChip(wound, isDark, subtle) {
  const meta = WOUND_META[wound] || WOUND_META.abandonment;
  const bg = isDark ? `oklch(28% 0.05 ${meta.hue})` : `oklch(95% 0.025 ${meta.hue})`;
  const text = isDark ? `oklch(82% 0.09 ${meta.hue})` : `oklch(40% 0.11 ${meta.hue})`;
  return { background: bg, color: text, fontSize: '11px', fontWeight: 600, padding: subtle ? '2px 8px' : '3px 9px', borderRadius: '999px', whiteSpace: 'nowrap' };
}
// advisorWorkspaceLoader.mapClientRow uses a large sentinel (999) for
// lastActiveDays/risk.daysAgo when a client has no recorded activity at all,
// so internal threshold/sort logic still treats them as "long inactive"
// without a null check at every call site. Never surface that sentinel as a
// literal day count.
const NO_ACTIVITY_SENTINEL = 900;
export function daysAgoText(n) {
  if (n == null) return 'No activity recorded';
  if (n >= NO_ACTIVITY_SENTINEL) return 'No activity recorded';
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  return n + ' days ago';
}
export function severityStyle(theme, level) {
  const map = {
    high: { bg: theme.riskHighBg, text: theme.riskHighText, border: theme.riskHighBorder },
    medium: { bg: theme.riskMedBg, text: theme.riskMedText, border: theme.riskMedBorder },
    low: { bg: theme.riskLowBg, text: theme.riskLowText, border: theme.riskLowBorder },
  };
  const c = map[level] || map.low;
  return { background: c.bg, color: c.text, border: '1px solid ' + c.border, fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.02em' };
}
export const RISK_LEVEL_TO_SEV = { none: 'low', monitor: 'low', elevated: 'medium', high: 'high', urgent: 'high' };
export const RISK_LEVEL_LABEL = { none: 'No concern', monitor: 'Monitor', elevated: 'Elevated', high: 'High', urgent: 'Urgent' };
export const RISK_LEVEL_RANK = { none: 0, monitor: 1, elevated: 2, high: 3, urgent: 4 };
export const PART_CAT_META = {
  manager: { label: 'Manager', color: '#2563eb' },
  firefighter: { label: 'Firefighter', color: '#dc2626' },
  exile: { label: 'Exile', color: '#7c3aed' },
};
// Matches the 1-5 categorical mood scale clients pick from in MoodTracker.jsx.
export const MOOD_LABELS = { 1: 'Struggling', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' };
export function partChip(cat, isDark) {
  const meta = PART_CAT_META[cat] || PART_CAT_META.manager;
  return { background: isDark ? 'rgba(255,255,255,0.08)' : meta.color + '14', color: meta.color, fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap' };
}

export const CLIENTS = [
  {
    id: 'c1', name: 'Maya Chen', initial: 'MC', email: 'maya.chen@example.com', phone: '(415) 555-0142', status: 'active', supportPriority: 'standard',
    primaryWound: 'abandonment', secondaryWound: 'shame',
    progressPct: 78, modulesCompleted: 9, streak: 12, level: 5, lastActiveDays: 0,
    risk: null,
    scores: { abandonment: 18, shame: 11, neglect: 6, betrayal: 4, helplessness: 5 },
    goals: [{ title: 'Build daily Self-energy practice', reviewInDays: 20 }],
    pendingReview: { label: 'Self-Connection Journal', daysAgo: 3 },
    session: { when: 'Tomorrow, 2:00 PM', status: 'submitted' },
    recentActivity: [
      { date: 'Today', label: 'Completed Module 9: Relationships & Attachment Repair' },
      { date: 'Yesterday', label: 'Logged mood 4/5, Self-Energy 7/10' },
      { date: '2 days ago', label: 'Journal entry: "Noticing the lonely part less this week"' },
      { date: '3 days ago', label: 'Submitted assigned practice: Self-Connection Journal' },
    ],
    qaAnswers: [
      { question: 'What did you notice about your abandonment part this week?', answer: 'She showed up twice when my partner was late texting back, but I could stay present with her instead of spiraling.' },
      { question: 'How present did Self feel during check-ins?', answer: '7/10 — calmer than last week.' },
      { question: 'Anything you want to bring to session?', answer: 'Want to talk about setting a boundary with my sister.' },
    ],
    timeline: [
      { type: 'note', label: 'Session note signed', date: 'Jul 10' },
      { type: 'assessment', label: 'PHQ-9 administered — score 6 (Mild)', date: 'Jul 10' },
      { type: 'practice', label: 'Completed Module 9: Relationships & Attachment Repair', date: 'Today' },
      { type: 'message', label: 'Message sent to Advisor about session prep', date: '2 days ago' },
      { type: 'journal', label: 'Journal entry: "Noticing the lonely part less this week"', date: '2 days ago' },
      { type: 'plan', label: 'Treatment plan milestone reviewed', date: '1 week ago' },
    ],
    safety: {
      riskLevel: 'none', protective: ['Strong support from partner', 'Consistent daily practice engagement'], riskFactors: [],
      safetyPlan: null, contacts: [{ name: 'Alex Chen', relation: 'Partner', phone: '(415) 555-0199' }],
      acknowledged: true, ackNote: 'No concerns at this time.',
    },
    mbc: [
      { code: 'PHQ-9', name: 'Depression (PHQ-9)', baseline: 16, previous: 9, current: 6, severity: 'Mild', date: 'Jul 10', history: [16, 13, 11, 9, 6] },
      { code: 'GAD-7', name: 'Anxiety (GAD-7)', baseline: 14, previous: 8, current: 5, severity: 'Mild', date: 'Jul 10', history: [14, 11, 9, 8, 5] },
    ],
    parts: [
      { id: 'p1', name: 'The Watcher', category: 'manager', description: 'Scans for signs of abandonment before they happen.', triggers: 'Delayed replies, distracted partner', bodyLocation: 'Chest, throat', activation: 35 },
      { id: 'p2', name: 'Little Maya', category: 'exile', description: 'Holds the memory of being left at daycare late.', triggers: 'Being forgotten or overlooked', bodyLocation: 'Stomach', activation: 20 },
    ],
    messages: [
      { id: 'm1', from: 'client', text: 'Quick question before Thursday — should I journal about the boundary thing with my sister?', date: '2 days ago' },
      { id: 'm2', from: 'advisor', text: 'Yes, that would be great prep. See you Thursday.', date: '2 days ago' },
    ],
  },
  {
    id: 'c2', name: 'Jordan Reyes', initial: 'JR', email: 'jordan.reyes@example.com', phone: '(206) 555-0118', status: 'active', supportPriority: 'high',
    primaryWound: 'betrayal', secondaryWound: 'helplessness',
    progressPct: 42, modulesCompleted: 5, streak: 2, level: 3, lastActiveDays: 1,
    risk: { type: 'concerning_language', level: 'high', detail: 'Journal entry contains language suggesting hopelessness — "I don’t see the point anymore."', daysAgo: 1 },
    scores: { abandonment: 7, shame: 9, neglect: 5, betrayal: 19, helplessness: 14 },
    goals: [{ title: 'Reduce isolation, practice trust-building exposure', reviewInDays: 5 }],
    pendingReview: { label: '6 Fs Reflection Worksheet', daysAgo: 1 },
    session: { when: 'Thursday, 10:00 AM', status: 'submitted' },
    recentActivity: [
      { date: 'Yesterday', label: 'Wrote a new journal entry (flagged for review)' },
      { date: '3 days ago', label: 'Started Module 5: The 6 Fs Protocol' },
      { date: '5 days ago', label: 'Logged mood 2/5, Self-Energy 3/10' },
      { date: '6 days ago', label: 'Submitted pre-session check-in' },
    ],
    qaAnswers: [
      { question: 'What did you notice about your betrayal part this week?', answer: 'It’s loud. I keep waiting for people to let me down first so it doesn’t hurt as much.' },
      { question: 'How present did Self feel during check-ins?', answer: '3/10 — mostly the protector was driving.' },
      { question: 'Anything you want to bring to session?', answer: 'I don’t see the point of trying with people anymore.' },
    ],
    timeline: [
      { type: 'safety', label: 'Risk alert generated — concerning language detected', date: 'Yesterday' },
      { type: 'journal', label: 'Journal entry flagged for review', date: 'Yesterday' },
      { type: 'practice', label: 'Started Module 5: The 6 Fs Protocol', date: '3 days ago' },
      { type: 'assessment', label: 'PHQ-9 administered — score 17 (Moderately severe)', date: 'Jul 13' },
      { type: 'message', label: 'Client message: "Not feeling up to much today."', date: 'Yesterday' },
    ],
    safety: {
      riskLevel: 'high', protective: ['Engaged in weekly sessions', 'No access to lethal means reported'],
      riskFactors: ['Recent hopelessness language', 'Reduced social contact', 'History of betrayal trauma'],
      safetyPlan: { steps: ['Identify warning signs: isolating, "no point" language', 'Coping strategies: call sponsor, go for a walk', 'Support contacts: Dr. Patel (supervisor), crisis line 988'], reviewDate: 'Jul 20' },
      contacts: [{ name: 'Sam Reyes', relation: 'Brother', phone: '(206) 555-0177' }],
      acknowledged: false, ackNote: '',
    },
    mbc: [
      { code: 'PHQ-9', name: 'Depression (PHQ-9)', baseline: 12, previous: 14, current: 17, severity: 'Moderately severe', date: 'Jul 13', history: [12, 13, 14, 15, 17] },
      { code: 'C-SSRS', name: 'Columbia Suicide Severity (C-SSRS)', baseline: 1, previous: 1, current: 2, severity: 'Low-moderate', date: 'Jul 13', history: [1, 1, 1, 1, 2] },
    ],
    parts: [
      { id: 'p3', name: 'The Wall', category: 'manager', description: 'Keeps everyone at a distance before they can betray him.', triggers: 'Vulnerability, asking for help', bodyLocation: 'Shoulders, jaw', activation: 70 },
      { id: 'p4', name: 'The Giver-Upper', category: 'firefighter', description: 'Shuts everything down when hope feels pointless.', triggers: 'Repeated disappointment', bodyLocation: 'Whole body, heavy', activation: 80 },
    ],
    messages: [
      { id: 'm3', from: 'client', text: 'Not feeling up to much today.', date: 'Yesterday' },
    ],
  },
  {
    id: 'c3', name: 'Sam Okafor', initial: 'SO', email: 'sam.okafor@example.com', phone: '(312) 555-0163', status: 'inactive', supportPriority: 'standard',
    primaryWound: 'neglect', secondaryWound: 'abandonment',
    progressPct: 25, modulesCompleted: 3, streak: 0, level: 2, lastActiveDays: 9,
    risk: { type: 'inactivity', level: 'medium', detail: 'No login or activity in 9 days.', daysAgo: 9 },
    scores: { abandonment: 13, shame: 8, neglect: 17, betrayal: 6, helplessness: 10 },
    goals: [{ title: 'Re-engage with body awareness practice', reviewInDays: 30 }],
    pendingReview: null,
    session: { when: 'No upcoming session scheduled', status: 'none' },
    recentActivity: [
      { date: '9 days ago', label: 'Logged mood 3/5, Self-Energy 5/10' },
      { date: '11 days ago', label: 'Completed Module 3: The Protective System' },
      { date: '14 days ago', label: 'Journal entry: "Feeling numb, hard to focus"' },
      { date: '16 days ago', label: 'Started Module 3' },
    ],
    qaAnswers: [
      { question: 'What did you notice about your neglect part this week?', answer: 'Mostly just numb. Hard to notice anything at all.' },
      { question: 'How present did Self feel during check-ins?', answer: '5/10.' },
      { question: 'Anything you want to bring to session?', answer: 'Not sure, just feeling stuck lately.' },
    ],
    timeline: [
      { type: 'safety', label: 'Inactivity flag generated — 9 days no activity', date: '9 days ago' },
      { type: 'note', label: 'Mood log 3/5, Self-Energy 5/10', date: '9 days ago' },
      { type: 'practice', label: 'Completed Module 3: The Protective System', date: '11 days ago' },
      { type: 'journal', label: 'Journal entry: "Feeling numb, hard to focus"', date: '14 days ago' },
    ],
    safety: {
      riskLevel: 'monitor', protective: ['No prior self-harm history'], riskFactors: ['Extended inactivity', 'Reduced check-in frequency'],
      safetyPlan: null, contacts: [],
      acknowledged: true, ackNote: 'Monitoring inactivity, not a safety concern yet.',
    },
    mbc: [
      { code: 'PHQ-9', name: 'Depression (PHQ-9)', baseline: 10, previous: 9, current: 9, severity: 'Mild', date: 'Jul 5', history: [10, 10, 9, 9, 9] },
    ],
    parts: [
      { id: 'p5', name: 'The Fog', category: 'firefighter', description: 'Numbs everything out when things feel like too much.', triggers: 'Overwhelm, feeling unseen', bodyLocation: 'Head, eyes', activation: 55 },
    ],
    messages: [],
  },
];

export const TEMPLATE_OPTIONS = [
  { id: 'none', label: 'Blank Note', placeholder: 'Write your session note...' },
  { id: 'initial_intake', label: 'Initial Intake', placeholder: 'Presenting concern, background, parts identified, growth goals...' },
  { id: 'parts_work', label: 'Parts Work Session', placeholder: 'Parts identified, interactions, interventions used, Self-energy level...' },
  { id: 'unburdening', label: 'Unburdening Session', placeholder: 'Target exile, protectors consulted, witnessing process, unburdening details...' },
  { id: 'crisis_intervention', label: 'Crisis Intervention', placeholder: 'Presenting crisis, safety assessment, parts activated, safety plan...' },
  { id: 'soap', label: 'SOAP Note', placeholder: 'Subjective, Objective, Assessment, Plan...' },
  { id: 'regular_checkin', label: 'Regular Check-In', placeholder: 'Progress review, parts identified, assigned IFS practice...' },
];
export const PRACTICE_TYPE_META = {
  journal: { label: 'Journaling Prompt', tmpl: (w) => `Write for 10 minutes about a moment this week your ${w} part showed up — what did it want you to know?` },
  somatic: { label: 'Somatic Practice', tmpl: (w) => `Notice where ${w} lives in your body. Spend 5 minutes breathing into that area and naming it kindly.` },
  worksheet: { label: 'Worksheet', tmpl: (w) => `Complete the 6 Fs worksheet using a recent situation that triggered your ${w} part.` },
  meditation: { label: 'Guided Meditation', tmpl: (w) => `8-minute meditation: invite Self to sit beside the ${w} part without trying to fix it.` },
};
export const LESSON_TITLES = [
  'Meeting Your Parts', 'Understanding Self', 'The Protective System', 'Firefighters & Managers',
  'The 6 Fs Protocol', 'Building Trust with Parts', 'Unburdening Basics', 'Exiles & Vulnerability',
  'Relationships & Attachment Repair', 'Self-Led Communication', 'Integration Practices', 'Sustaining Self-Energy',
];
export const PLAN_PHASES = [
  { key: 'stabilization', label: 'Stabilization', desc: 'Building safety, resourcing Self-energy, and mapping the protective system.' },
  { key: 'processing', label: 'Processing', desc: 'Working directly with exiles and burdened protectors.' },
  { key: 'integration', label: 'Integration', desc: 'Unburdening, consolidating Self-leadership, and relapse prevention.' },
];
// Mirrors REPORT_TYPES in api/generate-report.js — the only two document
// types that endpoint actually knows how to produce. Keep in sync.
export const DOC_TYPES = [
  { id: 'clinical_summary', label: 'Clinical Summary Report' },
  { id: 'client_progress_summary', label: 'Client Progress Summary' },
];
// Mirrors DEFAULT_SECTIONS/SECTION_LABELS in api/generate-report.js (and the
// section picker in ClinicalReportBuilder.jsx) — each key is a real toggle
// the backend understands, pulling from real client records.
export const DOC_SOURCES = [
  { id: 'includeTreatmentPlans', label: 'Growth goals', desc: 'Active/completed goals, objectives, interventions, target parts/wounds, and review date.' },
  { id: 'includeTaggedNotes', label: 'Tagged Advisor notes', desc: 'Note date/type, Advisor summary, tagged parts, and tagged goals.' },
  { id: 'includeSessionAgendas', label: 'Session agendas', desc: 'Topics, active parts, stuck points, mood/stress, and safety-related content.' },
  { id: 'includeAssignedHomework', label: 'Assigned practices', desc: 'Module title, status, assigned/completed/reviewed dates, and Advisor feedback.' },
  { id: 'includeParts', label: 'Parts summary', desc: 'Part names plus lightweight roles, burdens, and status.' },
  { id: 'includeMoodEntries', label: 'Mood summary', desc: 'Recent mood and energy values.' },
  { id: 'includeJournals', label: 'Journal excerpts', desc: 'Client journal titles and truncated excerpts. Off by default.' },
  { id: 'includeHealingTimeline', label: 'Healing timeline summary', desc: 'Client-safe milestones from goals, practices, and parts status.' },
  { id: 'includeAnalyticsSummary', label: 'Insights summary', desc: 'Compact Advisor insights summary.' },
  { id: 'includeModuleResponses', label: 'Cleaned module responses', desc: 'Meaningful curriculum reflections, with placeholders filtered out.' },
  { id: 'includeFullNoteText', label: 'Full Advisor note text', desc: 'Full note body excerpts. Off by default — use only when appropriate.' },
];
export const DOC_SOURCES_DEFAULT = {
  includeTreatmentPlans: true, includeTaggedNotes: true, includeSessionAgendas: true, includeAssignedHomework: true,
  includeParts: true, includeMoodEntries: true, includeJournals: false, includeHealingTimeline: false,
  includeAnalyticsSummary: false, includeModuleResponses: true, includeFullNoteText: false,
};

export const NAV_CONFIG = [
  { id: 'overview', label: 'Overview', swatch: 'var(--accent)' },
  { id: 'clients', label: 'Clients', swatch: '#3b82f6', children: [
    { id: 'clients-caseload', label: 'Caseload & Workspace' },
    { id: 'clients-analytics', label: 'Progress & Analytics' },
    { id: 'clients-engagement', label: 'Engagement & Dropout Risk' },
  ] },
  { id: 'safety', label: 'Safety & Risk Center', swatch: '#dc2626' },
  { id: 'review', label: 'Review Queue', swatch: '#ea580c' },
  { id: 'sessions', label: 'Sessions', swatch: '#0d9488', children: [
    { id: 'sessions-prep', label: 'Session Prep' },
    { id: 'sessions-cotherapy', label: 'Co-Therapy' },
    { id: 'sessions-live', label: 'Live Sessions' },
  ] },
  { id: 'messages', label: 'Messages', swatch: '#2563eb' },
  { id: 'notifications', label: 'Notifications', swatch: '#0891b2' },
  { id: 'tasks', label: 'Tasks & Reminders', swatch: '#9333ea' },
  { id: 'clinical', label: 'Clinical Tools', swatch: '#7c3aed', children: [
    { id: 'clinical-notes', label: 'Notes & Goals' },
    { id: 'clinical-plans', label: 'Treatment Plans' },
    { id: 'clinical-mbc', label: 'Measurement-Based Care' },
    { id: 'clinical-parts', label: 'Parts Studio' },
    { id: 'clinical-practice', label: 'Quick Practice Generator' },
    { id: 'clinical-practice-interactive', label: 'Interactive Modules' },
    { id: 'clinical-lessons', label: 'Curriculum Library' },
    { id: 'clinical-curriculum-builder', label: 'Custom Curriculum' },
    { id: 'clinical-docs', label: 'Document Creator' },
  ] },
  { id: 'insights', label: 'Insights & Reports', swatch: 'var(--emerald)', children: [
    { id: 'insights-overview', label: 'Overview' },
    { id: 'insights-reports', label: 'Report Generator' },
  ] },
  { id: 'admin', label: 'Admin', swatch: '#57534e', children: [
    { id: 'admin-access', label: 'Access Control' },
    { id: 'admin-team', label: 'Team & Caseloads' },
    { id: 'admin-audit', label: 'Audit & Consent Log' },
  ] },
  { id: 'settings', label: 'Settings', swatch: 'var(--muted)' },
];

export const CLIENT_TABS = [
  { id: 'overview', label: 'Overview' }, { id: 'snapshot', label: 'AI Snapshot' }, { id: 'changeSummary', label: 'Since Last Session' }, { id: 'assessments', label: 'Assessments' }, { id: 'timeline', label: 'Timeline' }, { id: 'betweenSession', label: 'Between Sessions' }, { id: 'notes', label: 'Notes' },
  { id: 'plan', label: 'Treatment Plan' }, { id: 'mbc', label: 'MBC' }, { id: 'parts', label: 'Parts' },
  { id: 'practices', label: 'Practices' }, { id: 'safety', label: 'Safety' }, { id: 'messages', label: 'Messages' },
  { id: 'lifeReflections', label: 'Life Reflections' }, { id: 'healingJourney', label: 'Healing Journey' },
  { id: 'curriculumReflections', label: 'Curriculum Reflections' },
];
export const RISK_TYPE_TITLE = {
  concerning_language: 'Concerning language detected', mood: 'Low mood reported', inactivity: 'Extended inactivity',
};
export const TIMELINE_TYPE_META = {
  note: { label: 'NOTE', color: '#57534e' }, assessment: { label: 'ASSESSMENT', color: '#2563eb' },
  practice: { label: 'PRACTICE', color: '#059669' }, message: { label: 'MSG', color: '#0d9488' },
  journal: { label: 'JOURNAL', color: '#b45309' }, safety: { label: 'SAFETY', color: '#dc2626' }, plan: { label: 'PLAN', color: '#7c3aed' },
};
export const TAB_TITLES = {
  overview: ['Command Center', "Here's what needs you today"],
  'clients-caseload': ['Clients', 'Caseload, workspace, and progress'],
  'clients-analytics': ['Progress & Analytics', 'Caseload trends and engagement'],
  'clients-engagement': ['Engagement & Dropout Risk', 'Clients showing reduced engagement'],
  safety: ['Safety & Risk Center', 'Risk levels, safety plans, and acknowledgment'],
  review: ['Review Queue', 'Risk flags and items awaiting your review'],
  'sessions-prep': ['Session Prep', 'Submitted check-ins ahead of upcoming sessions'],
  'sessions-cotherapy': ['Co-Therapy', 'Shared cases and supervisor collaboration'],
  'sessions-live': ['Live Sessions', 'Real-time guided sessions in progress'],
  messages: ['Messages', 'Advisor ↔ client conversations'],
  notifications: ['Notifications', 'Recent activity across your caseload'],
  tasks: ['Tasks & Reminders', 'Clinical to-dos across your caseload'],
  'clinical-notes': ['Notes & Goals', 'Advisor notes and treatment goals'],
  'clinical-plans': ['Treatment Plans', 'Phase-based plans and milestones'],
  'clinical-mbc': ['Measurement-Based Care', 'Wound-pattern measures and trajectories across your caseload'],
  'clinical-parts': ['Parts Studio', 'Parts across your caseload'],
  'clinical-practice': ['Practice Generator', 'AI-assisted homework and practice suggestions'],
  'clinical-lessons': ['Curriculum Library', 'IFS curriculum modules and caseload completion'],
  'clinical-docs': ['Document Creator', 'Generate clinical documents from client records'],
  'clinical-practice-interactive': ['Interactive Practice Builder', 'More than prompts — guided, multi-step modules'],
  'clinical-curriculum-builder': ['Custom Curriculum', 'Build and assign individualized curriculum per client'],
  'insights-overview': ['Insights & Reports', 'Auto-generated insights and exportable summaries'],
  'insights-reports': ['Report Generator', 'Create and export multiple report types'],
  'admin-access': ['Access Control', 'Roles and client access across your team'],
  'admin-audit': ['Audit & Consent Log', 'Chronological record of clinical actions'],
  'admin-team': ['Team & Caseloads', 'Reassign clients across Advisors and supervisors'],
  settings: ['Settings', 'Preferences for this workspace'],
};
export const TOGGLE_META = {
  riskAlerts: { label: 'Risk & safety alerts', desc: 'Notify me immediately when concerning language is detected' },
  weeklyDigest: { label: 'Weekly caseload digest', desc: 'Email summary of caseload progress every Monday' },
  sessionReminders: { label: 'Session prep reminders', desc: 'Remind me the evening before a client submits a check-in' },
};
export const QUICK_MESSAGES = [
  'Great progress this week — keep it up!',
  'Remember your daily Self-energy practice.',
  'How are you feeling since our last session?',
  "Don't forget your assigned practice.",
  'Wonderful self-reflection in your last journal entry!',
];

export function engagementStatusFor(days) {
  if (days < 2) return 'Highly engaged';
  if (days < 5) return 'Engaged';
  if (days < 8) return 'Reduced engagement';
  if (days < 14) return 'At risk of disengagement';
  return 'Inactive';
}
