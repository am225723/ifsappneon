import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, CheckCircle, Star, BookOpen, Heart, Brain, 
  Award, Calendar, TrendingUp, Activity, ChevronDown, ChevronUp,
  Sparkles, Target, Shield
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadLifeIntegrationReflections } from '../lib/lifeIntegration';
import { formatLifeReflectionType, normalizeLifeReflection, summarizeLifeReflection } from '../lib/lifeIntegrationDisplay';
import { loadCurriculumReflections } from '../lib/curriculumReflections';

const milestoneTypes = {
  module: { label: 'Module', color: 'amber', icon: BookOpen, bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500', darkBg: 'bg-amber-900/30', darkText: 'text-amber-300', darkBorder: 'border-amber-700' },
  assessment: { label: 'Assessment', color: 'emerald', icon: Target, bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500', darkBg: 'bg-emerald-900/30', darkText: 'text-emerald-300', darkBorder: 'border-emerald-700' },
  journal: { label: 'Journal', color: 'blue', icon: Heart, bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500', darkBg: 'bg-blue-900/30', darkText: 'text-blue-300', darkBorder: 'border-blue-700' },
  exercise: { label: 'Exercise', color: 'green', icon: Activity, bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500', darkBg: 'bg-green-900/30', darkText: 'text-green-300', darkBorder: 'border-green-700' },
  badge: { label: 'Badge', color: 'gold', icon: Award, bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500', darkBg: 'bg-yellow-900/30', darkText: 'text-yellow-300', darkBorder: 'border-yellow-700' },
  curriculum_practice: { label: 'Curriculum Practice', color: 'amber', icon: BookOpen, bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500', darkBg: 'bg-amber-900/30', darkText: 'text-amber-300', darkBorder: 'border-amber-700' },
  daily_life: { label: 'Daily Life Practice', color: 'emerald', icon: Sparkles, bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500', darkBg: 'bg-emerald-900/30', darkText: 'text-emerald-300', darkBorder: 'border-emerald-700' },
};

function generateSampleMilestones() {
  const now = new Date();
  const milestones = [
    { id: 1, date: new Date(now - 30 * 86400000).toISOString(), type: 'module', title: 'Started Your IFS Journey', description: 'Completed Module 1: Introduction to Internal Family Systems. Learned about the concept of parts and the Self.', details: 'Key takeaway: Everyone has parts, and all parts have positive intentions.' },
    { id: 2, date: new Date(now - 28 * 86400000).toISOString(), type: 'journal', title: 'First Journal Entry', description: 'Reflected on initial feelings about starting the IFS journey.', details: 'Wrote about noticing a protector part that feels skeptical about therapy.' },
    { id: 3, date: new Date(now - 26 * 86400000).toISOString(), type: 'exercise', title: 'Parts Awareness Exercise', description: 'Completed the "Noticing Your Parts" meditation exercise.', details: 'Identified 3 parts: an inner critic, a people-pleaser, and a vulnerable child part.' },
    { id: 4, date: new Date(now - 24 * 86400000).toISOString(), type: 'assessment', title: 'Initial Self-Assessment', description: 'Completed the baseline Parts Awareness assessment.', details: 'Early Self-energy snapshot: growing awareness around unblending from protector parts.' },
    { id: 5, date: new Date(now - 22 * 86400000).toISOString(), type: 'module', title: 'Understanding Protectors', description: 'Completed Module 2: Firefighters and Managers. Learned about protective parts.', details: 'Discovered how manager parts try to keep control and firefighters react to overwhelm.' },
    { id: 6, date: new Date(now - 20 * 86400000).toISOString(), type: 'journal', title: 'Protector Dialogue', description: 'Journaled a dialogue with an inner critic protector part.', details: 'The inner critic revealed it was trying to protect from rejection by pushing for perfection.' },
    { id: 7, date: new Date(now - 18 * 86400000).toISOString(), type: 'badge', title: 'First Week Complete', description: 'Earned the "Brave Beginning" badge for completing your first week.', details: 'Completed 2 modules, 2 journal entries, and 1 exercise in your first week.' },
    { id: 8, date: new Date(now - 16 * 86400000).toISOString(), type: 'exercise', title: 'Self-Energy Meditation', description: 'Practiced accessing Self-energy through guided meditation.', details: 'Experienced moments of calm, curiosity, and compassion toward parts.' },
    { id: 9, date: new Date(now - 14 * 86400000).toISOString(), type: 'module', title: 'Meeting Your Exiles', description: 'Completed Module 3: Understanding Exile Parts and their burdens.', details: 'Learned about how exiles carry pain and how protectors try to keep them hidden.' },
    { id: 10, date: new Date(now - 12 * 86400000).toISOString(), type: 'journal', title: 'Exile Awareness', description: 'Wrote about a childhood memory that may be connected to an exile part.', details: 'Noticed feelings of sadness and loneliness connected to a younger part.' },
    { id: 11, date: new Date(now - 10 * 86400000).toISOString(), type: 'exercise', title: 'Unblending Practice', description: 'Practiced the unblending technique to separate from intense emotions.', details: 'Successfully created space between Self and an anxious protector part.' },
    { id: 12, date: new Date(now - 8 * 86400000).toISOString(), type: 'assessment', title: 'Mid-Journey Check-in', description: 'Completed the mid-point Self-energy assessment.', details: 'Notable growth in recognizing parts and accessing curiosity.' },
    { id: 13, date: new Date(now - 6 * 86400000).toISOString(), type: 'badge', title: 'Consistent Explorer', description: 'Earned the "Consistent Explorer" badge for 3 weeks of engagement.', details: 'Maintained regular practice with modules, journaling, and exercises.' },
    { id: 14, date: new Date(now - 4 * 86400000).toISOString(), type: 'module', title: 'The Unburdening Process', description: 'Completed Module 4: How parts release their burdens through Self-leadership.', details: 'Understood the steps of witnessing, retrieving, and unburdening exile parts.' },
    { id: 15, date: new Date(now - 3 * 86400000).toISOString(), type: 'journal', title: 'Gratitude for Parts', description: 'Wrote a gratitude letter to protector parts for their service.', details: 'Expressed appreciation to the inner critic for trying to keep you safe all these years.' },
    { id: 16, date: new Date(now - 2 * 86400000).toISOString(), type: 'exercise', title: 'Parts Mapping Session', description: 'Created a visual map of your internal family system.', details: 'Mapped 6 parts and their relationships, identifying key protector-exile pairs.' },
    { id: 17, date: new Date(now - 1 * 86400000).toISOString(), type: 'badge', title: 'Self-Energy Rising', description: 'Earned the "Self-Energy Rising" badge for improved assessment scores.', details: 'Your Self-energy awareness has grown by 38% since you started.' },
  ];
  return milestones;
}

export default function ProgressTimeline() {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const [milestones, setMilestones] = useState([]);
  const [lifeReflections, setLifeReflections] = useState([]);
  const [curriculumReflections, setCurriculumReflections] = useState([]);
  const [curriculumProgressRows, setCurriculumProgressRows] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [activeFilters, setActiveFilters] = useState(new Set(['module', 'curriculum_practice', 'assessment', 'journal', 'exercise', 'badge', 'daily_life']));

  useEffect(() => {
    const loadMilestones = async () => {
      const client = clientAuth.getCurrentClient();
      const clientId = client?.id;
      if (!clientId) return;
      try {
        const data = await supabaseHelpers.getMilestones(clientId);
        const { data: reflectionRows } = await loadLifeIntegrationReflections({ clientId, self: true });
        const { data: curriculumReflectionRows } = await loadCurriculumReflections({ clientId, limit: 40 });
        const progressRows = await supabaseHelpers.getAllModuleProgress(clientId);
        const normalizedLifeReflections = (reflectionRows || []).map(normalizeLifeReflection);
        setLifeReflections(normalizedLifeReflections);
        setCurriculumReflections(curriculumReflectionRows || []);
        setCurriculumProgressRows(progressRows || []);
        const lifeMilestones = normalizedLifeReflections.map((reflection) => ({
          id: `life-${reflection.id}`,
          date: reflection.created_at,
          type: 'daily_life',
          title: reflection.label,
          description: summarizeLifeReflection(reflection),
          details: 'These reflections show moments when you practiced IFS outside the app.'
        }));
        const curriculumPracticeMilestones = [
          ...(progressRows || []).filter((row) => row.completed || row.is_completed || row.completed_at).map((row) => ({
            id: `curriculum-completed-${row.id || row.module_id}`,
            date: row.completed_at || row.updated_at || row.created_at || new Date().toISOString(),
            type: 'curriculum_practice',
            title: 'Completed Module',
            description: 'Continued the IFS Path through curriculum practice.',
            details: 'These moments show how you are moving through your IFS Path.'
          })),
          ...(curriculumReflectionRows || []).map((reflection) => ({
            id: `curriculum-reflection-${reflection.id}`,
            date: reflection.createdAt,
            type: 'curriculum_practice',
            title: 'Saved a Module Reflection',
            description: reflection.moduleTitle ? `Reflected on ${reflection.moduleTitle}.` : 'Saved a Module Reflection.',
            details: 'These moments show how you are moving through your IFS Path.'
          }))
        ];
        if (data && data.length > 0) {
          setMilestones([...data, ...curriculumPracticeMilestones, ...lifeMilestones]);
        } else {
          const sample = generateSampleMilestones();
          setMilestones([...sample, ...curriculumPracticeMilestones, ...lifeMilestones]);
          for (const milestone of sample) {
            await supabaseHelpers.saveMilestone(clientId, milestone);
          }
        }
      } catch {
        const sample = generateSampleMilestones();
        setMilestones(sample);
      }
    };
    loadMilestones();
  }, []);

  const toggleFilter = (type) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filteredMilestones = milestones
    .filter(m => activeFilters.has(m.type))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const stats = {
    daysOnJourney: milestones.length > 0 ? Math.ceil((new Date() - new Date(Math.min(...milestones.map(m => new Date(m.date))))) / 86400000) : 0,
    modulesCompleted: curriculumProgressRows.filter((row) => row.completed || row.is_completed || row.completed_at).length || milestones.filter(m => m.type === 'module').length,
    exercisesDone: milestones.filter(m => m.type === 'exercise').length,
    journalEntries: milestones.filter(m => m.type === 'journal').length,
    dailyLifeReflections: lifeReflections.length,
    curriculumReflections: curriculumReflections.length,
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statCards = [
    { label: 'Days on Journey', value: stats.daysOnJourney, icon: Calendar, color: 'from-amber-500 to-emerald-500' },
    { label: 'Modules Completed', value: stats.modulesCompleted, icon: BookOpen, color: 'from-amber-500 to-stone-500' },
    { label: 'Exercises Done', value: stats.exercisesDone, icon: Activity, color: 'from-green-500 to-emerald-500' },
    { label: 'Journal Entries', value: stats.journalEntries, icon: Heart, color: 'from-blue-500 to-cyan-500' },
    { label: 'Daily-life reflections', value: stats.dailyLifeReflections, icon: Sparkles, color: 'from-emerald-500 to-teal-500' },
    { label: 'Module reflections', value: stats.curriculumReflections, icon: BookOpen, color: 'from-amber-500 to-emerald-500' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Healing Journey</h1>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Notice curriculum, assessments, parts work, and reflections over time</p>
          </div>
        </div>
      </div>

      <div className={`mb-6 rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/60' : 'border-amber-100 bg-amber-50/70'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>My Healing Timeline</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Open a gentle timeline for milestones from your curriculum, parts work, check-ins, assigned IFS practices, and reflections.</p>
          </div>
          <Link to="/healing-timeline" className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
            View Timeline
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white/80 border-gray-200'} shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{stat.label}</div>
            </div>
          );
        })}
      </div>


      <section className={`mb-6 rounded-2xl border p-4 ${isDark ? 'border-amber-900/50 bg-amber-950/20' : 'border-amber-100 bg-amber-50/70'}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Curriculum Practice</p>
            <h2 className={`mt-1 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>IFS Path progress</h2>
            <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>These moments show how you are moving through your IFS Path.</p>
          </div>
          <Link to="/curriculum" className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
            Open Curriculum
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-gray-700'}`}>{curriculumProgressRows.filter((row) => row.completed || row.is_completed || row.completed_at).length} module{curriculumProgressRows.filter((row) => row.completed || row.is_completed || row.completed_at).length === 1 ? '' : 's'} completed</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-amber-900/40 text-amber-200' : 'bg-amber-100 text-amber-700'}`}>{curriculumReflections.length} reflection{curriculumReflections.length === 1 ? '' : 's'} saved</span>
          {curriculumReflections[0]?.createdAt && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-gray-700'}`}>Latest reflection {formatDate(curriculumReflections[0].createdAt)}</span>}
        </div>
      </section>

      <section className={`mb-6 rounded-2xl border p-4 ${isDark ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-emerald-100 bg-emerald-50/70'}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Daily Life Practice</p>
            <h2 className={`mt-1 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Life Integration activity</h2>
            <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>These reflections show moments when you practiced IFS outside the app.</p>
          </div>
          <Link to="/life-integration" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Open Life Integration
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-gray-700'}`}>{lifeReflections.length} saved reflection{lifeReflections.length === 1 ? '' : 's'}</span>
          {[...new Set(lifeReflections.map((reflection) => reflection.reflection_type))].slice(0, 4).map((type) => (
            <span key={type} className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-emerald-900/40 text-emerald-200' : 'bg-emerald-100 text-emerald-700'}`}>{formatLifeReflectionType(type)}</span>
          ))}
          {lifeReflections[0]?.created_at && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-gray-700'}`}>Latest {formatDate(lifeReflections[0].created_at)}</span>}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(milestoneTypes).map(([key, mt]) => {
          const active = activeFilters.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                active
                  ? isDark ? `${mt.darkBg} ${mt.darkText} ${mt.darkBorder}` : `${mt.bg} ${mt.text} ${mt.border}`
                  : isDark ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}
            >
              {mt.label}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <div className={`absolute left-5 top-0 bottom-0 w-0.5 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />

        <div className="space-y-1">
          {filteredMilestones.map((milestone) => {
            const mt = milestoneTypes[milestone.type];
            const Icon = mt.icon;
            const isExpanded = expandedId === milestone.id;

            return (
              <div key={milestone.id} className="relative pl-12">
                <div className={`absolute left-3.5 top-5 w-3.5 h-3.5 rounded-full border-2 ${isDark ? 'border-slate-900' : 'border-white'} ${mt.dot} z-10`} />

                <button
                  onClick={() => setExpandedId(isExpanded ? null : milestone.id)}
                  className={`w-full text-left rounded-xl p-4 border transition-all ${
                    isDark
                      ? `bg-slate-800/60 border-slate-700 hover:bg-slate-800`
                      : `bg-white/80 border-gray-200 hover:bg-white hover:shadow-md`
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? mt.darkBg : mt.bg}`}>
                        <Icon className={`w-4 h-4 ${isDark ? mt.darkText : mt.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? `${mt.darkBg} ${mt.darkText}` : `${mt.bg} ${mt.text}`}`}>
                            {mt.label}
                          </span>
                          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            {formatDate(milestone.date)}
                          </span>
                        </div>
                        <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{milestone.title}</h3>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{milestone.description}</p>
                      </div>
                    </div>
                    <div className={`flex-shrink-0 mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isExpanded && milestone.details && (
                    <div className={`mt-3 pt-3 border-t text-sm ${isDark ? 'border-slate-700 text-slate-300' : 'border-gray-100 text-gray-600'}`}>
                      <div className="flex items-start gap-2">
                        <Sparkles className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                        <p>{milestone.details}</p>
                      </div>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {filteredMilestones.length === 0 && (
          <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No milestones match your filters</p>
            <p className="text-sm mt-1">Try selecting different milestone types above</p>
          </div>
        )}
      </div>
    </div>
  );
}