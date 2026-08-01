// Access-control config shared by the client-restriction UI. Mirrors the
// same MODULE_SEQUENCE / ASSESSMENT_LABELS / FEATURE_LABELS / access_restrictions
// shape TherapistDashboard.jsx's own Access Controls modal already writes to
// ifs_clients.access_restrictions, and that src/lib/accessControl.js already
// reads (canAccessModule/canAccessAssessment/canAccessFeature) app-wide.

export const MODULE_SEQUENCE = [
  { id: 'module-1-intro-ifs', order: 1, title: 'Foundations of IFS & Your Inner Child' },
  { id: 'module-2-inner-child-wounds', order: 2, title: 'Deep Dive into Inner Child Wounds' },
  { id: 'module-3-protectors-unlocked', order: 3, title: 'The Protective System' },
  { id: 'module-4-self-leadership', order: 4, title: 'Self-Leadership & the 8 Cs' },
  { id: 'module-5-six-fs-protocol', order: 5, title: 'The 6 Fs Protocol' },
  { id: 'module-6-inner-child-healing', order: 6, title: 'Inner Child Healing & Unburdening' },
  { id: 'module-7-reparenting', order: 7, title: 'Reparenting Your Inner Child' },
  { id: 'module-8-somatic-healing', order: 8, title: 'Somatic Healing & Body-Based Parts Work' },
  { id: 'module-9-relationships', order: 9, title: 'Relationships & Attachment Repair' },
  { id: 'module-10-inner-critic', order: 10, title: 'Transforming the Inner Critic' },
];

export const ASSESSMENT_LABELS = {
  wounds: 'Wound Assessment',
  parts: 'Parts Assessment',
  attachment: 'Attachment Assessment',
  'self-energy': 'Self-Energy Assessment',
};

export const FEATURE_LABELS = {
  exercises: 'Exercises',
  meditations: 'Guided Meditations',
  letters: 'Letter Writing',
  partsCards: 'Parts Cards',
  partsStudio: 'Parts Studio',
  journal: 'Journal',
  resourceLibrary: 'Resource Library',
  weeklyReflection: 'Weekly Reflection',
  healingTracker: 'Healing Tracker',
  milestones: 'Milestones',
  dailyCheckin: 'Daily Check-In',
  partsDialogue: 'Parts Dialogue',
  unburdening: 'Unburdening Protocol',
  moodAnalytics: 'Mood Analytics',
};

export const DEFAULT_ACCESS_FORM = {
  modules: MODULE_SEQUENCE.map((m) => m.id),
  assessments: Object.keys(ASSESSMENT_LABELS),
  features: Object.fromEntries(Object.keys(FEATURE_LABELS).map((key) => [key, true])),
};
