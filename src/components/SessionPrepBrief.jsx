import { useEffect, useState } from 'react';
import { CalendarCheck, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SessionPrepBrief({ clientId }) {
  const [agenda, setAgenda] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    supabase.from('ifs_session_agendas').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => setAgenda(data?.[0] || null))
      .finally(() => setLoading(false));
  }, [clientId]);

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex items-center gap-2 mb-2"><CalendarCheck className="w-5 h-5 text-blue-600" /><h3 className="font-semibold text-blue-950">Session Prep Brief</h3>{loading && <RefreshCw className="w-4 h-4 animate-spin" />}</div>
      {!clientId ? <p className="text-sm text-blue-700">Select a client to see their latest pre-session check-in.</p> : !agenda ? <p className="text-sm text-blue-700">No pre-session agenda yet.</p> : (
        <div className="space-y-2 text-sm text-blue-900">
          <p><span className="font-semibold">Topics:</span> {agenda.topics}</p>
          {agenda.stuck_points && <p><span className="font-semibold">Stuck points:</span> {agenda.stuck_points}</p>}
          {agenda.active_parts?.length > 0 && <div className="flex flex-wrap gap-1">{agenda.active_parts.map(part => <span key={part.id || part.part_name} className="px-2 py-0.5 rounded-full bg-white text-blue-700">{part.part_name || part.name}</span>)}</div>}
          <p className="text-xs text-blue-600">Submitted {new Date(agenda.created_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
