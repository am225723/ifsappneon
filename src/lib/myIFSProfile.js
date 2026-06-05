import { supabase } from './supabase';
import { getPartsMapParts } from './interactiveResults';

function getClerkUserId() {
  return window.Clerk?.user?.id || null;
}

function isSameId(left, right) {
  return left && right && String(left) === String(right);
}

async function hasRows(table, columns, clientId, queryBuilder = null, errors = []) {
  try {
    let query = supabase
      .from(table)
      .select(columns)
      .eq('client_id', clientId)
      .limit(1);

    if (queryBuilder) query = queryBuilder(query);

    const { data, error } = await query;
    if (error) {
      errors.push({ table, status: error.status || error.statusCode || null, message: error.message || 'Request failed', effectiveClientId: clientId });
      return false;
    }
    return (data || []).length > 0;
  } catch (error) {
    errors.push({ table, status: error?.status || error?.statusCode || null, message: error?.message || 'Request failed', effectiveClientId: clientId });
    return false;
  }
}

function safeRowCount(result) {
  if (typeof result?.count === 'number') return result.count;
  if (Array.isArray(result?.data)) return result.data.length;
  return 0;
}

async function countRows(table, clientId, queryBuilder = null, errors = []) {
  try {
    let query = supabase
      .from(table)
      .select('id', { count: 'exact' })
      .eq('client_id', clientId);

    if (queryBuilder) query = queryBuilder(query);

    const result = await query;
    if (result.error) {
      errors.push({ table, status: result.error.status || result.error.statusCode || null, message: result.error.message || 'Request failed', effectiveClientId: clientId });
      return 0;
    }
    return safeRowCount(result);
  } catch (error) {
    errors.push({ table, status: error?.status || error?.statusCode || null, message: error?.message || 'Request failed', effectiveClientId: clientId });
    return 0;
  }
}

async function loadInteractiveSignals(clientId, errors = []) {
  try {
    const { data, error } = await supabase
      .from('ifs_interactive_data')
      .select('id, module_id, data, updated_at')
      .eq('client_id', clientId);

    if (error) {
      errors.push({ table: 'ifs_interactive_data', status: error.status || error.statusCode || null, message: error.message || 'Request failed', effectiveClientId: clientId });
      return { rows: [], assessments: [], curriculumModules: [], partsMap: null, hasPartsMap: false, partsMapCount: 0 };
    }

    const rows = data || [];
    const assessments = rows.filter((row) => String(row.module_id || '').startsWith('assessment_'));
    const curriculumModules = rows.filter((row) => String(row.module_id || '').startsWith('module-'));
    const partsMap = rows.find((row) => row.module_id === 'parts_map') || null;
    const partsMapCount = getPartsMapParts(partsMap).length;

    return {
      rows,
      assessments,
      curriculumModules,
      partsMap,
      hasPartsMap: Boolean(partsMap),
      partsMapCount
    };
  } catch (error) {
    errors.push({ table: 'ifs_interactive_data', status: error?.status || error?.statusCode || null, message: error?.message || 'Request failed', effectiveClientId: clientId });
    return { rows: [], assessments: [], curriculumModules: [], partsMap: null, hasPartsMap: false, partsMapCount: 0 };
  }
}

export async function loadMyIFSProfile(currentAppUser = null) {
  const clerkUserId = getClerkUserId();
  let profile = currentAppUser || null;
  let source = profile?.id ? 'current_app_user' : 'none';

  if (clerkUserId) {
    const { data, error } = await supabase
      .from('ifs_clients')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .limit(1);

    if (!error && data?.[0]) {
      profile = data[0];
      source = isSameId(profile.id, currentAppUser?.id) ? 'clerk_user_id_current_user' : 'clerk_user_id_linked_profile';
    }
  }

  if (!profile?.id && currentAppUser?.id) {
    profile = currentAppUser;
    source = 'current_app_user_fallback';
  }

  if (!profile?.id) {
    return {
      profile: null,
      source: 'not_connected',
      hasPersonalData: false,
      dataSignals: [],
      connectedData: {},
      needsManualLink: true,
      message: 'Your personal IFS workspace is not connected yet.'
    };
  }

  const queryErrors = [];

  const [
    formalWoundCount,
    interactiveSignals,
    curriculumProgressCount,
    persistentPartsCount,
    persistentRelationshipsCount,
    assignedPractices,
    healingTimeline,
    journalCount
  ] = await Promise.all([
    countRows('ifs_assessment_results', profile.id, null, queryErrors),
    loadInteractiveSignals(profile.id, queryErrors),
    countRows('ifs_client_progress', profile.id, null, queryErrors),
    countRows('ifs_parts', profile.id, null, queryErrors),
    countRows('ifs_part_relationships', profile.id, null, queryErrors),
    hasRows('ifs_assigned_homework', 'id', profile.id, null, queryErrors),
    hasRows('ifs_healing_timeline_events', 'id', profile.id),
    countRows('ifs_journal_entries', profile.id, null, queryErrors)
  ]);

  const connectedData = {
    formalWoundResults: formalWoundCount > 0,
    interactiveAssessments: interactiveSignals.assessments.length > 0,
    curriculumProgress: curriculumProgressCount > 0 || interactiveSignals.curriculumModules.length > 0,
    innerSystemMap: persistentPartsCount > 0 || interactiveSignals.hasPartsMap,
    persistentParts: persistentPartsCount > 0,
    persistentRelationships: persistentRelationshipsCount > 0,
    partsMap: interactiveSignals.hasPartsMap,
    assignedPractices,
    healingTimeline,
    journal: journalCount > 0
  };

  const dataSignals = [
    connectedData.formalWoundResults && 'wound assessment',
    connectedData.interactiveAssessments && 'interactive assessments',
    connectedData.curriculumProgress && 'curriculum progress',
    connectedData.innerSystemMap && 'Inner System Map',
    connectedData.persistentRelationships && 'parts relationships',
    connectedData.assignedPractices && 'assigned practices',
    connectedData.healingTimeline && 'healing timeline',
    connectedData.journal && 'journal reflections'
  ].filter(Boolean);

  return {
    profile,
    source,
    hasPersonalData: dataSignals.length > 0,
    dataSignals,
    connectedData,
    interactiveSignals,
    counts: {
      formalWoundCount,
      interactiveDataCount: interactiveSignals.rows.length,
      interactiveAssessmentCount: interactiveSignals.assessments.length,
      interactiveModuleCount: interactiveSignals.curriculumModules.length,
      curriculumProgressCount,
      legacyPartsMapFound: interactiveSignals.hasPartsMap,
      legacyPartsCount: interactiveSignals.partsMapCount,
      persistentPartsCount,
      persistentRelationshipsCount,
      journalCount
    },
    needsManualLink: false,
    message: queryErrors.length ? 'Some parts of your IFS path could not be refreshed. The rest of your information is still shown.' : null,
    queryErrors
  };
}

export function isSelfIFSRoute(pathname = window.location.pathname) {
  return pathname === '/my-ifs' || pathname.startsWith('/my-ifs/');
}
