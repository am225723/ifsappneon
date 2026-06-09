import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Check, ChevronRight, Heart, Sparkles, Wind, Sun, Moon, RefreshCw, Headphones } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import TranscriptPanel from '../components/TranscriptPanel';
import { guidedPracticeMediaByPracticeId } from '../lib/guidedPracticeMediaMap';
import { loadActiveMeditationMedia, mergeMeditationMediaWithLibrary } from '../lib/meditationMedia';

const baseMicroExercises = [
  {
    id: 'breath-anchor',
    title: 'Breath Anchor',
    duration: '2 min',
    category: 'grounding',
    icon: Wind,
    description: 'Quick grounding through conscious breathing',
    steps: [
      { text: 'Close your eyes and take a slow, deep breath in through your nose', duration: 5 },
      { text: 'Hold gently at the top of the breath', duration: 3 },
      { text: 'Release slowly through your mouth, letting tension melt away', duration: 5 },
      { text: 'Notice the pause between breaths - this is where peace lives', duration: 4 },
      { text: 'Repeat this cycle, each breath bringing you more present', duration: 15 },
      { text: 'Place a hand on your heart. Feel your Self here, steady and calm', duration: 8 }
    ]
  },
  {
    id: 'self-compassion-pause',
    title: 'Self-Compassion Pause',
    duration: '2 min',
    category: 'healing',
    icon: Heart,
    description: 'Brief moment of kindness toward yourself',
    steps: [
      { text: 'Acknowledge: "This is a moment of difficulty"', duration: 8 },
      { text: 'Remember: "Difficulty is part of being human. I am not alone."', duration: 8 },
      { text: 'Place your hand on your heart and feel its warmth', duration: 6 },
      { text: 'Offer yourself kindness: "May I be gentle with myself"', duration: 8 },
      { text: '"May I give myself the compassion I need"', duration: 8 },
      { text: 'Rest in this feeling of self-kindness for a moment', duration: 10 }
    ]
  },
  {
    id: 'quick-parts-check-in',
    title: 'Quick Parts Check-In',
    duration: '2 min',
    category: 'awareness',
    icon: Sparkles,
    description: 'Brief internal family system scan',
    steps: [
      { text: 'Pause and turn your attention inward', duration: 5 },
      { text: 'Ask yourself: "Who is present right now?"', duration: 8 },
      { text: 'Notice any feelings, sensations, or thoughts arising', duration: 10 },
      { text: 'Acknowledge each part you notice: "I see you"', duration: 8 },
      { text: 'From Self, offer curiosity: "What do you need right now?"', duration: 10 },
      { text: 'Thank your parts for showing up. They are trying to help.', duration: 7 }
    ]
  },
  {
    id: 'morning-intention',
    title: 'Morning Intention',
    duration: '2 min',
    category: 'daily',
    icon: Sun,
    description: 'Set a healing intention for your day',
    steps: [
      { text: 'Take three slow, intentional breaths to arrive in this moment', duration: 10 },
      { text: 'Connect with your Self - that calm, curious center within', duration: 8 },
      { text: 'Ask: "What quality do I want to bring to today?"', duration: 8 },
      { text: 'Perhaps compassion, patience, courage, or gentleness...', duration: 6 },
      { text: 'Visualize yourself moving through the day with this quality', duration: 10 },
      { text: 'Commit: "Today, I choose to lead with [your quality]"', duration: 6 }
    ]
  },
  {
    id: 'evening-release',
    title: 'Evening Release',
    duration: '2 min',
    category: 'daily',
    icon: Moon,
    description: 'Let go of the day before rest',
    steps: [
      { text: 'Settle into stillness. Let your body relax.', duration: 6 },
      { text: 'Reflect: What challenged me today?', duration: 8 },
      { text: 'Acknowledge any parts that worked hard to protect you', duration: 8 },
      { text: 'Say: "Thank you for trying to help. You can rest now."', duration: 8 },
      { text: 'Release expectations about tomorrow. This day is complete.', duration: 8 },
      { text: 'Rest in the knowing that you did your best today.', duration: 10 }
    ]
  },
  {
    id: 'mini-body-scan',
    title: 'Mini Body Scan',
    duration: '2 min',
    category: 'grounding',
    icon: RefreshCw,
    description: 'Quick scan for stored emotions',
    steps: [
      { text: 'Bring awareness to the top of your head', duration: 5 },
      { text: 'Scan down through your face, jaw, neck - release tension', duration: 8 },
      { text: 'Notice your shoulders, arms, hands. Let them soften.', duration: 8 },
      { text: 'Scan through chest and heart. What emotions live here?', duration: 10 },
      { text: 'Continue through belly, hips, legs, feet', duration: 10 },
      { text: 'Feel your whole body held by the ground beneath you', duration: 7 }
    ]
  }
];

