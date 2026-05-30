import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, 
  Play, 
  CheckCircle, 
  Lock, 
  Clock, 
  Users, 
  Award, 
  Target,
  Heart,
  Brain,
  Shield,
  Sparkles,
  ArrowRight,
  Star,
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';
import { supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const Curriculum = () => {
  const [searchParams] = useSearchParams();
  const [selectedModule, setSelectedModule] = useState(searchParams.get('module') || null);
  const [completedModules, setCompletedModules] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [showModuleDetail, setShowModuleDetail] = useState(false);

  useEffect(() => {
    const loadCompleted = async () => {
      const client = clientAuth.getCurrentClient();
      if (client?.id) {
        try {
          const allProgress = await supabaseHelpers.getAllModuleProgress(client.id);
          const completed = (allProgress || [])
            .filter(p => p.completed)
            .map(p => p.module_id);
          setCompletedModules(completed);
        } catch (err) {
          console.error('Error loading completed modules:', err);
        }
      }
    };
    loadCompleted();
    if (selectedModule) {
      setShowModuleDetail(true);
    }
  }, [selectedModule]);

  const curriculumData = {
    modules: [
      {
        id: 'foundation',
        title: 'Foundation: Understanding Your Inner World',
        description: 'Build the fundamental understanding of IFS and connect with your inner child',
        duration: '6 weeks',
        lessons: [
          {
            id: 'intro-ifs',
            title: 'Introduction to Internal Family Systems',
            duration: '45 min',
            type: 'video',
            content: 'Learn the core concepts of IFS therapy and how it applies to inner child healing',
            exercises: ['Self-reflection journaling', 'Parts identification exercise']
          },
          {
            id: 'meeting-self',
            title: 'Meeting Your Self',
            duration: '30 min',
            type: 'meditation',
            content: 'Guided meditation to connect with your core Self energy',
            exercises: ['Self-energy breathing practice', 'Body scan meditation']
          },
          {
            id: 'inner-child-intro',
            title: 'Understanding Your Inner Child',
            duration: '60 min',
            type: 'lesson',
            content: 'Explore the concept of the inner child and its role in your healing journey',
            exercises: ['Inner child visualization', 'Timeline creation']
          },
          {
            id: 'basic-parts',
            title: 'Identifying Your Basic Parts',
            duration: '45 min',
            type: 'interactive',
            content: 'Learn to identify the main parts of your internal system',
            exercises: ['Parts mapping worksheet', 'Dialogue practice']
          }
        ],
        prerequisites: [],
        outcomes: [
          'Understanding of IFS fundamentals',
          'Ability to identify your Self energy',
          'Basic awareness of your inner child',
          'Introduction to your parts system'
        ],
        color: 'from-blue-400 to-blue-600',
        icon: Brain,
        level: 'Beginner'
      },
      {
        id: 'inner-child-connection',
        title: 'Inner Child Connection & Healing',
        description: 'Deepen your relationship with your inner child and begin the healing process',
        duration: '8 weeks',
        lessons: [
          {
            id: 'child-wounds',
            title: 'Understanding Child Wounds',
            duration: '50 min',
            type: 'lesson',
            content: 'Comprehensive exploration of common inner child wounds and their impacts',
            exercises: ['Wound assessment', 'Healing intention setting']
          },
          {
            id: 'connecting-child',
            title: 'Connecting with Your Inner Child',
            duration: '40 min',
            type: 'meditation',
            content: 'Guided practice to safely meet and connect with your inner child',
            exercises: ['Inner child meeting meditation', 'Safe space creation']
          },
          {
            id: 'child-needs',
            title: 'Understanding Your Child\'s Needs',
            duration: '45 min',
            type: 'interactive',
            content: 'Identify what your inner child needs for healing and wholeness',
            exercises: ['Needs assessment worksheet', 'Parenting inner child exercise']
          },
          {
            id: 'reparenting',
            title: 'Reparenting Your Inner Child',
            duration: '60 min',
            type: 'practice',
            content: 'Learn to provide the love and care your inner child needed',
            exercises: ['Reparenting affirmations', 'Daily care practices']
          },
          {
            id: 'emotional-release',
            title: 'Emotional Release & Expression',
            duration: '50 min',
            type: 'exercise',
            content: 'Safe techniques for releasing stored emotions',
            exercises: ['Emotional release meditation', 'Expression exercises']
          }
        ],
        prerequisites: ['foundation'],
        outcomes: [
          'Deep connection with inner child',
          'Understanding of your specific wounds',
          'Reparenting skills',
          'Emotional release techniques'
        ],
        color: 'from-emerald-400 to-emerald-600',
        icon: Heart,
        level: 'Intermediate'
      },
      {
        id: 'self-leadership',
        title: 'Self-Leadership Development',
        description: 'Strengthen your Self to lead and heal your internal system',
        duration: '10 weeks',
        lessons: [
          {
            id: 'self-qualities',
            title: 'The 8 C\'s of Self',
            duration: '45 min',
            type: 'lesson',
            content: 'Explore curiosity, calmness, compassion, confidence, courage, creativity, clarity, and connectedness',
            exercises: ['Self-qualities assessment', 'Daily cultivation practices']
          },
          {
            id: 'strengthening-self',
            title: 'Strengthening Self Energy',
            duration: '40 min',
            type: 'meditation',
            content: 'Practices to build and strengthen your core Self',
            exercises: ['Self-energy meditation', 'Integration practices']
          },
          {
            id: 'leading-parts',
            title: 'Leading Your Parts',
            duration: '55 min',
            type: 'interactive',
            content: 'Learn to lead your parts from a place of Self energy',
            exercises: ['Leadership practice', 'Parts council meditation']
          },
          {
            id: 'handling-firefighters',
            title: 'Working with Firefighter Parts',
            duration: '50 min',
            type: 'practice',
            content: 'Understand and work with parts that engage in impulsive behaviors',
            exercises: ['Firefighter mapping', 'Containment techniques']
          },
          {
            id: 'helping-managers',
            title: 'Supporting Manager Parts',
            duration: '45 min',
            type: 'lesson',
            content: 'Help your protective parts relax and trust the Self',
            exercises: ['Manager appreciation', 'Trust-building exercises']
          },
          {
            id: 'unblending',
            title: 'Unblending from Parts',
            duration: '40 min',
            type: 'technique',
            content: 'Learn to separate from parts when you\'re blended',
            exercises: ['Unblending techniques', 'Presence practice']
          }
        ],
        prerequisites: ['inner-child-connection'],
        outcomes: [
          'Strong Self leadership',
          'Ability to work with all parts',
          'Unblending mastery',
          'Internal system harmony'
        ],
        color: 'from-amber-400 to-amber-600',
        icon: Shield,
        level: 'Advanced'
      },
      {
        id: 'unburdening',
        title: 'Unburdening & Deep Healing',
        description: 'Guide your parts to release the burdens they carry',
        duration: '8 weeks',
        lessons: [
          {
            id: 'understanding-burdens',
            title: 'Understanding Part Burdens',
            duration: '50 min',
            type: 'lesson',
            content: 'Explore how parts accumulate burdens from painful experiences',
            exercises: ['Burden identification', 'Part interviews']
          },
          {
            id: 'preparing-unburdening',
            title: 'Preparing for Unburdening',
            duration: '45 min',
            type: 'practice',
            content: 'Create the conditions for successful unburdening',
            exercises: ['Safety assessment', 'Witness preparation']
          },
          {
            id: 'unburdening-protocals',
            title: 'Unburdening Protocols',
            duration: '60 min',
            type: 'technique',
            content: 'Learn different approaches to helping parts release burdens',
            exercises: ['Guided unburdening', 'Witness practice']
          },
          {
            id: 'post-unburdening',
            title: 'Post-Unburdening Integration',
            duration: '40 min',
            type: 'integration',
            content: 'Support parts after releasing their burdens',
            exercises: ['Integration practices', 'Celebration rituals']
          }
        ],
        prerequisites: ['self-leadership'],
        outcomes: [
          'Unburdening proficiency',
          'Transformative healing skills',
          'Integration techniques',
          'Deep system release'
        ],
        color: 'from-yellow-400 to-yellow-600',
        icon: Sparkles,
        level: 'Advanced'
      }
    ]
  };

  const isModuleUnlocked = (moduleId) => {
    const module = curriculumData.modules.find(m => m.id === moduleId);
    if (!module) return false;
    if (module.prerequisites.length === 0) return true;
    return module.prerequisites.every(prereq => completedModules.includes(prereq));
  };

  const getModuleProgress = (moduleId) => {
    const module = curriculumData.modules.find(m => m.id === moduleId);
    if (!module) return 0;
    
    const completedLessons = module.lessons.filter(lesson => 
      completedModules.includes(`${moduleId}-${lesson.id}`)
    ).length;
    
    return Math.round((completedLessons / module.lessons.length) * 100);
  };

  const handleModuleSelect = (moduleId) => {
    if (isModuleUnlocked(moduleId)) {
      setSelectedModule(moduleId);
      setShowModuleDetail(true);
      setCurrentLesson(0);
    }
  };

  const handleLessonClick = (moduleId, lessonIndex) => {
    setCurrentLesson(lessonIndex);
  };

  if (showModuleDetail && selectedModule) {
    const module = curriculumData.modules.find(m => m.id === selectedModule);
    const currentLessonData = module.lessons[currentLesson];

    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Module Header */}
          <div className={`bg-gradient-to-r ${module.color} rounded-3xl p-8 mb-8 text-white`}>
            <button
              onClick={() => setShowModuleDetail(false)}
              className="mb-4 text-white/80 hover:text-white transition-colors"
            >
              ← Back to Curriculum
            </button>
            
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{module.title}</h1>
                <p className="text-xl text-white/90 mb-4">{module.description}</p>
                <div className="flex items-center space-x-6 text-white/80">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    {module.duration}
                  </div>
                  <div className="flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    {module.level}
                  </div>
                  <div className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    {module.lessons.length} lessons
                  </div>
                </div>
              </div>
              <div className={`w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center`}>
                <module.icon className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Lesson List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Lessons</h3>
                <div className="space-y-2">
                  {module.lessons.map((lesson, index) => {
                    const isCompleted = completedModules.includes(`${selectedModule}-${lesson.id}`);
                    const isCurrent = index === currentLesson;
                    
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleLessonClick(selectedModule, index)}
                        className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                          isCurrent
                            ? 'bg-amber-100 border-2 border-amber-300'
                            : isCompleted
                            ? 'bg-green-50 border-2 border-green-200'
                            : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                            ) : isCurrent ? (
                              <Play className="w-5 h-5 text-amber-600 mr-3" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full mr-3" />
                            )}
                            <span className="font-medium text-gray-900">Lesson {index + 1}</span>
                          </div>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-800 mb-1">{lesson.title}</h4>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {lesson.duration}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {currentLessonData && (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  {/* Lesson Header */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          currentLessonData.type === 'video' ? 'bg-blue-100 text-blue-700' :
                          currentLessonData.type === 'meditation' ? 'bg-amber-100 text-amber-700' :
                          currentLessonData.type === 'interactive' ? 'bg-green-100 text-green-700' :
                          currentLessonData.type === 'practice' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {currentLessonData.type}
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {currentLessonData.duration}
                        </div>
                      </div>
                    </div>
                    
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">{currentLessonData.title}</h2>
                    <p className="text-lg text-gray-600 leading-relaxed">{currentLessonData.content}</p>
                  </div>

                  {/* Interactive Content based on type */}
                  <div className={`mb-8 rounded-2xl p-8 ${
                    currentLessonData.type === 'video' ? 'bg-blue-50' :
                    currentLessonData.type === 'meditation' ? 'bg-amber-50' :
                    currentLessonData.type === 'interactive' ? 'bg-green-50' :
                    currentLessonData.type === 'practice' ? 'bg-orange-50' :
                    'bg-gray-50'
                  }`}>
                    {currentLessonData.type === 'video' && (
                      <div className="text-center">
                        <div className="w-full max-w-2xl mx-auto bg-gray-300 rounded-xl aspect-video flex items-center justify-center mb-4">
                          <Play className="w-16 h-16 text-gray-600" />
                        </div>
                        <p className="text-gray-600">Video lesson content would appear here</p>
                      </div>
                    )}
                    
                    {currentLessonData.type === 'meditation' && (
                      <div className="text-center">
                        <div className="w-32 h-32 bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                          <Brain className="w-16 h-16 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Guided Meditation</h3>
                        <p className="text-gray-600 mb-6">Find a comfortable position and press play when ready</p>
                        <button className="bg-amber-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-amber-700 transition-colors">
                          Start Meditation
                        </button>
                      </div>
                    )}
                    
                    {currentLessonData.type === 'interactive' && (
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Interactive Exercise</h3>
                        <div className="bg-white rounded-xl p-6 mb-4">
                          <p className="text-gray-600 mb-4">This interactive exercise will guide you through...</p>
                          <button className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                            Start Exercise
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Exercises */}
                  {currentLessonData.exercises && (
                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Practice Exercises</h3>
                      <div className="space-y-3">
                        {currentLessonData.exercises.map((exercise, index) => (
                          <div key={index} className="border border-gray-200 rounded-xl p-4 hover:border-amber-300 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900">{exercise}</h4>
                                <p className="text-sm text-gray-600">Complete this exercise to deepen your understanding</p>
                              </div>
                              <button className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg font-medium hover:bg-amber-200 transition-colors">
                                Start
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setCurrentLesson(Math.max(0, currentLesson - 1))}
                      disabled={currentLesson === 0}
                      className="flex items-center px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Previous Lesson
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      {Array.from({ length: module.lessons.length }, (_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i === currentLesson ? 'bg-amber-600' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    
                    <button
                      onClick={() => {
                        if (currentLesson < module.lessons.length - 1) {
                          setCurrentLesson(currentLesson + 1);
                        } else {
                          // Complete module
                          const updatedCompleted = [...completedModules, selectedModule];
                          setCompletedModules(updatedCompleted);
                          const client = clientAuth.getCurrentClient();
                          if (client?.id) {
                            supabaseHelpers.saveModuleProgress(client.id, selectedModule, { isCompleted: true });
                          }
                          setShowModuleDetail(false);
                        }
                      }}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-amber-600 to-emerald-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-emerald-700 transition-all duration-300"
                    >
                      {currentLesson < module.lessons.length - 1 ? (
                        <>
                          Next Lesson
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </>
                      ) : (
                        'Complete Module'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Learning Outcomes */}
              <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">What You'll Learn</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {module.outcomes.map((outcome, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{outcome}</span>
                    </div>
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
      <div className="bg-gradient-to-r from-amber-600 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Healing Curriculum
            </h1>
            <p className="text-xl text-amber-100 max-w-3xl mx-auto">
              A step-by-step journey through Inner Child healing using Internal Family Systems
            </p>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      {completedModules.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">{completedModules.length}</div>
                <div className="text-gray-600">Modules Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {Math.round((completedModules.length / curriculumData.modules.length) * 100)}%
                </div>
                <div className="text-gray-600">Overall Progress</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {curriculumData.modules.reduce((total, module) => {
                    return total + module.lessons.length;
                  }, 0)}
                </div>
                <div className="text-gray-600">Total Lessons</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {curriculumData.modules.filter(m => isModuleUnlocked(m.id)).length}
                </div>
                <div className="text-gray-600">Available Modules</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modules Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {curriculumData.modules.map((module) => {
            const isUnlocked = isModuleUnlocked(module.id);
            const progress = getModuleProgress(module.id);
            const Icon = module.icon;
            
            return (
              <div
                key={module.id}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ${
                  isUnlocked 
                    ? 'hover:shadow-2xl hover:scale-105 cursor-pointer' 
                    : 'opacity-75 cursor-not-allowed'
                }`}
                onClick={() => isUnlocked && handleModuleSelect(module.id)}
              >
                {/* Module Header */}
                <div className={`bg-gradient-to-r ${module.color} p-6 text-white`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    {!isUnlocked && (
                      <Lock className="w-6 h-6 text-white/80" />
                    )}
                    {progress > 0 && progress < 100 && (
                      <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-sm font-medium">
                        {progress}% Complete
                      </div>
                    )}
                    {progress === 100 && (
                      <div className="bg-green-500 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Completed
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2">{module.title}</h3>
                  <p className="text-white/90">{module.description}</p>
                </div>

                {/* Module Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {module.duration}
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="w-4 h-4 mr-1" />
                        {module.lessons.length} lessons
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      module.level === 'Beginner' ? 'bg-green-100 text-green-700' :
                      module.level === 'Intermediate' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {module.level}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {progress > 0 && (
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-amber-600 to-emerald-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Prerequisites */}
                  {module.prerequisites.length > 0 && (
                    <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Prerequisites:</strong> {module.prerequisites.join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Key Outcomes */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Key Outcomes:</h4>
                    <ul className="space-y-1">
                      {module.outcomes.slice(0, 2).map((outcome, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <Star className="w-3 h-3 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                          {outcome}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <button
                    disabled={!isUnlocked}
                    className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                      !isUnlocked
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : progress === 100
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gradient-to-r from-amber-600 to-emerald-600 text-white hover:from-amber-700 hover:to-emerald-700'
                    }`}
                  >
                    {progress === 100 ? 'Review Module' :
                     progress > 0 ? 'Continue Learning' :
                     isUnlocked ? 'Start Module' : 'Locked'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Learning Path Visualization */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Learning Path</h2>
          <p className="text-xl text-gray-600">Follow the proven sequence for optimal healing</p>
        </div>

        <div className="relative">
          {/* Connection Lines */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 transform -translate-y-1/2 hidden md:block"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {curriculumData.modules.map((module, index) => {
              const isUnlocked = isModuleUnlocked(module.id);
              const isCompleted = completedModules.includes(module.id);
              
              return (
                <div key={module.id} className="relative">
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-600 text-white' 
                      : isUnlocked
                      ? 'bg-amber-600 border-amber-700 text-white'
                      : 'bg-gray-300 border-gray-400 text-gray-600'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-8 h-8" />
                    ) : (
                      <span className="font-bold text-lg">{index + 1}</span>
                    )}
                  </div>
                  
                  <div className="text-center mt-4">
                    <h4 className="font-semibold text-gray-900">{module.title.split(':')[0]}</h4>
                    <p className="text-sm text-gray-600 mt-1">{module.duration}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Curriculum;