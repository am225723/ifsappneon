import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Trash2, Edit3, Save, Copy, ArrowLeft,
  ChevronUp, ChevronDown, CheckCircle, Target, BookOpen,
  Star, BarChart3, Share2, Sparkles, Link2, AlertCircle, RefreshCw
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import FormattedAIContent from '../components/ai/FormattedAIContent';

const assessmentTypes = [
  { value: 'wound-focused', label: 'Wound-Focused', icon: Target, color: 'text-rose-500' },
  { value: 'parts-focused', label: 'Parts-Focused', icon: BookOpen, color: 'text-blue-500' },
  { value: 'self-energy', label: 'Self-Energy', icon: Sparkles, color: 'text-emerald-500' },
  { value: 'custom', label: 'Custom', icon: Star, color: 'text-amber-500' }
];

const emptyAssessment = () => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  type: 'custom',
  questions: [],
  scoringRules: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const emptyQuestion = () => ({
  id: crypto.randomUUID(),
  text: '',
  category: '',
  scaleType: '1-5'
});

export default function AssessmentBuilder() {
  const { theme } = useTheme();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const therapist = clientAuth.getCurrentClient();
  const therapistId = therapist?.id;

  async function loadAssessments() {
    setLoadError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ifs_interactive_data')
        .select('*')
        .eq('client_id', therapistId)
        .like('module_id', 'custom_assessment_%');

      if (error) {
        setLoadError(`Failed to load assessments: ${error.message}`);
      } else if (data) {
        const filtered = data
          .filter(row => !row.module_id.startsWith('custom_assessment_response_'))
          .map(row => row.data)
          .filter(Boolean)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAssessments(filtered);
      }
    } catch (e) {
      setLoadError(`Unexpected error: ${e.message}`);
    }
    setLoading(false);
  }
  useEffect(() => {
    if (therapistId) {
      loadAssessments();
    } else {
      setLoading(false);
    }
  }, [therapistId]);


  const saveAssessment = async (assessment) => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = { ...assessment, updatedAt: new Date().toISOString() };

      const { error } = await supabase
        .from('ifs_interactive_data')
        .upsert({
          client_id: therapistId,
          module_id: `custom_assessment_${assessment.id}`,
          data: updated,
          updated_at: new Date().toISOString()
        }, { onConflict: 'client_id,module_id' });

      if (error) {
        setSaveError(`Save failed: ${error.message}`);
        setSaving(false);
        return;
      }

      setAssessments(prev => {
        const idx = prev.findIndex(a => a.id === assessment.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [updated, ...prev];
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setEditing(null);
      }, 1200);
    } catch (e) {
      setSaveError(`Unexpected error: ${e.message}`);
    }
    setSaving(false);
  };

  const deleteAssessment = async (id) => {
    try {
      const { error } = await supabase
        .from('ifs_interactive_data')
        .delete()
        .eq('client_id', therapistId)
        .eq('module_id', `custom_assessment_${id}`);

      if (error) {
        alert(`Delete failed: ${error.message}`);
        return;
      }
      setAssessments(prev => prev.filter(a => a.id !== id));
      setDeleteConfirm(null);
    } catch (e) {
      alert(`Unexpected error: ${e.message}`);
    }
  };

  const copyLink = (id) => {
    const url = `${window.location.origin}/custom-assessment/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      prompt('Copy this link:', url);
    });
  };

  const moveQuestion = (questions, idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return questions;
    const copy = [...questions];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    return copy;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50/30 to-rose-50/30'}`}>
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!therapistId) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50/30 to-rose-50/30'}`}>
        <div className="text-center px-6">
          <BarChart3 size={48} className={`mx-auto mb-4 ${theme.isDark ? 'text-slate-500' : 'text-amber-400'}`} />
          <h2 className={`text-xl font-bold mb-2 ${theme.isDark ? 'text-slate-200' : 'text-gray-800'}`}>Advisor Login Required</h2>
          <p className={`text-sm mb-6 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Please log in as an Advisor to create assessments.</p>
          <Link to="/therapist-dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <AssessmentForm
        assessment={editing}
        theme={theme}
        saving={saving}
        saveError={saveError}
        saveSuccess={saveSuccess}
        onSave={saveAssessment}
        onCancel={() => { setEditing(null); setSaveError(null); setSaveSuccess(false); }}
        moveQuestion={moveQuestion}
        copyLink={copyLink}
        copiedId={copiedId}
      />
    );
  }

  return (
    <div className={`min-h-screen pb-24 ${theme.isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50/30 to-rose-50/30'}`}>
      <div className={`sticky top-0 z-20 backdrop-blur-xl border-b ${theme.isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/therapist-dashboard" className={`p-2 rounded-xl ${theme.isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-amber-100 text-gray-600'}`}>
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className={`text-xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>Assessment Builder</h1>
              <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>{assessments.length} assessment{assessments.length !== 1 ? 's' : ''} created</p>
            </div>
          </div>
          <button
            onClick={() => setEditing(emptyAssessment())}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25"
          >
            <Plus size={18} />
            New Assessment
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {loadError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium">Could not load assessments</p>
              <p className="text-red-600 mt-0.5">{loadError}</p>
            </div>
            <button onClick={loadAssessments} className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 transition-colors">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {assessments.length === 0 && !loadError ? (
          <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${theme.isDark ? 'border-slate-700 text-slate-400' : 'border-amber-200 text-gray-400'}`}>
            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No assessments yet</h3>
            <p className="text-sm mb-6">Create your first custom assessment for your clients</p>
            <button
              onClick={() => setEditing(emptyAssessment())}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              <Plus size={18} />
              Create Assessment
            </button>
          </div>
        ) : (
          assessments.map(assessment => {
            const TypeIcon = assessmentTypes.find(t => t.value === assessment.type)?.icon || Star;
            const typeColor = assessmentTypes.find(t => t.value === assessment.type)?.color || 'text-amber-500';
            return (
              <div key={assessment.id} className={`rounded-2xl border backdrop-blur-xl p-5 ${theme.isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-amber-100'} transition-all hover:shadow-lg`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-xl ${theme.isDark ? 'bg-slate-700' : 'bg-amber-50'}`}>
                      <TypeIcon size={20} className={typeColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold truncate ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>{assessment.title || 'Untitled Assessment'}</h3>
                      {assessment.description && (
                        <FormattedAIContent content={assessment.description} className={`mt-1 line-clamp-3 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                      )}
                      <div className={`flex items-center gap-3 mt-2 text-xs ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        <span>{assessment.questions?.length || 0} question{(assessment.questions?.length || 0) !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{new Date(assessment.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="capitalize">{assessment.type?.replace('-', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => { setSaveError(null); setSaveSuccess(false); setEditing({ ...assessment }); }} className={`p-2 rounded-lg transition-colors ${theme.isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-amber-50 text-gray-400'}`} title="Edit">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => copyLink(assessment.id)} className={`p-2 rounded-lg transition-colors ${copiedId === assessment.id ? 'text-emerald-500' : theme.isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-amber-50 text-gray-400'}`} title="Copy client link">
                      {copiedId === assessment.id ? <CheckCircle size={16} /> : <Link2 size={16} />}
                    </button>
                    {deleteConfirm === assessment.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteAssessment(assessment.id)} className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors" title="Confirm delete">
                          <Trash2 size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirm(null)} className={`p-2 rounded-lg ${theme.isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`} title="Cancel">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(assessment.id)} className={`p-2 rounded-lg transition-colors ${theme.isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AssessmentForm({ assessment, theme, saving, saveError, saveSuccess, onSave, onCancel, moveQuestion, copyLink, copiedId }) {
  const [form, setForm] = useState(assessment);
  const [showScoringRules, setShowScoringRules] = useState(Object.keys(assessment.scoringRules || {}).length > 0);
  const [attempted, setAttempted] = useState(false);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addQuestion = () => {
    setForm(prev => ({ ...prev, questions: [...prev.questions, emptyQuestion()] }));
  };

  const updateQuestion = (idx, field, value) => {
    setForm(prev => {
      const questions = [...prev.questions];
      questions[idx] = { ...questions[idx], [field]: value };
      return { ...prev, questions };
    });
  };

  const removeQuestion = (idx) => {
    setForm(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
  };

  const handleMove = (idx, dir) => {
    setForm(prev => ({ ...prev, questions: moveQuestion(prev.questions, idx, dir) }));
  };

  const updateScoringRule = (category, field, value) => {
    setForm(prev => ({
      ...prev,
      scoringRules: {
        ...prev.scoringRules,
        [category]: { ...(prev.scoringRules?.[category] || {}), [field]: value }
      }
    }));
  };

  const removeScoringRule = (category) => {
    setForm(prev => {
      const rules = { ...prev.scoringRules };
      delete rules[category];
      return { ...prev, scoringRules: rules };
    });
  };

  const categories = [...new Set(form.questions.map(q => q.category).filter(Boolean))];

  const titleMissing = !form.title.trim();
  const noQuestions = form.questions.length === 0;
  const emptyQuestions = form.questions.filter(q => !q.text.trim());
  const isValid = !titleMissing && !noQuestions && emptyQuestions.length === 0;

  const handleSaveClick = () => {
    setAttempted(true);
    if (isValid) onSave(form);
  };

  const validationMessage = attempted && !isValid
    ? titleMissing ? 'Please add a title'
      : noQuestions ? 'Please add at least one question'
      : `${emptyQuestions.length} question${emptyQuestions.length > 1 ? 's are' : ' is'} missing text`
    : null;

  return (
    <div className={`min-h-screen pb-24 ${theme.isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50/30 to-rose-50/30'}`}>
      <div className={`sticky top-0 z-20 backdrop-blur-xl border-b ${theme.isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onCancel} className={`p-2 rounded-xl ${theme.isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-amber-100 text-gray-600'}`}>
              <ArrowLeft size={20} />
            </button>
            <h1 className={`text-xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>
              {assessment.title ? 'Edit Assessment' : 'New Assessment'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium animate-pulse">
                <CheckCircle size={16} /> Saved!
              </span>
            )}
            <button
              onClick={handleSaveClick}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        {(saveError || validationMessage) && (
          <div className="max-w-4xl mx-auto px-4 pb-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{saveError || validationMessage}</span>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className={`rounded-2xl border backdrop-blur-xl p-6 ${theme.isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>Assessment Details</h2>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${theme.isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Self-Compassion Scale"
                className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                  attempted && titleMissing
                    ? 'border-red-400 bg-red-50'
                    : theme.isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              />
              {attempted && titleMissing && <p className="mt-1 text-xs text-red-600">Title is required</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${theme.isDark ? 'text-slate-300' : 'text-gray-700'}`}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the purpose of this assessment..."
                rows={3}
                className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none ${theme.isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${theme.isDark ? 'text-slate-300' : 'text-gray-700'}`}>Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {assessmentTypes.map(type => {
                  const Icon = type.icon;
                  const selected = form.type === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => updateField('type', type.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        selected
                          ? theme.isDark ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-amber-50 border-amber-400 text-amber-700'
                          : theme.isDark ? 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={16} className={selected ? 'text-amber-500' : type.color} />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border backdrop-blur-xl p-6 ${theme.isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-lg font-semibold ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                Questions ({form.questions.length})
              </h2>
              {attempted && noQuestions && (
                <p className="text-xs text-red-600 mt-0.5">At least one question is required</p>
              )}
            </div>
            <button
              onClick={addQuestion}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              <Plus size={16} />
              Add Question
            </button>
          </div>

          {form.questions.length === 0 ? (
            <div className={`text-center py-10 rounded-xl border-2 border-dashed ${
              attempted ? 'border-red-300 bg-red-50/30' : theme.isDark ? 'border-slate-700 text-slate-500' : 'border-amber-200 text-gray-400'
            }`}>
              <p className={`text-sm ${attempted ? 'text-red-600' : ''}`}>No questions added yet. Click "Add Question" to begin.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {form.questions.map((q, idx) => {
                const isEmpty = attempted && !q.text.trim();
                return (
                  <div key={q.id} className={`rounded-xl border p-4 ${
                    isEmpty
                      ? 'border-red-300 bg-red-50/30'
                      : theme.isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50/80 border-gray-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      <span className={`text-xs font-bold mt-3 shrink-0 w-6 h-6 flex items-center justify-center rounded-full ${
                        isEmpty ? 'bg-red-100 text-red-700' : theme.isDark ? 'bg-slate-600 text-slate-300' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                          placeholder="Question text... *"
                          className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm ${
                            isEmpty
                              ? 'border-red-400 bg-red-50 text-red-900 placeholder-red-400'
                              : theme.isDark ? 'bg-slate-600 border-slate-500 text-slate-100 placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                          }`}
                        />
                        {isEmpty && <p className="text-xs text-red-600">Question text is required</p>}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={q.category}
                            onChange={(e) => updateQuestion(idx, 'category', e.target.value)}
                            placeholder="Category (optional, e.g. anxiety)"
                            className={`flex-1 px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-xs ${theme.isDark ? 'bg-slate-600 border-slate-500 text-slate-100 placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                          />
                          <select
                            value={q.scaleType}
                            onChange={(e) => updateQuestion(idx, 'scaleType', e.target.value)}
                            className={`px-3 py-1.5 rounded-lg border focus:outline-none text-xs ${theme.isDark ? 'bg-slate-600 border-slate-500 text-slate-100' : 'bg-white border-gray-200 text-gray-900'}`}
                          >
                            <option value="1-5">1–5 Likert</option>
                            <option value="1-7">1–7 Likert</option>
                            <option value="1-10">1–10 Scale</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button onClick={() => handleMove(idx, -1)} disabled={idx === 0} className={`p-1 rounded ${theme.isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-400'} disabled:opacity-30`}>
                          <ChevronUp size={14} />
                        </button>
                        <button onClick={() => handleMove(idx, 1)} disabled={idx === form.questions.length - 1} className={`p-1 rounded ${theme.isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-400'} disabled:opacity-30`}>
                          <ChevronDown size={14} />
                        </button>
                        <button onClick={() => removeQuestion(idx)} className={`p-1 rounded ${theme.isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-400'}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`rounded-2xl border backdrop-blur-xl p-6 ${theme.isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>Scoring Rules</h2>
            <button
              onClick={() => setShowScoringRules(!showScoringRules)}
              className={`text-sm ${theme.isDark ? 'text-amber-400' : 'text-amber-600'}`}
            >
              {showScoringRules ? 'Hide' : 'Configure'}
            </button>
          </div>
          {showScoringRules && (
            <div className="space-y-3">
              <p className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Optional: Define how each category maps to result labels. Categories are auto-detected from your questions.
              </p>
              {categories.length === 0 ? (
                <p className={`text-sm italic ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>Add questions with categories first.</p>
              ) : (
                categories.map(cat => (
                  <div key={cat} className={`rounded-lg border p-3 ${theme.isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium capitalize ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>{cat}</span>
                      <button onClick={() => removeScoringRule(cat)} className={`text-xs ${theme.isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>Clear</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={form.scoringRules?.[cat]?.lowLabel || ''}
                        onChange={(e) => updateScoringRule(cat, 'lowLabel', e.target.value)}
                        placeholder="Low score label"
                        className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${theme.isDark ? 'bg-slate-600 border-slate-500 text-slate-100 placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                      />
                      <input
                        type="text"
                        value={form.scoringRules?.[cat]?.midLabel || ''}
                        onChange={(e) => updateScoringRule(cat, 'midLabel', e.target.value)}
                        placeholder="Mid score label"
                        className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${theme.isDark ? 'bg-slate-600 border-slate-500 text-slate-100 placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                      />
                      <input
                        type="text"
                        value={form.scoringRules?.[cat]?.highLabel || ''}
                        onChange={(e) => updateScoringRule(cat, 'highLabel', e.target.value)}
                        placeholder="High score label"
                        className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${theme.isDark ? 'bg-slate-600 border-slate-500 text-slate-100 placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className={`rounded-2xl border backdrop-blur-xl p-6 ${theme.isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
          <h2 className={`text-lg font-semibold mb-1 ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>Share Assessment</h2>
          <p className={`text-xs mb-3 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Save the assessment first, then share this link with clients so they can take it.</p>
          <div className={`flex items-center gap-2 p-3 rounded-xl ${theme.isDark ? 'bg-slate-700' : 'bg-amber-50'}`}>
            <Share2 size={16} className={theme.isDark ? 'text-slate-400' : 'text-amber-500'} />
            <code className={`flex-1 text-xs truncate ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              {window.location.origin}/custom-assessment/{form.id}
            </code>
            <button
              onClick={() => copyLink(form.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              {copiedId === form.id ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copiedId === form.id ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
