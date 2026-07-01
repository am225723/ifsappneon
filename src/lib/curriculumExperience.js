import { curriculumModules, getNextModule } from '../data/curriculumData';
import { isCurriculumInteractiveModule, normalizeInteractiveResult } from './interactiveResults';

const hasExplicitCompletion = (row = {}) => {
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  return row.completed === true
    || row.is_completed === true
    || Boolean(row.completed_at || row.completedAt)
    || data.completed === true
    || data.is_completed === true
    || Boolean(data.completedAt || data.completed_at);
};

function countAnswerFields(moduleAnswerRows = []) {
  return moduleAnswerRows.reduce((total, row) => {
    const answers = row?.answers || {};
    if (Array.isArray(answers)) return total + answers.length;
    if (answers && typeof answers === 'object') return total + Object.keys(answers).length;
    return total;
  }, 0);
}

export function getCompletedModuleIds(progressRows = [], curriculumModuleRows = []) {
  return Array.from(new Set([
    ...progressRows.filter(hasExplicitCompletion).map((row) => row.module_id || row.moduleId),
    ...curriculumModuleRows.filter(hasExplicitCompletion).map((row) => row.moduleId || row.module_id)
  ].filter(Boolean)));
}

export function getCurriculumPathSummary({ completedModuleIds = [] } = {}) {
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
  return {
    completedCount,
    totalModules,
    percent: Math.round((completedCount / totalModules) * 100),
    nextModule,
    currentModule: nextModule,
    lastCompletedModule,
    assignedModule: null,
    assignedModuleIds: new Set()
  };
}

export function getCurriculumSummaryInputs({ progressRows = [], interactiveRows = [], moduleAnswerRows = [] } = {}) {
  const normalizedInteractive = (interactiveRows || []).map((row) => row?.moduleId ? row : normalizeInteractiveResult(row));
  const curriculumModuleRows = normalizedInteractive.filter((row) => isCurriculumInteractiveModule(row.moduleId));
  const completedModuleIds = getCompletedModuleIds(progressRows, curriculumModuleRows);

  const answerRows = moduleAnswerRows.length;
  const answerFieldCount = countAnswerFields(moduleAnswerRows);
  const modulesWithAnswers = new Set(
    moduleAnswerRows
      .map((row) => row.module_id || row.moduleId)
      .filter(Boolean)
  ).size;

  return {
    progressRows,
    curriculumModuleRows,
    completedModuleIds,
    moduleAnswerRows,
    answerRows,
    answerFieldCount,
    modulesWithAnswers,
    assignedPractices: []
  };
}

export function buildSharedCurriculumSummary({ progressRows = [], interactiveRows = [], moduleAnswerRows = [], assignedPractices = [] } = {}) {
  const {
    completedModuleIds,
    curriculumModuleRows,
    answerRows,
    answerFieldCount,
    modulesWithAnswers
  } = getCurriculumSummaryInputs({ progressRows, interactiveRows, moduleAnswerRows });

  return {
    ...getCurriculumPathSummary({ completedModuleIds }),
    completedModuleIds,
    curriculumModuleRows,
    answerRows,
    answerFieldCount,
    modulesWithAnswers
  };
}

export function getModuleActionLabel(status, moduleOrder = 1) {
  if (status === 'completed') return 'Review Module';
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
