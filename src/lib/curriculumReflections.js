import { supabase } from './supabase';
import { curriculumModules, getModuleById } from '../data/curriculumData';

const REFLECTION_TYPE = 'curriculum_module';
const SOURCE = 'curriculum';

function compactText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function moduleTitleFor(moduleId, fallback = '') {
  return fallback || getModuleById(moduleId)?.title || moduleId || 'Curriculum module';
}

function makeReflectionId(moduleId) {
  return `curriculum-${moduleId || 'module'}-${Date.now()}`;
}

export function normalizeCurriculumReflection(row = {}, reflection = null) {
  const data = row.data || row;
  const sourceReflection = reflection || data.latestCurriculumReflection || data;
  const moduleId = sourceReflection.moduleId || sourceReflection.module_id || row.module_id || data.moduleId || data.module_id || '';
  const createdAt = sourceReflection.createdAt || sourceReflection.created_at || row.updated_at || row.created_at || new Date().toISOString();

  return {
    id: sourceReflection.id || `${row.id || moduleId || 'curriculum'}-${createdAt}`,
    clientId: row.client_id || sourceReflection.clientId || sourceReflection.client_id || null,
    moduleId,
    moduleTitle: moduleTitleFor(moduleId, sourceReflection.moduleTitle || sourceReflection.module_title),
    reflectionType: sourceReflection.reflectionType || sourceReflection.reflection_type || REFLECTION_TYPE,
    prompt: sourceReflection.prompt || 'Take a moment to notice what shifted',
    insight: compactText(sourceReflection.insight || sourceReflection.reflection || sourceReflection.content),
    partNoticed: compactText(sourceReflection.partNoticed || sourceReflection.part_noticed),
    selfEnergyQuality: compactText(sourceReflection.selfEnergyQuality || sourceReflection.self_energy_quality),
    nextPractice: compactText(sourceReflection.nextPractice || sourceReflection.next_practice),
    linkedPartId: sourceReflection.linkedPartId || sourceReflection.linked_part_id || null,
    linkedPracticeRoute: sourceReflection.linkedPracticeRoute || sourceReflection.linked_practice_route || null,
    isPrivate: false,
    sharedWithAdvisor: true,
    createdAt,
    updatedAt: sourceReflection.updatedAt || sourceReflection.updated_at || row.updated_at || createdAt,
    source: sourceReflection.source || SOURCE
  };
}

function reflectionsFromRows(rows = []) {
  return rows.flatMap((row) => {
    const data = row.data || {};
    const reflections = Array.isArray(data.curriculumReflections) ? data.curriculumReflections : [];
    return reflections.map((reflection) => normalizeCurriculumReflection(row, reflection));
  });
}

export async function saveCurriculumReflection({ clientId, moduleId, moduleTitle, insight, partNoticed, selfEnergyQuality, nextPractice, linkedPartId }) {
  if (!clientId || !moduleId) throw new Error('clientId and moduleId are required');

  const normalized = {
    id: makeReflectionId(moduleId),
    moduleId,
    moduleTitle: moduleTitleFor(moduleId, moduleTitle),
    reflectionType: REFLECTION_TYPE,
    prompt: 'Take a moment to notice what shifted',
    insight: compactText(insight),
    partNoticed: compactText(partNoticed),
    selfEnergyQuality: compactText(selfEnergyQuality),
    nextPractice: compactText(nextPractice),
    linkedPartId: linkedPartId || null,
    isPrivate: false,
    sharedWithAdvisor: true,
    source: SOURCE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!normalized.insight && !normalized.partNoticed && !normalized.selfEnergyQuality && !normalized.nextPractice) {
    throw new Error('Add at least one reflection field before saving.');
  }

  const { data: existingRow, error: loadError } = await supabase
    .from('ifs_interactive_data')
    .select('id, data, created_at, updated_at')
    .eq('client_id', clientId)
    .eq('module_id', moduleId)
    .maybeSingle();

  if (loadError) throw new Error(loadError.message || 'Unable to load module reflection data.');

  const existingData = existingRow?.data && typeof existingRow.data === 'object' ? existingRow.data : {};
  const existingReflections = Array.isArray(existingData.curriculumReflections) ? existingData.curriculumReflections : [];
  const nextData = {
    ...existingData,
    curriculumReflections: [...existingReflections, normalized],
    latestCurriculumReflection: normalized
  };

  const { data, error } = await supabase
    .from('ifs_interactive_data')
    .upsert({
      client_id: clientId,
      module_id: moduleId,
      data: nextData,
      updated_at: normalized.updatedAt
    }, { onConflict: 'client_id,module_id' })
    .select();

  if (error) throw new Error(error.message || 'Unable to save curriculum reflection.');
  const row = Array.isArray(data) ? data[0] : data;
  return normalizeCurriculumReflection(row || { client_id: clientId, module_id: moduleId, data: nextData }, normalized);
}

export async function loadCurriculumReflections({ clientId, limit = 20 } = {}) {
  if (!clientId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('ifs_interactive_data')
    .select('id, client_id, module_id, data, created_at, updated_at')
    .eq('client_id', clientId);

  if (error) return { data: [], error };

  const reflections = reflectionsFromRows(data || [])
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
  return { data: reflections, error: null };
}

export async function loadCurriculumReflectionsForModule({ clientId, moduleId } = {}) {
  if (!clientId || !moduleId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('ifs_interactive_data')
    .select('id, client_id, module_id, data, created_at, updated_at')
    .eq('client_id', clientId)
    .eq('module_id', moduleId)
    .maybeSingle();

  if (error) return { data: [], error };
  return { data: reflectionsFromRows(data ? [data] : []), error: null };
}

export function summarizeCurriculumReflection(reflection) {
  if (!reflection) return 'Visible to Advisor curriculum reflection';
  if (reflection.insight) return reflection.insight.length > 120 ? `${reflection.insight.slice(0, 117)}...` : reflection.insight;
  if (reflection.partNoticed) return `Part noticed: ${reflection.partNoticed}`;
  if (reflection.selfEnergyQuality) return `Self-energy quality: ${reflection.selfEnergyQuality}`;
  if (reflection.nextPractice) return `Next practice: ${reflection.nextPractice}`;
  return 'Visible to Advisor curriculum reflection';
}

export function countCurriculumReflectionsByModule(reflections = []) {
  return reflections.reduce((acc, reflection) => {
    if (!reflection.moduleId) return acc;
    acc[reflection.moduleId] = (acc[reflection.moduleId] || 0) + 1;
    return acc;
  }, {});
}

export function getCurriculumReflectionModuleOptions() {
  return curriculumModules.map((module) => ({ id: module.id, title: module.title }));
}
