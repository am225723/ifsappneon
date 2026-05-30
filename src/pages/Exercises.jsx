import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Heart, 
  Brain, 
  Shield, 
  Sparkles, 
  Clock, 
  Headphones, 
  Wind, 
  Moon, 
  Sun,
  Zap,
  Target,
  Eye,
  Hand
} from 'lucide-react';

const Exercises = () => {
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('inhale');
  const [breathingCount, setBreathingCount] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioVolume, setAudioVolume] = useState(1);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const hasAudio = selectedExercise && audioLoaded && !audioError;

  const exerciseCategories = [
    {
      id: 'connection',
      title: 'Self-Connection',
      description: 'Exercises to strengthen your Self energy',
      color: 'from-amber-400 to-amber-600',
      icon: Brain,
      exercises: [
        {
          id: 'meeting-self',
          title: 'Meeting Your Self',
          duration: '15 min',
          type: 'meditation',
          difficulty: 'Beginner',
          description: 'A guided meditation to connect with your core Self energy',
          transcript: `Welcome to this meditation to meet your Self... Begin by finding a comfortable position... Notice your breath...`,
          audioUrl: '/audio/exercises/meeting-self.mp3',
          benefits: ['Deeper Self-awareness', 'Increased clarity', 'Emotional balance']
        },
        {
          id: 'self-qualities',
          title: 'Cultivating Self Qualities',
          duration: '20 min',
          type: 'practice',
          difficulty: 'Intermediate',
          description: "Practice embodying the 8 C's of Self: curiosity, calmness, compassion, confidence, courage, creativity, clarity, and connectedness",
          transcript: `Today we'll explore the qualities of your Self... Each quality is already within you...`,
          audioUrl: '/audio/exercises/self-qualities.mp3',
          benefits: ['Self-leadership', 'Emotional regulation', 'Inner wisdom']
        }
      ]
    },
    {
      id: 'inner-child',
      title: 'Inner Child Work',
      description: 'Connect with and heal your inner child',
      color: 'from-emerald-400 to-emerald-600',
      icon: Heart,
      exercises: [
        {
          id: 'meeting-inner-child',
          title: 'Meeting Your Inner Child',
          duration: '18 min',
          type: 'meditation',
          difficulty: 'Beginner',
          description: 'Safely meet and connect with your inner child part',
          transcript: `Create a safe space in your mind... Call forth your inner child... Notice how they appear...`,
          audioUrl: '/audio/exercises/meeting-inner-child.mp3',
          benefits: ['Inner connection', 'Emotional healing', 'Self-compassion']
        },
        {
          id: 'reparenting',
          title: 'Reparenting Meditation',
          duration: '25 min',
          type: 'practice',
          difficulty: 'Intermediate',
          description: 'Learn to parent your inner child with love and care',
          transcript: `Imagine holding your inner child... What do they need to hear from you?... Offer the love they missed...`,
          audioUrl: '/audio/exercises/reparenting.mp3',
          benefits: ['Healing neglect wounds', 'Self-nurturing', 'Emotional security']
        },
        {
          id: 'child-play',
          title: 'Inner Child Play',
          duration: '12 min',
          type: 'interactive',
          difficulty: 'Beginner',
          description: 'A playful exercise to reconnect with your inner child\'s joy',
          transcript: `Remember what brought you joy as a child... Let yourself play freely...`,
          audioUrl: '/audio/exercises/child-play.mp3',
          benefits: ['Joy and creativity', 'Stress relief', 'Authentic expression']
        }
      ]
    },
    {
      id: 'parts-work',
      title: 'Parts Work',
      description: 'Work directly with your internal parts',
      color: 'from-brand-stone-500 to-brand-stone-600',
      icon: Shield,
      exercises: [
        {
          id: 'unblending',
          title: 'Unblending Practice',
          duration: '15 min',
          type: 'technique',
          difficulty: 'Intermediate',
          description: 'Learn to separate from parts when you\'re blended',
          transcript: `Notice which part is present... Ask it to give you some space... Feel the difference...`,
          audioUrl: '/audio/exercises/unblending.mp3',
          benefits: ['Clear perspective', 'Self leadership', 'Emotional freedom']
        },
        {
          id: 'parts-council',
          title: 'Parts Council Meditation',
          duration: '30 min',
          type: 'meditation',
          difficulty: 'Advanced',
          description: 'Facilitate a meeting between your parts from Self energy',
          transcript: `Gather your parts in a council... Each part gets to speak... You listen with compassion...`,
          audioUrl: '/audio/exercises/parts-council.mp3',
          benefits: ['Internal harmony', 'Conflict resolution', 'System integration']
        },
        {
          id: 'firefighter-work',
          title: 'Working with Firefighters',
          duration: '20 min',
          type: 'technique',
          difficulty: 'Intermediate',
          description: 'Learn to work with parts that act impulsively',
          transcript: `Acknowledge your firefighter parts... Thank them for protecting you... Find what they need...`,
          audioUrl: '/audio/exercises/firefighter-work.mp3',
          benefits: ['Impulse control', 'Understanding triggers', 'Self-protection']
        }
      ]
    },
    {
      id: 'breathing',
      title: 'Breathing Exercises',
      description: 'Regulate your nervous system through breath',
      color: 'from-brand-emerald-600 to-brand-emerald-700',
      icon: Wind,
      exercises: [
        {
          id: 'box-breathing',
          title: 'Box Breathing',
          duration: '10 min',
          type: 'breathing',
          difficulty: 'Beginner',
          description: 'Calm your nervous system with this simple 4-4-4-4 breathing pattern',
          transcript: `Inhale for 4... Hold for 4... Exhale for 4... Hold for 4... Repeat...`,
          audioUrl: '/audio/exercises/box-breathing.mp3',
          benefits: ['Stress reduction', 'Focus', 'Anxiety relief']
        },
        {
          id: '4-7-8-breathing',
          title: '4-7-8 Breathing',
          duration: '12 min',
          type: 'breathing',
          difficulty: 'Intermediate',
          description: 'Powerful breathing technique for deep relaxation',
          transcript: `Inhale for 4... Hold for 7... Exhale for 8... Feel the relaxation...`,
          audioUrl: '/audio/exercises/4-7-8-breathing.mp3',
          benefits: ['Deep relaxation', 'Sleep preparation', 'Tension release']
        }
      ]
    }
  ];

  const breathingExercises = [
    {
      id: 'box-breathing',
      name: 'Box Breathing',
      inhale: 4,
      hold1: 4,
      exhale: 4,
      hold2: 4,
      cycles: 10
    },
    {
      id: '4-7-8',
      name: '4-7-8 Breathing',
      inhale: 4,
      hold1: 7,
      exhale: 8,
      hold2: 0,
      cycles: 8
    }
  ];

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!selectedExercise?.audioUrl) {
      setAudioLoaded(false);
      setAudioError(false);
      return;
    }
    setAudioLoaded(false);
    setAudioError(false);
    const audio = new Audio(selectedExercise.audioUrl);
    audio.preload = 'auto';
    audio.addEventListener('loadedmetadata', () => {
      setAudioLoaded(true);
      setDuration(Math.floor(audio.duration));
    });
    audio.addEventListener('error', () => setAudioError(true));
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; audioRef.current = null; };
  }, [selectedExercise?.id, selectedExercise?.audioUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : audioVolume;
  }, [audioVolume, isMuted]);

  useEffect(() => {
    if (!hasAudio || !isPlaying) return;
    const id = setInterval(() => {
      if (audioRef.current) setCurrentTime(Math.floor(audioRef.current.currentTime));
    }, 250);
    return () => clearInterval(id);
  }, [hasAudio, isPlaying]);

  const handleExerciseSelect = (exercise) => {
    if (audioRef.current) { audioRef.current.pause(); }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSelectedExercise(exercise);
    setIsPlaying(false);
    setCurrentTime(0);
    setShowTranscript(false);
    if (!exercise.audioUrl) {
      const durationMinutes = parseInt(exercise.duration);
      setDuration(durationMinutes * 60);
    }
  };

  const togglePlayPause = () => {
    if (hasAudio) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (hasAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startBreathingExercise = (exercise) => {
    setSelectedExercise({
      ...exercise,
      isBreathing: true
    });
    setIsPlaying(true);
    setBreathingPhase('inhale');
    setBreathingCount(0);
    
    let currentPhase = 'inhale';
    let currentCount = 0;
    let cycleCount = 0;
    
    const breathingInterval = setInterval(() => {
      currentCount++;
      
      if (currentPhase === 'inhale' && currentCount >= exercise.inhale) {
        currentPhase = exercise.hold1 > 0 ? 'hold1' : 'exhale';
        currentCount = 0;
        setBreathingPhase(currentPhase === 'hold1' ? 'hold' : 'exhale');
      } else if (currentPhase === 'hold1' && currentCount >= exercise.hold1) {
        currentPhase = 'exhale';
        currentCount = 0;
        setBreathingPhase('exhale');
      } else if (currentPhase === 'exhale' && currentCount >= exercise.exhale) {
        if (exercise.hold2 > 0) {
          currentPhase = 'hold2';
          currentCount = 0;
          setBreathingPhase('hold');
        } else {
          currentPhase = 'inhale';
          currentCount = 0;
          setBreathingPhase('inhale');
          cycleCount++;
          setBreathingCount(cycleCount);
        }
      } else if (currentPhase === 'hold2' && currentCount >= exercise.hold2) {
        currentPhase = 'inhale';
        currentCount = 0;
        setBreathingPhase('inhale');
        cycleCount++;
        setBreathingCount(cycleCount);
      }
      
      setCurrentTime(prev => prev + 1);
      
      if (cycleCount >= exercise.cycles) {
        clearInterval(breathingInterval);
        setIsPlaying(false);
      }
    }, 1000);
  };

  if (selectedExercise && selectedExercise.isBreathing) {
    const phaseConfig = {
      inhale: { text: 'Inhale', color: 'from-brand-stone-500 to-brand-stone-600', duration: selectedExercise.inhale },
      hold: { text: 'Hold', color: 'from-amber-400 to-amber-600', duration: selectedExercise.hold1 || selectedExercise.hold2 },
      exhale: { text: 'Exhale', color: 'from-brand-emerald-600 to-brand-emerald-700', duration: selectedExercise.exhale }
    };
    
    const currentPhaseConfig = phaseConfig[breathingPhase];

    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
          <button
            onClick={() => setSelectedExercise(null)}
            className="mb-6 text-brand-stone-600 dark:text-slate-400 hover:text-brand-stone-900 dark:hover:text-slate-100 transition-colors"
          >
            ← Back to Exercises
          </button>

          <div className="text-center">
            <h1 className="text-4xl font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-4">{selectedExercise.name}</h1>
            <p className="text-xl text-brand-stone-600 dark:text-slate-400 mb-12">Follow the breathing pattern</p>

            {/* Breathing Circle */}
            <div className="relative w-80 h-80 mx-auto mb-12">
              <div className={`absolute inset-0 bg-gradient-to-r ${currentPhaseConfig.color} rounded-full transition-all duration-1000 ${
                breathingPhase === 'inhale' ? 'scale-100' : 'scale-75'
              }`}></div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-6xl font-bold text-white mb-2 ${
                    breathingPhase === 'inhale' ? 'scale-110' : 'scale-100'
                  } transition-transform duration-1000`}>
                    {currentPhaseConfig.text}
                  </div>
                  <div className="text-2xl text-white/90">
                    {breathingPhase === 'inhale' && selectedExercise.inhale - (currentTime % selectedExercise.inhale)}
                    {breathingPhase === 'hold' && (
                      breathingCount < selectedExercise.cycles - 1 
                        ? selectedExercise.hold1 - (currentTime % selectedExercise.hold1)
                        : selectedExercise.hold2 - (currentTime % selectedExercise.hold2)
                    )}
                    {breathingPhase === 'exhale' && selectedExercise.exhale - (currentTime % selectedExercise.exhale)}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-8">
              <div className="text-lg text-brand-stone-600 dark:text-slate-400 mb-2">
                Cycle {breathingCount + 1} of {selectedExercise.cycles}
              </div>
              <div className="w-full bg-brand-stone-200 dark:bg-slate-700 rounded-full h-3 max-w-md mx-auto">
                <div 
                  className="bg-gradient-to-r from-brand-emerald-600 to-brand-gold-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${((breathingCount + 1) / selectedExercise.cycles) * 100}%` }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setIsPlaying(!isPlaying);
                }}
                className="btn-sanctuary-primary text-xl px-8 py-4"
              >
                {isPlaying ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={() => setSelectedExercise(null)}
                className="btn-sanctuary-secondary text-xl px-8 py-4"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedExercise) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setSelectedExercise(null)}
              className="flex items-center text-brand-stone-600 dark:text-slate-400 hover:text-brand-stone-900 dark:hover:text-slate-100 transition-colors"
            >
              ← Back to Exercises
            </button>
            <div className="flex items-center space-x-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                selectedExercise.difficulty === 'Beginner' ? 'bg-brand-emerald-50 text-brand-emerald-700' :
                selectedExercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {selectedExercise.difficulty}
              </span>
              <span className="text-brand-stone-600 dark:text-slate-400 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {selectedExercise.duration}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="soft-card p-8">
                <h1 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-4">{selectedExercise.title}</h1>
                <p className="text-xl text-brand-stone-600 dark:text-slate-400 mb-8">{selectedExercise.description}</p>

                {/* Audio Player */}
                <div className="bg-gradient-to-r from-brand-gold-50 to-brand-emerald-50 dark:from-brand-gold-950/20 dark:to-brand-emerald-950/20 rounded-[28px] p-8 mb-8">
                  <div className="flex items-center justify-center mb-8">
                    <div className="relative">
                      <div className="w-32 h-32 bg-gradient-to-r from-brand-gold-600 to-brand-emerald-700 rounded-full flex items-center justify-center">
                        {isPlaying ? (
                          <Pause className="w-16 h-16 text-white" />
                        ) : (
                          <Play className="w-16 h-16 text-white ml-2" />
                        )}
                      </div>
                      {isPlaying && (
                        <div className="absolute inset-0 rounded-full border-4 border-amber-300 animate-ping"></div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-sm text-brand-stone-600 dark:text-slate-400 mb-2">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <div className="w-full bg-white/40 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-brand-gold-600 to-brand-emerald-700 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={handleReset}
                      className="p-3 bg-white/40 rounded-full hover:bg-white/70 transition-colors"
                    >
                      <RotateCcw className="w-5 h-5 text-brand-stone-700 dark:text-slate-300" />
                    </button>
                    <button
                      onClick={togglePlayPause}
                      className="p-4 bg-white/80 rounded-full hover:bg-white/90 transition-colors shadow-lg"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 text-brand-stone-700 dark:text-slate-300" />
                      ) : (
                        <Play className="w-6 h-6 text-brand-stone-700 dark:text-slate-300 ml-1" />
                      )}
                    </button>
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-3 bg-white/40 rounded-full hover:bg-white/70 transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-brand-stone-700 dark:text-slate-300" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-brand-stone-700 dark:text-slate-300" />
                      )}
                    </button>
                  </div>
                  {hasAudio && (
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <Volume2 className="w-4 h-4 text-brand-stone-500 dark:text-slate-500" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : audioVolume}
                        onChange={(e) => { setAudioVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                        className="w-32 accent-amber-600"
                      />
                    </div>
                  )}
                </div>

                {/* Benefits */}
                <div>
                  <h3 className="text-xl font-serif font-semibold text-brand-stone-900 dark:text-slate-100 mb-4">Benefits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedExercise.benefits?.map((benefit, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-brand-stone-700 dark:text-slate-300">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Instructions */}
              <div className="soft-card p-6 mb-6">
                <h3 className="text-lg font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-4 flex items-center">
                  <Headphones className="w-5 h-5 mr-2 text-amber-600" />
                  Instructions
                </h3>
                <ul className="space-y-3 text-brand-stone-600 dark:text-slate-400">
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Find a quiet, comfortable space
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Use headphones for best experience
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Close your eyes when ready
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Follow the guidance at your own pace
                  </li>
                  <li className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    Be gentle with yourself throughout
                  </li>
                </ul>
              </div>

              {/* Transcript Toggle */}
              <div className="soft-card p-6 mb-6">
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-lg font-serif font-normal text-brand-stone-900 dark:text-slate-100 flex items-center">
                    <Eye className="w-5 h-5 mr-2 text-amber-600" />
                    Transcript
                  </h3>
                  <span className="text-amber-600">
                    {showTranscript ? 'Hide' : 'Show'}
                  </span>
                </button>
                
                {showTranscript && (
                  <div className="mt-4 p-4 bg-brand-stone-50 dark:bg-slate-800/50 rounded-lg max-h-64 overflow-y-auto">
                    <p className="text-brand-stone-700 dark:text-slate-300 text-sm leading-relaxed">
                      {selectedExercise.transcript}
                    </p>
                  </div>
                )}
              </div>

              {/* Related Exercises */}
              <div className="soft-card p-6">
                <h3 className="text-lg font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-4">Related Exercises</h3>
                <div className="space-y-3">
                  {exerciseCategories
                    .flatMap(cat => cat.exercises)
                    .filter(ex => ex.id !== selectedExercise.id)
                    .slice(0, 3)
                    .map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => handleExerciseSelect(exercise)}
                        className="w-full text-left p-3 bg-brand-stone-50 dark:bg-slate-800/50 rounded-lg hover:bg-brand-stone-100 dark:bg-slate-800/60 transition-colors"
                      >
                        <div className="font-medium text-brand-stone-900 dark:text-slate-100">{exercise.title}</div>
                        <div className="text-sm text-brand-stone-600 dark:text-slate-400">{exercise.duration}</div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-12 lg:pt-20">
        <div className="soft-card bg-gradient-to-br from-brand-emerald-600 to-brand-emerald-700 text-white p-8 lg:p-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Guided Healing Exercises
            </h1>
            <p className="text-xl text-brand-emerald-50/90 max-w-3xl mx-auto">
              Transformative practices to strengthen your Self, heal your inner child, and harmonize your parts
            </p>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => handleExerciseSelect(exerciseCategories[0].exercises[0])}
            className="soft-card p-6 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6 text-amber-600" />
              </div>
              <Play className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-bold text-brand-stone-900 dark:text-slate-100 mb-2">Quick Self-Connection</h3>
            <p className="text-sm text-brand-stone-600 dark:text-slate-400">5-minute practice to center yourself</p>
          </button>

          <button
            onClick={() => startBreathingExercise(breathingExercises[0])}
            className="soft-card p-6 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-brand-emerald-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wind className="w-6 h-6 text-brand-emerald-600" />
              </div>
              <Play className="w-5 h-5 text-brand-emerald-600" />
            </div>
            <h3 className="font-bold text-brand-stone-900 dark:text-slate-100 mb-2">Box Breathing</h3>
            <p className="text-sm text-brand-stone-600 dark:text-slate-400">Calm your nervous system instantly</p>
          </button>

          <button
            onClick={() => handleExerciseSelect(exerciseCategories[1].exercises[0])}
            className="soft-card p-6 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6 text-emerald-600" />
              </div>
              <Play className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-brand-stone-900 dark:text-slate-100 mb-2">Inner Child Check-in</h3>
            <p className="text-sm text-brand-stone-600 dark:text-slate-400">Quick connection with your inner child</p>
          </button>
        </div>
      </div>

      {/* Exercise Categories */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {exerciseCategories.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.id} className="mb-12">
              <div className="flex items-center mb-6">
                <div className={`w-16 h-16 bg-gradient-to-r ${category.color} rounded-xl flex items-center justify-center mr-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">{category.title}</h2>
                  <p className="text-brand-stone-600 dark:text-slate-400">{category.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.exercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    onClick={() => handleExerciseSelect(exercise)}
                    className="soft-card p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        exercise.difficulty === 'Beginner' ? 'bg-brand-emerald-50 text-brand-emerald-700' :
                        exercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {exercise.difficulty}
                      </span>
                      <div className="flex items-center text-brand-stone-500 dark:text-slate-500">
                        <Clock className="w-4 h-4 mr-1" />
                        <span className="text-sm">{exercise.duration}</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-serif font-semibold text-brand-stone-900 dark:text-slate-100 mb-2 group-hover:text-brand-gold-700 dark:group-hover:text-brand-gold-500 transition-colors">
                      {exercise.title}
                    </h3>
                    
                    <p className="text-brand-stone-600 dark:text-slate-400 mb-4 leading-relaxed">
                      {exercise.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        exercise.type === 'meditation' ? 'bg-amber-100 text-amber-700' :
                        exercise.type === 'practice' ? 'bg-brand-stone-100 text-brand-stone-600' :
                        exercise.type === 'technique' ? 'bg-brand-emerald-50 text-brand-emerald-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {exercise.type}
                      </span>
                      <div className="flex items-center text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-sm font-medium">Start</span>
                        <Play className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips Section */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="soft-card bg-gradient-to-r from-brand-gold-50 to-brand-emerald-50 dark:from-brand-gold-950/20 dark:to-brand-emerald-950/20 p-8">
          <h2 className="text-2xl font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-6">Tips for Effective Practice</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100 mb-1">Be Consistent</h3>
                <p className="text-brand-stone-600 dark:text-slate-400 text-sm">Regular practice builds deeper connections and lasting change</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100 mb-1">Be Gentle</h3>
                <p className="text-brand-stone-600 dark:text-slate-400 text-sm">Approach yourself with compassion, especially when working with wounded parts</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-brand-stone-500" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100 mb-1">Create Safety</h3>
                <p className="text-brand-stone-600 dark:text-slate-400 text-sm">Ensure you feel safe and supported before deep inner work</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Hand className="w-4 h-4 text-brand-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100 mb-1">Stay Present</h3>
                <p className="text-brand-stone-600 dark:text-slate-400 text-sm">Return to the present moment if you feel overwhelmed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exercises;