const microExercises = baseMicroExercises.map((exercise) => ({
  ...exercise,
  ...(guidedPracticeMediaByPracticeId[exercise.id] || {})
}));

export default function MicroLearning() {
  const { theme, getAnimationClass } = useTheme();
  const { awardXP } = useData();
  const [activeExercise, setActiveExercise] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timer, setTimer] = useState(0);
  const [completedToday, setCompletedToday] = useState([]);
  const [exercises, setExercises] = useState(microExercises);

  useEffect(() => {
    const loadCompleted = async () => {
      const client = clientAuth.getCurrentClient();
      const clientId = client?.id;
      if (!clientId) return;
      try {
        const data = await supabaseHelpers.getExerciseProgress(clientId);
        const today = new Date().toDateString();
        const todayCompleted = (data || [])
          .filter(ep => ep.exercise_id?.startsWith('micro-') && ep.completed && ep.data?.completedAt && new Date(ep.data.completedAt).toDateString() === today)
          .map(ep => ep.exercise_id.replace('micro-', ''));
        setCompletedToday(todayCompleted);
      } catch { /* ignore */ }
    };
    loadCompleted();
  }, []);

  useEffect(() => {
    let mounted = true;
    loadActiveMeditationMedia().then(({ data }) => {
      if (!mounted || !Array.isArray(data)) return;
      setExercises(mergeMeditationMediaWithLibrary(microExercises, data));
    });
    return () => { mounted = false; };
  }, []);

  const startExercise = (exercise) => {
    setActiveExercise(exercise);
    setCurrentStep(0);
    setTimer(0);
    setIsPlaying(true);
  };

  async function completeExercise() {
    setIsPlaying(false);
    if (activeExercise && !completedToday.includes(activeExercise.id)) {
      const newCompleted = [...completedToday, activeExercise.id];
      setCompletedToday(newCompleted);
      const client = clientAuth.getCurrentClient();
      const clientId = client?.id;
      if (clientId) {
        await supabaseHelpers.saveExerciseProgress(clientId, `micro-${activeExercise.id}`, {
          completed: true,
          completionTime: new Date().toISOString(),
          data: { completedAt: new Date().toISOString() }
        });
      }
      if (awardXP) awardXP('exercise_complete', 30);
    }
  }
  useEffect(() => {
    if (isPlaying && activeExercise) {
      const step = activeExercise.steps[currentStep];
      if (timer < step.duration) {
        const interval = setInterval(() => setTimer(t => t + 1), 1000);
        return () => clearInterval(interval);
      } else {
        if (currentStep < activeExercise.steps.length - 1) {
          queueMicrotask(() => {
            setCurrentStep(s => s + 1);
            setTimer(0);
          });
        } else {
          completeExercise();
        }
      }
    }
  // Existing timer loop intentionally depends on the current active exercise state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, timer, currentStep, activeExercise]);


  const closeExercise = () => {
    setActiveExercise(null);
    setIsPlaying(false);
    setCurrentStep(0);
    setTimer(0);
  };

  const categories = [...new Set(exercises.map(e => e.category))];

  return (
    <div className={`min-h-screen ${theme.isDark ? 'text-slate-100' : ''}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          to="/" 
          className={`inline-flex items-center gap-2 ${theme.isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} mb-6 ${getAnimationClass('transition')}`}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${theme.isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            Micro-Learning
          </h1>
          <p className={theme.isDark ? 'text-slate-300' : 'text-gray-600'}>
            2-minute healing exercises for your busy life. Complete one daily for consistent growth.
          </p>
        </div>

        <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6 mb-8`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>Today's Progress</h3>
              <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {completedToday.length} of {exercises.length} exercises completed
              </p>
            </div>
            <div className="flex gap-1">
              {exercises.map(ex => (
                <div 
                  key={ex.id}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    completedToday.includes(ex.id) 
                      ? 'text-white' 
                      : theme.isDark ? 'bg-slate-700' : 'bg-gray-100'
                  }`}
                  style={{ backgroundColor: completedToday.includes(ex.id) ? theme.accentColor : undefined }}
                >
                  {completedToday.includes(ex.id) && <Check className="w-4 h-4" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {categories.map(category => (
          <div key={category} className="mb-8">
            <h3 className={`text-lg font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'} mb-4 capitalize`}>
              {category}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {exercises.filter(e => e.category === category).map(exercise => {
                const Icon = exercise.icon;
                const isCompleted = completedToday.includes(exercise.id);
                
                return (
                  <button
                    key={exercise.id}
                    onClick={() => startExercise(exercise)}
                    className={`${theme.cardBg} backdrop-blur-sm rounded-xl shadow-sm border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-4 text-left ${getAnimationClass('transition')} ${getAnimationClass('hover')}`}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className={`p-3 rounded-xl ${isCompleted ? 'text-white' : ''}`}
                        style={{ backgroundColor: isCompleted ? theme.accentColor : (theme.isDark ? '#334155' : '#F3F4F6') }}
                      >
                        <Icon className={`w-6 h-6 ${isCompleted ? '' : theme.isDark ? 'text-slate-300' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>{exercise.title}</h4>
                          {isCompleted && <Check className="w-4 h-4 text-green-500" />}
                        </div>
                        <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'} mb-2`}>
                          {exercise.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="w-3 h-3" />
                          <span className={theme.isDark ? 'text-slate-400' : 'text-gray-500'}>{exercise.duration}</span>
                          <span className={theme.isDark ? 'text-slate-500' : 'text-gray-400'}>{exercise.mp3Filename}</span>
                          {exercise.audioUrl && <span className="inline-flex items-center gap-1 text-emerald-600"><Headphones className="h-3 w-3" /> Audio</span>}
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {activeExercise && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={`${theme.cardBg} rounded-3xl shadow-2xl max-w-2xl max-h-[90vh] overflow-y-auto w-full p-8 ${theme.isDark ? 'text-white' : ''}`}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">{activeExercise.title}</h2>
              <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Step {currentStep + 1} of {activeExercise.steps.length}
              </p>
            </div>

            <div className="mb-8">
              <div className="w-full h-2 bg-gray-200 rounded-full mb-6">
                <div 
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${(timer / activeExercise.steps[currentStep].duration) * 100}%`,
                    backgroundColor: theme.accentColor
                  }}
                />
              </div>

              <p className={`text-xl text-center leading-relaxed ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                {activeExercise.steps[currentStep].text}
              </p>
            </div>

            {activeExercise.audioUrl ? (
              <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-gray-900">
                <p className="mb-2 text-sm font-semibold text-emerald-800">Optional audio guidance</p>
                <audio src={activeExercise.audioUrl} controls className="w-full" />
              </div>
            ) : (
              <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Audio is optional and has not been mapped yet. Continue with the written steps and transcript.</p>
            )}

            <TranscriptPanel transcriptPath={activeExercise.transcriptPath} className="mb-6 text-left" />

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-6 py-3 rounded-xl text-white font-medium"
                style={{ backgroundColor: theme.accentColor }}
              >
                {isPlaying ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={closeExercise}
                className={`px-6 py-3 rounded-xl font-medium ${theme.isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
