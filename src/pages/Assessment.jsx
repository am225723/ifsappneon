import { useState } from 'react';
import { CheckCircle, Circle, ArrowRight, RotateCcw } from 'lucide-react';

const Assessment = () => {
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const quizzes = [
    {
      id: 'wounds',
      title: 'Identify Your Core Wounds',
      description: 'Discover which inner child wounds may be affecting you',
      questions: [
        {
          id: 1,
          question: 'I often feel anxious when people get too close to me emotionally.',
          wound: 'abandonment'
        },
        {
          id: 2,
          question: 'I struggle to ask for help, even when I really need it.',
          wound: 'neglect'
        },
        {
          id: 3,
          question: 'I feel like I have to hide parts of myself to be accepted.',
          wound: 'helplessness'
        },
        {
          id: 4,
          question: 'I am extremely hard on myself when I make mistakes.',
          wound: 'criticism'
        },
        {
          id: 5,
          question: 'I have difficulty trusting people, even those close to me.',
          wound: 'betrayal'
        },
        {
          id: 6,
          question: 'I avoid being the center of attention or speaking up in groups.',
          wound: 'humiliation'
        },
        {
          id: 7,
          question: 'I feel angry when I see unfairness, even if it doesn\'t affect me directly.',
          wound: 'injustice'
        },
        {
          id: 8,
          question: 'I avoid getting too attached to people or things.',
          wound: 'loss'
        },
        {
          id: 9,
          question: 'I often feel like my emotions are "too much" or inappropriate.',
          wound: 'invalidation'
        },
        {
          id: 10,
          question: 'I feel on edge or hypervigilant, even in safe situations.',
          wound: 'trauma'
        }
      ]
    },
    {
      id: 'parts',
      title: 'Identify Your Protective Parts',
      description: 'Learn which protective parts are most active in your system',
      questions: [
        {
          id: 1,
          question: 'I plan everything carefully to avoid surprises or chaos.',
          part: 'manager'
        },
        {
          id: 2,
          question: 'When I feel overwhelmed, I tend to zone out or distract myself.',
          part: 'firefighter'
        },
        {
          id: 3,
          question: 'I criticize myself harshly to motivate myself to do better.',
          part: 'manager'
        },
        {
          id: 4,
          question: 'I sometimes engage in impulsive behaviors when I\'m stressed.',
          part: 'firefighter'
        },
        {
          id: 5,
          question: 'I work hard to maintain control over my emotions and environment.',
          part: 'manager'
        },
        {
          id: 6,
          question: 'I use food, substances, or other behaviors to numb difficult feelings.',
          part: 'firefighter'
        },
        {
          id: 7,
          question: 'I strive for perfection to avoid criticism or failure.',
          part: 'manager'
        },
        {
          id: 8,
          question: 'When emotions get intense, I shut down or dissociate.',
          part: 'firefighter'
        },
        {
          id: 9,
          question: 'I people-please to avoid conflict or rejection.',
          part: 'manager'
        },
        {
          id: 10,
          question: 'I can be self-destructive when I\'m in pain.',
          part: 'firefighter'
        }
      ]
    },
    {
      id: 'self-energy',
      title: 'Self-Energy Assessment',
      description: 'Evaluate your connection to the 8 C\'s of Self',
      questions: [
        {
          id: 1,
          question: 'I can remain calm even in stressful situations.',
          quality: 'calmness'
        },
        {
          id: 2,
          question: 'I approach my inner experiences with genuine curiosity.',
          quality: 'curiosity'
        },
        {
          id: 3,
          question: 'I feel compassion for myself and my struggles.',
          quality: 'compassion'
        },
        {
          id: 4,
          question: 'I trust my ability to handle difficult situations.',
          quality: 'confidence'
        },
        {
          id: 5,
          question: 'I can face my fears and take necessary risks.',
          quality: 'courage'
        },
        {
          id: 6,
          question: 'I see situations clearly without being clouded by emotions.',
          quality: 'clarity'
        },
        {
          id: 7,
          question: 'I can think creatively and find novel solutions.',
          quality: 'creativity'
        },
        {
          id: 8,
          question: 'I feel connected to others and to something larger than myself.',
          quality: 'connectedness'
        }
      ]
    }
  ];

  const handleAnswer = (questionId, value) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const calculateResults = () => {
    if (!currentQuiz) return null;

    const quiz = quizzes.find(q => q.id === currentQuiz);
    const results = {};

    quiz.questions.forEach(question => {
      const answer = answers[question.id] || 0;
      const category = question.wound || question.part || question.quality;
      
      if (!results[category]) {
        results[category] = { score: 0, count: 0 };
      }
      results[category].score += answer;
      results[category].count += 1;
    });

    // Calculate averages
    Object.keys(results).forEach(key => {
      results[key].average = results[key].score / results[key].count;
    });

    return results;
  };

  const getResultsInterpretation = () => {
    const results = calculateResults();
    if (!results) return null;

    const sortedResults = Object.entries(results)
      .sort((a, b) => b[1].average - a[1].average)
      .slice(0, 3);

    return sortedResults;
  };

  const startQuiz = (quizId) => {
    setCurrentQuiz(quizId);
    setAnswers({});
    setShowResults(false);
  };

  const resetQuiz = () => {
    setAnswers({});
    setShowResults(false);
  };

  const submitQuiz = () => {
    setShowResults(true);
  };

  const getScaleLabel = (value) => {
    const labels = {
      1: 'Strongly Disagree',
      2: 'Disagree',
      3: 'Neutral',
      4: 'Agree',
      5: 'Strongly Agree'
    };
    return labels[value] || '';
  };

  const getScoreColor = (average) => {
    if (average >= 4) return 'from-red-400 to-red-600';
    if (average >= 3) return 'from-yellow-400 to-yellow-600';
    return 'from-green-400 to-green-600';
  };

  const getScoreInterpretation = (average) => {
    if (average >= 4) return 'High - This area may need attention';
    if (average >= 3) return 'Moderate - Some work may be beneficial';
    return 'Low - This area seems relatively balanced';
  };

  if (!currentQuiz) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-stone-500 to-amber-500 rounded-full flex items-center justify-center shadow-xl">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-amber-600 to-amber-600 bg-clip-text text-transparent">
              Self-Assessment Tools
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Gain insights into your inner world through guided self-assessments
            </p>
          </div>

          {/* Introduction */}
          <div className="card mb-12 bg-gradient-to-br from-stone-50 to-amber-50">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">About These Assessments</h2>
            <div className="space-y-3 text-gray-700">
              <p className="text-lg">
                These self-assessments are designed to help you gain insight into your inner world. They are not 
                diagnostic tools, but rather reflective exercises to increase self-awareness.
              </p>
              <p className="text-lg">
                Answer honestly based on how you typically feel or behave. There are no right or wrong answers—
                this is about understanding yourself better.
              </p>
              <p className="text-lg font-semibold">
                Remember: Self-awareness is the first step toward healing and growth.
              </p>
            </div>
          </div>

          {/* Quiz Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="card hover:scale-105 transform transition-all duration-300 cursor-pointer"
                onClick={() => startQuiz(quiz.id)}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-stone-500 to-amber-500 rounded-xl flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{quiz.title}</h3>
                <p className="text-gray-600 mb-4">{quiz.description}</p>
                <div className="flex items-center text-amber-600 font-semibold">
                  <span>{quiz.questions.length} questions</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const quiz = quizzes.find(q => q.id === currentQuiz);
  const allAnswered = quiz.questions.every(q => answers[q.id] !== undefined);

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {!showResults ? (
          <>
            {/* Quiz Header */}
            <div className="card mb-8 bg-gradient-to-br from-stone-50 to-amber-50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-gray-800">{quiz.title}</h2>
                <button
                  onClick={() => setCurrentQuiz(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors"
                >
                  Exit
                </button>
              </div>
              <p className="text-lg text-gray-700">{quiz.description}</p>
              <div className="mt-4 flex items-center space-x-4 text-gray-600">
                <span>Progress: {Object.keys(answers).length} / {quiz.questions.length}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-amber-600 to-amber-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(Object.keys(answers).length / quiz.questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-6 mb-8">
              {quiz.questions.map((question, index) => (
                <div key={question.id} className="card">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-stone-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-lg text-gray-800 font-medium">{question.question}</p>
                  </div>
                  <div className="space-y-2 ml-14">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <label
                        key={value}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                          answers[question.id] === value
                            ? 'bg-gradient-to-r from-stone-100 to-amber-100 border-2 border-indigo-400'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={value}
                          checked={answers[question.id] === value}
                          onChange={() => handleAnswer(question.id, value)}
                          className="hidden"
                        />
                        {answers[question.id] === value ? (
                          <CheckCircle className="w-6 h-6 text-amber-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400" />
                        )}
                        <span className="font-medium text-gray-700">{getScaleLabel(value)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={resetQuiz}
                className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center space-x-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Reset</span>
              </button>
              <button
                onClick={submitQuiz}
                disabled={!allAnswered}
                className={`px-8 py-4 rounded-lg font-semibold transition-all shadow-lg ${
                  allAnswered
                    ? 'bg-gradient-to-r from-amber-600 to-amber-600 text-white hover:from-amber-700 hover:to-amber-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                View Results
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Results */}
            <div className="card mb-8 bg-gradient-to-br from-stone-50 to-amber-50">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Results</h2>
              <p className="text-lg text-gray-700">
                Based on your responses, here are your top areas of focus:
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {getResultsInterpretation().map(([category, data], index) => (
                <div key={category} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-stone-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {index + 1}
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800 capitalize">{category.replace('-', ' ')}</h3>
                    </div>
                    <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${getScoreColor(data.average)} text-white font-bold`}>
                      {data.average.toFixed(1)} / 5.0
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="bg-gray-200 rounded-full h-3">
                      <div
                        className={`bg-gradient-to-r ${getScoreColor(data.average)} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${(data.average / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-gray-700 text-lg">{getScoreInterpretation(data.average)}</p>
                </div>
              ))}
            </div>

            <div className="card bg-gradient-to-br from-amber-600 to-emerald-600 text-white mb-8">
              <h3 className="text-2xl font-bold mb-4">What These Results Mean</h3>
              <p className="text-lg leading-relaxed text-amber-100 mb-4">
                These results highlight areas where you may benefit from focused IFS work. Remember, there's no 
                "good" or "bad" score—this is simply information to guide your healing journey.
              </p>
              <p className="text-lg leading-relaxed text-amber-100">
                Consider exploring the parts related to your highest scores. What are they trying to protect you from? 
                What do they need from you? Approach them with curiosity and compassion.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowResults(false)}
                className="px-8 py-4 bg-white text-amber-600 border-2 border-amber-600 rounded-lg font-semibold hover:bg-amber-50 transition-all"
              >
                Review Answers
              </button>
              <button
                onClick={() => setCurrentQuiz(null)}
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-600 text-white rounded-lg font-semibold hover:from-amber-700 hover:to-amber-700 transition-all shadow-lg"
              >
                Take Another Assessment
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Assessment;