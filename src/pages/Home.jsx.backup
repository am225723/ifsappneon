import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Brain, 
  Sparkles, 
  Play, 
  ArrowRight, 
  Star,
  Shield,
  Users,
  Zap,
  Target,
  Award,
  Clock,
  BookOpen,
  Activity,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Compass,
  Moon,
  Sun,
  CloudRain,
  Flame,
  Wind,
  Mountain,
  Eye,
  Info
} from 'lucide-react';

const Home = () => {
  const [showAssessment, setShowAssessment] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState({});
  const [assessmentResults, setAssessmentResults] = useState(null);
  const [userProgress, setUserProgress] = useState({});
  const [animateHero, setAnimateHero] = useState(false);

  useEffect(() => {
    setAnimateHero(true);
    const savedProgress = localStorage.getItem('userProgress');
    if (savedProgress) {
      setUserProgress(JSON.parse(savedProgress));
    }
  }, []);

  const woundSections = [
    {
      id: 'abandonment',
      title: 'The Wound of Abandonment',
      subtitle: 'The "Lonely" Child',
      description: 'This wound often forms from inconsistent caregiving, physical absence, or emotional withdrawal.',
      icon: CloudRain,
      color: 'from-blue-400 to-blue-600',
      questions: [
        {
          id: 'abandonment_1',
          text: 'I often feel that if I stop being "useful" or "good," people will leave me.'
        },
        {
          id: 'abandonment_2',
          text: 'When I am alone, I feel a deep, hollow sense of panic or emptiness.'
        },
        {
          id: 'abandonment_3',
          text: 'I have a part of me that clings to relationships, even when they are harmful, because being alone feels worse.'
        },
        {
          id: 'abandonment_4',
          text: 'I frequently scan others\' faces or tones for signs that they are pulling away from me.'
        }
      ],
      protectorQuestion: 'Do you have a part that tries to be a "people pleaser" or "caretaker" to ensure no one leaves you?',
      burden: 'I am unlovable unless I earn it',
      protectorType: 'Caretaker managers'
    },
    {
      id: 'shame',
      title: 'The Wound of Shame',
      subtitle: 'The "Unworthy" Child',
      description: 'This wound often forms from criticism, humiliation, or being told you were "too much" or "not enough."',
      icon: Eye,
      color: 'from-gray-400 to-gray-600',
      questions: [
        {
          id: 'shame_1',
          text: 'I feel fundamentally flawed, as if there is something wrong with me at my core.'
        },
        {
          id: 'shame_2',
          text: 'I have a hard time accepting compliments; a part of me believes they are fake or undeserved.'
        },
        {
          id: 'shame_3',
          text: 'I constantly apologize, even for taking up space or having basic needs.'
        },
        {
          id: 'shame_4',
          text: 'When I make a mistake, I don\'t just feel guilt (I did something bad); I feel shame (I am bad).'
        }
      ],
      protectorQuestion: 'Do you have a part that is a harsh "Inner Critic" or a "Perfectionist" trying to hide your flaws?',
      burden: 'I am broken',
      protectorType: 'Perfectionist managers or Critic parts'
    },
    {
      id: 'neglect',
      title: 'The Wound of Neglect/Invisibility',
      subtitle: 'The "Lost" Child',
      description: 'This wound forms when emotional needs were ignored, or you were treated as an accessory rather than a person.',
      icon: Wind,
      color: 'from-purple-400 to-purple-600',
      questions: [
        {
          id: 'neglect_1',
          text: 'I feel like I am invisible in groups, or that my voice doesn\'t carry weight.'
        },
        {
          id: 'neglect_2',
          text: 'I struggle to identify what I want or need; I am much better at knowing what others need.'
        },
        {
          id: 'neglect_3',
          text: 'I have a part that feels it is "selfish" to ask for help or support.'
        },
        {
          id: 'neglect_4',
          text: 'I often feel like I am on the outside looking in, disconnected from the warmth others seem to share.'
        }
      ],
      protectorQuestion: 'Do you have a part that withdraws, dissociates, or "numbs out" to avoid needing anything?',
      burden: 'I don\'t matter',
      protectorType: 'Dissociative firefighters or Passive managers'
    },
    {
      id: 'betrayal',
      title: 'The Wound of Betrayal/Fear',
      subtitle: 'The "Terrified" Child',
      description: 'This wound forms from chaos, abuse, or having trust broken by primary caregivers.',
      icon: AlertCircle,
      color: 'from-red-400 to-red-600',
      questions: [
        {
          id: 'betrayal_1',
          text: 'I find it nearly impossible to trust that people are who they say they are.'
        },
        {
          id: 'betrayal_2',
          text: 'I need to be in control of my environment at all times to feel safe.'
        },
        {
          id: 'betrayal_3',
          text: 'I have a hyper-vigilant part that is always waiting for the "other shoe to drop."'
        },
        {
          id: 'betrayal_4',
          text: 'Vulnerability feels dangerous; showing emotion feels like handing someone a weapon.'
        }
      ],
      protectorQuestion: 'Do you have a part that is aggressive, controlling, or extremely suspicious (a "Manager") to keep you safe?',
      burden: 'The world is unsafe',
      protectorType: 'Controller managers'
    }
  ];

  const handleAnswer = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value
    });
  };

  const handleProtectorAnswer = (sectionId, value) => {
    setAnswers({
      ...answers,
      [`${sectionId}_protector`]: value
    });
  };

  const calculateSectionScore = (section) => {
    const questionScores = section.questions.map(q => answers[q.id] || 0);
    const protectorScore = answers[`${section.id}_protector`] === 'Yes' ? 4 : 0;
    return questionScores.reduce((sum, score) => sum + score, 0) + protectorScore;
  };

  const handleNextSection = () => {
    if (currentSection < woundSections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      calculateResults();
    }
  };

  const handlePreviousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const calculateResults = async () => {
    const results = woundSections.map(section => ({
      ...section,
      score: calculateSectionScore(section),
      maxScore: 24
    }));

    results.sort((a, b) => b.score - a.score);
    setAssessmentResults(results);

    // Generate AI-powered personalized curriculum
    try {
      console.log('🧠 Generating personalized curriculum based on assessment...');
      const personalizedCurriculum = aiCurriculumPersonalizer.analyzeAndPersonalize(results);
      
      // Save personalized curriculum to localStorage for immediate use
      localStorage.setItem('personalizedCurriculum', JSON.stringify(personalizedCurriculum));
      
      // Save assessment results to Supabase if client is authenticated
      const currentClient = clientAuth.getCurrentClient();
      if (currentClient) {
        await clientAuth.saveAssessment(currentClient.id, {
          abandonment_score: results.find(r => r.id === 'abandonment')?.score || 0,
          shame_score: results.find(r => r.id === 'shame')?.score || 0,
          neglect_score: results.find(r => r.id === 'neglect')?.score || 0,
          betrayal_score: results.find(r => r.id === 'betrayal')?.score || 0,
          responses: answers,
          primary_wound: results[0]?.id || null,
          personalized_curriculum: personalizedCurriculum
        });
      }
      
      console.log('✅ Personalized curriculum generated successfully');
    } catch (error) {
      console.error('❌ Error generating personalized curriculum:', error);
    }
  };

  const getHighestScoringSection = () => {
    return assessmentResults && assessmentResults.length > 0 ? assessmentResults[0] : null;
  };

  const resetAssessment = () => {
    setShowAssessment(false);
    setCurrentSection(0);
    setAnswers({});
    setAssessmentResults(null);
  };

  const healingModules = [
    {
      icon: Heart,
      title: "Inner Child Healing",
      description: "Connect with and heal your wounded inner child",
      duration: "6 weeks",
      level: "Foundation",
      color: "from-pink-400 to-pink-600",
      progress: 0
    },
    {
      icon: Brain,
      title: "Parts Understanding",
      description: "Learn to identify and communicate with your internal parts",
      duration: "4 weeks", 
      level: "Intermediate",
      color: "from-purple-400 to-purple-600",
      progress: 0
    },
    {
      icon: Shield,
      title: "Self-Leadership",
      description: "Develop your Self energy to lead your internal system",
      duration: "8 weeks",
      level: "Advanced", 
      color: "from-blue-400 to-blue-600",
      progress: 0
    },
    {
      icon: Sparkles,
      title: "Unburdening Practice",
      description: "Release the burdens your parts carry",
      duration: "5 weeks",
      level: "Advanced",
      color: "from-yellow-400 to-yellow-600",
      progress: 0
    }
  ];

  if (showAssessment && !assessmentResults) {
    const currentSectionData = woundSections[currentSection];
    const Icon = currentSectionData.icon;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <button
                onClick={resetAssessment}
                className="text-white/80 hover:text-white transition-colors"
              >
                ← Exit Assessment
              </button>
              <div className="text-center">
                <h1 className="text-2xl font-bold">The "Burdens of the Exile" Assessment</h1>
                <p className="text-purple-100 mt-2">Section {currentSection + 1} of {woundSections.length}</p>
              </div>
              <div className="text-purple-100">
                {Math.round(((currentSection + 1) / woundSections.length) * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="w-full bg-purple-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${((currentSection + 1) / woundSections.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {/* Section Header */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className={`w-20 h-20 bg-gradient-to-r ${currentSectionData.color} rounded-2xl flex items-center justify-center mr-6`}>
                <Icon className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentSectionData.title}</h2>
                <p className="text-xl text-gray-600 mb-2">{currentSectionData.subtitle}</p>
                <p className="text-gray-600">{currentSectionData.description}</p>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Instructions</h3>
                <Info className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-gray-600 leading-relaxed">
                Read each statement below. Rate how strongly a part of you resonates with the statement on a scale of 0–5.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-4 p-4 bg-purple-50 rounded-lg">
                <div className="text-center">
                  <div className="font-bold text-purple-700">0</div>
                  <div className="text-xs text-gray-600">Not true at all</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-700">1</div>
                  <div className="text-xs text-gray-600">Slightly true</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-700">2</div>
                  <div className="text-xs text-gray-600">Somewhat true</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-700">3</div>
                  <div className="text-xs text-gray-600">Moderately true</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-700">4</div>
                  <div className="text-xs text-gray-600">Very true</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-700">5</div>
                  <div className="text-xs text-gray-600">Deeply and painfully true</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {currentSectionData.questions.map((question, index) => (
                <div key={question.id} className="border-b border-gray-200 pb-6 last:border-0">
                  <p className="text-lg text-gray-800 mb-4 leading-relaxed">
                    <span className="font-semibold text-purple-600 mr-2">{index + 1}.</span>
                    {question.text}
                  </p>
                  <div className="flex space-x-2">
                    {[0, 1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        onClick={() => handleAnswer(question.id, value)}
                        className={`w-12 h-12 rounded-lg border-2 font-semibold transition-all duration-200 ${
                          answers[question.id] === value
                            ? 'border-purple-600 bg-purple-600 text-white'
                            : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Protector Question */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Protector Check</h3>
            <p className="text-lg text-gray-800 mb-6">{currentSectionData.protectorQuestion}</p>
            <div className="flex space-x-4">
              <button
                onClick={() => handleProtectorAnswer(currentSectionData.id, 'Yes')}
                className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                  answers[`${currentSectionData.id}_protector`] === 'Yes'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => handleProtectorAnswer(currentSectionData.id, 'No')}
                className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                  answers[`${currentSectionData.id}_protector`] === 'No'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={handlePreviousSection}
              disabled={currentSection === 0}
              className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous Section
            </button>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                Score: {calculateSectionScore(currentSectionData)} / 24
              </span>
            </div>
            <button
              onClick={handleNextSection}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
            >
              {currentSection === woundSections.length - 1 ? 'View Results' : 'Next Section →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (assessmentResults) {
    const highestScoringSection = getHighestScoringSection();
    const Icon = highestScoringSection?.icon;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Your IFS Assessment Results</h1>
            <p className="text-xl text-purple-100">A trailhead for your healing journey</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Important Note */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start">
              <Info className="w-6 h-6 text-amber-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-amber-900 mb-2">Important Note</h3>
                <p className="text-amber-800 leading-relaxed">
                  This is a conceptual assessment based on Internal Family Systems (IFS) principles. 
                  In IFS, "inner child wounds" are carried by Exiles—young parts of us that have been 
                  isolated to protect the system from the pain they carry (burdens). This is a tool for 
                  self-discovery and coaching exploration, not a clinical diagnostic tool. In IFS, we 
                  approach these wounds with curiosity and compassion, not judgment.
                </p>
              </div>
            </div>
          </div>

          {/* Results Overview */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Wound Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {assessmentResults.map((result) => {
                const SectionIcon = result.icon;
                const percentage = Math.round((result.score / result.maxScore) * 100);
                
                return (
                  <div key={result.id} className="border border-gray-200 rounded-xl p-6">
                    <div className={`w-16 h-16 bg-gradient-to-r ${result.color} rounded-xl flex items-center justify-center mb-4`}>
                      <SectionIcon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{result.subtitle}</h3>
                    <div className="text-2xl font-bold text-purple-600 mb-2">{result.score}/24</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className={`bg-gradient-to-r ${result.color} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-600">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Primary Focus */}
          <div className={`bg-gradient-to-r ${highestScoringSection.color} rounded-3xl p-8 mb-8 text-white`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mr-6">
                  <Icon className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">Primary Focus: {highestScoringSection.title}</h2>
                  <p className="text-xl text-white/90 mb-4">{highestScoringSection.subtitle}</p>
                  <p className="text-white/80 leading-relaxed">
                    In IFS, we don't look at "high scores" as a bad thing; we view them as a Trailhead. 
                    A high score in this category indicates a group of parts that need your attention.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">Your System Pattern</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Protector Pattern</h4>
                  <p className="text-white/90">
                    Your system is likely guarded by {highestScoringSection.protectorType}.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Exile Burden</h4>
                  <p className="text-white/90">
                    The Exile here carries the burden: "{highestScoringSection.burden}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* The Next Step */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">The Next Step: Unblending</h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              If you scored highly in this section, the immediate goal is not to dig up the wound immediately, 
              but to get to know the Protector first.
            </p>
            
            <div className="bg-purple-50 rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold text-purple-900 mb-4">Journaling Prompt for {highestScoringSection.subtitle}</h3>
              <blockquote className="text-lg text-purple-800 italic leading-relaxed pl-4 border-l-4 border-purple-400">
                "I notice I have a Protector part that tries to stop me from feeling {highestScoringSection.title}. 
                I appreciate that it has been working hard to keep me safe from that pain. 
                If that Protector could step back just a little, what would it want me to know about its job?"
              </blockquote>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Recommended Next Steps</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  to="/parts-mapping"
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-lg transition-all duration-300"
                >
                  <Brain className="w-8 h-8 text-purple-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">Parts Mapping</h4>
                  <p className="text-gray-600 text-sm">Identify and get to know your Protector parts</p>
                </Link>
                
                <Link
                  to="/exercises"
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-lg transition-all duration-300"
                >
                  <Heart className="w-8 h-8 text-pink-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">Guided Exercises</h4>
                  <p className="text-gray-600 text-sm">Practice unblending and Self leadership</p>
                </Link>
                
                <Link
                  to="/journal"
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-lg transition-all duration-300"
                >
                  <BookOpen className="w-8 h-8 text-blue-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">Healing Journal</h4>
                  <p className="text-gray-600 text-sm">Document your conversations with parts</p>
                </Link>
              </div>
            </div>
          </div>

          {/* All Results */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Complete Assessment Profile</h2>
            <div className="space-y-4">
              {assessmentResults.map((result) => {
                const SectionIcon = result.icon;
                return (
                  <div key={result.id} className="border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 bg-gradient-to-r ${result.color} rounded-lg flex items-center justify-center mr-4`}>
                          <SectionIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{result.title}</h3>
                          <p className="text-gray-600">{result.subtitle}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">{result.score}/24</div>
                        <div className="text-sm text-gray-600">
                          {result.score >= 18 ? 'High Priority' : 
                           result.score >= 12 ? 'Moderate Priority' : 'Low Priority'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/curriculum"
              onClick={() => {
                // Ensure personalized curriculum is loaded when navigating
                const personalizedCurriculum = localStorage.getItem('personalizedCurriculum');
                if (!personalizedCurriculum && assessmentResults) {
                  // Generate curriculum if not already done
                  const curriculum = aiCurriculumPersonalizer.analyzeAndPersonalize(assessmentResults);
                  localStorage.setItem('personalizedCurriculum', JSON.stringify(curriculum));
                }
              }}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 text-center shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <div className="flex items-center justify-center">
                <Play className="w-5 h-5 mr-2" />
                Start Your Personalized Journey
              </div>
            </Link>
            <button
              onClick={resetAssessment}
              className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors text-center"
            >
              Retake Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with Assessment */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-700">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className={`text-center transition-all duration-1000 ${animateHero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white">
              Heal Your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
                Inner Child
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-purple-100 max-w-3xl mx-auto">
              Discover your inner wounds and begin your transformative healing journey with Internal Family Systems
            </p>
            
            {/* Main CTA - Assessment */}
            <button
              onClick={() => setShowAssessment(true)}
              className="group relative inline-flex items-center px-8 py-6 bg-white text-purple-700 rounded-2xl font-bold text-xl hover:bg-purple-50 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105 mb-8"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center">
                <Brain className="mr-3 w-8 h-8" />
                <span>Take the IFS Wound Assessment</span>
                <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Assessment Description */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 max-w-2xl mx-auto mb-8">
              <p className="text-white text-sm leading-relaxed">
                The "Burdens of the Exile" Assessment is a professional IFS-based tool to help you identify 
                which parts of your inner child carry painful burdens. This isn't about labeling - it's about 
                creating trailheads for compassionate healing.
              </p>
            </div>

            {/* Quick Start Options */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/curriculum" 
                className="inline-flex items-center px-6 py-3 bg-purple-700/50 backdrop-blur text-white rounded-full font-semibold hover:bg-purple-700/70 transition-all duration-300"
              >
                <BookOpen className="mr-2 w-5 h-5" />
                Browse Curriculum
              </Link>
              <Link 
                to="/exercises" 
                className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur text-white rounded-full font-semibold hover:bg-white/30 transition-all duration-300"
              >
                <Play className="mr-2 w-5 h-5" />
                Try Exercises
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Healing Modules Grid */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Your Healing Pathway</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Step-by-step modules designed to guide you through complete Inner Child healing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {healingModules.map((module, index) => {
              const Icon = module.icon;
              return (
                <div key={index} className="group relative">
                  <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-100">
                    <div className={`w-16 h-16 bg-gradient-to-r ${module.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{module.title}</h3>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                        {module.level}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed">{module.description}</p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center text-gray-500 text-sm">
                        <Clock className="w-4 h-4 mr-1" />
                        {module.duration}
                      </div>
                      {module.progress > 0 && (
                        <span className="text-sm font-medium text-purple-600">{module.progress}%</span>
                      )}
                    </div>

                    {module.progress > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${module.progress}%` }}
                        />
                      </div>
                    )}

                    <Link
                      to="/curriculum"
                      className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 text-center"
                    >
                      {module.progress > 0 ? 'Continue' : 'Start Module'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Features */}
      <div className="py-20 bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Interactive Healing Tools</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Engage with your inner world through guided exercises and activities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link
              to="/parts-mapping"
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Compass className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Parts Mapping</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Interactive tool to identify, understand, and connect with your internal family of parts
              </p>
              <div className="flex items-center text-blue-600 font-semibold">
                <span>Explore Your Parts</span>
                <ArrowRight className="ml-2 w-5 h-5" />
              </div>
            </Link>

            <Link
              to="/exercises"
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Guided Exercises</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Meditations and practices to strengthen your Self energy and heal your parts
              </p>
              <div className="flex items-center text-green-600 font-semibold">
                <span>Start Practice</span>
                <ArrowRight className="ml-2 w-5 h-5" />
              </div>
            </Link>

            <Link
              to="/journal"
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Healing Journal</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Sacred space to document your journey and insights from your inner world
              </p>
              <div className="flex items-center text-pink-600 font-semibold">
                <span>Begin Journaling</span>
                <ArrowRight className="ml-2 w-5 h-5" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Healing Principles */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                The IFS Healing Principles
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Bad Parts</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Every part of you has a positive intention and is trying to help in the only way it knows how.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Self-Leadership</h3>
                    <p className="text-gray-600 leading-relaxed">
                      You have a core Self that is calm, compassionate, and capable of leading your internal system.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Unburdening</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Parts can release the burdens they carry when they feel safe and connected to Self.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl p-8">
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 border border-purple-200">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                    <Moon className="w-5 h-5 mr-2 text-purple-600" />
                    Your Inner Child
                  </h3>
                  <p className="text-gray-600">The vulnerable, authentic part holding your core emotions and needs</p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border border-blue-200">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-blue-600" />
                    Your Protectors
                  </h3>
                  <p className="text-gray-600">Parts that work to keep you safe from pain and overwhelming emotions</p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border border-green-200">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                    <Sun className="w-5 h-5 mr-2 text-green-600" />
                    Your Self
                  </h3>
                  <p className="text-gray-600">The calm, compassionate core that can heal and lead your internal system</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-20 bg-gradient-to-r from-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Begin Your Healing Journey
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Take the first step toward healing and wholeness with our professional IFS assessment
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowAssessment(true)}
              className="inline-flex items-center px-8 py-4 bg-white text-purple-700 rounded-full font-bold text-lg hover:bg-purple-50 transition-all duration-300 shadow-xl"
            >
              <Brain className="mr-2 w-6 h-6" />
              Take IFS Assessment
            </button>
            <Link 
              to="/curriculum" 
              className="inline-flex items-center px-8 py-4 bg-purple-700 text-white rounded-full font-bold text-lg hover:bg-purple-800 transition-all duration-300"
            >
              <BookOpen className="mr-2 w-6 h-6" />
              View Curriculum
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

import { clientAuth } from '../lib/supabasePersonalization';
import { aiCurriculumPersonalizer } from '../lib/aiCurriculumPersonalizer';

export default Home;
