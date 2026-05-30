import { useEffect, useState } from 'react';
import { CheckCircle, Heart, Flame, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

export default function HealingTimeline() {
  const client = clientAuth.getCurrentClient();
  const [milestones, setMilestones] = useState([]);

  useEffect(() => {
    if (!client?.id) return;
    Promise.all([
      supabase.from('ifs_parts').select('id, part_name, created_at').eq('client_id', client.id).order('created_at', { ascending: true }).limit(1),
      supabase.from('ifs_client_progress').select('module_id, completed_at, updated_at').eq('client_id', client.id).eq('completed', true).order('updated_at', { ascending: true }),
      supabase.from('ifs_gamification').select('streak_current, streak_longest, updated_at').eq('client_id', client.id).limit(1)
    ]).then(([parts, progress, gamification]) => {
      const items = [];
      const firstPart = parts.data?.[0];
      if (firstPart) items.push({ icon: Heart, title: `Met ${firstPart.part_name}`, description: 'First mapped part', date: firstPart.created_at });
      (progress.data || []).forEach((module, index) => {
        if ([0, 2, 4, 9].includes(index)) items.push({ icon: BookOpen, title: `${index + 1} modules completed`, description: module.module_id, date: module.completed_at || module.updated_at });
      });
      const gam = gamification.data?.[0];
      if (gam?.streak_longest >= 7) items.push({ icon: Flame, title: `${gam.streak_longest}-day practice streak`, description: 'Consistency milestone', date: gam.updated_at || new Date().toISOString() });
      setMilestones(items.sort((a, b) => new Date(a.date) - new Date(b.date)));
    });
  }, [client?.id]);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-5">Healing Timeline</h3>
      {milestones.length === 0 ? <p className="text-sm text-gray-500">Your major milestones will appear here as you map parts, complete modules, and build practice streaks.</p> : (
        <div className="relative pl-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-amber-200">
          {milestones.map((milestone, index) => {
            const Icon = milestone.icon || CheckCircle;
            return <div key={`${milestone.title}-${index}`} className="relative pb-6 last:pb-0"><div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center"><Icon className="w-3.5 h-3.5 text-white" /></div><p className="font-semibold text-gray-900">{milestone.title}</p><p className="text-sm text-gray-600">{milestone.description}</p><p className="text-xs text-gray-400 mt-1">{new Date(milestone.date).toLocaleDateString()}</p></div>;
          })}
        </div>
      )}
    </div>
  );
}
