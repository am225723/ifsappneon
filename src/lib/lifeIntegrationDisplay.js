export const LIFE_REFLECTION_LABELS = {
  notice_part: 'Noticed a Part',
  return_to_self: 'Returned to Self-Energy',
  trigger_reflection: 'Reflected on a Trigger',
  repair_after_conflict: 'Repair After Conflict',
  protector_check_in: 'Protector Check-In',
  needs_boundaries: 'Needs & Boundaries Reflection'
};

export const LIFE_REFLECTION_SUMMARIES = {
  notice_part: 'You paused to notice which part was present.',
  return_to_self: 'You practiced reconnecting with Self-energy.',
  trigger_reflection: 'You reflected on a trigger and what parts may need.',
  repair_after_conflict: 'You explored repair, boundaries, or honest communication.',
  protector_check_in: 'You checked in with a protector and what it may need.',
  needs_boundaries: 'You explored a need, boundary, request, or next step.'
};

export const LIFE_REFLECTION_ICONS = {
  notice_part: 'sparkles',
  return_to_self: 'sun',
  trigger_reflection: 'feather',
  repair_after_conflict: 'heart',
  protector_check_in: 'shield-check',
  needs_boundaries: 'compass'
};

export const LIFE_REFLECTION_ROUTES = {
  notice_part: '/life-integration/notice-part',
  return_to_self: '/life-integration/return-to-self',
  trigger_reflection: '/life-integration/trigger-reflection',
  repair_after_conflict: '/life-integration/repair-after-conflict',
  protector_check_in: '/life-integration/protector-check-in',
  needs_boundaries: '/life-integration/needs-boundaries'
};

export const LIFE_REFLECTION_TIMELINE_TITLES = {
  notice_part: 'Noticed a Part in Daily Life',
  return_to_self: 'Returned to Self-Energy',
  trigger_reflection: 'Reflected on a Trigger',
  repair_after_conflict: 'Explored Repair After Conflict',
  protector_check_in: 'Checked in with a Protector',
  needs_boundaries: 'Named Needs or Boundaries'
};

export function formatLifeReflectionType(type) {
  return LIFE_REFLECTION_LABELS[type] || 'Life Integration Reflection';
}

export function summarizeLifeReflection(row = {}) {
  const type = row?.reflection_type || row?.type;
  return LIFE_REFLECTION_SUMMARIES[type] || 'You made space for IFS in daily life.';
}

export function getLifeReflectionIcon(type) {
  return LIFE_REFLECTION_ICONS[type] || 'sparkles';
}

export function getLifeReflectionRoute(type) {
  return LIFE_REFLECTION_ROUTES[type] || '/life-integration';
}

export function getLifeReflectionTimelineTitle(type) {
  return LIFE_REFLECTION_TIMELINE_TITLES[type] || formatLifeReflectionType(type);
}

export function normalizeLifeReflection(row = {}) {
  const linkedPartName = row.linked_part_name || row.linked_part_alias || row.part_name || '';
  const type = row.reflection_type || row.type || '';
  return {
    ...row,
    reflection_type: type,
    label: formatLifeReflectionType(type),
    summary: summarizeLifeReflection(row),
    icon: getLifeReflectionIcon(type),
    practiceRoute: getLifeReflectionRoute(type),
    detailRoute: row.id ? `/life-integration/reflections/${row.id}` : getLifeReflectionRoute(type),
    linkedPartName,
    privacyLabel: 'Visible to Advisor',
    isSharedWithAdvisor: true,
    isPrivate: false
  };
}
