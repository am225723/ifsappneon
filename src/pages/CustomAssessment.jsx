import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle, BarChart3, Sparkles,
  Target, BookOpen, Star, Eye
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const scaleLabels = {
  1: 'Strongly Disagree',
  2: 'Disagree',
  3: 'Neutral',
  4: 'Agree',
  5: 'Strongly Agree'
};

const scaleLabels7 = {
  1: 'Strongly Disagree',
  2: 'Disagree',
  3: 'Somewhat Disagree',
  4: 'Neutral',
  5: 'Somewhat Agree',
  6: 'Agree',
  7: 'Strongly Agree'
};

function getMaxScale(scaleType) {
  if (scaleType === '1-7') return 7;
  if (scaleType === '1-10') return 10;
  return 5;
}

export default function CustomAssessment() {
  const { theme } = useTheme();
  const { assessmentId } = useParams();
  const [searchParams] = useSearchParams();
  const resolvedId = assessmentId || searchParams.get('id');

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [viewMode, setViewMode] = useState('one');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (resolvedId) loadAssessment();
    else {
      setError('No assessment ID provided');
      setLoading(false);
    }
  }, [resolvedId]);

  const loadAssessment = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('ifs_interactive_data')
        .select('*')
        .eq('module_id', `custom_assessment_${resolvedId}`);

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setError('Assessment not found');
        setLoading(false);
        return;
      }

      setAssessment(data[0].data);
    } catch (e) {
      console.error('Error loading assessment:', e);
      setError('Failed to load assessment');
    }
    setLoading(false);
  };

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const calculateResults = () => {
    const categoryScores = {};

    assessment.questions.forEach(q => {
      const answer = answers[q.id];
      if (answer !== undefined) {
        if (!categoryScores[q.category || 'general']) {
          categoryScores[q.category || 'general'] = { total: 0, count: 0, maxScale: getMaxScale(q.scaleType) };
        }
        categoryScores[q.category || 'general'].total += answer;
        categoryScores[q.category || 'general'].count += 1;
      }
    });

    Object.keys(categoryScores).forEach(cat => {
      const s = categoryScores[cat];
      s.average = s.count > 0 ? s.total / s.count : 0;
      s.percentage = s.count > 0 ? (s.average / s.maxScale) * 100 : 0;

      const rules = assessment.scoringRules?.[cat];
      if (rules) {
        const pct = s.percentage;
        if (pct >= 66) s.label = rules.highLabel || 'High';
        else if (pct >= 33) s.label = rules.midLabel || 'Moderate';
        else s.label = rules.lowLabel || 'Low';
      } else {
        if (s.percentage >= 66) s.label = 'High';
        else if (s.percentage >= 33) s.label = 'Moderate';
        else s.label = 'Low';
      }
    });

    const ranked = Object.entries(categoryScores)
      .sort((a, b) => b[1].percentage - a[1].percentage);

    return { scores: categoryScores, ranked, completedAt: new Date().toISOString(), answers: { ...answers } };
  };

  const handleSubmit = async () => {
    const res = calculateResults();
    setResults(res);
    setShowResults(true);

    setSaving(true);
    try {
      const client = clientAuth.getCurrentClientValidated();
      if (client) {
        const { error } = await supabase
          .from('ifs_interactive_data')
          .upsert({
            client_id: client.id,
            module_id: `custom_assessment_response_${resolvedId}`,
            data: { ...res, assessmentTitle: assessment.title, assessmentId: resolvedId },
            updated_at: new Date().toISOString()
          }, { onConflict: 'client_id,module_id' });
        if (!error) setSaved(true);
        else console.error('Error saving results:', error.message);
      }
    } catch (e) {
      console.error('Error saving results:', e);
    }
    setSaving(false);
  };

  const totalQuestions = assessment?.questions?.length || 0;
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const allAnswered = answeredCount === totalQuestions && totalQuestions > 0;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50/30 to-rose-50/30'}`}>
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50/30 to-rose-50/30'}`}>
        <div className={`text-center p-8 rounded-2xl border ${theme.isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
          <Target size={48} className="mx-auto mb-4 text-red-400 opacity-60" />
          <h2 className={`text-lg font-semibold mb-2 ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>{error}</h2>
          <Link to="/assessments" className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm text-amber-600 hover:text-amber-700 font-medium">
            <ArrowLeft size={16} /> Back to Assessments
          </Link>
        </div>
      </div>
    );
  }

  if (showResults && results) {
    return (
      <div className={`min-h-screen pb-24 ${theme.isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50/30 to-rose-50/30'}`}>
        <div className={`sticky top-0 z-20 backdrop-blur-xl border-b ${theme.isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link to="/assessments" className={`p-2 rounded-xl ${theme.isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-amber-100 text-gray-600'}`}>
              <ArrowLeft size={20} />
            </Link>
            <h1 className={`text-xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>Your Results</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <div className={`rounded-2xl border backdrop-blur-xl p-6 text-center ${theme.isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 mb-4">
              <CheckCircle size={32} className="text-white" />
            </div>
            <h2 className={`text-xl font-bold mb-1 ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>{assessment.title}</h2>
            <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Assessment completed • {saved ? 'Results saved' : saving ? 'Saving...' : 'Not saved'}</p>
          </div>

          <div className={`rounded-2xl border backdrop-blur-xl p-6 ${theme.isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>
              <BarChart3 size={20} className="text-amber-500" />
              Scores by Category
            </h3>
            <div className="space-y-4">
              {results.ranked.map(([category, data], idx) => {
                const barColor = idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-emerald-500' : 'bg-blue-500';
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium capitalize ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>{category}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          data.label === 'High' ? 'bg-red-100 text-red-700' :
                          data.label === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>{data.label}</span>
                        <span className={`text-sm font-semibold ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                          {data.average.toFixed(1)}/{data.maxScale}
                        </span>
                      </div>
                    </div>
                    <div className={`w-full h-3 rounded-full overflow-hidden ${theme.isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${data.percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Link
              to="/assessments"
              className="flex items-center gap-2 px-5 py-2.5 text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25"
            >
              <ArrowLeft size={16} />
              Back to Assessments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 ${theme.isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50/30 to-rose-50/30'}`}>
      <div className={`sticky top-0 z-20 backdrop-blur-xl border-b ${theme.isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link to="/assessments" className={`p-2 rounded-xl ${theme.isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-amber-100 text-gray-600'}`}>
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className={`text-lg font-bold ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>{assessment.title}</h1>
                <p className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>{answeredCount}/{totalQuestions} answered</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'one' ? 'all' : 'one')}
                className={`p-2 rounded-lg text-xs font-medium ${theme.isDark ? 'bg-slate-700 text-slate-300' : 'bg-amber-50 text-amber-700'}`}
                title={viewMode === 'one' ? 'Show all questions' : 'Show one at a time'}
              >
                <Eye size={16} />
              </button>
            </div>
          </div>
          <div className={`w-full h-2 rounded-full overflow-hidden ${theme.isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {assessment.description && (
          <p className={`text-sm mb-6 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>{assessment.description}</p>
        )}

        {viewMode === 'one' ? (
          <div className="space-y-6">
            {assessment.questions[currentQuestion] && (
              <QuestionCard
                question={assessment.questions[currentQuestion]}
                index={currentQuestion}
                total={totalQuestions}
                value={answers[assessment.questions[currentQuestion].id]}
                onChange={(val) => handleAnswer(assessment.questions[currentQuestion].id, val)}
                theme={theme}
              />
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 ${theme.isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
              >
                <ArrowLeft size={16} /> Previous
              </button>
              {currentQuestion < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(Math.min(totalQuestions - 1, currentQuestion + 1))}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25"
                >
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={16} /> Submit
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {assessment.questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={idx}
                total={totalQuestions}
                value={answers[q.id]}
                onChange={(val) => handleAnswer(q.id, val)}
                theme={theme}
              />
            ))}
            <div className="flex justify-center pt-4">
              <button
                onClick={handleSubmit}
                disabled={!allAnswered}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={18} /> Submit Assessment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionCard({ question, index, total, value, onChange, theme }) {
  const maxScale = getMaxScale(question.scaleType);
  const scaleOptions = Array.from({ length: maxScale }, (_, i) => i + 1);

  const getLabel = (val) => {
    if (maxScale === 5) return scaleLabels[val] || '';
    if (maxScale === 7) return scaleLabels7[val] || '';
    return String(val);
  };

  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 ${theme.isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-amber-100'} transition-all`}>
      <div className="flex items-start gap-3 mb-5">
        <span className={`text-xs font-bold shrink-0 w-7 h-7 flex items-center justify-center rounded-full ${theme.isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
          {index + 1}
        </span>
        <div>
          <p className={`font-medium ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>{question.text}</p>
          {question.category && (
            <span className={`text-xs mt-1 inline-block capitalize ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>{question.category}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {scaleOptions.map(val => {
          const selected = value === val;
          return (
            <button
              key={val}
              onClick={() => onChange(val)}
              className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all min-w-[56px] ${
                selected
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-lg shadow-amber-500/25 scale-105'
                  : theme.isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-300 hover:border-amber-500/50 hover:bg-slate-600'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              <span className="text-base font-bold">{val}</span>
              {maxScale <= 7 && (
                <span className={`text-[10px] leading-tight ${selected ? 'text-white/80' : theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {getLabel(val)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
