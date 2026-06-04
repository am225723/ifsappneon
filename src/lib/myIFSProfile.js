import { supabase } from './supabase';

const SELF_DATA_TABLES = [
  { table: 'ifs_interactive_data', columns: 'id', label: 'assessments' },
  { table: 'ifs_client_progress', columns: 'id', label: 'curriculum progress' },
  { table: 'ifs_parts', columns: 'id', label: 'parts work' },
  { table: 'ifs_assigned_homework', columns: 'id', label: 'assigned practices' },
  { table: 'ifs_healing_timeline_events', columns: 'id', label: 'healing timeline' },
  { table: 'ifs_journal_entries', columns: 'id', label: 'journal reflections' }
];

function getClerkUserId() {
  return window.Clerk?.user?.id || null;
}

function isSameId(left, right) {
  return left && right && String(left) === String(right);
}

async function hasRows(table, columns, clientId) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('client_id', clientId)
      .limit(1);

    if (error) return false;
    return (data || []).length > 0;
  } catch {
    return false;
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
      needsManualLink: true,
      message: 'Your personal IFS workspace is not connected yet.'
    };
  }

  const signalChecks = await Promise.all(
    SELF_DATA_TABLES.map(async (item) => ({ ...item, present: await hasRows(item.table, item.columns, profile.id) }))
  );
  const dataSignals = signalChecks.filter((item) => item.present).map((item) => item.label);

  return {
    profile,
    source,
    hasPersonalData: dataSignals.length > 0,
    dataSignals,
    needsManualLink: false,
    message: null
  };
}

export function isSelfIFSRoute(pathname = window.location.pathname) {
  return pathname === '/my-ifs' || pathname.startsWith('/my-ifs/');
}
