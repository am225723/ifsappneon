export const CURRICULUM_ACTIVITY_PRACTICE_MAP = {
  'activity-cultivate-self': 'cultivating-self-energy-practice',
  'activity-self-leadership-mastery': 'self-leadership-mastery-practice',
  'activity-inner-child-visualization': 'safe-place-visualization-inner-child',
  'activity-reparenting-dialogue': 'reparenting-your-inner-child',
  'activity-reparenting-practice': 'reparenting-your-inner-child',
  'activity-body-connection': 'body-based-inner-child-connection',
  'activity-somatic-practice': 'somatic-healing-body-scan',
  'activity-six-fs-mastery-practice': 'six-fs-protocol-mastery-practice',
  'activity-wound-healing-plan': 'personalized-wound-healing-action-plan',
  'activity-unburdening-ceremony': 'unburdening-ceremony',
  'activity-unburdening-preparation': 'unburdening-ceremony',
  'activity-relationship-patterns': 'attachment-pattern-reflection',
  'activity-critic-transformation': 'befriending-your-inner-critic',
};

export function getCurriculumPracticeIdForActivity(activityId) {
  return CURRICULUM_ACTIVITY_PRACTICE_MAP[activityId] || null;
}
