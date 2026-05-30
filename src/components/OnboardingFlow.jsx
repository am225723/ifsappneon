import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, Shield, Users, Sparkles, ArrowRight,
  Brain, CheckCircle2, Star, Circle, RefreshCw, Eye, AlertTriangle
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

const REQUIRED_ASSESSMENTS = [
  {
    id: 'wounds',
    moduleId: 'assessment_wounds',
    title: 'IFS Wound Assessment',
    description: 'Identify your core inner child wounds — abandonment, shame, neglect, betrayal, or helplessness',
    duration: '5-10 min',
    icon: Heart,
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    id: 'self-energy',
    moduleId: 'assessment_self-energy',
    title: 'Self-Energy Assessment (6 C\'s)',
    description: 'Measure your connection to the 8 qualities of Self — Calmness, Curiosity, Compassion, Confidence, Courage, Clarity, Creativity, and Connectedness',
    duration: '3-5 min',
    icon: Sparkles,
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'parts',
    moduleId: 'assessment_parts',
    title: 'Protective Parts Assessment',
    description: 'Discover which inner protector parts are most active — managers, firefighters, and exiles',
    duration: '3-5 min',
    icon: Users,
    gradient: 'from-purple-500 to-indigo-600',
  },
];

export default function OnboardingFlow({ onComplete, clientName, clientId }) {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(true);
  const [completedAssessments, setCompletedAssessments] = useState({});
  const [loading, setLoading] = useState(true);
  const [checkingReturn, setCheckingReturn] = useState(false);

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-slate-800/80' : 'bg-white/90';
  const cardBorder = isDark ? 'border-slate-700/50' : 'border-gray-200/50';
  const featureBg = isDark ? 'bg-slate-700/50' : 'bg-gray-50';

  const checkCompletedAssessments = useCallback(async () => {
    if (!clientId) return;
    try {
      const { data } = await supabase
        .from('ifs_interactive_data')
        .select('module_id')
        .eq('client_id', clientId)
        .in('module_id', REQUIRED_ASSESSMENTS.map(a => a.moduleId));

      const completed = {};
      (data || []).forEach(row => {
        completed[row.module_id] = true;
      });
      setCompletedAssessments(completed);

      const allDone = REQUIRED_ASSESSMENTS.every(a => completed[a.moduleId]);
      if (allDone) {
        if (clientId) {
          localStorage.setItem(`onboarding_completed_${clientId}`, 'true');
        }
        onComplete();
      }
    } catch (err) {
      console.error('Error checking assessments:', err);
    }
    setLoading(false);
  }, [clientId, onComplete]);

  useEffect(() => {
    checkCompletedAssessments();
  }, [checkCompletedAssessments]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCheckingReturn(true);
      checkCompletedAssessments().then(() => setCheckingReturn(false));
    }, 3000);
    return () => clearInterval(interval);
  }, [checkCompletedAssessments]);

  useEffect(() => {
    const welcomeSeen = localStorage.getItem(`onboarding_welcome_${clientId}`);
    if (welcomeSeen) {
      setShowWelcome(false);
    }
  }, [clientId]);

  const handleStartAssessments = () => {
    if (clientId) {
      localStorage.setItem(`onboarding_welcome_${clientId}`, 'true');
    }
    setShowWelcome(false);
  };

  const handleStartAssessment = (assessmentId) => {
    navigate(`/assessments?start=${assessmentId}`);
  };

  const completedCount = REQUIRED_ASSESSMENTS.filter(a => completedAssessments[a.moduleId]).length;
  const totalCount = REQUIRED_ASSESSMENTS.length;
  const progressPercent = (completedCount / totalCount) * 100;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${isDark ? 'from-slate-900 via-slate-800 to-slate-900' : 'from-amber-50 via-white to-emerald-50'}`}>
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (showWelcome) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br ${isDark ? 'from-slate-900 via-slate-800 to-slate-900' : 'from-amber-50 via-white to-emerald-50'}`}>
        <div className="w-full max-w-lg">
          <div className={`${cardBg} backdrop-blur-lg rounded-3xl border ${cardBorder} shadow-xl overflow-hidden`}>
            <div className="bg-gradient-to-r from-amber-500 to-emerald-500 p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Welcome to Your Healing Journey</h2>
              <p className="text-white/80 text-sm">You've taken a brave first step</p>
            </div>

            <div className="p-6">
              {clientName && (
                <p className={`text-center text-lg font-medium ${textPrimary} mb-4`}>
                  Hi {clientName}, welcome!
                </p>
              )}

              <p className={`${textSecondary} leading-relaxed mb-4`}>
                Before you begin exploring, we need to personalize your experience. You'll complete three short assessments that help us understand your unique inner world.
              </p>

              <div className={`${featureBg} rounded-xl p-4 border ${cardBorder} mb-5`}>
                <p className={`text-sm font-medium ${textPrimary} mb-3`}>Your 3 Getting-Started Assessments:</p>
                <div className="space-y-2.5">
                  {REQUIRED_ASSESSMENTS.map((a) => {
                    const AIcon = a.icon;
                    return (
                      <div key={a.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.gradient} flex items-center justify-center flex-shrink-0`}>
                          <AIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${textPrimary}`}>{a.title}</p>
                          <p className={`text-xs ${textMuted}`}>{a.duration}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${featureBg} rounded-xl p-4 border ${cardBorder} mb-5`}>
                <p className={`text-sm ${textMuted} italic flex items-start gap-2`}>
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                  There are no right or wrong answers — just honest reflection. Total time: about 15 minutes.
                </p>
              </div>

              <button
                onClick={handleStartAssessments}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-white font-semibold text-sm hover:from-amber-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Sparkles className="w-5 h-5" />
                Let's Begin
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br ${isDark ? 'from-slate-900 via-slate-800 to-slate-900' : 'from-amber-50 via-white to-emerald-50'}`}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className={`text-xl font-bold ${textPrimary} mb-1`}>Complete Your Assessments</h1>
          <p className={`text-sm ${textMuted}`}>{completedCount} of {totalCount} completed</p>
        </div>

        <div className="mb-6">
          <div className={`h-2.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'} overflow-hidden`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {REQUIRED_ASSESSMENTS.map((assessment, index) => {
            const AIcon = assessment.icon;
            const isCompleted = completedAssessments[assessment.moduleId];
            const previousCompleted = index === 0 || completedAssessments[REQUIRED_ASSESSMENTS[index - 1].moduleId];
            const isNext = !isCompleted && previousCompleted;

            return (
              <div
                key={assessment.id}
                className={`${cardBg} backdrop-blur-lg rounded-2xl border ${cardBorder} shadow-lg overflow-hidden transition-all duration-300 ${
                  isCompleted ? 'opacity-80' : isNext ? 'ring-2 ring-amber-500/50' : 'opacity-60'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${assessment.gradient} flex items-center justify-center ${isCompleted ? '' : isNext ? '' : 'grayscale opacity-50'}`}>
                        <AIcon className="w-6 h-6 text-white" />
                      </div>
                      {isCompleted && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${textPrimary}`}>{assessment.title}</h3>
                      </div>
                      <p className={`text-xs ${textMuted} mb-2 leading-relaxed`}>{assessment.description}</p>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${textMuted}`}>{assessment.duration}</span>
                        {isCompleted && (
                          <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Complete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isNext && (
                    <button
                      onClick={() => handleStartAssessment(assessment.id)}
                      className={`mt-4 w-full py-3 rounded-xl bg-gradient-to-r ${assessment.gradient} text-white font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md`}
                    >
                      {completedCount === 0 ? 'Start' : 'Continue'} Assessment
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {!isCompleted && !isNext && (
                    <div className={`mt-4 w-full py-3 rounded-xl border ${cardBorder} text-center`}>
                      <span className={`text-xs ${textMuted}`}>Complete the previous assessment first</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {checkingReturn && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
            <span className={`text-xs ${textMuted}`}>Checking progress...</span>
          </div>
        )}

        <div className={`mt-6 ${featureBg} rounded-xl p-4 border ${cardBorder}`}>
          <p className={`text-xs ${textMuted} italic text-center`}>
            These assessments personalize your entire healing journey — curriculum, exercises, and recommendations are all tailored to your results.
          </p>
        </div>
      </div>
    </div>
  );
}
