import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  Heart, 
  Target,
  Lightbulb,
  Award,
  Pause,
  Play,
  RotateCcw,
  Save,
  Share,
  Download,
  User,
  MapPin,
  Brain,
  Activity,
  TrendingUp,
  Star,
  Eye,
  Layers,
  Timer,
  Shield,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Pen,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Send,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lock,
  Volume2
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { progressTracker } from '../lib/supabasePersonalization';
import { generatePersonalizedLesson } from '../lib/dynamicLessonContent';
import { generatePersonalizedActivity } from '../lib/dynamicActivityContent';
import { syncAssignedHomeworkCompletion } from '../lib/assignedHomework';

const VoiceRecorder = ({ onRecordingComplete, label }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        stream.getTracks().forEach(t => t.stop());
        if (onRecordingComplete) onRecordingComplete(blob, url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Please allow microphone access to record your response.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const deleteRecording = () => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL(null);
    setRecordingTime(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatRecTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="bg-gradient-to-r from-red-50 to-emerald-50 rounded-xl p-4 border border-red-200">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-red-500" />
        <span className="text-sm font-medium text-gray-700">{label || 'Voice Recording'}</span>
      </div>
      {!audioURL ? (
        <div className="flex items-center gap-3">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isRecording
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            {isRecording ? (
              <><Pause className="w-4 h-4" /><span>Stop ({formatRecTime(recordingTime)})</span></>
            ) : (
              <><Play className="w-4 h-4" /><span>Record Response</span></>
            )}
          </button>
          {isRecording && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-600">Recording...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <audio src={audioURL} controls className="flex-1 h-10" />
          <button
            onClick={deleteRecording}
            className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
            title="Delete recording"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const CURRICULUM_AUDIO_MAP = {
  'activity-cultivate-self': '/audio/curriculum/cultivating-self-energy.mp3',
  'activity-self-leadership-mastery': '/audio/curriculum/self-leadership-mastery.mp3',
  'activity-inner-child-visualization': '/audio/curriculum/safe-place-visualization.mp3',
  'activity-reparenting-dialogue': '/audio/curriculum/reparenting-practice.mp3',
  'activity-body-connection': '/audio/curriculum/body-inner-child-connection.mp3',
  'activity-somatic-practice': '/audio/curriculum/somatic-healing-practice.mp3',
};

const LearningModuleEnhanced = ({ module, onComplete, onBack, userProgress = {}, woundContext = null }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [activityResponses, setActivityResponses] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [interactiveData, setInteractiveData] = useState({});
  const [meditationActive, setMeditationActive] = useState(false);
  const [meditationTimer, setMeditationTimer] = useState(0);
  const [meditationStepIndex, setMeditationStepIndex] = useState(0);
  const [meditationStepTimer, setMeditationStepTimer] = useState(0);
  const [meditationCompleted, setMeditationCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [incompleteItems, setIncompleteItems] = useState([]);
  const [currAudioPlaying, setCurrAudioPlaying] = useState(false);
  const [currAudioReady, setCurrAudioReady] = useState(false);
  const [currAudioError, setCurrAudioError] = useState(false);
  const [currAudioProgress, setCurrAudioProgress] = useState(0);
  const [currAudioDuration, setCurrAudioDuration] = useState(0);
  const currAudioRef = useRef(null);
  const currAudioHandlersRef = useRef(null);
  
  const { 
    userId, 
    saveModuleProgress, 
    getModuleProgress, 
    saveInteractiveData, 
    getInteractiveData,
    saveModuleAnswers,
    awardXP
  } = useData();

  const steps = module.steps || [];
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const migrateResponseKeys = (responses, moduleSteps) => {
    if (!responses || Object.keys(responses).length === 0) return responses;
    const hasStepPrefix = Object.keys(responses).some(k => /^s\d+-/.test(k));
    if (hasStepPrefix) return responses;

    const migrated = {};
    const stepsByType = {};
    moduleSteps.forEach((step, idx) => {
      const t = step.type || 'unknown';
      if (!stepsByType[t]) stepsByType[t] = [];
      stepsByType[t].push(idx);
    });

    const learnSteps = stepsByType['learn'] || [];
    const activitySteps = stepsByType['activity'] || [];

    Object.entries(responses).forEach(([key, val]) => {
      if (key.startsWith('reflection-')) {
        const targetStep = learnSteps[0] ?? 0;
        migrated[`s${targetStep}-${key}`] = val;
      } else if (key.startsWith('question-')) {
        const targetStep = activitySteps[0] ?? 0;
        migrated[`s${targetStep}-${key}`] = val;
      } else if (key.startsWith('wound-reflection-')) {
        const targetStep = activitySteps[0] ?? 0;
        migrated[`s${targetStep}-${key}`] = val;
      } else if (key.startsWith('secondary-wound-reflection-')) {
        const targetStep = learnSteps[0] ?? 0;
        migrated[`s${targetStep}-${key}`] = val;
      } else {
        migrated[key] = val;
      }
    });
    return migrated;
  };

  useEffect(() => {
    const loadProgress = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const progress = await getModuleProgress(module.id);
        const interactiveDataSaved = await getInteractiveData(module.id);
        
        if (progress) {
          setCurrentStepIndex(progress.current_step || 0);
          const migrated = migrateResponseKeys(progress.responses || {}, steps);
          setActivityResponses(migrated);
          setCompletedSteps(progress.completed_steps || []);
          setIsCompleted(progress.completed || progress.is_completed || false);
        }
        
        if (interactiveDataSaved) {
          setInteractiveData(interactiveDataSaved);
        }
      } catch (error) {
        console.error('Error loading progress:', error);
        if (userProgress[module.id]) {
          const savedStep = userProgress[module.id].currentStep || 0;
          const savedResponses = migrateResponseKeys(userProgress[module.id].responses || {}, steps);
          const savedCompletedSteps = userProgress[module.id].completedSteps || [];
          
          setCurrentStepIndex(savedStep);
          setActivityResponses(savedResponses);
          setCompletedSteps(savedCompletedSteps);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadProgress();
  }, [module.id, userProgress, userId, getModuleProgress, getInteractiveData]);

  // Save progress
  const saveProgress = async () => {
    if (!userId) return;
    
    const progress = {
      current_step: currentStepIndex,
      responses: activityResponses,
      completed_steps: completedSteps,
      is_completed: isCompleted,
      lastAccessed: new Date().toISOString()
    };
    
    try {
      await saveModuleProgress(module.id, progress);
      await saveInteractiveData(module.id, interactiveData);

      if (activityResponses && Object.keys(activityResponses).length > 0) {
        const stepId = currentStep?.data?.id || `step-${currentStepIndex}`;
        try {
          await saveModuleAnswers(module.id, stepId, activityResponses);
        } catch (e) {
          // non-critical
        }
      }
      
      if (typeof window !== 'undefined' && window.onModuleProgress) {
        window.onModuleProgress(module.id, progress);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const destroyCurrAudio = useCallback(() => {
    if (currAudioRef.current) {
      currAudioRef.current.pause();
      if (currAudioHandlersRef.current) {
        const h = currAudioHandlersRef.current;
        currAudioRef.current.removeEventListener('loadedmetadata', h.onMeta);
        currAudioRef.current.removeEventListener('canplaythrough', h.onReady);
        currAudioRef.current.removeEventListener('timeupdate', h.onTime);
        currAudioRef.current.removeEventListener('ended', h.onEnd);
        currAudioRef.current.removeEventListener('error', h.onError);
      }
      currAudioRef.current.src = '';
      currAudioRef.current.load();
      currAudioRef.current = null;
      currAudioHandlersRef.current = null;
    }
    setCurrAudioPlaying(false);
    setCurrAudioReady(false);
    setCurrAudioError(false);
    setCurrAudioProgress(0);
    setCurrAudioDuration(0);
  }, []);

  useEffect(() => {
    return destroyCurrAudio;
  }, [destroyCurrAudio]);

  useEffect(() => {
    destroyCurrAudio();
  }, [currentStepIndex, destroyCurrAudio]);

  // Auto-save progress
  useEffect(() => {
    const timer = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timer);
  }, [currentStepIndex, activityResponses, completedSteps, interactiveData]);

  useEffect(() => {
    let interval;
    if (meditationActive) {
      interval = setInterval(() => {
        setMeditationTimer(prev => prev + 1);
        setMeditationStepTimer(prev => {
          const currentActivityData = currentStep?.data;
          const meditationSteps = currentActivityData?.guidedSteps || [];
          if (meditationSteps.length === 0) return prev;
          const currentMedText = meditationSteps[meditationStepIndex];
          if (!currentMedText) return prev;
          const pauseMatch = currentMedText.match(/\[(?:Pause|Allow)\s+(?:for\s+)?(\d+)\s+seconds?(?:\s+of\s+silence)?\]/i);
          const stepDuration = pauseMatch ? parseInt(pauseMatch[1]) : 20;
          const next = prev + 1;
          if (next >= stepDuration) {
            if (meditationStepIndex < meditationSteps.length - 1) {
              setMeditationStepIndex(i => i + 1);
              return 0;
            } else {
              setMeditationActive(false);
              setMeditationCompleted(true);
              return prev;
            }
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [meditationActive, meditationStepIndex, currentStep]);

  // Handle step completion
  const completeStep = () => {
    if (!completedSteps.includes(currentStepIndex)) {
      const newCompleted = [...completedSteps, currentStepIndex];
      setCompletedSteps(newCompleted);
    }
  };

  // Handle activity response
  const handleActivityResponse = (questionId, response) => {
    setActivityResponses(prev => ({
      ...prev,
      [questionId]: response
    }));
  };

  // Handle interactive data changes
  const handleInteractiveChange = (elementId, value) => {
    setInteractiveData(prev => ({
      ...prev,
      [elementId]: value
    }));
  };

  const getStepRequirements = useCallback((step, stepIdx) => {
    if (!step) return [];
    const missing = [];
    const data = step.data;
    const woundPersonalization = module?.woundPersonalization?.[woundContext?.primary];
    const isSixFs = data.id?.includes('six-fs');
    const prefix = `s${stepIdx}-`;

    if (step.type === 'learn') {
      const prompts = (isSixFs && woundPersonalization?.reflectionPrompts)
        ? woundPersonalization.reflectionPrompts
        : data.reflectionPrompts;
      if (prompts) {
        prompts.forEach((prompt, index) => {
          const val = activityResponses[`${prefix}reflection-${index}`];
          if (!val || val.trim().length === 0) {
            missing.push(`Reflection question ${index + 1}`);
          }
        });
      }
    }

    if (step.type === 'activity') {
      const woundPersVal = module?.woundPersonalization?.[woundContext?.primary];
      const dynActivity = generatePersonalizedActivity(data.id, woundContext, woundPersVal);
      const activeQuestions = dynActivity?.questions || data.questions;
      if (activeQuestions) {
        activeQuestions.forEach((q, index) => {
          const val = activityResponses[`${prefix}question-${index}`];
          if (!val || val.trim().length === 0) {
            missing.push(`Question ${index + 1}`);
          }
        });
      }
      if (isSixFs && woundPersonalization?.reflectionPrompts) {
        woundPersonalization.reflectionPrompts.forEach((prompt, index) => {
          const val = activityResponses[`${prefix}wound-reflection-${index}`];
          if (!val || val.trim().length === 0) {
            missing.push(`Wound reflection ${index + 1}`);
          }
        });
      }
    }

    return missing;
  }, [activityResponses, module, woundContext]);

  const isCurrentStepComplete = useCallback(() => {
    if (!currentStep) return true;
    if (currentStep.type === 'result') return true;
    return getStepRequirements(currentStep, currentStepIndex).length === 0;
  }, [currentStep, currentStepIndex, getStepRequirements]);

  // Navigate to next step
  const nextStep = () => {
    const missing = getStepRequirements(currentStep, currentStepIndex);
    if (missing.length > 0) {
      setIncompleteItems(missing);
      setShowIncompleteWarning(true);
      setTimeout(() => setShowIncompleteWarning(false), 5000);
      return;
    }
    setShowIncompleteWarning(false);
    setIncompleteItems([]);
    completeStep();
    if (isLastStep) {
      completeModule();
    } else {
      setCurrentStepIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const previousStep = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Complete module
  const completeModule = async () => {
    setIsCompleted(true);
    completeStep();
    
    await saveModuleProgress(module.id, {
      current_step: steps.length - 1,
      responses: activityResponses,
      completed_steps: [...completedSteps, currentStepIndex],
      is_completed: true,
      completedAt: new Date().toISOString()
    });
    await syncAssignedHomeworkCompletion(userId, module.id);
    
    if (awardXP) awardXP('module_complete', 100);
    
    if (onComplete) {
      onComplete(module);
    }
  };

  // Reset module
  const resetModule = async () => {
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setActivityResponses({});
    setInteractiveData({});
    setIsCompleted(false);
    setShowCertificate(false);
    setMeditationActive(false);
    setMeditationTimer(0);
    
    if (userId) {
      try {
        // Clear from Supabase by resetting progress to empty
        await saveModuleProgress(module.id, {
          current_step: 0,
          responses: {},
          completed_steps: [],
          is_completed: false
        });
        await saveInteractiveData(module.id, {});
      } catch (error) {
        console.error('Error resetting module:', error);
      }
    }
    
  };

  // Format meditation time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const typeColors = { manager: 'bg-blue-100 text-blue-800 border-blue-200', firefighter: 'bg-amber-100 text-amber-800 border-amber-200', exile: 'bg-rose-100 text-rose-800 border-rose-200' };
  const typeLabels = { manager: 'Manager', firefighter: 'Firefighter', exile: 'Exile' };

  const renderActivePartsPanel = () => {
    if (!woundContext?.activeParts?.length) return null;
    return (
      <div className="bg-gradient-to-r from-stone-50 to-amber-50 rounded-lg p-4 border border-stone-200">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-stone-600" />
          <p className="text-sm font-semibold text-gray-900">Your Active Parts in This Work</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {woundContext.activeParts.map((part, i) => (
            <div key={i} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border ${typeColors[part.type] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
              <span className="font-semibold">{part.name}</span>
              <span className="opacity-60">({typeLabels[part.type] || part.type})</span>
              {part.intensity === 'Very Active' && <span className="text-red-500 font-bold">!</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">These parts may activate during this module. Notice them with curiosity, not judgment.</p>
      </div>
    );
  };

  const renderDualWoundPanel = () => {
    if (module?.id !== 'module-6-inner-child-healing') return null;
    if (!woundContext?.secondary || !module?.woundPersonalization?.[woundContext.secondary]) return null;
    const secondaryWP = module.woundPersonalization[woundContext.secondary];
    const secondaryConfig = woundContext.secondaryConfig;
    return (
      <div className="bg-gradient-to-r from-stone-50 to-amber-50 rounded-xl p-5 border-2 border-stone-200">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-amber-600" />
          <p className="font-semibold text-gray-900">Your Secondary Wound: {secondaryWP.childName}</p>
          {secondaryConfig && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${secondaryConfig.darkBg} ${secondaryConfig.textColor}`}>
              {woundContext.secondary}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700 leading-relaxed mb-3">{secondaryWP.moduleIntro}</p>
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-amber-700 hover:text-amber-800">
            View {secondaryWP.childName} unburdening steps
          </summary>
          <div className="mt-3 space-y-2">
            {secondaryWP.guidedSteps?.map((step, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-white/80 rounded-lg">
                <span className="w-6 h-6 bg-stone-200 rounded-full flex items-center justify-center text-xs font-bold text-stone-600 flex-shrink-0">{i + 1}</span>
                <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          {secondaryWP.reflectionPrompts && (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-medium text-amber-700">{secondaryWP.childName} Reflections:</p>
              {secondaryWP.reflectionPrompts.map((prompt, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-sm text-gray-700 italic">Q{i + 1}. {prompt}</p>
                  <textarea
                    value={activityResponses[`s${currentStepIndex}-secondary-wound-reflection-${i}`] || ''}
                    onChange={(e) => handleActivityResponse(`s${currentStepIndex}-secondary-wound-reflection-${i}`, e.target.value)}
                    placeholder={`Reflect on your ${secondaryWP.childName}...`}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white/80"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          )}
        </details>
      </div>
    );
  };

  // Render Learn section
  const renderLearnSection = (step) => {
    const data = step.data;
    const woundPersonalization = module?.woundPersonalization?.[woundContext?.primary];
    const isSixFsLearn = data.id?.includes('six-fs');
    
    const dynamicLesson = generatePersonalizedLesson(module?.id, woundContext, woundPersonalization);

    const woundColor = woundContext?.config;
    const partTypeBadge = (type) => {
      const colors = { manager: 'bg-blue-100 text-blue-800', firefighter: 'bg-amber-100 text-amber-800', exile: 'bg-rose-100 text-rose-800' };
      const labels = { manager: 'Manager', firefighter: 'Firefighter', exile: 'Exile' };
      return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors[type] || 'bg-gray-100 text-gray-700'}`}>{labels[type] || type}</span>;
    };

    const renderPartsList = (section, borderColor) => {
      if (!section) return null;
      return (
        <div className={`rounded-xl p-5 bg-white border-l-4 ${borderColor} shadow-sm`}>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{section.title}</h3>
          <p className="text-sm text-gray-600 mb-4">{section.intro}</p>
          <div className="space-y-3">
            {section.parts.map((part, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 mt-0.5">{partTypeBadge(part.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{part.name}</span>
                    <span className="text-xs text-gray-400">({part.score.toFixed(1)})</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${part.score >= 5 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {part.intensity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{part.strategy || part.connection}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    const renderSelfEnergySection = (seSection) => {
      if (!seSection) return null;
      return (
        <div className="rounded-xl p-5 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{seSection.title}</h3>
          <div className="space-y-3">
            {seSection.sections.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${s.type === 'strengths' ? 'bg-emerald-500' : s.type === 'developing' ? 'bg-amber-400' : 'bg-violet-400'}`} />
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${s.type === 'strengths' ? 'text-emerald-700' : s.type === 'developing' ? 'text-amber-700' : 'text-violet-700'}`}>
                    {s.label}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed mt-0.5">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${dynamicLesson && woundColor ? `bg-gradient-to-r ${woundColor.gradient}` : 'bg-gradient-to-r from-blue-500 to-amber-500'}`}>
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{dynamicLesson ? dynamicLesson.sectionTitle : data.title}</h2>
            {dynamicLesson && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                Personalized for your {dynamicLesson.childName}
              </p>
            )}
            {!dynamicLesson && <p className="text-gray-600">Educational Content</p>}
          </div>
        </div>

        {dynamicLesson ? (
          <>
            <div className={`rounded-xl p-5 border-l-4 bg-gradient-to-r from-stone-50 to-white ${
              woundColor?.color === 'blue' ? 'border-l-blue-400' :
              woundColor?.color === 'purple' ? 'border-l-purple-400' :
              woundColor?.color === 'amber' ? 'border-l-amber-400' :
              woundColor?.color === 'red' ? 'border-l-red-400' :
              woundColor?.color === 'green' ? 'border-l-green-400' : 'border-l-amber-400'
            }`}>
              <p className="text-lg text-gray-800 leading-relaxed">{dynamicLesson.intro}</p>
            </div>

            {renderPartsList(dynamicLesson.managerSection, 'border-l-blue-400')}
            {renderPartsList(dynamicLesson.firefighterSection, 'border-l-amber-400')}
            {renderPartsList(dynamicLesson.exileSection, 'border-l-rose-400')}
            {renderSelfEnergySection(dynamicLesson.selfEnergySection)}

            {dynamicLesson.closingMessages.length > 0 && (
              <div className="rounded-xl p-5 bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-3">The Path Forward: A Message to Your Parts</h3>
                <div className="space-y-3">
                  {dynamicLesson.closingMessages.map((msg, i) => (
                    <div key={i} className="pl-4 border-l-2 border-amber-300">
                      <p className="text-sm font-semibold text-gray-800 mb-0.5">To {msg.to}:</p>
                      <p className="text-sm text-gray-700 italic leading-relaxed">{msg.text}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mt-4 pt-3 border-t border-amber-200">
                  {dynamicLesson.closingNarrative}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {woundPersonalization && (
              <div className="bg-gradient-to-r from-amber-50 to-stone-50 rounded-xl p-5 border-2 border-amber-200 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  <p className="font-semibold text-gray-900">Personalized for Your {woundPersonalization.childName}</p>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">{woundPersonalization.moduleIntro}</p>
                {woundPersonalization.selfCsIntegration && (
                  <div className="p-3 bg-white/80 rounded-lg border border-amber-100">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">How the 8 C's of Self Support Your Practice</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{woundPersonalization.selfCsIntegration}</p>
                  </div>
                )}
              </div>
            )}

            {renderActivePartsPanel()}
            {renderDualWoundPanel()}

            <div className="prose max-w-none">
              {data.content.map((paragraph, index) => (
                <p key={index} className="text-lg text-gray-700 leading-relaxed mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          </>
        )}

        {data.bullets && data.bullets.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Points:</h3>
            <ul className="space-y-2">
              {data.bullets.map((bullet, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-gray-700">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.keyTakeaways && data.keyTakeaways.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-lg p-6 border border-amber-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Takeaways:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.keyTakeaways.map((takeaway, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">{takeaway}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.reflectionPrompts && data.reflectionPrompts.length > 0 && (
          <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isSixFsLearn && woundPersonalization ? `Reflection — Your ${woundPersonalization.childName}` : 'Reflection Prompts:'}
            </h3>
            <div className="space-y-5">
              {(isSixFsLearn && woundPersonalization?.reflectionPrompts ? woundPersonalization.reflectionPrompts : data.reflectionPrompts).map((prompt, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <span className="text-yellow-600 font-bold mt-1">Q{index + 1}.</span>
                    <p className="text-gray-700 italic">{prompt}</p>
                  </div>
                  <textarea
                    value={activityResponses[`s${currentStepIndex}-reflection-${index}`] || ''}
                    onChange={(e) => handleActivityResponse(`s${currentStepIndex}-reflection-${index}`, e.target.value)}
                    placeholder={isSixFsLearn && woundPersonalization ? `Reflect on your ${woundPersonalization.childName} experience...` : "Write your reflection here..."}
                    className="w-full px-4 py-3 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/80 text-gray-700"
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActivitySection = (step) => {
    const data = step.data;
    const woundPers = module?.woundPersonalization?.[woundContext?.primary];
    const isSixFsActivity = data.id?.includes('six-fs') || data.interactiveElements?.includes('six-fs-wizard');

    const dynamicActivity = generatePersonalizedActivity(data.id, woundContext, woundPers);

    const displayTitle = dynamicActivity?.title || (isSixFsActivity && woundPers ? `6 F's Protocol — ${woundPers.childName} Practice` : data.title);
    const displayPrompt = dynamicActivity?.prompt || (isSixFsActivity && woundPers
      ? `You will now practice the complete 6 F's protocol with your ${woundPers.childName}. Each step below is personalized for your ${woundContext?.primary} wound. The 8 C's of Self — Curiosity, Compassion, Calm, Clarity, Confidence, Courage, Creativity, and Connectedness — are woven into each step as your guiding inner resources. Take your time; depth is more important than speed.`
      : data.prompt);
    const displayQuestions = dynamicActivity?.questions || data.questions;
    const displayGuidedSteps = dynamicActivity?.guidedSteps || (isSixFsActivity && woundPers?.guidedSteps ? woundPers.guidedSteps : data.guidedSteps);
    const childName = dynamicActivity?.childName || woundPers?.childName || 'Inner Child';
    const isPersonalized = !!dynamicActivity;

    const woundColor = woundContext?.primary === 'shame' ? 'purple' :
      woundContext?.primary === 'abandonment' ? 'blue' :
      woundContext?.primary === 'betrayal' ? 'red' :
      woundContext?.primary === 'neglect' ? 'green' : 'amber';

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{displayTitle}</h2>
            <p className="text-gray-600">
              {isPersonalized ? `Personalized Activity — ${childName}` : 'Interactive Activity'}
            </p>
          </div>
        </div>

        {isPersonalized && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium w-fit ${
            woundColor === 'blue' ? 'bg-blue-100 text-blue-700' :
            woundColor === 'purple' ? 'bg-purple-100 text-purple-700' :
            woundColor === 'red' ? 'bg-red-100 text-red-700' :
            woundColor === 'green' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <Star className="w-3 h-3" />
            Personalized for your {childName}
          </div>
        )}

        {!isPersonalized && woundPers && (
          <div className="bg-gradient-to-r from-amber-50 to-stone-50 rounded-lg p-5 border border-amber-200 mb-2">
            <p className="text-sm font-medium text-amber-800 mb-2">Personalized for Your {woundPers.childName}</p>
            <p className="text-sm text-gray-700 leading-relaxed">{woundPers.moduleIntro}</p>
          </div>
        )}

        {renderActivePartsPanel()}
        {renderDualWoundPanel()}

        <div className={`rounded-lg p-6 border ${
          isPersonalized
            ? `border-l-4 bg-gradient-to-r from-stone-50 to-white ${
                woundColor === 'blue' ? 'border-l-blue-400' :
                woundColor === 'purple' ? 'border-l-purple-400' :
                woundColor === 'red' ? 'border-l-red-400' :
                woundColor === 'green' ? 'border-l-green-400' : 'border-l-amber-400'
              }`
            : 'bg-gradient-to-r from-teal-50 to-green-50 border-teal-100'
        }`}>
          <p className="text-lg text-gray-700 leading-relaxed">{displayPrompt}</p>
        </div>

        {renderInteractiveElements(data)}

        {displayQuestions && displayQuestions.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isPersonalized ? `Reflection — Your ${childName}` : 'Reflection Questions:'}
            </h3>
            {displayQuestions.map((question, index) => (
              <div key={index} className={`bg-white rounded-lg p-4 border ${isPersonalized ? 'border-l-4 border-gray-200' : 'border-gray-200'} ${
                isPersonalized ? (
                  woundColor === 'blue' ? 'border-l-blue-300' :
                  woundColor === 'purple' ? 'border-l-purple-300' :
                  woundColor === 'red' ? 'border-l-red-300' :
                  woundColor === 'green' ? 'border-l-green-300' : 'border-l-amber-300'
                ) : ''
              }`}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question {index + 1}
                </label>
                <p className="text-gray-900 mb-3">{question}</p>
                <textarea
                  value={activityResponses[`s${currentStepIndex}-question-${index}`] || ''}
                  onChange={(e) => handleActivityResponse(`s${currentStepIndex}-question-${index}`, e.target.value)}
                  placeholder={isPersonalized ? `Reflect on your ${childName} experience...` : 'Share your thoughts and reflections here...'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={4}
                />
                <div className="mt-2">
                  <VoiceRecorder label={`Record answer for Question ${index + 1}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {displayGuidedSteps && displayGuidedSteps.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isPersonalized ? `Guided Steps — Your ${childName}` : (isSixFsActivity && woundPers ? `Guided Steps — Personalized for Your ${woundPers.childName}` : 'Guided Steps:')}
            </h3>
            {isSixFsActivity && woundPers?.selfCsIntegration && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-2">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">The 8 C's of Self in Your Practice</p>
                <p className="text-sm text-gray-700 leading-relaxed">{woundPers.selfCsIntegration}</p>
              </div>
            )}
            <div className="space-y-3">
              {displayGuidedSteps.map((stepText, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                    isPersonalized
                      ? (woundColor === 'blue' ? 'bg-blue-500' :
                         woundColor === 'purple' ? 'bg-purple-500' :
                         woundColor === 'red' ? 'bg-red-500' :
                         woundColor === 'green' ? 'bg-green-500' : 'bg-amber-500')
                      : 'bg-gradient-to-r from-teal-500 to-green-500'
                  }`}>
                    {index + 1}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{stepText}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isSixFsActivity && woundPers?.reflectionPrompts && (
          <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Wound-Specific Reflection:</h3>
            <div className="space-y-5">
              {woundPers.reflectionPrompts.map((prompt, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <span className="text-yellow-600 font-bold mt-1">Q{index + 1}.</span>
                    <p className="text-gray-700 italic">{prompt}</p>
                  </div>
                  <textarea
                    value={activityResponses[`s${currentStepIndex}-wound-reflection-${index}`] || ''}
                    onChange={(e) => handleActivityResponse(`s${currentStepIndex}-wound-reflection-${index}`, e.target.value)}
                    placeholder={`Reflect on your ${woundPers.childName} experience...`}
                    className="w-full px-4 py-3 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/80 text-gray-700"
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render interactive elements
  const renderInteractiveElements = (data) => {
    if (!data.interactiveElements) return null;

    return (
      <div className="space-y-6">
        {data.interactiveElements.includes('wound-selector') && renderWoundSelector()}
        {data.interactiveElements.includes('belief-mapper') && renderBeliefMapper()}
        {data.interactiveElements.includes('manager-identifier') && renderManagerIdentifier()}
        {data.interactiveElements.includes('six-fs-wizard') && renderSixFsWizard()}
        {data.interactiveElements.includes('readiness-assessment') && renderReadinessAssessment()}
        {data.interactiveElements.includes('guided-meditation') && renderGuidedMeditation()}
        {data.interactiveElements.includes('emotion-spectrum') && renderEmotionSpectrum()}
        {data.interactiveElements.includes('age-identification') && renderAgeIdentification()}
        {data.interactiveElements.includes('self-energy-meter') && renderSelfEnergyMeter()}
        {data.interactiveElements.includes('pattern-identifier') && renderPatternIdentifier()}
        {data.interactiveElements.includes('body-scan-mapper') && renderBodyScanMapper()}
        {data.interactiveElements.includes('wound-healing-planner') && renderWoundHealingPlanner()}
        {data.interactiveElements.includes('guided-visualization') && renderGuidedVisualization()}
        {data.interactiveElements.includes('matching-exercise') && renderMatchingExercise()}
        {data.interactiveElements.includes('safety-checklist') && renderSafetyChecklist()}
        {data.interactiveElements.includes('mindfulness-timer') && renderMindfulnessTimer()}
        {data.interactiveElements.includes('scale-rating') && renderScaleRating()}
        {data.interactiveElements.includes('true-false-quiz') && renderTrueFalseQuiz()}
        {data.interactiveElements.includes('drag-to-rank') && renderDragToRank()}
        {data.interactiveElements.includes('letter-to-parts') && renderLetterToParts()}
        {data.interactiveElements.includes('scenario-cards') && renderScenarioCards()}
        {data.interactiveElements.includes('emotion-wheel') && renderEmotionWheel()}
        {data.interactiveElements.includes('fill-in-blank') && renderFillInBlank()}
        {data.interactiveElements.includes('parts-dialogue') && renderPartsDialogue()}
      </div>
    );
  };

  // Wound Selector Component
  const renderWoundSelector = () => {
    const wounds = [
      'Helplessness', 'Abandonment', 'Neglect', 'Criticism/Shame', 
      'Betrayal', 'Humiliation', 'Injustice', 'Loss/Grief', 
      'Emotional Invalidation', 'Trauma'
    ];

    return (
      <div className="bg-gradient-to-r from-blue-100 to-amber-100 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🩹 Wound Identification</h3>
        <p className="text-gray-700 mb-4">Select the wounds that resonate with your experience (0-5 intensity):</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wounds.map(wound => (
            <div key={wound} className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-amber-600"
                    checked={interactiveData[`wound-${wound}`]?.selected || false}
                    onChange={(e) => handleInteractiveChange(`wound-${wound}`, {
                      ...interactiveData[`wound-${wound}`],
                      selected: e.target.checked
                    })}
                  />
                  <span className="text-sm font-medium text-gray-700">{wound}</span>
                </label>
              </div>
              {interactiveData[`wound-${wound}`]?.selected && (
                <div className="mt-2">
                  <label className="text-xs text-gray-600">Intensity:</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="5" 
                    value={interactiveData[`wound-${wound}`]?.intensity || 0}
                    onChange={(e) => handleInteractiveChange(`wound-${wound}`, {
                      ...interactiveData[`wound-${wound}`],
                      intensity: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0</span>
                    <span>{interactiveData[`wound-${wound}`]?.intensity || 0}</span>
                    <span>5</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Belief Mapper Component
  const renderBeliefMapper = () => {
    return (
      <div className="bg-gradient-to-r from-emerald-100 to-orange-100 rounded-lg p-6 border border-emerald-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🧠 Belief Mapping</h3>
        <p className="text-gray-700 mb-4">What beliefs did you form from these experiences?</p>
        <div className="space-y-3">
          <textarea 
            value={interactiveData['beliefs'] || ''}
            onChange={(e) => handleInteractiveChange('beliefs', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Examples: 'I'm unlovable,' 'I'm not good enough,' 'I must be perfect,' 'I can't trust anyone'..."
            rows={4}
          />
          <div className="text-sm text-gray-600">
            <p>Common limiting beliefs:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {["I'm unlovable", "I'm not enough", "I must be perfect", "I can't trust anyone", "I'm too much", "I'm invisible"].map(belief => (
                <button
                  key={belief}
                  onClick={() => {
                    const current = interactiveData['beliefs'] || '';
                    handleInteractiveChange('beliefs', current + (current ? ', ' : '') + belief);
                  }}
                  className="text-xs bg-white px-2 py-1 rounded border border-gray-300 hover:bg-emerald-50"
                >
                  + {belief}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Manager Identifier Component
  const renderManagerIdentifier = () => {
    const managers = [
      'The Perfectionist', 'The People-Pleaser', 'The Planner', 
      'The Critic', 'The Caretaker', 'The Controller', 
      'The Achiever', 'The Protector'
    ];

    return (
      <div className="bg-gradient-to-r from-blue-100 to-teal-100 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🛡️ Meet Your Managers</h3>
        <p className="text-gray-700 mb-4">Identify your protective Manager parts:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {managers.map(manager => (
            <label key={manager} className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-blue-600"
                checked={interactiveData['managers']?.includes(manager) || false}
                onChange={(e) => {
                  const current = interactiveData['managers'] || [];
                  if (e.target.checked) {
                    handleInteractiveChange('managers', [...current, manager]);
                  } else {
                    handleInteractiveChange('managers', current.filter(m => m !== manager));
                  }
                }}
              />
              <span className="text-sm text-gray-700">{manager}</span>
            </label>
          ))}
        </div>
        {interactiveData['managers'] && interactiveData['managers'].length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Selected Managers:</strong> {interactiveData['managers'].join(', ')}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Six F's Wizard Component
  const renderSixFsWizard = () => {
    const woundPersonalization = module?.woundPersonalization?.[woundContext?.primary];

    const defaultSteps = [
      { name: 'Find', description: 'Notice when a part is active in your system' },
      { name: 'Focus', description: 'Direct your compassionate attention to the part' },
      { name: 'Flesh Out', description: 'Explore the part\'s role and perspective' },
      { name: 'Feel Toward', description: 'Notice your emotional response to the part' },
      { name: 'Befriend', description: 'Build trust and understanding with the part' },
      { name: 'Fear', description: 'Ask what the part fears would happen if it stopped' }
    ];

    const steps = woundPersonalization
      ? defaultSteps.map((step, i) => ({
          ...step,
          description: woundPersonalization.guidedSteps[i]
            ? woundPersonalization.guidedSteps[i].replace(/^\*\*[A-Z ]+\*\*[^:]*:\s*/, '')
            : step.description
        }))
      : defaultSteps;

    const woundGradients = {
      abandonment: 'from-blue-500 to-indigo-600',
      shame: 'from-purple-500 to-rose-500',
      neglect: 'from-amber-500 to-orange-500',
      betrayal: 'from-red-500 to-rose-600',
      helplessness: 'from-green-500 to-emerald-600'
    };
    const gradientClass = woundContext?.primary ? woundGradients[woundContext.primary] || 'from-amber-500 to-stone-500' : 'from-amber-500 to-stone-500';

    return (
      <div className="bg-gradient-to-r from-amber-100 to-stone-100 rounded-lg p-6 border border-amber-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {woundPersonalization ? `6 F's Protocol — Personalized for Your ${woundPersonalization.childName}` : "6 F's Protocol Guide"}
        </h3>
        {woundPersonalization && (
          <div className="mb-4 space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed">{woundPersonalization.moduleIntro}</p>
            <div className="p-3 bg-white/80 rounded-lg border border-amber-200">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">The 8 C's of Self in Your 6 F's Practice</p>
              <p className="text-sm text-gray-700 leading-relaxed">{woundPersonalization.selfCsIntegration}</p>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.name} className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200">
              <div className={`w-8 h-8 bg-gradient-to-r ${gradientClass} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{step.name}</h4>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{step.description}</p>
                <textarea
                  value={interactiveData[`6fs-${step.name.toLowerCase()}`] || ''}
                  onChange={(e) => handleInteractiveChange(`6fs-${step.name.toLowerCase()}`, e.target.value)}
                  placeholder={woundPersonalization ? `Your ${woundPersonalization.childName} notes for the ${step.name} step...` : `Notes for ${step.name} step...`}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  rows={woundPersonalization ? 3 : 2}
                />
              </div>
            </div>
          ))}
        </div>
        {woundPersonalization?.guidedSteps?.[6] && (
          <div className="mt-4 p-4 bg-white/80 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-1">Closing Practice</p>
            <p className="text-sm text-gray-700 leading-relaxed">{woundPersonalization.guidedSteps[6]}</p>
          </div>
        )}
      </div>
    );
  };

  // Readiness Assessment Component
  const renderReadinessAssessment = () => {
    return (
      <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ Readiness Assessment</h3>
        <div className="space-y-4">
          {[
            {
              question: "Can you reliably access Self-energy when parts are active?",
              name: "self-energy"
            },
            {
              question: "Do you have support available if intense emotions arise?",
              name: "support"
            },
            {
              question: "Are you prepared to be with overwhelming emotions without immediately trying to fix them?",
              name: "overwhelm"
            }
          ].map((item, index) => (
            <div key={item.name} className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-700 mb-3">{item.question}</p>
              <div className="flex flex-wrap gap-3">
                {['Yes, consistently', 'Sometimes', 'Rarely', 'Not sure'].map(option => (
                  <label key={option} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name={item.name}
                      value={option}
                      checked={interactiveData[`readiness-${item.name}`] === option}
                      onChange={(e) => handleInteractiveChange(`readiness-${item.name}`, e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const currAudioSrc = currentStep?.data?.id ? CURRICULUM_AUDIO_MAP[currentStep.data.id] : null;

  const initCurrAudio = (autoPlay = false) => {
    if (currAudioRef.current || !currAudioSrc) return;
    const audio = new Audio(currAudioSrc);
    audio.preload = 'auto';
    const handlers = {
      onMeta: () => { setCurrAudioDuration(audio.duration); },
      onReady: () => {
        setCurrAudioReady(true);
        if (autoPlay) {
          audio.play().then(() => setCurrAudioPlaying(true)).catch(() => {});
        }
      },
      onTime: () => { setCurrAudioProgress(audio.currentTime); },
      onEnd: () => { setCurrAudioPlaying(false); setCurrAudioProgress(0); },
      onError: () => { setCurrAudioReady(false); setCurrAudioError(true); },
    };
    audio.addEventListener('loadedmetadata', handlers.onMeta);
    audio.addEventListener('canplaythrough', handlers.onReady);
    audio.addEventListener('timeupdate', handlers.onTime);
    audio.addEventListener('ended', handlers.onEnd);
    audio.addEventListener('error', handlers.onError);
    currAudioRef.current = audio;
    currAudioHandlersRef.current = handlers;
  };

  const toggleCurrAudio = () => {
    if (!currAudioRef.current) {
      initCurrAudio(true);
      return;
    }
    if (currAudioPlaying) {
      currAudioRef.current.pause();
      setCurrAudioPlaying(false);
    } else {
      currAudioRef.current.play().then(() => setCurrAudioPlaying(true)).catch(() => {});
    }
  };

  const seekCurrAudio = (e) => {
    if (!currAudioRef.current || !currAudioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    currAudioRef.current.currentTime = pct * currAudioDuration;
    setCurrAudioProgress(currAudioRef.current.currentTime);
  };

  const formatAudioTime = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const renderGuidedMeditation = () => {
    const currentActivityData = currentStep?.data;
    const meditationSteps = currentActivityData?.guidedSteps || [];
    const hasSteps = meditationSteps.length > 0;
    const currentMedStep = meditationSteps[meditationStepIndex];
    const pauseMatch = currentMedStep ? currentMedStep.match(/\[(?:Pause|Allow)\s+(?:for\s+)?(\d+)\s+seconds?(?:\s+of\s+silence)?\]/i) : null;
    const stepPauseDuration = pauseMatch ? parseInt(pauseMatch[1]) : 20;
    const isBreathingStep = currentMedStep ? /breath|breathe|inhale|exhale/i.test(currentMedStep) : false;

    const handleMeditationPlayPause = () => {
      if (!hasSteps) {
        setMeditationActive(!meditationActive);
        return;
      }
      if (meditationCompleted) {
        setMeditationStepIndex(0);
        setMeditationStepTimer(0);
        setMeditationCompleted(false);
        setMeditationActive(true);
        return;
      }
      setMeditationActive(!meditationActive);
    };

    const handleMeditationReset = () => {
      setMeditationActive(false);
      setMeditationTimer(0);
      setMeditationStepIndex(0);
      setMeditationStepTimer(0);
      setMeditationCompleted(false);
    };

    const goToMeditationStep = (idx) => {
      setMeditationStepIndex(idx);
      setMeditationStepTimer(0);
    };

    return (
      <div className="bg-gradient-to-r from-amber-100 to-emerald-100 rounded-xl p-6 border border-amber-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Guided Meditation</h3>

        {currAudioSrc && !currAudioError && (
          <div className="bg-white/80 rounded-lg p-4 mb-4 border border-amber-200">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={toggleCurrAudio}
                className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 transition-colors flex-shrink-0"
              >
                {currAudioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Volume2 className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span className="text-sm font-medium text-amber-800 truncate">Recorded Audio Guidance</span>
                </div>
                <div
                  className="w-full h-2 bg-gray-200 rounded-full cursor-pointer group"
                  onClick={seekCurrAudio}
                >
                  <div
                    className="h-2 bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-200"
                    style={{ width: currAudioDuration ? `${(currAudioProgress / currAudioDuration) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0 tabular-nums">
                {formatAudioTime(currAudioProgress)} / {formatAudioTime(currAudioDuration)}
              </span>
            </div>
            <p className="text-xs text-gray-500 italic">Play the recorded meditation or follow the text steps below.</p>
          </div>
        )}

        {hasSteps ? (
          <div>
            <div className="text-center mb-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-1000 ${
                meditationActive
                  ? isBreathingStep
                    ? 'bg-gradient-to-r from-blue-400 to-teal-400 animate-pulse scale-110'
                    : 'bg-gradient-to-r from-amber-500 to-emerald-500 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-emerald-500'
              }`}>
                {meditationActive ? (
                  isBreathingStep ? <Brain className="w-12 h-12 text-white" /> : <Pause className="w-12 h-12 text-white" />
                ) : (
                  <Play className="w-12 h-12 text-white" />
                )}
              </div>
              <div className="text-sm text-gray-600 mb-1">
                Step {meditationStepIndex + 1} of {meditationSteps.length}
              </div>
              <div className="text-lg font-bold text-gray-900">
                {meditationActive ? formatTime(meditationTimer) : meditationCompleted ? 'Complete' : 'Ready to begin'}
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div
                className="bg-gradient-to-r from-amber-600 to-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((meditationStepIndex + (meditationActive ? meditationStepTimer / stepPauseDuration : 0)) / meditationSteps.length) * 100}%` }}
              />
            </div>

            {isBreathingStep && meditationActive && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  <Brain className="w-4 h-4" />
                  Breathing Exercise - Follow along
                </div>
              </div>
            )}

            {pauseMatch && meditationActive && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium animate-pulse">
                  <Clock className="w-4 h-4" />
                  Pause - {stepPauseDuration - meditationStepTimer}s remaining
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-6 mb-6 border border-amber-200 min-h-[120px]">
              <p className="text-gray-800 text-lg leading-relaxed italic">
                {currentMedStep ? currentMedStep.replace(/\[(?:Pause|Allow)\s+(?:for\s+)?(\d+)\s+seconds?(?:\s+of\s+silence)?\]/gi, '').trim() : ''}
              </p>
            </div>

            <VoiceRecorder label="Record your thoughts during this meditation" />

            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => goToMeditationStep(Math.max(0, meditationStepIndex - 1))}
                disabled={meditationStepIndex === 0}
                className="p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleMeditationPlayPause}
                className="px-8 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors flex items-center gap-2"
              >
                {meditationCompleted ? (
                  <><RotateCcw className="w-5 h-5" /><span>Restart</span></>
                ) : meditationActive ? (
                  <><Pause className="w-5 h-5" /><span>Pause</span></>
                ) : (
                  <><Play className="w-5 h-5" /><span>{meditationStepIndex > 0 ? 'Resume' : 'Begin Meditation'}</span></>
                )}
              </button>
              <button
                onClick={() => goToMeditationStep(Math.min(meditationSteps.length - 1, meditationStepIndex + 1))}
                disabled={meditationStepIndex >= meditationSteps.length - 1}
                className="p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleMeditationReset}
                className="p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                title="Reset"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 max-h-48 overflow-y-auto">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Full Transcript</h4>
              <div className="space-y-2">
                {meditationSteps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToMeditationStep(idx)}
                    className={`w-full text-left p-3 rounded-lg text-sm transition-all ${
                      idx === meditationStepIndex
                        ? 'bg-amber-100 border-2 border-amber-300 text-amber-900'
                        : idx < meditationStepIndex
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        idx === meditationStepIndex ? 'bg-amber-600 text-white' : idx < meditationStepIndex ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                      }`}>
                        {idx < meditationStepIndex ? '✓' : idx + 1}
                      </span>
                      <span className="line-clamp-2">{step.replace(/\[(?:Pause|Allow).*?\]/gi, '').trim().substring(0, 120)}...</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              {meditationActive ? <Pause className="w-12 h-12 text-white" /> : <Play className="w-12 h-12 text-white" />}
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-4">{meditationActive ? formatTime(meditationTimer) : 'Ready to begin'}</div>
            <button
              onClick={() => setMeditationActive(!meditationActive)}
              className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors flex items-center gap-2 mx-auto"
            >
              {meditationActive ? <><Pause className="w-5 h-5" /><span>Pause</span></> : <><Play className="w-5 h-5" /><span>Start Meditation</span></>}
            </button>
            <VoiceRecorder label="Record your meditation reflection" />
          </div>
        )}
      </div>
    );
  };

  // Emotion Spectrum Component
  const renderEmotionSpectrum = () => {
    const emotions = [
      { name: 'Joy', color: 'bg-yellow-400' },
      { name: 'Sadness', color: 'bg-blue-400' },
      { name: 'Anger', color: 'bg-red-400' },
      { name: 'Fear', color: 'bg-amber-400' },
      { name: 'Shame', color: 'bg-emerald-400' },
      { name: 'Love', color: 'bg-green-400' }
    ];

    return (
      <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-6 border border-yellow-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🌈 Emotion Spectrum</h3>
        <p className="text-gray-700 mb-4">What emotions are present right now?</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {emotions.map(emotion => (
            <label key={emotion.name} className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:shadow-sm">
              <input 
                type="checkbox" 
                className="w-4 h-4"
                checked={interactiveData['emotions']?.includes(emotion.name) || false}
                onChange={(e) => {
                  const current = interactiveData['emotions'] || [];
                  if (e.target.checked) {
                    handleInteractiveChange('emotions', [...current, emotion.name]);
                  } else {
                    handleInteractiveChange('emotions', current.filter(e => e !== emotion.name));
                  }
                }}
              />
              <div className={`w-4 h-4 rounded-full ${emotion.color}`} />
              <span className="text-sm text-gray-700">{emotion.name}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  // Age Identification Component
  const renderAgeIdentification = () => {
    return (
      <div className="bg-gradient-to-r from-green-100 to-teal-100 rounded-lg p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👶 Age Identification</h3>
        <p className="text-gray-700 mb-4">What age does this part feel?</p>
        <div className="space-y-3">
          <input
            type="range"
            min="0"
            max="18"
            value={interactiveData['part-age'] || 5}
            onChange={(e) => handleInteractiveChange('part-age', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-center">
            <span className="text-2xl font-bold text-gray-900">{interactiveData['part-age'] || 5} years old</span>
          </div>
          <textarea
            value={interactiveData['age-description'] || ''}
            onChange={(e) => handleInteractiveChange('age-description', e.target.value)}
            placeholder="Describe this part at this age..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
          />
        </div>
      </div>
    );
  };

  // Self Energy Meter Component
  const renderSelfEnergyMeter = () => {
    const selfCs = ['Curiosity', 'Compassion', 'Calm', 'Clarity', 'Confidence', 'Courage', 'Creativity', 'Connectedness'];
    
    return (
      <div className="bg-gradient-to-r from-stone-100 to-amber-100 rounded-lg p-6 border border-indigo-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">✨ Self Energy Meter</h3>
        <p className="text-gray-700 mb-4">How present are these qualities right now?</p>
        <div className="space-y-3">
          {selfCs.map(c => (
            <div key={c} className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700 w-24">{c}</span>
              <input
                type="range"
                min="0"
                max="10"
                value={interactiveData[`self-${c.toLowerCase()}`] || 5}
                onChange={(e) => handleInteractiveChange(`self-${c.toLowerCase()}`, parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 w-8">{interactiveData[`self-${c.toLowerCase()}`] || 5}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Pattern Identifier Component
  const renderPatternIdentifier = () => {
    const patterns = [
      'Perfectionism', 'People-pleasing', 'Control issues', 'Avoidance',
      'Self-criticism', 'Isolation', 'Overworking', 'Compulsive behaviors'
    ];

    return (
      <div className="bg-gradient-to-r from-red-100 to-emerald-100 rounded-lg p-6 border border-red-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 Pattern Identifier</h3>
        <p className="text-gray-700 mb-4">Which protective patterns do you notice?</p>
        <div className="grid grid-cols-2 gap-3">
          {patterns.map(pattern => (
            <label key={pattern} className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-red-600"
                checked={interactiveData['patterns']?.includes(pattern) || false}
                onChange={(e) => {
                  const current = interactiveData['patterns'] || [];
                  if (e.target.checked) {
                    handleInteractiveChange('patterns', [...current, pattern]);
                  } else {
                    handleInteractiveChange('patterns', current.filter(p => p !== pattern));
                  }
                }}
              />
              <span className="text-sm text-gray-700">{pattern}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  // Body Scan Mapper Component
  const renderBodyScanMapper = () => {
    const bodyAreas = [
      'Head/Forehead', 'Throat/Neck', 'Shoulders', 'Chest/Heart',
      'Stomach/Gut', 'Lower Back', 'Hips/Pelvis', 'Hands/Arms', 'Legs/Feet'
    ];

    return (
      <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🧍 Body Scan Mapper</h3>
        <p className="text-gray-700 mb-4">Where do you hold these feelings in your body?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bodyAreas.map(area => (
            <label key={area} className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600"
                checked={interactiveData['body-areas']?.includes(area) || false}
                onChange={(e) => {
                  const current = interactiveData['body-areas'] || [];
                  if (e.target.checked) {
                    handleInteractiveChange('body-areas', [...current, area]);
                  } else {
                    handleInteractiveChange('body-areas', current.filter(a => a !== area));
                  }
                }}
              />
              <span className="text-sm text-gray-700">{area}</span>
            </label>
          ))}
        </div>
        <textarea
          value={interactiveData['body-sensations'] || ''}
          onChange={(e) => handleInteractiveChange('body-sensations', e.target.value)}
          placeholder="Describe the physical sensations..."
          className="mt-4 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
      </div>
    );
  };

  // Wound Healing Planner Component
  const renderWoundHealingPlanner = () => {
    return (
      <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Wound Healing Planner</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority Wounds to Heal:</label>
            <textarea
              value={interactiveData['priority-wounds'] || ''}
              onChange={(e) => handleInteractiveChange('priority-wounds', e.target.value)}
              placeholder="List your top 2-3 priority wounds..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Healing Actions (This Week):</label>
            <textarea
              value={interactiveData['healing-actions'] || ''}
              onChange={(e) => handleInteractiveChange('healing-actions', e.target.value)}
              placeholder="What specific actions will you take this week?"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Support Needed:</label>
            <textarea
              value={interactiveData['support-needed'] || ''}
              onChange={(e) => handleInteractiveChange('support-needed', e.target.value)}
              placeholder="What support do you need for this healing?"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={2}
            />
          </div>
        </div>
      </div>
    );
  };

  // Guided Visualization Component
  const renderGuidedVisualization = () => {
    const steps = [
      { title: 'Settle In', instruction: 'Close your eyes and take three deep breaths. Allow your body to relax into a comfortable position. Notice the support beneath you.' },
      { title: 'Create Safety', instruction: 'Imagine a safe, peaceful place — it could be real or imagined. Notice the colors, sounds, and feelings of this space. Let yourself feel completely protected here.' },
      { title: 'Invite Your Inner Child', instruction: 'Gently invite your inner child to appear in this safe space. They may come as a specific age or as a feeling. Let them arrive in their own time without forcing anything.' },
      { title: 'Observe With Curiosity', instruction: 'Notice how your inner child appears. What are they wearing? What expression do they have? What do they seem to be feeling? Simply observe with compassion.' },
      { title: 'Offer Connection', instruction: 'Let your inner child know you see them. You might say: "I see you. I\'m here now. You\'re safe." Notice how they respond to your presence and attention.' },
      { title: 'Listen Deeply', instruction: 'Ask your inner child: "What do you need me to know?" Listen without judgment. Whatever they share — feelings, memories, or needs — receive it with openness.' },
      { title: 'Offer Comfort', instruction: 'Offer your inner child what they need — perhaps a hug, reassurance, or simply your continued presence. Let love and compassion flow naturally.' },
      { title: 'Integration', instruction: 'Thank your inner child for trusting you. Let them know you will return. Slowly bring your awareness back to the present moment, carrying this connection with you.' }
    ];

    const currentVizStep = interactiveData['viz-current-step'] || 0;
    const progress = ((currentVizStep + 1) / steps.length) * 100;

    return (
      <div className="bg-gradient-to-r from-violet-100 to-stone-100 rounded-lg p-6 border border-violet-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Eye className="w-5 h-5 text-violet-600" />
          <span>Guided Visualization</span>
        </h3>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Step {currentVizStep + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-violet-200 rounded-full h-2">
            <div className="bg-violet-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-lg p-5 border border-violet-100 mb-4">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {currentVizStep + 1}
            </div>
            <h4 className="text-md font-semibold text-gray-900">{steps[currentVizStep].title}</h4>
          </div>
          <p className="text-gray-700 leading-relaxed mb-4">{steps[currentVizStep].instruction}</p>
          <textarea
            value={interactiveData[`viz-notes-${currentVizStep}`] || ''}
            onChange={(e) => handleInteractiveChange(`viz-notes-${currentVizStep}`, e.target.value)}
            placeholder="Jot down any thoughts, feelings, or images that arise..."
            className="w-full px-4 py-3 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-violet-50/30"
            rows={3}
          />
        </div>
        <div className="flex justify-between">
          <button
            onClick={() => handleInteractiveChange('viz-current-step', Math.max(0, currentVizStep - 1))}
            disabled={currentVizStep === 0}
            className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-white border border-violet-200 text-violet-700 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          <button
            onClick={() => handleInteractiveChange('viz-current-step', Math.min(steps.length - 1, currentVizStep + 1))}
            disabled={currentVizStep === steps.length - 1}
            className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Matching Exercise Component
  const renderMatchingExercise = () => {
    const pairs = [
      { term: 'Manager', description: 'Proactive protector that tries to prevent pain through control, perfectionism, or caretaking' },
      { term: 'Firefighter', description: 'Reactive protector that numbs or distracts from pain through impulsive behaviors' },
      { term: 'Exile', description: 'Wounded inner child part carrying pain, shame, fear, or traumatic memories' },
      { term: 'Self', description: 'Core compassionate leader embodying curiosity, calm, confidence, and connectedness' },
      { term: 'Unburdening', description: 'Process of releasing extreme beliefs and emotions that parts have been carrying' },
      { term: 'Blending', description: 'When a part\'s emotions or beliefs take over and feel like the whole of you' }
    ];

    const shuffledDescriptions = [
      'Wounded inner child part carrying pain, shame, fear, or traumatic memories',
      'Core compassionate leader embodying curiosity, calm, confidence, and connectedness',
      'Proactive protector that tries to prevent pain through control, perfectionism, or caretaking',
      'Process of releasing extreme beliefs and emotions that parts have been carrying',
      'Reactive protector that numbs or distracts from pain through impulsive behaviors',
      'When a part\'s emotions or beliefs take over and feel like the whole of you'
    ];

    const showFeedback = interactiveData['matching-submitted'] || false;

    return (
      <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-lg p-6 border border-amber-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Layers className="w-5 h-5 text-amber-600" />
          <span>IFS Concept Matching</span>
        </h3>
        <p className="text-gray-700 mb-4">Match each IFS term with its correct description:</p>
        <div className="space-y-3">
          {pairs.map((pair, index) => {
            const selectedValue = interactiveData[`match-${pair.term}`] || '';
            const isCorrect = selectedValue === pair.description;
            return (
              <div key={pair.term} className="bg-white rounded-lg p-4 border border-amber-100">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="md:w-1/4">
                    <span className="font-semibold text-gray-900">{pair.term}</span>
                  </div>
                  <div className="md:w-3/4">
                    <select
                      value={selectedValue}
                      onChange={(e) => handleInteractiveChange(`match-${pair.term}`, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    >
                      <option value="">— Select a description —</option>
                      {shuffledDescriptions.map((desc, i) => (
                        <option key={i} value={desc}>{desc}</option>
                      ))}
                    </select>
                    {showFeedback && selectedValue && (
                      <div className={`mt-1 text-sm font-medium ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                        {isCorrect ? '✓ Correct!' : '✗ Not quite — try again'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => handleInteractiveChange('matching-submitted', true)}
            className="px-5 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors font-medium"
          >
            Check Answers
          </button>
        </div>
        {showFeedback && (
          <div className="mt-3 text-sm text-gray-600 bg-white rounded-lg p-3 border border-amber-100">
            {pairs.every(p => interactiveData[`match-${p.term}`] === p.description)
              ? <span className="text-green-700 font-semibold">🎉 Perfect! You matched all concepts correctly!</span>
              : <span>Review your answers above. Incorrect matches are highlighted in red.</span>
            }
          </div>
        )}
      </div>
    );
  };

  // Safety Checklist Component
  const renderSafetyChecklist = () => {
    const items = [
      { id: 'safe-space', label: 'I have a safe, private space for this work' },
      { id: 'support-available', label: 'I have support available if I need it (therapist, trusted person, helpline)' },
      { id: 'feel-grounded', label: 'I feel grounded and present in my body right now' },
      { id: 'can-pause', label: 'I know I can pause or stop at any time without judgment' },
      { id: 'not-in-crisis', label: 'I am not currently in an acute emotional crisis' },
      { id: 'have-time', label: 'I have enough uninterrupted time for this practice' },
      { id: 'self-care-plan', label: 'I have a self-care plan for after this session' },
      { id: 'grounding-tools', label: 'I know at least one grounding technique I can use if needed' }
    ];

    const checkedCount = items.filter(item => interactiveData[`safety-${item.id}`]).length;
    const progress = (checkedCount / items.length) * 100;
    const allChecked = checkedCount === items.length;

    return (
      <div className="bg-gradient-to-r from-emerald-100 to-green-100 rounded-lg p-6 border border-emerald-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <span>Safety & Grounding Checklist</span>
        </h3>
        <p className="text-gray-700 mb-4">Before diving into deep healing work, ensure you have the following in place:</p>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{checkedCount} of {items.length} items</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-emerald-200 rounded-full h-2">
            <div className="bg-emerald-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="space-y-2">
          {items.map(item => (
            <label key={item.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-emerald-50 transition-colors">
              <input
                type="checkbox"
                className="w-5 h-5 text-emerald-600 mt-0.5 rounded"
                checked={interactiveData[`safety-${item.id}`] || false}
                onChange={(e) => handleInteractiveChange(`safety-${item.id}`, e.target.checked)}
              />
              <span className={`text-sm ${interactiveData[`safety-${item.id}`] ? 'text-emerald-700 font-medium' : 'text-gray-700'}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
        {allChecked && (
          <div className="mt-4 bg-emerald-50 border border-emerald-300 rounded-lg p-4 text-center">
            <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-emerald-800 font-semibold">You're ready for deep healing work!</p>
            <p className="text-emerald-600 text-sm mt-1">All safety foundations are in place. Proceed with confidence and self-compassion.</p>
          </div>
        )}
      </div>
    );
  };

  // Mindfulness Timer Component
  const renderMindfulnessTimer = () => {
    const presets = [
      { label: '2 min', seconds: 120 },
      { label: '5 min', seconds: 300 },
      { label: '10 min', seconds: 600 }
    ];

    const timerDuration = interactiveData['mindful-duration'] || 120;
    const timerActive = meditationActive;
    const elapsed = meditationTimer;
    const remaining = Math.max(0, timerDuration - elapsed);
    const timerProgress = timerDuration > 0 ? (elapsed / timerDuration) * 100 : 0;

    const cycleLength = 14;
    const breathPhase = elapsed % cycleLength;
    let breathLabel = 'Breathe in...';
    let breathScale = 1;
    if (breathPhase < 4) {
      breathLabel = 'Breathe in...';
      breathScale = 1 + (breathPhase / 4) * 0.3;
    } else if (breathPhase < 8) {
      breathLabel = 'Hold...';
      breathScale = 1.3;
    } else {
      breathLabel = 'Breathe out...';
      breathScale = 1.3 - ((breathPhase - 8) / 6) * 0.3;
    }

    const startTimer = (duration) => {
      handleInteractiveChange('mindful-duration', duration);
      setMeditationTimer(0);
      setMeditationActive(true);
    };

    const stopTimer = () => {
      setMeditationActive(false);
    };

    const resetTimer = () => {
      setMeditationActive(false);
      setMeditationTimer(0);
    };

    if (remaining === 0 && timerActive) {
      setMeditationActive(false);
    }

    return (
      <div className="bg-gradient-to-r from-sky-100 to-blue-100 rounded-lg p-6 border border-sky-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Timer className="w-5 h-5 text-sky-600" />
          <span>Mindfulness Breathing Timer</span>
        </h3>
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center w-48 h-48">
            <div
              className="absolute inset-0 rounded-full bg-sky-200 opacity-40 transition-transform duration-1000 ease-in-out"
              style={{ transform: `scale(${timerActive ? breathScale : 1})` }}
            />
            <div
              className="absolute inset-4 rounded-full bg-sky-300 opacity-50 transition-transform duration-1000 ease-in-out"
              style={{ transform: `scale(${timerActive ? breathScale : 1})` }}
            />
            <div className="relative z-10 text-center">
              <div className="text-3xl font-bold text-sky-800">{formatTime(remaining)}</div>
              <div className="text-sm text-sky-600 mt-1 font-medium">
                {timerActive ? breathLabel : 'Ready'}
              </div>
            </div>
          </div>
        </div>
        {!timerActive && elapsed === 0 && (
          <div className="flex justify-center space-x-3 mb-4">
            {presets.map(preset => (
              <button
                key={preset.seconds}
                onClick={() => startTimer(preset.seconds)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timerDuration === preset.seconds
                    ? 'bg-sky-600 text-white'
                    : 'bg-white border border-sky-200 text-sky-700 hover:bg-sky-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
        <div className="mb-4">
          <div className="w-full bg-sky-200 rounded-full h-2">
            <div className="bg-sky-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min(timerProgress, 100)}%` }} />
          </div>
          <div className="text-center text-sm text-gray-600 mt-1">
            Elapsed: {formatTime(elapsed)}
          </div>
        </div>
        <div className="flex justify-center space-x-3">
          {!timerActive && elapsed === 0 && (
            <button
              onClick={() => startTimer(timerDuration)}
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Start</span>
            </button>
          )}
          {timerActive && (
            <button
              onClick={stopTimer}
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>
          )}
          {!timerActive && elapsed > 0 && (
            <>
              <button
                onClick={() => setMeditationActive(true)}
                className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Resume</span>
              </button>
              <button
                onClick={resetTimer}
                className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </>
          )}
        </div>
        <div className="mt-4 bg-white rounded-lg p-3 border border-sky-100 text-sm text-gray-600 text-center">
          Breathing pattern: <strong>In (4s)</strong> → <strong>Hold (4s)</strong> → <strong>Out (6s)</strong>
        </div>
      </div>
    );
  };

  // Scale Rating Component
  const renderScaleRating = () => {
    const questions = [
      { id: 'self-energy-connection', question: 'How connected do you feel to Self-energy right now?', low: 'Not at all', mid: 'Somewhat', high: 'Fully' },
      { id: 'parts-awareness', question: 'How aware are you of your different parts?', low: 'Unaware', mid: 'Developing', high: 'Very aware' },
      { id: 'inner-child-safety', question: 'How safe does your inner child feel right now?', low: 'Unsafe', mid: 'Neutral', high: 'Very safe' },
      { id: 'protector-trust', question: 'How much do your protector parts trust your Self leadership?', low: 'No trust', mid: 'Some trust', high: 'Full trust' },
      { id: 'emotional-capacity', question: 'How much emotional capacity do you have for this work right now?', low: 'None', mid: 'Moderate', high: 'Abundant' }
    ];

    const ratings = questions.map(q => ({
      ...q,
      value: interactiveData[`scale-${q.id}`] ?? 5
    }));

    const average = ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length;

    return (
      <div className="bg-gradient-to-r from-rose-100 to-emerald-100 rounded-lg p-6 border border-rose-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <SlidersHorizontal className="w-5 h-5 text-rose-600" />
          <span>Self-Assessment Scale</span>
        </h3>
        <p className="text-gray-700 mb-4">Rate each area on a scale of 0 to 10:</p>
        <div className="space-y-5">
          {questions.map(q => {
            const value = interactiveData[`scale-${q.id}`] ?? 5;
            return (
              <div key={q.id} className="bg-white rounded-lg p-4 border border-rose-100">
                <p className="text-sm font-medium text-gray-800 mb-2">{q.question}</p>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={value}
                  onChange={(e) => handleInteractiveChange(`scale-${q.id}`, parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0 — {q.low}</span>
                  <span>5 — {q.mid}</span>
                  <span>10 — {q.high}</span>
                </div>
                <div className="text-center mt-1">
                  <span className="text-sm font-semibold text-rose-700">{value}/10</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 bg-white rounded-lg p-4 border border-rose-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ratings.map(r => (
              <div key={r.id} className="text-center p-2 bg-rose-50 rounded-lg">
                <div className="text-lg font-bold text-rose-700">{r.value}</div>
                <div className="text-xs text-gray-600 truncate">{r.question.split('?')[0].replace('How ', '').replace('do you feel ', '')}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center border-t border-rose-100 pt-3">
            <span className="text-sm text-gray-600">Overall Average: </span>
            <span className="text-lg font-bold text-rose-700">{average.toFixed(1)}/10</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTrueFalseQuiz = () => {
    const statements = [
      { text: "All parts have positive intent, even if their strategies cause problems.", answer: true, explanation: "In IFS, every part has a positive intention — it's trying to protect or help the system, even if the behavior seems harmful." },
      { text: "Firefighter parts are always harmful and should be eliminated.", answer: false, explanation: "Firefighter parts use extreme strategies to manage pain, but they are not 'bad.' They need compassion and understanding, not elimination." },
      { text: "Self energy cannot be developed or strengthened over time.", answer: false, explanation: "Self energy is inherent in everyone and can be accessed more readily through practice, meditation, and IFS work." },
      { text: "Exiles are parts that carry painful emotions and memories from the past.", answer: true, explanation: "Exiles hold burdens — extreme feelings and beliefs from past experiences, often from childhood." },
      { text: "The goal of IFS is to get rid of problematic parts.", answer: false, explanation: "IFS never aims to eliminate parts. The goal is to help parts unburden and find healthier roles in the system." },
      { text: "Managers are proactive protectors that try to prevent painful experiences.", answer: true, explanation: "Managers work preemptively to keep exiles' pain from surfacing through control, planning, and caretaking." },
      { text: "A person can only have one protective part active at a time.", answer: false, explanation: "Multiple parts can be active simultaneously, and parts often interact with and polarize against each other." },
      { text: "The 8 C's of Self include Curiosity, Compassion, Calm, and Clarity.", answer: true, explanation: "The 8 C's — Curiosity, Compassion, Calm, Clarity, Confidence, Courage, Creativity, and Connectedness — are qualities of Self energy." },
      { text: "Unburdening is the process where an exile releases its extreme feelings and beliefs.", answer: true, explanation: "In unburdening, an exile releases the painful emotions and limiting beliefs it has been carrying, often through a ritualistic process." },
      { text: "Parts work should only be done with a professional therapist.", answer: false, explanation: "While complex trauma work benefits from professional guidance, many IFS techniques like Self-led check-ins can be practiced independently." }
    ];

    const quizAnswers = interactiveData['tf-quiz-answers'] || {};
    const answeredCount = Object.keys(quizAnswers).length;
    const correctCount = Object.values(quizAnswers).filter(a => a.correct).length;

    return (
      <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg p-6 border border-emerald-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">✅ True or False Quiz</h3>
        <p className="text-gray-700 mb-4">Test your IFS knowledge — select True or False for each statement.</p>
        {answeredCount > 0 && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-emerald-200 text-center">
            <span className="text-sm text-gray-600">Score: </span>
            <span className="text-lg font-bold text-emerald-700">{correctCount}/{answeredCount}</span>
            <span className="text-sm text-gray-500 ml-1">answered</span>
          </div>
        )}
        <div className="space-y-4">
          {statements.map((stmt, index) => {
            const answer = quizAnswers[index];
            const answered = answer !== undefined;
            return (
              <div key={index} className={`p-4 rounded-lg border ${answered ? (answer.correct ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300') : 'bg-white border-gray-200'}`}>
                <p className="text-gray-800 font-medium mb-3">{index + 1}. {stmt.text}</p>
                <div className="flex gap-3 mb-2">
                  <button
                    onClick={() => {
                      if (!answered) {
                        const isCorrect = stmt.answer === true;
                        const newAnswers = { ...quizAnswers, [index]: { selected: true, correct: isCorrect } };
                        handleInteractiveChange('tf-quiz-answers', newAnswers);
                      }
                    }}
                    disabled={answered}
                    className={`px-5 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                      answered && answer.selected === true
                        ? (answer.correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white')
                        : answered ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    <Check className="w-4 h-4" /> True
                  </button>
                  <button
                    onClick={() => {
                      if (!answered) {
                        const isCorrect = stmt.answer === false;
                        const newAnswers = { ...quizAnswers, [index]: { selected: false, correct: isCorrect } };
                        handleInteractiveChange('tf-quiz-answers', newAnswers);
                      }
                    }}
                    disabled={answered}
                    className={`px-5 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                      answered && answer.selected === false
                        ? (answer.correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white')
                        : answered ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                    }`}
                  >
                    <X className="w-4 h-4" /> False
                  </button>
                </div>
                {answered && (
                  <div className={`mt-2 p-3 rounded-lg text-sm ${answer.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <span className="font-semibold">{answer.correct ? '✓ Correct!' : '✗ Incorrect.'}</span> {stmt.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDragToRank = () => {
    const defaultItems = ['Curiosity', 'Compassion', 'Calm', 'Clarity', 'Confidence', 'Courage', 'Creativity', 'Connectedness'];
    const items = interactiveData['rank-items'] || defaultItems;

    const moveItem = (index, direction) => {
      const newItems = [...items];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newItems.length) return;
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      handleInteractiveChange('rank-items', newItems);
    };

    return (
      <div className="bg-gradient-to-r from-violet-100 to-amber-100 rounded-lg p-6 border border-violet-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 Rank Self Qualities</h3>
        <p className="text-gray-700 mb-4">Rank these Self qualities by how strongly you feel them right now. Use the arrows to reorder — #1 is the strongest.</p>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-violet-200 hover:shadow-sm transition-shadow">
              <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {index + 1}
              </div>
              <span className="flex-1 font-medium text-gray-800">{item}</span>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className={`p-1 rounded ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-violet-600 hover:bg-violet-100'}`}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  className={`p-1 rounded ${index === items.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-violet-600 hover:bg-violet-100'}`}
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLetterToParts = () => {
    const partName = interactiveData['letter-part-name'] || '';
    const greeting = interactiveData['letter-greeting'] || '';
    const body = interactiveData['letter-body'] || '';
    const closing = interactiveData['letter-closing'] || '';

    return (
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-6 border border-amber-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">✉️ Letter to a Part</h3>
        <p className="text-gray-700 mb-4">Write a compassionate letter from your Self to one of your parts. This exercise helps build trust and connection.</p>
        <div className="bg-white rounded-xl p-6 border-2 border-amber-200 shadow-sm" style={{ fontFamily: 'Georgia, serif' }}>
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-600 mb-1">Name of the part you're writing to:</label>
            <input
              type="text"
              value={partName}
              onChange={(e) => handleInteractiveChange('letter-part-name', e.target.value)}
              placeholder="e.g., My Inner Critic, The Worrier, Little Me..."
              className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent text-gray-800"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-500 italic mb-1">Dear {partName || '[part name]'}, I want you to know...</label>
            <textarea
              value={greeting}
              onChange={(e) => handleInteractiveChange('letter-greeting', e.target.value)}
              placeholder="Start with what you appreciate about this part and acknowledge its efforts..."
              className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent text-gray-700"
              rows={3}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-500 italic mb-1">What I understand about you now is...</label>
            <textarea
              value={body}
              onChange={(e) => handleInteractiveChange('letter-body', e.target.value)}
              placeholder="Share your understanding of this part's role, fears, and what it carries for you..."
              className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent text-gray-700"
              rows={5}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 italic mb-1">My promise to you is...</label>
            <textarea
              value={closing}
              onChange={(e) => handleInteractiveChange('letter-closing', e.target.value)}
              placeholder="Make a commitment to this part about how you'll show up for it going forward..."
              className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent text-gray-700"
              rows={3}
            />
          </div>
          <div className="mt-4 pt-3 border-t border-amber-100 text-right">
            <span className="text-gray-500 italic">With love and compassion,</span>
            <br />
            <span className="text-gray-700 font-medium">Your Self</span>
          </div>
        </div>
      </div>
    );
  };

  const renderScenarioCards = () => {
    const scenarios = [
      { id: 'shame-work', title: "Shame After a Mistake at Work", description: "You feel intense shame after making a visible mistake during a team presentation. Your face burns and you want to disappear." },
      { id: 'anger-boundary', title: "Anger When Boundaries Are Crossed", description: "A close friend repeatedly cancels plans last minute. You feel a surge of anger but also guilt for feeling angry." },
      { id: 'anxiety-future', title: "Anxiety About the Future", description: "You wake up at 3 AM with racing thoughts about finances, your career, and whether you're 'on track' in life." },
      { id: 'numbness-conflict', title: "Numbness During Conflict", description: "During an argument with your partner, you suddenly feel nothing — like you've checked out emotionally and can't access any feelings." },
      { id: 'perfectionism-project', title: "Perfectionism Paralysis", description: "You've been working on a creative project but can't finish it because nothing feels good enough. You keep revising endlessly." }
    ];

    const openCard = interactiveData['scenario-open-card'] || null;

    return (
      <div className="bg-gradient-to-r from-sky-100 to-blue-100 rounded-lg p-6 border border-sky-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🎭 Role-Play Scenario Cards</h3>
        <p className="text-gray-700 mb-4">Explore each scenario through an IFS lens. Click a card to expand it and reflect on the parts involved.</p>
        <div className="space-y-3">
          {scenarios.map((scenario) => {
            const isOpen = openCard === scenario.id;
            return (
              <div key={scenario.id} className="bg-white rounded-lg border border-sky-200 overflow-hidden">
                <button
                  onClick={() => handleInteractiveChange('scenario-open-card', isOpen ? null : scenario.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-sky-50 transition-colors"
                >
                  <div>
                    <h4 className="font-semibold text-gray-900">{scenario.title}</h4>
                    {!isOpen && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{scenario.description}</p>}
                  </div>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-sky-600 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-sky-600 flex-shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 border-t border-sky-100">
                    <p className="text-gray-700 mt-3 italic bg-sky-50 p-3 rounded-lg">{scenario.description}</p>
                    <div>
                      <label className="block text-sm font-medium text-sky-800 mb-1">Which part is activated?</label>
                      <textarea
                        value={interactiveData[`scenario-${scenario.id}-part`] || ''}
                        onChange={(e) => handleInteractiveChange(`scenario-${scenario.id}-part`, e.target.value)}
                        placeholder="Identify the part(s) showing up in this situation..."
                        className="w-full px-3 py-2 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sky-800 mb-1">What does this part need?</label>
                      <textarea
                        value={interactiveData[`scenario-${scenario.id}-need`] || ''}
                        onChange={(e) => handleInteractiveChange(`scenario-${scenario.id}-need`, e.target.value)}
                        placeholder="What is this part trying to protect you from? What does it need to feel safe?"
                        className="w-full px-3 py-2 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sky-800 mb-1">How would Self respond?</label>
                      <textarea
                        value={interactiveData[`scenario-${scenario.id}-self`] || ''}
                        onChange={(e) => handleInteractiveChange(`scenario-${scenario.id}-self`, e.target.value)}
                        placeholder="How could you respond from Self energy — with curiosity, compassion, and calm?"
                        className="w-full px-3 py-2 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm"
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEmotionWheel = () => {
    const emotionCategories = [
      { primary: 'Joy', color: 'bg-yellow-400', hoverColor: 'hover:bg-yellow-100', borderColor: 'border-yellow-300', secondary: ['Happy', 'Grateful', 'Playful', 'Content', 'Proud'] },
      { primary: 'Sadness', color: 'bg-blue-400', hoverColor: 'hover:bg-blue-100', borderColor: 'border-blue-300', secondary: ['Lonely', 'Grieving', 'Disappointed', 'Hopeless', 'Melancholy'] },
      { primary: 'Anger', color: 'bg-red-400', hoverColor: 'hover:bg-red-100', borderColor: 'border-red-300', secondary: ['Frustrated', 'Resentful', 'Irritated', 'Bitter', 'Enraged'] },
      { primary: 'Fear', color: 'bg-amber-400', hoverColor: 'hover:bg-amber-100', borderColor: 'border-amber-300', secondary: ['Anxious', 'Insecure', 'Overwhelmed', 'Panicked', 'Vulnerable'] },
      { primary: 'Surprise', color: 'bg-orange-400', hoverColor: 'hover:bg-orange-100', borderColor: 'border-orange-300', secondary: ['Amazed', 'Confused', 'Shocked', 'Startled', 'Awestruck'] },
      { primary: 'Disgust', color: 'bg-green-400', hoverColor: 'hover:bg-green-100', borderColor: 'border-green-300', secondary: ['Ashamed', 'Contemptuous', 'Repulsed', 'Self-loathing', 'Judgmental'] }
    ];

    const selectedEmotions = interactiveData['emotion-wheel-selected'] || [];

    const toggleEmotion = (emotion) => {
      const updated = selectedEmotions.includes(emotion)
        ? selectedEmotions.filter(e => e !== emotion)
        : [...selectedEmotions, emotion];
      handleInteractiveChange('emotion-wheel-selected', updated);
    };

    return (
      <div className="bg-gradient-to-r from-emerald-100 to-rose-100 rounded-lg p-6 border border-emerald-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🎡 Emotion Wheel</h3>
        <p className="text-gray-700 mb-4">Click on the emotions you're currently experiencing. Explore both primary and secondary emotions.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {emotionCategories.map((category) => (
            <div key={category.primary} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleEmotion(category.primary)}
                className={`w-full flex items-center gap-2 p-3 font-semibold text-gray-800 transition-colors ${
                  selectedEmotions.includes(category.primary) ? 'bg-gradient-to-r from-gray-100 to-gray-50 ring-2 ring-inset ring-gray-400' : category.hoverColor
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${category.color}`} />
                {category.primary}
                {selectedEmotions.includes(category.primary) && <Check className="w-4 h-4 ml-auto text-green-600" />}
              </button>
              <div className="p-2 grid grid-cols-1 gap-1">
                {category.secondary.map((emotion) => (
                  <button
                    key={emotion}
                    onClick={() => toggleEmotion(emotion)}
                    className={`text-left text-sm px-3 py-1.5 rounded transition-colors ${
                      selectedEmotions.includes(emotion) ? `${category.borderColor} border bg-gray-50 font-medium` : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {selectedEmotions.includes(emotion) && <Check className="w-3 h-3 inline mr-1 text-green-600" />}
                    {emotion}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {selectedEmotions.length > 0 && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-emerald-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Currently feeling:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedEmotions.map((emotion) => (
                <span
                  key={emotion}
                  onClick={() => toggleEmotion(emotion)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-emerald-200 to-rose-200 text-emerald-800 rounded-full text-sm font-medium cursor-pointer hover:from-emerald-300 hover:to-rose-300"
                >
                  {emotion}
                  <X className="w-3 h-3" />
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFillInBlank = () => {
    const sentences = [
      { id: 'fib-1', before: 'When I notice a', blank1: 'type of', after1: 'part is active, I can bring', blank2: 'quality', after2: 'to it from my Self.' },
      { id: 'fib-2', before: 'The part that wants to', blank1: 'behavior', after1: 'is trying to protect me from feeling', blank2: 'emotion', after2: '.' },
      { id: 'fib-3', before: 'My', blank1: 'part name', after1: 'part carries the burden of', blank2: 'burden', after2: 'from my past.' },
      { id: 'fib-4', before: 'When I lead with Self energy, I feel', blank1: 'sensation', after1: 'in my body and', blank2: 'quality', after2: 'in my mind.' },
      { id: 'fib-5', before: 'The manager part that', blank1: 'strategy', after1: 'is afraid that without it, I would experience', blank2: 'fear', after2: '.' },
      { id: 'fib-6', before: 'Instead of blending with my', blank1: 'part', after1: 'part, I can ask it to', blank2: 'action', after2: 'so I can be present.' },
      { id: 'fib-7', before: 'The exile that holds', blank1: 'feeling', after1: 'needs to know that it is', blank2: 'reassurance', after2: 'now.' },
      { id: 'fib-8', before: 'Unburdening my', blank1: 'part name', after1: 'part would allow it to take on a new role of', blank2: 'new role', after2: '.' }
    ];

    return (
      <div className="bg-gradient-to-r from-cyan-100 to-sky-100 rounded-lg p-6 border border-cyan-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📝 Fill in the Blanks</h3>
        <p className="text-gray-700 mb-4">Complete each sentence with your own IFS insights. The placeholders give hints about what to fill in.</p>
        <div className="space-y-4">
          {sentences.map((s) => (
            <div key={s.id} className="p-4 bg-white rounded-lg border border-cyan-200">
              <p className="text-gray-800 leading-relaxed flex flex-wrap items-center gap-1">
                <span>{s.before}</span>
                <input
                  type="text"
                  value={interactiveData[`${s.id}-blank1`] || ''}
                  onChange={(e) => handleInteractiveChange(`${s.id}-blank1`, e.target.value)}
                  placeholder={s.blank1}
                  className="inline-block w-32 px-2 py-1 border-b-2 border-cyan-400 bg-cyan-50 text-center text-sm focus:outline-none focus:border-cyan-600 rounded-sm"
                />
                <span>{s.after1}</span>
                <input
                  type="text"
                  value={interactiveData[`${s.id}-blank2`] || ''}
                  onChange={(e) => handleInteractiveChange(`${s.id}-blank2`, e.target.value)}
                  placeholder={s.blank2}
                  className="inline-block w-32 px-2 py-1 border-b-2 border-cyan-400 bg-cyan-50 text-center text-sm focus:outline-none focus:border-cyan-600 rounded-sm"
                />
                <span>{s.after2}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPartsDialogue = () => {
    const partName = interactiveData['dialogue-part-name'] || '';
    const selfPrompts = [
      "Hello. I notice you're here with me right now. Can you tell me — what are you feeling?",
      "Thank you for sharing that. How long have you been carrying this feeling?",
      "That sounds like a heavy burden. What are you most afraid would happen if you let go of it?",
      "I hear you. I want you to know that I'm here and I'm not going anywhere. What do you need from me right now?",
      "I appreciate you trusting me with this. Is there something you want me to understand about your role in my life?",
      "You've been working so hard to protect me. If you could do anything else — any role at all — what would you want to do instead?"
    ];

    const dialogueResponses = interactiveData['dialogue-responses'] || {};

    return (
      <div className="bg-gradient-to-r from-stone-100 to-violet-100 rounded-lg p-6 border border-indigo-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-600" /> Parts Dialogue Simulation
        </h3>
        <p className="text-gray-700 mb-4">Have a compassionate dialogue between your Self and a part. Self's prompts are provided — you write the part's responses.</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Name the part you'll dialogue with:</label>
          <input
            type="text"
            value={partName}
            onChange={(e) => handleInteractiveChange('dialogue-part-name', e.target.value)}
            placeholder="e.g., The Anxious One, My Inner Critic, The Protector..."
            className="w-full px-4 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
        </div>
        {partName && (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {selfPrompts.map((prompt, index) => {
              const prevAnswered = index === 0 || dialogueResponses[index - 1];
              if (!prevAnswered && index > 0) return null;
              return (
                <div key={index} className="space-y-3">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-gradient-to-r from-amber-500 to-stone-500 text-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                      <p className="text-xs font-semibold mb-1 opacity-80">Self</p>
                      <p className="text-sm">{prompt}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] w-full">
                      <div className="bg-gradient-to-r from-blue-100 to-sky-100 px-4 py-3 rounded-2xl rounded-br-sm border border-blue-200">
                        <p className="text-xs font-semibold mb-1 text-blue-700">{partName}</p>
                        <textarea
                          value={dialogueResponses[index] || ''}
                          onChange={(e) => {
                            const newResponses = { ...dialogueResponses, [index]: e.target.value };
                            handleInteractiveChange('dialogue-responses', newResponses);
                          }}
                          placeholder={`Write ${partName}'s response...`}
                          className="w-full bg-transparent text-sm text-gray-700 focus:outline-none resize-none placeholder-blue-400"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!partName && (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Enter a part name above to begin the dialogue</p>
          </div>
        )}
      </div>
    );
  };

  // Render Result section
  const renderResultSection = (step) => {
    const data = step.data;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{data.title}</h2>
            <p className="text-gray-600">Module Completion</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-8 border border-yellow-100 text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Congratulations! 🎉</h3>
          <p className="text-lg text-gray-700 mb-6">{data.completionMessage}</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowCertificate(true)}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download Certificate</span>
            </button>
            <button
              onClick={() => window.print()}
              className="bg-white text-orange-600 px-6 py-3 rounded-lg font-medium border border-orange-300 hover:bg-orange-50 transition-colors flex items-center space-x-2"
            >
              <Share className="w-5 h-5" />
              <span>Share Progress</span>
            </button>
          </div>
        </div>

        {data.nextSteps && data.nextSteps.length > 0 && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Next Steps:</h3>
            <div className="space-y-3">
              {data.nextSteps.map((step, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.achievement && (
          <div className="bg-gradient-to-r from-amber-600 to-emerald-600 rounded-lg p-6 text-white text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold mb-2">Achievement Unlocked!</h4>
            <p className="text-lg">{data.achievement}</p>
          </div>
        )}
      </div>
    );
  };

  // Render current step content
  const renderStepContent = () => {
    if (!currentStep) return null;
    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      );
    }

    switch (currentStep.type) {
      case 'learn':
        return renderLearnSection(currentStep);
      case 'activity':
        return renderActivitySection(currentStep);
      case 'result':
        return renderResultSection(currentStep);
      default:
        return <div>Unknown step type</div>;
    }
  };

  // Render certificate modal
  const renderCertificate = () => {
    if (!showCertificate) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-amber-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Certificate of Completion</h2>
              <p className="text-lg text-gray-600">Inner Child Healing Journey</p>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">{module.title}</h3>
              <p className="text-gray-700 mb-4">{module.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Completed: {new Date().toLocaleDateString()}</span>
                <span>Duration: {module.estimatedMinutes} minutes</span>
              </div>
              {completedSteps.length > 0 && (
                <div className="mt-4 pt-4 border-t border-amber-200">
                  <p className="text-sm text-amber-700">
                    <strong>Progress:</strong> {completedSteps.length} of {steps.length} steps completed
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowCertificate(false)}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                  setShowCertificate(false);
                }}
                className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors"
              >
                Print Certificate
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!currentStep) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading module...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-emerald-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{module.title}</h1>
                <p className="text-sm text-gray-600">
                  Step {currentStepIndex + 1} of {steps.length} • {currentStep.type}
                </p>
                {woundContext && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${woundContext.config.darkBg} ${woundContext.config.textColor}`}>
                      <span>{woundContext.priority.badge}</span>
                      <span className="font-normal opacity-75">for your {woundContext.config.childName}</span>
                    </div>
                    {woundContext.activeParts?.length > 0 && (
                      <div className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        <Shield className="w-3 h-3" />
                        <span>{woundContext.activeParts.length} active part{woundContext.activeParts.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={saveProgress}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Save Progress"
              >
                <Save className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={resetModule}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reset Module"
              >
                <RotateCcw className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{module.estimatedMinutes} min</span>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-amber-600 to-emerald-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          {renderStepContent()}
        </div>

        {showIncompleteWarning && incompleteItems.length > 0 && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-pulse">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-800 font-medium text-sm">Please complete before continuing:</p>
              <ul className="mt-1 space-y-0.5">
                {incompleteItems.map((item, i) => (
                  <li key={i} className="text-amber-700 text-sm flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={previousStep}
            disabled={isFirstStep}
            className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              isFirstStep
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-4">
            {completedSteps.includes(currentStepIndex) && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Step Completed</span>
              </div>
            )}
          </div>

          <button
            onClick={nextStep}
            className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg ${
              isCurrentStepComplete()
                ? 'bg-gradient-to-r from-amber-600 to-emerald-600 text-white hover:from-amber-700 hover:to-emerald-700'
                : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed'
            }`}
          >
            {!isCurrentStepComplete() && <Lock className="w-4 h-4" />}
            <span>{isLastStep ? 'Complete Module' : 'Next Step'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Certificate Modal */}
      {renderCertificate()}
    </div>
  );
};

export default LearningModuleEnhanced;
