import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import LearningModuleEnhanced from './LearningModuleEnhanced';
import { useData } from '../contexts/DataContext';
import { supabaseHelpers, supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { WOUND_MODULE_PRIORITIES, getWoundPriority } from '../lib/woundModulePriorities';
import { canAccessModule } from '../lib/accessControl';
import { useTheme } from '../contexts/ThemeContext';

const LearningModuleRenderer = ({ userProgress = {} }) => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [module, setModule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [woundContext, setWoundContext] = useState(null);

  if (moduleId && !canAccessModule(moduleId)) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme?.isDark ? 'text-slate-100' : ''}`}>
        <div className="text-center px-6 max-w-md">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${theme?.isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <ChevronLeft className={`w-8 h-8 ${theme?.isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          </div>
          <h2 className={`text-xl font-bold mb-2 ${theme?.isDark ? 'text-white' : 'text-gray-900'}`}>
            Module Coming Up
          </h2>
          <p className={`text-sm mb-4 ${theme?.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            This module will open as you continue your IFS path.
          </p>
          <button onClick={() => navigate('/curriculum')} className="text-amber-600 hover:text-amber-700 font-medium text-sm">
            Back to Curriculum
          </button>
        </div>
      </div>
    );
  }

  const generateDefaultStepsForPersonalizedModule = (mod) => {
    const baseSteps = [];
    baseSteps.push({
      type: "learn",
      data: {
        id: `learn-intro-${mod.id}`,
        title: mod.title || "Welcome to Your Personalized Module",
        content: [mod.description || "This module has been personalized based on your assessment results."],
        keyTakeaways: mod.personalizedContent?.healingGoals || ["Begin your healing journey"]
      }
    });
    if (mod.personalizedContent?.woundFocus) {
      baseSteps.push({
        type: "learn",
        data: {
          id: `learn-focus-${mod.id}`,
          title: `Focus: ${mod.personalizedContent.woundFocus}`,
          content: [`This module is specifically designed to address ${mod.personalizedContent.woundFocus} patterns.`],
          keyTakeaways: mod.personalizedContent.healingGoals || []
        }
      });
    }
    baseSteps.push({
      type: "activity",
      data: {
        id: `activity-reflection-${mod.id}`,
        title: "Personalized Reflection Activity",
        description: "Take a moment to reflect on your personal healing journey.",
        type: 'reflection',
        prompt: "Take a moment to reflect on your personal healing journey.",
        questions: mod.personalizedContent?.activities || ["What are you noticing in your body right now?"],
        interactiveElements: []
      }
    });
    baseSteps.push({
      type: "result",
      data: {
        id: `result-${mod.id}`,
        title: "Module Complete",
        completionMessage: `Congratulations! You have completed the personalized module for ${mod.personalizedContent?.woundFocus || "your healing journey"}.`
      }
    });
    return baseSteps;
  };

  useEffect(() => {
    loadModule();
  }, [moduleId]);

  const loadModule = async () => {
    try {
      setIsLoading(true);
      const client = clientAuth.getCurrentClient();
      const clientId = client?.id;
      let personalizedCurriculum = null;
      let targetModule = null;

      if (clientId) {
        try {
          const [curriculumRes, interactiveRes, partsRes, selfEnergyRes] = await Promise.all([
            supabaseHelpers.getPersonalizedCurriculum(clientId),
            supabase.from('ifs_interactive_data')
              .select('data')
              .eq('client_id', clientId)
              .eq('module_id', 'assessment_wounds')
              .maybeSingle(),
            supabase.from('ifs_interactive_data')
              .select('data')
              .eq('client_id', clientId)
              .eq('module_id', 'assessment_parts')
              .maybeSingle(),
            supabase.from('ifs_interactive_data')
              .select('data')
              .eq('client_id', clientId)
              .eq('module_id', 'assessment_self-energy')
              .maybeSingle()
          ]);

          personalizedCurriculum = curriculumRes;

          const wd = interactiveRes.data?.data;
          let primaryWound = wd?.primary;
          let secondaryWound = wd?.secondary;
          const woundScores = wd?.scores;

          const partsData = partsRes.data?.data;
          let activeParts = [];
          if (partsData?.answers) {
            const partsDefs = {
              manager: [
                { name: 'The Inner Critic', trigger: [3], threshold: 4 },
                { name: 'The Planner', trigger: [1], threshold: 4 },
                { name: 'The Perfectionist', trigger: [7], threshold: 4 },
                { name: 'The People Pleaser', trigger: [9], threshold: 4 },
                { name: 'The Controller', trigger: [5], threshold: 4 },
                { name: 'The Worrier', trigger: [14], threshold: 4 }
              ],
              firefighter: [
                { name: 'The Distractor', trigger: [2], threshold: 4 },
                { name: 'The Numbing Part', trigger: [6], threshold: 4 },
                { name: 'The Impulse Part', trigger: [4], threshold: 4 },
                { name: 'The Shutdown Part', trigger: [8], threshold: 4 },
                { name: 'The Self-Destructive Part', trigger: [10], threshold: 3 }
              ],
              exile: [
                { name: 'The Scared Child', trigger: [11], threshold: 4 },
                { name: 'The Lonely Child', trigger: [12], threshold: 4 },
                { name: 'The Grieving Child', trigger: [13], threshold: 4 },
                { name: 'The Shamed Child', trigger: [15], threshold: 4 }
              ]
            };
            Object.entries(partsDefs).forEach(([type, parts]) => {
              parts.forEach(part => {
                const score = part.trigger.reduce((sum, qId) => sum + (partsData.answers[qId] || 0), 0) / part.trigger.length;
                if (score >= part.threshold) {
                  activeParts.push({ name: part.name, type, score, intensity: score >= 5 ? 'Very Active' : 'Active' });
                }
              });
            });
            activeParts.sort((a, b) => b.score - a.score);
          }

          const selfEnergyData = selfEnergyRes.data?.data || null;
          const clientName = client?.name?.split(' ')[0] || null;

          if (primaryWound && WOUND_MODULE_PRIORITIES[primaryWound]) {
            const priority = getWoundPriority(primaryWound, moduleId);
            setWoundContext({
              primary: primaryWound,
              secondary: secondaryWound,
              scores: woundScores,
              config: WOUND_MODULE_PRIORITIES[primaryWound],
              secondaryConfig: secondaryWound ? WOUND_MODULE_PRIORITIES[secondaryWound] : null,
              priority: priority || { level: 'standard', badge: null, message: null },
              activeParts,
              selfEnergy: selfEnergyData,
              clientName
            });
          }
        } catch (err) {
          console.error('Error loading personalization:', err);
        }
      }

      if (personalizedCurriculum) {
        targetModule = personalizedCurriculum.personalizedModules?.find(m => m.id === moduleId);
      }

      if (!targetModule) {
        const { curriculumModules } = await import("../data/curriculumData.js");
        targetModule = curriculumModules.find(m => m.id === moduleId);
      }

      if (targetModule && !targetModule.steps && personalizedCurriculum) {
        targetModule.steps = generateDefaultStepsForPersonalizedModule(targetModule);
        targetModule.estimatedTime = targetModule.estimatedTime || `${targetModule.estimatedMinutes || 30} minutes`;
      }

      if (targetModule) {
        setModule(targetModule);
      } else {
        console.error('Module not found:', moduleId);
        navigate('/curriculum');
      }
    } catch (error) {
      console.error('Error loading module:', error);
      navigate('/curriculum');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    navigate('/curriculum');
  };

  const handleBack = () => {
    navigate('/curriculum');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your learning module...</p>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Module Not Found</h2>
          <Link to="/curriculum" className="text-amber-600 hover:text-amber-700">
            <ChevronLeft className="w-4 h-4 inline" /> Back to Curriculum
          </Link>
        </div>
      </div>
    );
  }

  return (
    <LearningModuleEnhanced
      module={module}
      onComplete={handleComplete}
      onBack={handleBack}
      userProgress={userProgress}
      woundContext={woundContext}
    />
  );
};

export default LearningModuleRenderer;
