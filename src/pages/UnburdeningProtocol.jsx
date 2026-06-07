import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, ArrowLeft, ArrowRight, Sparkles, Flame, Droplets,
  Wind, Mountain, Sun, CheckCircle, Star, Shield, RefreshCw, Clock
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useParts } from '../contexts/PartsContext';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { useData } from '../contexts/DataContext';

const STEPS = [
  {
    id: 1,
    title: 'Find the Part',
    icon: Heart,
    instruction: 'Close your eyes and go inside. Notice which part is carrying something heavy. Where do you feel it in your body? What does it look like?',
    type: 'body-scan',
  },
  {
    id: 2,
    title: 'Witness the Burden',
    icon: Shield,
    instruction: "Ask this part: 'What are you carrying?' Listen without trying to fix. What burden has this part been holding? Where did it come from?",
    type: 'journal',
  },
  {
    id: 3,
    title: 'Get Permission',
    icon: Star,
    instruction: "Ask the part: 'Are you ready to let this go?' Check if protectors also agree. If not, honor their timing.",
    type: 'permission',
  },
  {
    id: 4,
    title: 'Acknowledge the Weight',
    icon: Heart,
    instruction: 'Thank this part for carrying this burden for so long. Acknowledge how heavy it has been. Write a letter of gratitude to this part.',
    type: 'gratitude',
  },
  {
    id: 5,
    title: 'Choose the Element',
    icon: Sparkles,
    instruction: 'How would you like to release this burden? Choose an element:',
    type: 'element',
  },
  {
    id: 6,
    title: 'Release Ceremony',
    icon: Wind,
    instruction: 'Visualize the burden leaving your body. Feel the weight lifting. Stay with this as long as you need.',
    type: 'release',
  },
  {
    id: 7,
    title: 'Fill the Space',
    icon: Sun,
    instruction: 'Now that the burden is released, what quality would you like to invite in?',
    type: 'fill',
  },
  {
    id: 8,
    title: 'Integration',
    icon: CheckCircle,
    instruction: 'Notice how your body feels now. What has changed? Write about your experience.',
    type: 'integration',
  },
];

const ELEMENTS = [
  { id: 'fire', name: 'Fire', emoji: '🔥', description: 'Burn away the burden, transforming it into ash and smoke', color: 'from-orange-500 to-red-600', bg: 'bg-orange-50', darkBg: 'bg-orange-900/20', border: 'border-orange-300', icon: Flame },
  { id: 'water', name: 'Water', emoji: '💧', description: 'Wash away the burden, letting it dissolve in a flowing river', color: 'from-blue-400 to-cyan-600', bg: 'bg-blue-50', darkBg: 'bg-blue-900/20', border: 'border-blue-300', icon: Droplets },
  { id: 'wind', name: 'Wind', emoji: '🌬️', description: 'Blow away the burden, scattering it into the open sky', color: 'from-teal-400 to-cyan-500', bg: 'bg-teal-50', darkBg: 'bg-teal-900/20', border: 'border-teal-300', icon: Wind },
  { id: 'earth', name: 'Earth', emoji: '🌱', description: 'Bury and compost the burden, returning it to the soil to nourish new growth', color: 'from-green-500 to-emerald-700', bg: 'bg-green-50', darkBg: 'bg-green-900/20', border: 'border-green-300', icon: Mountain },
  { id: 'light', name: 'Light', emoji: '✨', description: 'Dissolve the burden in warm, radiant light until nothing remains', color: 'from-amber-400 to-yellow-500', bg: 'bg-amber-50', darkBg: 'bg-amber-900/20', border: 'border-amber-300', icon: Sun },
];

const QUALITIES = ['Lightness', 'Freedom', 'Joy', 'Peace', 'Worthiness', 'Strength', 'Love', 'Courage', 'Safety', 'Clarity'];

const BODY_LOCATIONS = ['Head', 'Throat', 'Chest', 'Stomach', 'Shoulders', 'Back', 'Hands', 'Legs', 'Whole Body'];

const MOODS = [
  { value: 1, label: 'Heavy', emoji: '😔' },
  { value: 2, label: 'Tender', emoji: '🥺' },
  { value: 3, label: 'Neutral', emoji: '😐' },
  { value: 4, label: 'Lighter', emoji: '🙂' },
  { value: 5, label: 'Free', emoji: '😊' },
];

