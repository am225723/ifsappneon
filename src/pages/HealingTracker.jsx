import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  Circle, 
  Loader, 
  MapPin, 
  Star, 
  Shield, 
  Heart, 
  Sparkles, 
  Compass, 
  RefreshCw,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { useTheme } from '../contexts/ThemeContext';

const healingStages = [
  {
    id: 1,
    name: 'Discovery',
    description: 'Complete your wound assessment to identify your primary healing focus.',
    icon: Compass,
    color: 'from-blue-400 to-blue-600',
    bgLight: 'bg-blue-50',
    borderLight: 'border-blue-200',
    textLight: 'text-blue-700',
    bgDark: 'bg-blue-900/30',
    borderDark: 'border-blue-700',
    textDark: 'text-blue-300',
    checkFn: (data) => !!data.assessment,
    modules: ['Wound Assessment'],
    milestones: ['Identified primary wound', 'Understood wound patterns']
  },
  {
    id: 2,
    name: 'Understanding',
    description: 'Build your foundation by completing the first two learning modules.',
    icon: Star,
    color: 'from-emerald-400 to-emerald-600',
    bgLight: 'bg-emerald-50',
    borderLight: 'border-emerald-200',
    textLight: 'text-emerald-700',
    bgDark: 'bg-emerald-900/30',
    borderDark: 'border-emerald-700',
    textDark: 'text-emerald-300',
    checkFn: (data) => {
      const m1 = data.progress['module_1'];
      const m2 = data.progress['module_2'];
      return !!(m1?.completed && m2?.completed);
    },
    inProgressFn: (data) => {
      const m1 = data.progress['module_1'];
      const m2 = data.progress['module_2'];
      return !!(m1 || m2);
    },
    modules: ['Module 1: IFS Foundations', 'Module 2: Meeting Your Parts'],
    milestones: ['Learned IFS basics', 'Identified your parts']
  },
  {
    id: 3,
    name: 'Protector Work',
    description: 'Develop relationships with your protector parts through Modules 3 and 4.',
    icon: Shield,
    color: 'from-amber-400 to-amber-600',
    bgLight: 'bg-amber-50',
    borderLight: 'border-amber-200',
    textLight: 'text-amber-700',
    bgDark: 'bg-amber-900/30',
    borderDark: 'border-amber-700',
    textDark: 'text-amber-300',
    checkFn: (data) => {
      const m3 = data.progress['module_3'];
      const m4 = data.progress['module_4'];
      return !!(m3?.completed && m4?.completed);
    },
    inProgressFn: (data) => {
      const m3 = data.progress['module_3'];
      const m4 = data.progress['module_4'];
      return !!(m3 || m4);
    },
    modules: ['Module 3: Protector Relationships', 'Module 4: Working with Managers & Firefighters'],
    milestones: ['Connected with protectors', 'Understood protector roles']
  },
  {
    id: 4,
    name: 'Protocol Mastery',
    description: 'Master the IFS protocol through Module 5.',
    icon: Heart,
    color: 'from-rose-400 to-rose-600',
    bgLight: 'bg-rose-50',
    borderLight: 'border-rose-200',
    textLight: 'text-rose-700',
    bgDark: 'bg-rose-900/30',
    borderDark: 'border-rose-700',
    textDark: 'text-rose-300',
    checkFn: (data) => {
      const m5 = data.progress['module_5'];
      return !!m5?.completed;
    },
    inProgressFn: (data) => !!data.progress['module_5'],
    modules: ['Module 5: The IFS Protocol'],
    milestones: ['Mastered 6 F\'s process', 'Ready for deeper work']
  },
  {
    id: 5,
    name: 'Unburdening',
    description: 'Release the burdens carried by your exile parts through Module 6.',
    icon: Sparkles,
    color: 'from-purple-400 to-purple-600',
    bgLight: 'bg-purple-50',
    borderLight: 'border-purple-200',
    textLight: 'text-purple-700',
    bgDark: 'bg-purple-900/30',
    borderDark: 'border-purple-700',
    textDark: 'text-purple-300',
    checkFn: (data) => {
      const m6 = data.progress['module_6'];
      return !!m6?.completed;
    },
    inProgressFn: (data) => !!data.progress['module_6'],
    modules: ['Module 6: Unburdening'],
    milestones: ['Connected with exile parts', 'Released stored burdens']
  },
  {
    id: 6,
    name: 'Integration',
    description: 'Complete your healing journey with advanced modules 7-10.',
    icon: Award,
    color: 'from-yellow-400 to-yellow-600',
    bgLight: 'bg-yellow-50',
    borderLight: 'border-yellow-200',
    textLight: 'text-yellow-700',
    bgDark: 'bg-yellow-900/30',
    borderDark: 'border-yellow-700',
    textDark: 'text-yellow-300',
    checkFn: (data) => {
      const m7 = data.progress['module_7'];
      const m8 = data.progress['module_8'];
      const m9 = data.progress['module_9'];
      const m10 = data.progress['module_10'];
      return !!(m7?.completed && m8?.completed && m9?.completed && m10?.completed);
    },
    inProgressFn: (data) => {
      const m7 = data.progress['module_7'];
      const m8 = data.progress['module_8'];
      const m9 = data.progress['module_9'];
      const m10 = data.progress['module_10'];
      return !!(m7 || m8 || m9 || m10);
    },
    modules: ['Module 7: Self-Leadership', 'Module 8: Daily Practice', 'Module 9: Relationship Patterns', 'Module 10: Ongoing Growth'],
    milestones: ['Achieved Self-leadership', 'Integrated healing into daily life']
  }
];

