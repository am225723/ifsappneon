import { curriculumModules, getNextModule } from '../data/curriculumData';
import { isCurriculumInteractiveModule, normalizeInteractiveResult } from './interactiveResults';

const ACTIVE_ASSIGNMENT_STATUSES = ['assigned', 'in_progress'];
const VISIBLE_ASSIGNMENT_STATUSES = ['assigned', 'in_progress', 'completed', 'reviewed'];

export function getCompletedModuleIds(progressRows = [], curriculumModuleRows = []) {
  return Array.from(new Set([
    ...progressRows.filter((row) => row.completed).map((row) => row.module_id),
    ...curriculumModuleRows.map((row) => row.moduleId)
  ].filter(Boolean)));
}

export function getCurriculumPathSummary({ completedModuleIds = [], assignedPractices = [] } = {}) {
  const completedSet = new Set(completedModuleIds);
  const totalModules = curriculumModules.length || 1;
  const completedCount = completedSet.size;
  const nextModule = getNextModule([...completedSet])
    || curriculumModules.find((module) => !completedSet.has(module.id))
    || curriculumModules[0]
    || null;
  const lastCompletedModule = [...curriculumModules]
    .filter((module) => completedSet.has(module.id))
    .sort((a, b) => (b.order || 0) - (a.order || 0))[0] || null;
  const activeAssignedModuleId = assignedPractices
    .find((item) => ACTIVE_ASSIGNMENT_STATUSES.includes(item.status) && item.module_id)
    ?.module_id;
  const assignedModule = curriculumModules.find((module) => module.id === activeAssignedModuleId) || null;

  return {
    completedCount,
    totalModules,
    percent: Math.round((completedCount / totalModules) * 100),
    nextModule,
    currentModule: assignedModule || nextModule,
    lastCompletedModule,
    assignedModule,
    assignedModuleIds: new Set(
      assignedPractices
        .filter((item) => VISIBLE_ASSIGNMENT_STATUSES.includes(item.status) && item.module_id)
        .map((item) => item.module_id)
    )
  };
}


export function getCurriculumSummaryInputs({ progressRows = [], interactiveRows = [], assignedPractices = [] } = {}) {
  const normalizedInteractive = (interactiveRows || []).map((row) => row?.moduleId ? row : normalizeInteractiveResult(row));
  const curriculumModuleRows = normalizedInteractive.filter((row) => isCurriculumInteractiveModule(row.moduleId));
  const completedModuleIds = getCompletedModuleIds(progressRows, curriculumModuleRows);
  return { progressRows, curriculumModuleRows, completedModuleIds, assignedPractices };
}

export function buildSharedCurriculumSummary({ progressRows = [], interactiveRows = [], assignedPractices = [] } = {}) {
  const { completedModuleIds, curriculumModuleRows } = getCurriculumSummaryInputs({ progressRows, interactiveRows, assignedPractices });
  return {
    ...getCurriculumPathSummary({ completedModuleIds, assignedPractices }),
    completedModuleIds,
    curriculumModuleRows
  };
}

export function getModuleActionLabel(status, moduleOrder = 1) {
  if (status === 'completed') return 'Review Module';
  if (status === 'assigned') return 'Open Assigned Module';
  if (moduleOrder <= 1) return 'Start Module';
  return 'Continue Module';
}

export function getModuleSupportLinks(module = {}) {
  const title = `${module.title || ''} ${module.description || ''} ${module.category || ''}`.toLowerCase();
  const links = [];

  const add = (label, to, helper) => {
    if (!links.some((link) => link.to === to)) links.push({ label, to, helper });
  };

  if (title.includes('assessment') || title.includes('pattern') || title.includes('self-energy')) {
    add('Reflect on this', '/assessments', 'Use assessment insights gently alongside this module.');
  }

  if (title.includes('part') || title.includes('protector') || title.includes('exile') || title.includes('inner child')) {
    add('Support this module', '/parts-relationships', 'Map parts that respond as you learn.');
    add('Parts Dialogue', '/parts-dialogue', 'Listen to one part with curiosity.');
  }

  if (title.includes('trigger') || title.includes('relationship') || title.includes('attachment') || title.includes('daily') || title.includes('integration')) {
    add('Practice this in daily life', '/life-integration', 'Use daily-life reflections to integrate this lesson.');
  }

  if (title.includes('self') || title.includes('calm') || title.includes('ground') || title.includes('meditation') || title.includes('somatic')) {
    add('Helpful next practice', '/life-integration/return-to-self', 'Return to a Self-energy quality before continuing.');
    add('Guided Meditation', '/meditation', 'Settle your system with a guided practice.');
  }

  add('Reflect in Journal', '/journal', 'Capture what you notice after this module.');
  add('Tools Directory', '/tools', 'Find supporting practices without leaving the IFS Path behind.');

  return links.slice(0, 3);
}