export default function UnburdeningProtocol() {
  const { theme, tc } = useTheme();
  const isDark = theme.isDark;
  const { parts } = useParts();
  const { awardXP } = useData();

  const [currentStep, setCurrentStep] = useState(1);
  const [responses, setResponses] = useState({});
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [releaseTimer, setReleaseTimer] = useState(0);
  const [releaseActive, setReleaseActive] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    loadProgress();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadProgress = async () => {
    try {
      const client = clientAuth.getCurrentClientValidated();
      if (!client) { setLoading(false); return; }
      const { data, error } = await supabase
        .from('ifs_interactive_data')
        .select('data')
        .eq('client_id', client.id)
        .eq('module_id', 'unburdening_protocol')
        .single();
      if (!error && data?.data && data.data.currentStep > 1) {
        setSavedProgress(data.data);
        setShowResumePrompt(true);
      }
    } catch (e) {
      console.error('Error loading unburdening progress:', e);
    } finally {
      setLoading(false);
    }
  };

  const resumeProgress = () => {
    if (savedProgress) {
      setCurrentStep(savedProgress.currentStep);
      setResponses(savedProgress.responses || {});
      if (savedProgress.completedAt) setCompleted(true);
    }
    setShowResumePrompt(false);
  };

  const startFresh = () => {
    setCurrentStep(1);
    setResponses({});
    setCompleted(false);
    setShowResumePrompt(false);
  };

  const saveProgress = useCallback(async (step, resp, isComplete = false) => {
    setSaving(true);
    try {
      const client = clientAuth.getCurrentClientValidated();
      if (!client) return;
      const element = resp.step5?.element || null;
      const qualityChosen = resp.step7?.quality || resp.step7?.customQuality || null;
      await supabase.from('ifs_interactive_data').upsert({
        client_id: client.id,
        module_id: 'unburdening_protocol',
        data: {
          currentStep: step,
          responses: resp,
          completedAt: isComplete ? new Date().toISOString() : null,
          element,
          qualityChosen,
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,module_id' });
    } catch (e) {
      console.error('Error saving unburdening progress:', e);
    } finally {
      setSaving(false);
    }
  }, []);

  const updateResponse = (stepKey, data) => {
    setResponses(prev => ({ ...prev, [stepKey]: { ...prev[stepKey], ...data } }));
  };

  const goNext = async () => {
    if (currentStep < 8) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await saveProgress(nextStep, responses);
    } else {
      setCompleted(true);
      await saveProgress(8, responses, true);
      if (!xpAwarded) {
        setXpAwarded(true);
        awardXP('exercise_complete', 50);
      }
    }
  };

  const goBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const startReleaseTimer = () => {
    setReleaseActive(true);
    setReleaseTimer(0);
    timerRef.current = setInterval(() => {
      setReleaseTimer(prev => prev + 1);
    }, 1000);
  };

  const stopReleaseTimer = () => {
    setReleaseActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    updateResponse('step6', { duration: releaseTimer });
  };

  const formatTimer = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const cardBg = isDark ? 'bg-slate-800/80' : 'bg-white/80';
  const cardBorder = isDark ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showResumePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className={`${cardBg} backdrop-blur-sm rounded-3xl shadow-xl p-8 max-w-md w-full border ${cardBorder}`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-white" />
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>Welcome Back</h2>
            <p className={`${textSecondary} mb-6`}>
              You have a previous unburdening session in progress (Step {savedProgress?.currentStep} of 8). Would you like to continue?
            </p>
            <div className="space-y-3">
              <button onClick={resumeProgress} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all">
                Resume Session
              </button>
              <button onClick={startFresh} className={`w-full py-3 rounded-xl font-semibold border ${cardBorder} ${textSecondary} hover:bg-emerald-50 dark:hover:bg-slate-700 transition-all`}>
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    const element = ELEMENTS.find(e => e.id === responses.step5?.element);
    const quality = responses.step7?.quality || responses.step7?.customQuality;
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className={`${cardBg} backdrop-blur-sm rounded-3xl shadow-xl p-8 border ${cardBorder} text-center`}>
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className={`text-3xl font-bold mb-3 ${textPrimary}`}>Ceremony Complete</h1>
            <p className={`text-lg mb-8 ${textSecondary}`}>
              You have completed a sacred unburdening ceremony. Honor this moment of transformation.
            </p>

            <div className={`rounded-2xl p-6 mb-6 ${isDark ? 'bg-slate-700/50' : 'bg-gradient-to-br from-emerald-50 to-teal-50'}`}>
              <h3 className={`font-semibold mb-4 ${textPrimary}`}>Your Journey Summary</h3>
              <div className="space-y-3 text-left">
                {responses.step1?.bodyLocation && (
                  <div className={`${textSecondary} text-sm`}>
                    <span className="font-medium">Body location:</span> {responses.step1.bodyLocation}
                  </div>
                )}
                {element && (
                  <div className={`${textSecondary} text-sm`}>
                    <span className="font-medium">Released through:</span> {element.emoji} {element.name}
                  </div>
                )}
                {quality && (
                  <div className={`${textSecondary} text-sm`}>
                    <span className="font-medium">Invited in:</span> {quality}
                  </div>
                )}
                {responses.step8?.mood && (
                  <div className={`${textSecondary} text-sm`}>
                    <span className="font-medium">Feeling after:</span> {MOODS.find(m => m.value === responses.step8.mood)?.emoji} {MOODS.find(m => m.value === responses.step8.mood)?.label}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-6 text-amber-500">
              <Star className="w-5 h-5 fill-amber-500" />
              <span className="font-semibold">+50 XP Earned</span>
              <Star className="w-5 h-5 fill-amber-500" />
            </div>

            <p className={`italic mb-8 ${textMuted}`}>
              "The burden you carried was never yours to keep. You are lighter now. Trust this new space within you."
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={startFresh} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all">
                Begin Another Ceremony
              </button>
              <Link to="/exercises" className={`px-6 py-3 rounded-xl font-semibold border ${cardBorder} ${textSecondary} hover:bg-emerald-50 dark:hover:bg-slate-700 transition-all inline-block`}>
                Back to Exercises
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepData = STEPS[currentStep - 1];
  const StepIcon = stepData.icon;
  const progress = (currentStep / 8) * 100;

  const renderStepContent = () => {
    const key = `step${currentStep}`;
    const resp = responses[key] || {};

    switch (stepData.type) {
      case 'body-scan':
        return (
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Where do you feel it in your body?</label>
              <div className="flex flex-wrap gap-2">
                {BODY_LOCATIONS.map(loc => (
                  <button
                    key={loc}
                    onClick={() => updateResponse(key, { bodyLocation: loc })}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      resp.bodyLocation === loc
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                        : `${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>What does it look like? Describe the shape, color, texture...</label>
              <textarea
                value={resp.visualization || ''}
                onChange={e => updateResponse(key, { visualization: e.target.value })}
                placeholder="It looks like a heavy, dark stone sitting on my chest..."
                rows={4}
                className={`w-full rounded-xl p-4 border focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${inputBg}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Give this part a name (optional)</label>
              <input
                type="text"
                value={resp.partName || ''}
                onChange={e => updateResponse(key, { partName: e.target.value })}
                placeholder="e.g., The Heavy One, Little Me, The Guardian..."
                className={`w-full rounded-xl p-4 border focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${inputBg}`}
              />
            </div>
          </div>
        );

      case 'journal':
        return (
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>What burden is this part carrying?</label>
              <textarea
                value={resp.burden || ''}
                onChange={e => updateResponse(key, { burden: e.target.value })}
                placeholder="This part has been carrying..."
                rows={4}
                className={`w-full rounded-xl p-4 border focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${inputBg}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Where did this burden come from?</label>
              <textarea
                value={resp.origin || ''}
                onChange={e => updateResponse(key, { origin: e.target.value })}
                placeholder="This burden started when..."
                rows={3}
                className={`w-full rounded-xl p-4 border focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${inputBg}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>How long has this part been carrying it?</label>
              <textarea
                value={resp.duration || ''}
                onChange={e => updateResponse(key, { duration: e.target.value })}
                placeholder="For as long as I can remember... / Since I was..."
                rows={2}
                className={`w-full rounded-xl p-4 border focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${inputBg}`}
              />
            </div>
          </div>
        );

      case 'permission':
        return (
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-3 ${textSecondary}`}>Is this part ready to let go?</label>
              <div className="flex gap-4">
                {['yes', 'not yet', 'somewhat'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => updateResponse(key, { ready: opt })}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                      resp.ready === opt
                        ? opt === 'yes'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                          : opt === 'not yet'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                        : `${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                    }`}
                  >
                    {opt === 'yes' ? '✓ Yes' : opt === 'not yet' ? '⏳ Not Yet' : '〰️ Partially'}
                  </button>
                ))}
              </div>
            </div>
            {resp.ready === 'not yet' && (
              <div className={`rounded-xl p-4 ${isDark ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
                <p className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  That's completely okay. Honor the timing of your parts. You can return to this ceremony when they're ready.
                </p>
              </div>
            )}
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Do any protector parts have concerns?</label>
              <textarea
                value={resp.protectorConcerns || ''}
                onChange={e => updateResponse(key, { protectorConcerns: e.target.value })}
                placeholder="Are there any protective parts that need to be heard first?"
                rows={3}
                className={`w-full rounded-xl p-4 border focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${inputBg}`}
              />
            </div>
          </div>
        );

      case 'gratitude':
        return (
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Write a letter of gratitude to this part</label>
              <textarea
                value={resp.gratitudeLetter || ''}
                onChange={e => updateResponse(key, { gratitudeLetter: e.target.value })}
                placeholder="Dear part of me that has been carrying this burden,&#10;&#10;Thank you for..."
                rows={8}
                className={`w-full rounded-xl p-4 border focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${inputBg}`}
              />
            </div>
            <div className={`rounded-xl p-4 ${isDark ? 'bg-emerald-900/20 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200'}`}>
              <p className={`text-sm italic ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                💚 Prompts: How has this part tried to protect you? What would you want it to know? What would your life have been like without its protection?
              </p>
            </div>
          </div>
        );

      case 'element':
        return (
          <div className="space-y-4">
            {ELEMENTS.map(el => {
              const ElIcon = el.icon;
              const selected = resp.element === el.id;
              return (
                <button
                  key={el.id}
                  onClick={() => updateResponse(key, { element: el.id })}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selected
                      ? `${isDark ? el.darkBg : el.bg} ${el.border} shadow-md`
                      : `${isDark ? 'border-slate-700 hover:border-slate-600' : 'border-gray-200 hover:border-gray-300'}`
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${el.color} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-2xl">{el.emoji}</span>
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold ${textPrimary}`}>{el.name}</div>
                      <div className={`text-sm ${textSecondary}`}>{el.description}</div>
                    </div>
                    {selected && <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'release': {
        const chosenElement = ELEMENTS.find(e => e.id === responses.step5?.element);
        const elementName = chosenElement?.name || 'your chosen element';
        const elementEmoji = chosenElement?.emoji || '✨';
        const elementColor = chosenElement?.color || 'from-emerald-400 to-teal-500';

        return (
          <div className="space-y-6">
            <div className={`rounded-2xl p-6 text-center ${isDark ? 'bg-slate-700/50' : 'bg-gradient-to-br from-emerald-50 to-teal-50'}`}>
              <p className={`text-lg mb-4 ${textSecondary}`}>
                Visualize the burden leaving your body through <span className="font-semibold">{elementEmoji} {elementName}</span>. Feel the weight lifting with each breath.
              </p>
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${elementColor} ${releaseActive ? 'animate-pulse' : ''} opacity-80`} />
                <div className={`absolute inset-2 rounded-full bg-gradient-to-br ${elementColor} ${releaseActive ? 'animate-ping' : ''} opacity-30`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl">{elementEmoji}</span>
                </div>
              </div>
              <div className={`text-3xl font-mono font-bold mb-4 ${textPrimary}`}>
                {formatTimer(releaseTimer)}
              </div>
              {!releaseActive ? (
                <button
                  onClick={startReleaseTimer}
                  className={`px-8 py-3 bg-gradient-to-r ${elementColor} text-white rounded-xl font-semibold hover:shadow-lg transition-all`}
                >
                  Begin Release
                </button>
              ) : (
                <button
                  onClick={stopReleaseTimer}
                  className={`px-8 py-3 rounded-xl font-semibold border ${cardBorder} ${textSecondary} hover:bg-gray-100 dark:hover:bg-slate-700 transition-all`}
                >
                  I'm Ready to Continue
                </button>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>What did you notice during the release?</label>
              <textarea
                value={resp.releaseNotes || ''}
                onChange={e => updateResponse(key, { releaseNotes: e.target.value })}
                placeholder="I noticed..."
                rows={3}
                className={`w-full rounded-xl p-4 border focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${inputBg}`}
              />
            </div>
          </div>
        );
      }

      case 'fill':
        return (
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-3 ${textSecondary}`}>Choose a quality to invite in:</label>
              <div className="flex flex-wrap gap-2">
                {QUALITIES.map(q => (
                  <button
                    key={q}
                    onClick={() => updateResponse(key, { quality: q, customQuality: '' })}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      resp.quality === q
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                        : `${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Or write your own quality:</label>
              <input
                type="text"
                value={resp.customQuality || ''}
                onChange={e => updateResponse(key, { customQuality: e.target.value, quality: '' })}
                placeholder="A quality that feels right for you..."
                className={`w-full rounded-xl p-4 border focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${inputBg}`}
              />
            </div>
            <div className={`rounded-xl p-4 ${isDark ? 'bg-emerald-900/20 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200'}`}>
              <p className={`text-sm italic ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                ✨ Breathe in this quality. Imagine it filling the space where the burden used to live. Let it radiate through your entire body.
              </p>
            </div>
          </div>
        );

      case 'integration':
        return (
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>How does your body feel now?</label>
              <textarea
                value={resp.reflection || ''}
                onChange={e => updateResponse(key, { reflection: e.target.value })}
                placeholder="I notice that my body feels..."
                rows={5}
                className={`w-full rounded-xl p-4 border focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${inputBg}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-3 ${textSecondary}`}>How are you feeling right now?</label>
              <div className="flex gap-2 justify-center">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => updateResponse(key, { mood: m.value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                      resp.mood === m.value
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md scale-110'
                        : `${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className={`text-xs font-medium ${resp.mood === m.value ? 'text-white' : textSecondary}`}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Any message to your future self about this experience?</label>
              <textarea
                value={resp.futureMessage || ''}
                onChange={e => updateResponse(key, { futureMessage: e.target.value })}
                placeholder="Dear future me..."
                rows={3}
                className={`w-full rounded-xl p-4 border focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${inputBg}`}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    const key = `step${currentStep}`;
    const resp = responses[key] || {};
    switch (currentStep) {
      case 1: return resp.bodyLocation;
      case 2: return resp.burden;
      case 3: return resp.ready;
      case 4: return resp.gratitudeLetter;
      case 5: return resp.element;
      case 6: return true;
      case 7: return resp.quality || resp.customQuality;
      case 8: return resp.reflection && resp.mood;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/exercises" className={`flex items-center gap-2 ${textSecondary} hover:text-emerald-500 transition-colors`}>
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Exercises</span>
          </Link>
          <div className="flex items-center gap-2">
            {saving && <Clock className="w-4 h-4 text-emerald-500 animate-spin" />}
            <span className={`text-sm ${textMuted}`}>Step {currentStep} of 8</span>
          </div>
        </div>

        <div className="mb-8">
          <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map(s => {
              const done = s.id < currentStep;
              const active = s.id === currentStep;
              return (
                <div
                  key={s.id}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md scale-125'
                        : `${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'}`
                  }`}
                >
                  {done ? '✓' : s.id}
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${cardBg} backdrop-blur-sm rounded-3xl shadow-xl border ${cardBorder} overflow-hidden`}>
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <StepIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{stepData.title}</h2>
                <p className="text-emerald-100 text-sm">Step {currentStep} of 8</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className={`text-base leading-relaxed mb-6 ${textSecondary} italic`}>
              "{stepData.instruction}"
            </p>

            {renderStepContent()}

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={goBack}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                  currentStep === 1
                    ? 'opacity-30 cursor-not-allowed'
                    : `${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}`
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${
                  canProceed()
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-md hover:shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                }`}
              >
                {currentStep === 8 ? 'Complete Ceremony' : 'Continue'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