const woundLabels = {
  abandonment: 'Abandonment',
  shame: 'Shame',
  neglect: 'Neglect',
  betrayal: 'Betrayal',
  helplessness: 'Helplessness'
};

const HealingTracker = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [allAssessments, setAllAssessments] = useState([]);
  const [progress, setProgress] = useState({});
  const [expandedStage, setExpandedStage] = useState(null);

  useEffect(() => {
    const client = clientAuth.getCurrentClient();
    if (client?.id) {
      setClientId(client.id);
    }
  }, []);

  useEffect(() => {
    if (!clientId) return;
    loadData();
  }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [progressData, assessmentData, allAssessmentData] = await Promise.all([
        supabaseHelpers.getAllModuleProgress(clientId),
        (async () => {
          const { data } = await supabase
            .from('ifs_interactive_data')
            .select('data, updated_at')
            .eq('client_id', clientId)
            .eq('module_id', 'assessment_wounds')
            .maybeSingle();
          if (data?.data) {
            const wd = data.data;
            return {
              primary_wound: wd.primary,
              secondary_wound: wd.secondary,
              abandonment_score: wd.scores?.abandonment?.total || 0,
              shame_score: wd.scores?.shame?.total || 0,
              neglect_score: wd.scores?.neglect?.total || 0,
              betrayal_score: wd.scores?.betrayal?.total || 0,
              helplessness_score: wd.scores?.helplessness?.total || 0,
              assessment_date: wd.completedAt || data.updated_at
            };
          }
          return null;
        })(),
        (async () => {
          const { data } = await supabase
            .from('ifs_assessment_results')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: true });
          return data || [];
        })()
      ]);

      const progressObj = {};
      (progressData || []).forEach(p => {
        progressObj[p.module_id] = p;
      });
      setProgress(progressObj);
      setAssessment(assessmentData);
      setAllAssessments(allAssessmentData);
    } catch (err) {
      console.error('Error loading healing tracker data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStageStatus = (stage) => {
    const data = { assessment, progress };
    if (stage.checkFn(data)) return 'complete';
    if (stage.inProgressFn && stage.inProgressFn(data)) return 'in-progress';
    const prevStage = healingStages.find(s => s.id === stage.id - 1);
    if (!prevStage || prevStage.checkFn(data)) {
      if (stage.id === 1 && !assessment) return 'not-started';
      if (stage.id === 1) return 'complete';
      return 'not-started';
    }
    return 'not-started';
  };

  const getCurrentStage = () => {
    for (let i = healingStages.length - 1; i >= 0; i--) {
      const status = getStageStatus(healingStages[i]);
      if (status === 'complete') {
        return i < healingStages.length - 1 ? healingStages[i + 1].id : healingStages[i].id;
      }
      if (status === 'in-progress') return healingStages[i].id;
    }
    return 1;
  };

  const completedStages = healingStages.filter(s => getStageStatus(s) === 'complete').length;
  const overallProgress = Math.round((completedStages / healingStages.length) * 100);

  const getScoreComparison = () => {
    if (allAssessments.length < 2) return null;
    const first = allAssessments[0];
    const latest = allAssessments[allAssessments.length - 1];
    const wounds = ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'];
    return wounds.map(w => ({
      wound: w,
      label: woundLabels[w],
      first: first[`${w}_score`] || 0,
      latest: latest[`${w}_score`] || 0,
      change: (latest[`${w}_score`] || 0) - (first[`${w}_score`] || 0)
    }));
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-white to-emerald-50'}`}>
        <Loader className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const currentStageId = getCurrentStage();
  const comparison = getScoreComparison();

  return (
    <div className={`min-h-screen pb-24 ${theme.isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-white to-emerald-50'}`}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-xl ${theme.isDark ? 'hover:bg-slate-800' : 'hover:bg-white'} transition-colors`}>
            <ArrowLeft className={`w-5 h-5 ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`} />
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>Healing Journey</h1>
            <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {assessment?.primary_wound ? `${woundLabels[assessment.primary_wound] || assessment.primary_wound} Healing Path` : 'Your path to wholeness'}
            </p>
          </div>
        </div>

        <div className={`rounded-2xl p-5 mb-6 ${theme.isDark ? 'bg-slate-800/80 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>Overall Progress</span>
            <span className={`text-sm font-bold ${theme.isDark ? 'text-amber-400' : 'text-amber-700'}`}>{overallProgress}%</span>
          </div>
          <div className={`h-3 rounded-full overflow-hidden ${theme.isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-1000"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className={`text-xs mt-2 ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {completedStages} of {healingStages.length} stages complete
          </p>
        </div>

        <div className="relative">
          <div className={`absolute left-7 top-0 bottom-0 w-0.5 ${theme.isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />

          {healingStages.map((stage, index) => {
            const status = getStageStatus(stage);
            const isCurrent = stage.id === currentStageId;
            const isExpanded = expandedStage === stage.id;
            const Icon = stage.icon;

            return (
              <div key={stage.id} className="relative mb-4">
                <div className="absolute left-5 top-6 z-10">
                  {status === 'complete' ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center ring-4 ring-emerald-100">
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : status === 'in-progress' ? (
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center ring-4 ring-amber-100 animate-pulse">
                      <Loader className="w-3 h-3 text-white" />
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ring-4 ${theme.isDark ? 'bg-slate-600 ring-slate-800' : 'bg-gray-300 ring-gray-100'}`}>
                      <Circle className={`w-3 h-3 ${theme.isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                    </div>
                  )}
                </div>

                <div className="ml-14">
                  <button
                    onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                    className={`w-full text-left rounded-2xl p-4 transition-all ${
                      isCurrent
                        ? theme.isDark
                          ? 'bg-slate-800 border-2 border-amber-500/50 shadow-lg shadow-amber-500/10'
                          : 'bg-white border-2 border-amber-300 shadow-lg shadow-amber-100'
                        : status === 'complete'
                          ? theme.isDark
                            ? 'bg-slate-800/60 border border-emerald-700/30'
                            : 'bg-emerald-50/50 border border-emerald-100'
                          : theme.isDark
                            ? 'bg-slate-800/40 border border-slate-700/50'
                            : 'bg-white/60 border border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${stage.color}`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                              Stage {stage.id}: {stage.name}
                            </h3>
                            {isCurrent && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                Current
                              </span>
                            )}
                          </div>
                          <p className={`text-sm mt-0.5 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {stage.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {status === 'complete' && (
                              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Complete
                              </span>
                            )}
                            {status === 'in-progress' && (
                              <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                                <Loader className="w-3 h-3" /> In Progress
                              </span>
                            )}
                            {status === 'not-started' && (
                              <span className={`text-xs ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>Not Started</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`p-1 ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className={`mt-2 rounded-xl p-4 ${theme.isDark ? 'bg-slate-800/40 border border-slate-700/50' : 'bg-white/80 border border-gray-100'}`}>
                      <div className="mb-3">
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Related Modules
                        </h4>
                        <div className="space-y-1.5">
                          {stage.modules.map((mod, i) => {
                            const moduleKey = `module_${stage.id === 1 ? 'assessment' : (stage.id === 2 ? (i + 1) : stage.id === 3 ? (i + 3) : stage.id === 4 ? 5 : stage.id === 5 ? 6 : (i + 7))}`;
                            const modProgress = progress[moduleKey];
                            const isModComplete = stage.id === 1 ? !!assessment : modProgress?.completed;
                            return (
                              <div key={i} className="flex items-center gap-2">
                                {isModComplete ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                ) : (
                                  <Circle className={`w-3.5 h-3.5 flex-shrink-0 ${theme.isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                                )}
                                <span className={`text-sm ${isModComplete ? (theme.isDark ? 'text-emerald-400' : 'text-emerald-700') : (theme.isDark ? 'text-slate-400' : 'text-gray-600')}`}>
                                  {mod}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Key Milestones
                        </h4>
                        <div className="space-y-1.5">
                          {stage.milestones.map((milestone, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${status === 'complete' ? 'text-amber-500' : (theme.isDark ? 'text-slate-600' : 'text-gray-300')}`} />
                              <span className={`text-sm ${status === 'complete' ? (theme.isDark ? 'text-amber-400' : 'text-amber-700') : (theme.isDark ? 'text-slate-400' : 'text-gray-600')}`}>
                                {milestone}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {comparison && (
          <div className={`rounded-2xl p-5 mt-6 ${theme.isDark ? 'bg-slate-800/80 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className={`w-5 h-5 ${theme.isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <h3 className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>Growth Measurement</h3>
            </div>
            <p className={`text-sm mb-4 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Comparing your first assessment to your most recent one.
            </p>
            <div className="space-y-3">
              {comparison.map(c => (
                <div key={c.wound}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-700'}`}>{c.label}</span>
                    <span className={`text-sm font-medium ${c.change < 0 ? 'text-emerald-500' : c.change > 0 ? 'text-rose-500' : (theme.isDark ? 'text-slate-400' : 'text-gray-400')}`}>
                      {c.change < 0 ? `↓ ${Math.abs(c.change)}` : c.change > 0 ? `↑ ${c.change}` : '—'}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${theme.isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                      <div className="h-full rounded-full bg-gray-400 opacity-40" style={{ width: `${Math.min(c.first * 4, 100)}%` }} />
                    </div>
                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${theme.isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                      <div className={`h-full rounded-full ${c.change <= 0 ? 'bg-emerald-500' : 'bg-rose-400'}`} style={{ width: `${Math.min(c.latest * 4, 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className={`text-[10px] ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>First: {c.first}</span>
                    <span className={`text-[10px] ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>Latest: {c.latest}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/assessments')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-white font-medium shadow-md hover:shadow-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            {assessment ? 'Re-take Assessment to Measure Growth' : 'Take Your First Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HealingTracker;
