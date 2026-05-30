import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Lock, CheckCircle, Circle, Play, Clock, Award, Target,
  Heart, Users, Lightbulb, Zap, ChevronRight, Star, TrendingUp,
  Brain, Sparkles, Shield, Flag, RotateCcw, Filter
} from 'lucide-react';
import { 
  curriculumModules, getModuleById, checkPrerequisites,
  getNextModule, getInnerChildModules, getTotalEstimatedTime
} from '../data/curriculumData';
import { supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { supabase } from '../lib/supabase';
import { WOUND_MODULE_PRIORITIES, LEVEL_ORDER } from '../lib/woundModulePriorities';
import { canAccessModule } from '../lib/accessControl';

const CurriculumSystem = ({ onModuleSelect, userProgress = {}, clientId }) => {
  const [completedModules, setCompletedModules] = useState([]);
  const [currentModule, setCurrentModule] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set(['introduction', 'parts_system']));
  const [personalizedCurriculum, setPersonalizedCurriculum] = useState(null);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [clientWound, setClientWound] = useState(null);
  const [loadingWound, setLoadingWound] = useState(true);
  const [woundFocus, setWoundFocus] = useState('primary');
  const [restartingModule, setRestartingModule] = useState(null);
  const [assignedHomeworkIds, setAssignedHomeworkIds] = useState(new Set());

  useEffect(() => {
    if (userProgress.completedModules) {
      setCompletedModules(userProgress.completedModules);
    }

    const loadCurriculum = async () => {
      const client = clientAuth.getCurrentClient();
      const id = client?.id;
      if (!id) { setLoadingWound(false); return; }

      try {
        const [curriculumRes, interactiveRes, progressRes, assignmentsRes] = await Promise.all([
          supabaseHelpers.getPersonalizedCurriculum(id),
          supabase.from('ifs_interactive_data')
            .select('data')
            .eq('client_id', id)
            .eq('module_id', 'assessment_wounds')
            .maybeSingle(),
          supabase.from('ifs_client_progress')
            .select('module_id, completed')
            .eq('client_id', id),
          supabase.from('ifs_assigned_homework')
            .select('module_id, status')
            .eq('client_id', id)
        ]);

        if (curriculumRes) {
          setPersonalizedCurriculum(curriculumRes);
          setIsPersonalized(true);
        }

        const activeAssignments = (assignmentsRes.data || []);
        const assignedModules = (activeAssignments.length ? activeAssignments : [])
          .filter(item => item.status !== 'completed' && item.status !== 'cancelled')
          .map(item => item.module_id);
        setAssignedHomeworkIds(new Set(assignedModules));

        const dbCompleted = (progressRes.data || [])
          .filter(p => p.completed)
          .map(p => p.module_id);
        if (dbCompleted.length > 0) {
          setCompletedModules(prev => {
            const merged = new Set([...prev, ...dbCompleted]);
            return [...merged];
          });
        }

        // Wound comes ONLY from the client's own assessment tab results
        const wd = interactiveRes.data?.data;
        const primaryWound = wd?.primary;
        const secondaryWound = wd?.secondary;

        if (primaryWound && WOUND_MODULE_PRIORITIES[primaryWound]) {
          setClientWound({ primary: primaryWound, secondary: secondaryWound });
        }
      } catch (error) {
        console.error('Error loading curriculum personalization:', error);
      }
      setLoadingWound(false);
    };

    loadCurriculum();
  }, [userProgress]);

  const woundConfig = clientWound ? WOUND_MODULE_PRIORITIES[clientWound.primary] : null;
  const secondaryWoundConfig = clientWound?.secondary ? WOUND_MODULE_PRIORITIES[clientWound.secondary] : null;

  const getModulePriority = (moduleId) => {
    if (!woundConfig) return null;
    return woundConfig.modules[moduleId] || { level: 'standard', badge: null, message: null };
  };

  const getSecondaryPriority = (moduleId) => {
    if (!secondaryWoundConfig) return null;
    return secondaryWoundConfig.modules[moduleId] || { level: 'standard', badge: null, message: null };
  };

  const activeWoundConfig = woundFocus === 'secondary' && secondaryWoundConfig ? secondaryWoundConfig : woundConfig;

  const enrichAndSort = (modules) => {
    return [...modules]
      .map(m => ({
        ...m,
        _priority: getModulePriority(m.id),
        _secondaryPriority: getSecondaryPriority(m.id)
      }))
      .sort((a, b) => {
        if (!woundConfig) return a.order - b.order;
        const getLevel = (mod) => {
          if (woundFocus === 'secondary' && secondaryWoundConfig) {
            return LEVEL_ORDER[mod._secondaryPriority?.level || 'standard'];
          }
          return LEVEL_ORDER[mod._priority?.level || 'standard'];
        };
        const la = getLevel(a);
        const lb = getLevel(b);
        if (la !== lb) return la - lb;
        return a.order - b.order;
      });
  };

  const handleRestartModule = async (module) => {
    const confirmed = window.confirm(`Restart "${module.title}"? Your previous responses will be cleared.`);
    if (!confirmed) return;

    setRestartingModule(module.id);
    try {
      const client = clientAuth.getCurrentClient();
      if (!client?.id) return;

      await Promise.all([
        supabase.from('ifs_client_progress')
          .update({ current_step: 0, completed: false })
          .eq('client_id', client.id)
          .eq('module_id', module.id),
        supabase.from('ifs_interactive_data')
          .delete()
          .eq('client_id', client.id)
          .like('module_id', `${module.id}%`)
      ]);

      setCompletedModules(prev => prev.filter(id => id !== module.id));
    } catch (error) {
      console.error('Error restarting module:', error);
      alert('Failed to restart module. Please try again.');
    } finally {
      setRestartingModule(null);
    }
  };

  const nextModule = getNextModule(completedModules);

  const categories = [
    { id: 'introduction', title: 'Foundation', icon: BookOpen, color: 'from-blue-500 to-blue-600' },
    { id: 'parts_system', title: 'Inner Child & Parts', icon: Heart, color: 'from-rose-500 to-pink-600' },
    { id: 'self_leadership', title: 'Self Leadership', icon: Star, color: 'from-amber-500 to-amber-600' },
    { id: 'protocols', title: 'Healing Protocols', icon: Target, color: 'from-orange-500 to-orange-600' },
    { id: 'unburdening', title: 'Deep Healing', icon: Lightbulb, color: 'from-emerald-500 to-emerald-600' },
    { id: 'exercises', title: 'Exercises & Integration', icon: Zap, color: 'from-green-500 to-green-600' },
    { id: 'reparenting', title: 'Reparenting', icon: Heart, color: 'from-pink-500 to-rose-600' },
    { id: 'somatic', title: 'Somatic Healing', icon: Brain, color: 'from-teal-500 to-teal-600' },
    { id: 'relationships', title: 'Relationships & Attachment', icon: Users, color: 'from-indigo-500 to-indigo-600' },
    { id: 'protectors', title: 'Inner Critic', icon: Shield, color: 'from-violet-500 to-violet-600' },
  ];

  const getModuleStatus = (module) => {
    if (assignedHomeworkIds.has(module.id)) {
      if (completedModules.includes(module.id)) return 'completed';
      return 'available';
    }
    if (!canAccessModule(module.id)) return 'restricted';
    if (completedModules.includes(module.id)) return 'completed';
    if (module.prerequisites?.length && !checkPrerequisites(module.id, completedModules)) return 'locked';
    return 'available';
  };

  const isTherapistAssigned = (moduleId) => assignedHomeworkIds.has(moduleId);

  const getStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />;
    if (status === 'locked' || status === 'restricted') return <Lock className="w-6 h-6 text-gray-400 flex-shrink-0" />;
    return <Circle className="w-6 h-6 text-blue-500 flex-shrink-0" />;
  };

  const modulesByCategory = categories.map(cat => ({
    ...cat,
    modules: enrichAndSort(curriculumModules.filter(m => m.category === cat.id))
  }));

  const totalModules = curriculumModules.length;
  const completedCount = completedModules.length;
  const progressPercentage = Math.round((completedCount / totalModules) * 100);
  const innerChildModules = getInnerChildModules();
  const innerChildCompleted = innerChildModules.filter(m => completedModules.includes(m.id)).length;
  const totalTime = getTotalEstimatedTime();
  const completedTime = completedModules.reduce((total, id) => {
    const m = getModuleById(id);
    return total + (m?.estimatedMinutes || 0);
  }, 0);

  const toggleCategory = (id) => {
    const next = new Set(expandedCategories);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedCategories(next);
  };

  const handleModuleSelect = (module) => {
    const status = getModuleStatus(module);
    if (status === 'available' || status === 'completed') {
      setCurrentModule(module);
      if (onModuleSelect) onModuleSelect(module);
    }
  };

  const getPriorityModules = (config, getPriorityFn) => {
    if (!config) return [];
    return curriculumModules
      .map(m => ({ ...m, _priority: getPriorityFn(m.id) }))
      .filter(m => m._priority?.level === 'core' || m._priority?.level === 'high')
      .sort((a, b) => LEVEL_ORDER[a._priority.level] - LEVEL_ORDER[b._priority.level])
      .slice(0, 4);
  };

  const primaryPriorityModules = getPriorityModules(woundConfig, getModulePriority);
  const secondaryPriorityModules = getPriorityModules(secondaryWoundConfig, getSecondaryPriority);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-emerald-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-emerald-600 bg-clip-text text-transparent">
                Inner Child Healing Journey
              </h1>
              <p className="text-gray-600 mt-1 text-sm">
                {woundConfig ? (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Personalized for your <strong>{woundConfig.childName}</strong>
                    {secondaryWoundConfig && <> &amp; <strong>{secondaryWoundConfig.childName}</strong></>}
                  </span>
                ) : (
                  'A comprehensive IFS curriculum for healing your Inner Child wounds'
                )}
              </p>
            </div>
            {nextModule && (
              <Link
                to={`/curriculum/module/${nextModule.id}`}
                onClick={() => handleModuleSelect(nextModule)}
                className="bg-gradient-to-r from-amber-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-amber-700 hover:to-emerald-700 transition-all flex items-center space-x-2 shadow-lg"
              >
                <Play className="w-5 h-5" />
                <span>Continue Learning</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* === YOUR HEALING FOCUS (dual-wound display) === */}
        {woundConfig && primaryPriorityModules.length > 0 && (
          <div className="space-y-4">
            <div className={`grid ${secondaryWoundConfig ? 'md:grid-cols-5' : 'grid-cols-1'} gap-4`}>
              {/* Primary Wound Card */}
              <div className={`rounded-2xl border-2 p-6 ${woundConfig.lightBg} ${secondaryWoundConfig ? 'md:col-span-3' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${woundConfig.gradient} flex items-center justify-center shadow-md`}>
                    <Flag className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={`text-lg font-bold ${woundConfig.textColor}`}>
                        {woundConfig.childName}
                      </h2>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${woundConfig.darkBg} ${woundConfig.textColor}`}>Primary</span>
                    </div>
                    <p className="text-sm text-gray-600">{woundConfig.tagline}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {primaryPriorityModules.map(mod => {
                    const status = getModuleStatus(mod);
                    const p = mod._priority;
                    return (
                      <Link
                        key={mod.id}
                        to={status !== 'locked' && status !== 'restricted' ? `/curriculum/module/${mod.id}` : '#'}
                        onClick={() => status !== 'locked' && status !== 'restricted' && handleModuleSelect(mod)}
                        className={`block rounded-xl border bg-white p-3 transition-all hover:shadow-md group ${status === 'locked' || status === 'restricted' ? 'opacity-60 cursor-not-allowed' : ''}`}
                        title={status === 'restricted' ? 'Contact your advisor to unlock this module' : undefined}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${woundConfig.gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            {status === 'completed'
                              ? <CheckCircle className="w-3.5 h-3.5 text-white" />
                              : status === 'locked' || status === 'restricted'
                              ? <Lock className="w-3.5 h-3.5 text-white" />
                              : <Play className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-xs leading-tight">{mod.title}</h4>
                            {p?.badge && <span className={`text-[10px] font-bold ${woundConfig.textColor}`}>{p.badge}</span>}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Wound Card */}
              {secondaryWoundConfig && (
                <div className={`rounded-2xl border-2 p-6 ${secondaryWoundConfig.lightBg} md:col-span-2`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${secondaryWoundConfig.gradient} flex items-center justify-center shadow-md`}>
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className={`text-base font-bold ${secondaryWoundConfig.textColor}`}>
                          {secondaryWoundConfig.childName}
                        </h2>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${secondaryWoundConfig.darkBg} ${secondaryWoundConfig.textColor}`}>Secondary</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{secondaryWoundConfig.tagline}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {secondaryPriorityModules.slice(0, 3).map(mod => {
                      const status = getModuleStatus(mod);
                      return (
                        <Link
                          key={mod.id}
                          to={status !== 'locked' && status !== 'restricted' ? `/curriculum/module/${mod.id}` : '#'}
                          onClick={() => status !== 'locked' && status !== 'restricted' && handleModuleSelect(mod)}
                          className={`block rounded-lg border bg-white p-2.5 transition-all hover:shadow-sm text-xs ${status === 'locked' || status === 'restricted' ? 'opacity-60 cursor-not-allowed' : ''}`}
                          title={status === 'restricted' ? 'Contact your advisor to unlock this module' : undefined}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${secondaryWoundConfig.gradient} flex items-center justify-center flex-shrink-0`}>
                              {status === 'completed'
                                ? <CheckCircle className="w-3 h-3 text-white" />
                                : <Play className="w-3 h-3 text-white" />}
                            </div>
                            <span className="font-medium text-gray-800 leading-tight">{mod.title}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Wound Focus Toggle */}
            {secondaryWoundConfig && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 font-medium mr-1">Sort by:</span>
                <button
                  onClick={() => setWoundFocus('primary')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    woundFocus === 'primary'
                      ? `bg-gradient-to-r ${woundConfig.gradient} text-white shadow-sm`
                      : `${woundConfig.lightBg} ${woundConfig.textColor} hover:opacity-80`
                  }`}
                >
                  {woundConfig.childName}
                </button>
                <button
                  onClick={() => setWoundFocus('secondary')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    woundFocus === 'secondary'
                      ? `bg-gradient-to-r ${secondaryWoundConfig.gradient} text-white shadow-sm`
                      : `${secondaryWoundConfig.lightBg} ${secondaryWoundConfig.textColor} hover:opacity-80`
                  }`}
                >
                  {secondaryWoundConfig.childName}
                </button>
                {woundFocus === 'secondary' && (
                  <span className="text-xs text-gray-500 ml-1">Modules sorted for secondary wound</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Overall Progress</span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{progressPercentage}%</div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-amber-600 to-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
            </div>
            <div className="text-xs text-gray-500 mt-1">{completedCount} of {totalModules} modules</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Inner Child Focus</span>
              <Heart className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{innerChildCompleted}/{innerChildModules.length}</div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-emerald-600 to-amber-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(innerChildCompleted / innerChildModules.length) * 100}%` }} />
            </div>
            <div className="text-xs text-gray-500 mt-1">Child-focused modules</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Time Invested</span>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{completedTime}min</div>
            <div className="text-xs text-gray-500 mt-1">{totalTime - completedTime}min remaining</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Achievements</span>
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{completedCount}</div>
            <div className="text-xs text-gray-500 mt-1">Modules completed</div>
          </div>
        </div>

        {/* Next Module Recommendation */}
        {nextModule && (
          <div className="bg-gradient-to-r from-amber-600 to-emerald-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Next Recommended</h3>
                    {woundConfig && getModulePriority(nextModule.id)?.level === 'core' && (
                      <span className="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded-full font-semibold">
                        🎯 Core focus for your healing
                      </span>
                    )}
                  </div>
                </div>
                <h4 className="text-2xl font-bold mt-2">{nextModule.title}</h4>
                <p className="text-amber-100 mt-1">{nextModule.description}</p>
                {woundConfig && getModulePriority(nextModule.id)?.message && (
                  <p className="text-amber-200 text-sm mt-1 italic">{getModulePriority(nextModule.id).message}</p>
                )}
              </div>
              <Link
                to={`/curriculum/module/${nextModule.id}`}
                onClick={() => handleModuleSelect(nextModule)}
                className="bg-white text-amber-600 px-6 py-3 rounded-lg font-semibold hover:bg-amber-50 transition-colors flex items-center space-x-2 flex-shrink-0"
              >
                <span>Start Module</span>
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}

        {/* Curriculum Modules by Category */}
        <div className="space-y-4">
          {modulesByCategory.map(category => {
            const Icon = category.icon;
            const isExpanded = expandedCategories.has(category.id);
            const categoryCompleted = category.modules.filter(m => completedModules.includes(m.id)).length;
            const categoryTotal = category.modules.length;
            const hasCoreModules = woundConfig && category.modules.some(m => m._priority?.level === 'core');

            return (
              <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-gradient-to-r ${category.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{category.title}</h3>
                        {hasCoreModules && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${woundConfig.darkBg} ${woundConfig.textColor}`}>
                            Core Focus
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{categoryCompleted} of {categoryTotal} modules completed</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-600">
                      {categoryCompleted > 0 && `${Math.round((categoryCompleted / categoryTotal) * 100)}%`}
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                <div className="px-6 pb-2">
                  <div className="bg-gray-200 rounded-full h-1.5">
                    <div className={`bg-gradient-to-r ${category.color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${categoryTotal > 0 ? (categoryCompleted / categoryTotal) * 100 : 0}%` }} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {category.modules.map(module => {
                      const status = getModuleStatus(module);
                      const priority = module._priority;
                      const isCore = priority?.level === 'core';
                      const isHigh = priority?.level === 'high';

                      return (
                        <div
                          key={module.id}
                          className={`px-6 py-4 border-b border-gray-50 last:border-b-0 transition-colors
                            ${status === 'locked' || status === 'restricted' ? 'opacity-60' : 'hover:bg-gray-50'}
                            ${isCore && woundConfig ? 'bg-gradient-to-r from-white to-amber-50/50' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                              {getStatusIcon(status)}
                              <div className="flex-1 min-w-0">
                                <Link
                                  to={status !== 'locked' && status !== 'restricted' ? `/curriculum/module/${module.id}` : '#'}
                                  onClick={() => (status !== 'locked' && status !== 'restricted') && handleModuleSelect(module)}
                                  className={`block ${status !== 'locked' && status !== 'restricted' ? 'hover:text-amber-600 transition-colors' : 'cursor-not-allowed pointer-events-none'}`}
                                  title={status === 'restricted' ? 'Contact your advisor to unlock this module' : undefined}
                                >
                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <h4 className="font-semibold text-gray-900">{module.title}</h4>
                                    {priority?.badge && woundConfig && (
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                        isCore ? `${woundConfig.darkBg} ${woundConfig.textColor}` :
                                        isHigh ? 'bg-amber-100 text-amber-700' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>
                                        {priority.badge}
                                      </span>
                                    )}
                                    {isTherapistAssigned(module.id) && (
                                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
                                        Therapist Assigned
                                      </span>
                                    )}
                                    {module._secondaryPriority && secondaryWoundConfig && (module._secondaryPriority.level === 'core' || module._secondaryPriority.level === 'high') && (
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${secondaryWoundConfig.darkBg} ${secondaryWoundConfig.textColor}`}>
                                        {module._secondaryPriority.level === 'core' ? `Also core for ${secondaryWoundConfig.childName}` : secondaryWoundConfig.childName}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600">{module.description}</p>

                                  {status === 'restricted' && (
                                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                      <Lock className="w-3 h-3" /> Contact your advisor to unlock this module
                                    </p>
                                  )}

                                  {priority?.message && woundConfig && (
                                    <div className={`mt-2 p-2.5 rounded-lg border text-xs ${
                                      isCore ? `${woundConfig.lightBg} ${woundConfig.textColor}` : 'bg-amber-50 border-amber-200 text-amber-700'
                                    }`}>
                                      <span className="flex items-center gap-1 font-semibold mb-0.5">
                                        <Sparkles className="w-3 h-3" /> Personalized for your {woundConfig.childName}:
                                      </span>
                                      {priority.message}
                                    </div>
                                  )}

                                  <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500 flex-wrap gap-1">
                                    <span className="flex items-center space-x-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{module.estimatedMinutes} min</span>
                                    </span>
                                    {module.innerChildFocus && (
                                      <span className="flex items-center space-x-1">
                                        <Heart className="w-3 h-3" />
                                        <span>Inner Child</span>
                                      </span>
                                    )}
                                    {woundConfig && priority?.level !== 'standard' && (
                                      <span className="flex items-center space-x-1">
                                        <Brain className="w-3 h-3" />
                                        <span>Personalized</span>
                                      </span>
                                    )}
                                    {isTherapistAssigned(module.id) && (
                                      <span className="flex items-center space-x-1 text-blue-600">
                                        <Flag className="w-3 h-3" />
                                        <span>Unlocked by therapist</span>
                                      </span>
                                    )}
                                    {module.prerequisites?.length > 0 && (
                                      <span className="flex items-center space-x-1">
                                        <Lock className="w-3 h-3" />
                                        <span>Prerequisites</span>
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-4">
                              {status === 'available' && (
                                <Link
                                  to={`/curriculum/module/${module.id}`}
                                  onClick={() => handleModuleSelect(module)}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                                    isCore && woundConfig
                                      ? `bg-gradient-to-r ${woundConfig.gradient} hover:opacity-90`
                                      : 'bg-amber-600 hover:bg-amber-700'
                                  }`}
                                >
                                  Start
                                </Link>
                              )}
                              {status === 'completed' && (
                                <div className="flex flex-col items-end gap-1.5">
                                  <div className="flex items-center space-x-1 text-green-600">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="text-sm font-medium">Done</span>
                                  </div>
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRestartModule(module); }}
                                    disabled={restartingModule === module.id}
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 transition-colors disabled:opacity-50"
                                  >
                                    <RotateCcw className={`w-3.5 h-3.5 ${restartingModule === module.id ? 'animate-spin' : ''}`} />
                                    <span>{restartingModule === module.id ? 'Restarting...' : 'Restart'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Healing Tips — wound-specific if known */}
        <div className={`rounded-xl p-6 border ${woundConfig ? `${woundConfig.lightBg}` : 'bg-gradient-to-r from-blue-50 to-amber-50 border-blue-100'}`}>
          <h3 className={`text-lg font-bold mb-3 ${woundConfig ? woundConfig.textColor : 'text-gray-900'}`}>
            💡 {woundConfig ? `Healing Tips for Your ${woundConfig.childName}` : 'Learning Journey Tips'}
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {(woundConfig?.tips || [
              'Complete modules in order to build a strong foundation for Inner Child healing',
              'Take your time with each module — Inner Child work unfolds at its own pace',
              'Practice the exercises regularly to integrate the learning into daily life',
              'Journal about your experiences to deepen your connection with your Inner Child',
              'Consider working with an IFS advisor for deeper unburdening work',
            ]).map((tip, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className={`mt-1 flex-shrink-0 ${woundConfig ? woundConfig.textColor : 'text-blue-500'}`}>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CurriculumSystem;
