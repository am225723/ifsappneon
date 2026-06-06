import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, CheckCircle, Clock, AlertTriangle, Calendar,
  ChevronDown, ChevronUp, RefreshCw, MessageSquare, Flag, BookOpen
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { curriculumModules } from '../data/curriculumData';
import InteractiveWorksheetRenderer from '../components/ai/InteractiveWorksheetRenderer';
import FormattedAIContent from '../components/ai/FormattedAIContent';
import { serializeStructuredWorksheetResponses } from '../lib/interactiveWorksheetState';
import { renderInteractiveResponseSummaryLines, summarizeInteractiveResponses } from '../lib/interactiveWorksheetSummary';
import { isMissingWorksheetPersistenceColumn, WORKSHEET_MIGRATION_CLIENT_WARNING } from '../lib/worksheetPersistenceFallback';
import {
  loadAssignedHomeworkForClient,
  markAssignedHomeworkStarted,
  syncAssignedHomeworkCompletion
} from '../lib/assignedHomework';

const categories = [
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700' },
  { value: 'journaling', label: 'Journaling', color: 'bg-blue-100 text-blue-700' },
  { value: 'parts-work', label: 'Parts Work', color: 'bg-purple-100 text-purple-700' },
  { value: 'meditation', label: 'Meditation', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'exercise', label: 'Exercise', color: 'bg-amber-100 text-amber-700' },
  { value: 'reading', label: 'Reading', color: 'bg-rose-100 text-rose-700' },
  { value: 'self-care', label: 'Self-Care', color: 'bg-teal-100 text-teal-700' },
];

const ClientHomework = () => {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const client = clientAuth.getCurrentClient();
  const [homework, setHomework] = useState([]);
  const [assignedModules, setAssignedModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [completionNotes, setCompletionNotes] = useState({});
  const [worksheetResponses, setWorksheetResponses] = useState({});
  const [completionMessages, setCompletionMessages] = useState({});
  const [filter, setFilter] = useState('active');

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-slate-800/60' : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700/50' : 'border-gray-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900';

  const loadHomework = useCallback(async () => {
    if (!client?.id) {
      setError('Client profile is not available. Please sign in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [homeworkRes, assignedRes, progressRes] = await Promise.all([
        supabase
          .from('ifs_therapy_homework')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false }),
        loadAssignedHomeworkForClient(client.id),
        supabase
          .from('ifs_client_progress')
          .select('module_id, completed')
          .eq('client_id', client.id)
      ]);
      if (homeworkRes.error) throw homeworkRes.error;
      if (assignedRes.error) throw assignedRes.error;
      if (progressRes.error) throw progressRes.error;
      setHomework(homeworkRes.data || []);
      const completedIds = (progressRes.data || [])
        .filter(progress => progress.completed)
        .map(progress => progress.module_id);
      await Promise.all(
        (assignedRes.data || [])
          .filter(item => completedIds.includes(item.module_id) && ['assigned', 'in_progress'].includes(item.status))
          .map(item => syncAssignedHomeworkCompletion(client.id, item.module_id))
      );
      const finalAssigned = (assignedRes.data || []).map(item => (
        completedIds.includes(item.module_id) && ['assigned', 'in_progress'].includes(item.status)
          ? { ...item, status: 'completed', completed_at: item.completed_at || new Date().toISOString() }
          : item
      ));
      setAssignedModules(finalAssigned.map(item => ({
        ...item,
        module: curriculumModules.find(module => module.id === item.module_id)
      })));
    } catch (loadError) {
      console.error('Error loading client homework:', loadError);
      setHomework([]);
      setAssignedModules([]);
      setError(loadError.message || 'Unable to load assigned practice. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  useEffect(() => { loadHomework(); }, [loadHomework]);

  const handleComplete = async (item) => {
    const notes = completionNotes[item.id] || '';
    const summaryLines = renderInteractiveResponseSummaryLines(worksheetResponses[item.id] || {});
    const structuredResponses = serializeStructuredWorksheetResponses(worksheetResponses[item.id] || {}, summaryLines);
    const completionText = notes.trim();
    const completedAt = new Date().toISOString();
    const basePayload = {
      completed: true,
      status: 'completed',
      completed_at: completedAt,
      completion_notes: completionText || item.completion_notes || null,
      updated_at: completedAt
    };

    setCompletionMessages(prev => ({ ...prev, [item.id]: null }));
    const { error: structuredError } = await supabase
      .from('ifs_therapy_homework')
      .update({
        ...basePayload,
        interactive_responses: structuredResponses
      })
      .eq('id', item.id);

    if (structuredError) {
      if (isMissingWorksheetPersistenceColumn(structuredError, ['interactive_responses'])) {
        const { error: fallbackError } = await supabase
          .from('ifs_therapy_homework')
          .update(basePayload)
          .eq('id', item.id);

        if (fallbackError) {
          console.warn('Unable to save worksheet completion fallback.');
          setCompletionMessages(prev => ({ ...prev, [item.id]: 'We could not save this completion right now. Please try again.' }));
          return;
        }

        setCompletionMessages(prev => ({ ...prev, [item.id]: WORKSHEET_MIGRATION_CLIENT_WARNING }));
        await loadHomework();
        return;
      }

      console.warn('Unable to save worksheet completion.');
      setCompletionMessages(prev => ({ ...prev, [item.id]: 'We could not save this completion right now. Please try again.' }));
      return;
    }

    await loadHomework();
  };

  const getStatusInfo = (item) => {
    if (item.completed || item.status === 'completed') {
      return { label: 'Completed', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', darkBg: 'bg-emerald-900/20' };
    }
    if (item.due_date && new Date(item.due_date) < new Date()) {
      return { label: 'Overdue', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', darkBg: 'bg-red-900/20' };
    }
    return { label: 'To Do', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', darkBg: 'bg-amber-900/20' };
  };

  const filtered = homework.filter(h => {
    if (filter === 'active') return !h.completed;
    if (filter === 'completed') return h.completed;
    return true;
  });

  const activeCount = homework.filter(h => !h.completed).length;
  const completedCount = homework.filter(h => h.completed).length;


  const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  const getAssignedActionLabel = (item) => {
    if (item.status === 'assigned') return 'Start';
    if (item.status === 'in_progress') return 'Continue';
    if (item.status === 'completed') return 'Completed — awaiting review';
    if (item.status === 'reviewed') return 'Review';
    return 'Open';
  };

  const handleStartAssignedModule = async (item) => {
    if (item.status === 'assigned') {
      await markAssignedHomeworkStarted(item.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <h1 className="font-semibold">Unable to load assigned practice</h1>
              <p className="mt-1 text-sm">{error}</p>
              <button type="button" onClick={loadHomework} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"><RefreshCw className="w-4 h-4" /> Retry</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className={`text-xl font-bold ${textPrimary}`}>Assigned IFS Practice</h1>
          <p className={`text-sm ${textMuted}`}>
            {activeCount > 0 ? `${activeCount} assignment${activeCount > 1 ? 's' : ''} to complete` : 'All caught up!'}
          </p>
        </div>
      </div>

      {assignedModules.length > 0 && (
        <div className={`mb-6 rounded-2xl border p-4 ${isDark ? 'border-blue-800/40 bg-blue-950/30' : 'border-blue-200 bg-blue-50'}`}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className={`font-bold ${isDark ? 'text-blue-100' : 'text-blue-950'}`}>Assigned by My Advisor</h2>
          </div>
          <div className="space-y-3">
            {assignedModules.map(item => (
              <div key={item.id} className={`rounded-xl p-3 ${isDark ? 'bg-slate-800/80 border border-slate-700' : 'bg-white border border-blue-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-semibold ${textPrimary}`}>{item.title || item.module?.title || item.module_id}</p>
                    <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs ${textMuted}`}>
                      <span>Status: <span className="font-semibold capitalize">{item.status === 'completed' ? 'completed — awaiting review' : item.status}</span></span>
                      {formatDate(item.assigned_at) && <span>Assigned: {formatDate(item.assigned_at)}</span>}
                      {formatDate(item.completed_at) && <span>Completed: {formatDate(item.completed_at)}</span>}
                    </div>
                    {item.instructions && <p className={`mt-2 text-sm ${textSecondary}`}>{item.instructions}</p>}
                    {item.status === 'reviewed' && item.therapist_feedback && (
                      <div className={`mt-2 rounded-lg p-2 text-sm ${isDark ? 'bg-emerald-900/20 text-emerald-200' : 'bg-emerald-50 text-emerald-800'}`}>
                        <span className="font-semibold">Advisor reflection:</span> {item.therapist_feedback}
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/curriculum/module/${item.module_id}`}
                    onClick={() => handleStartAssignedModule(item)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${item.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {getAssignedActionLabel(item)}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {[
          { value: 'active', label: `To Do (${activeCount})` },
          { value: 'completed', label: `Done (${completedCount})` },
          { value: 'all', label: `All (${homework.length})` },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === f.value
                ? 'bg-amber-500 text-white'
                : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={`${cardBg} rounded-2xl border ${cardBorder} p-12 text-center`}>
          <ClipboardList className={`w-12 h-12 mx-auto mb-3 ${textMuted} opacity-30`} />
          <p className={`text-sm font-medium ${textSecondary}`}>
            {filter === 'active' ? 'No active assignments' : filter === 'completed' ? 'No completed assignments yet' : 'No assigned practice yet'}
          </p>
          <p className={`text-xs ${textMuted} mt-1`}>Advisor-guided practices will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const statusInfo = getStatusInfo(item);
            const StatusIcon = statusInfo.icon;
            const catInfo = categories.find(c => c.value === item.category) || categories[0];
            const isExpanded = expandedItems[item.id];

            return (
              <div key={item.id} className={`${cardBg} rounded-xl border ${cardBorder} overflow-hidden`}>
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isDark ? statusInfo.darkBg : statusInfo.bg}`}>
                    <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${textPrimary} ${item.completed ? 'line-through opacity-60' : ''}`}>
                        {item.title}
                      </p>
                      {item.priority === 'high' && <Flag className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${catInfo.color}`}>{catInfo.label}</span>
                      {item.due_date && (
                        <span className={`text-xs ${textMuted} flex items-center gap-1`}>
                          <Calendar className="w-3 h-3" /> Due {new Date(item.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className={`w-4 h-4 ${textMuted} flex-shrink-0`} /> : <ChevronDown className={`w-4 h-4 ${textMuted} flex-shrink-0`} />}
                </div>

                {isExpanded && (
                  <div className={`px-4 pb-4 border-t ${cardBorder}`}>
                    {item.description && (
                      <div className="mt-3">
                        <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-1`}>Instructions</p>
                        <InteractiveWorksheetRenderer blocks={item.activity_blocks || item.activityBlocks} fallbackText={item.description} initialResponses={item.completed ? (item.interactive_responses || worksheetResponses[item.id]) : worksheetResponses[item.id]} onResponsesChange={(responses) => setWorksheetResponses(prev => ({ ...prev, [item.id]: responses }))} mode="client" readOnly={item.completed} />
                      </div>
                    )}

                    {completionMessages[item.id] && (
                      <div className={`mt-3 rounded-lg border p-3 text-sm ${completionMessages[item.id] === WORKSHEET_MIGRATION_CLIENT_WARNING ? (isDark ? 'border-amber-800/60 bg-amber-950/30 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700') : (isDark ? 'border-red-800/60 bg-red-950/30 text-red-200' : 'border-red-200 bg-red-50 text-red-700')}`}>
                        {completionMessages[item.id]}
                      </div>
                    )}

                    {!item.completed && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className={`block text-xs font-medium ${textMuted} mb-1`}>Reflection / Notes (optional)</label>
                          <textarea
                            value={completionNotes[item.id] || ''}
                            onChange={e => setCompletionNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Share your thoughts, reflections, or what you noticed..."
                            rows={3}
                            className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`}
                          />
                        </div>
                        <button
                          onClick={() => handleComplete(item)}
                          className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark as Complete
                        </button>
                      </div>
                    )}

                    {item.completed && (item.interactive_responses || item.completion_notes) && (
                      <div className={`mt-3 space-y-3 rounded-lg ${isDark ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'} p-3`}>
                        {summarizeInteractiveResponses(item.interactive_responses || {}).length > 0 && (
                          <div>
                            <p className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'} mb-2 flex items-center gap-1`}>
                              <MessageSquare className="w-3 h-3" /> Interactive Responses
                            </p>
                            <div className="space-y-2">
                              {summarizeInteractiveResponses(item.interactive_responses || {}).map(section => (
                                <div key={section.widgetId} className="text-sm">
                                  <p className={`${isDark ? 'text-emerald-100' : 'text-emerald-800'} font-medium`}>{section.title}</p>
                                  <ul className={`${isDark ? 'text-emerald-200' : 'text-emerald-700'} mt-1 list-disc space-y-1 pl-5`}>
                                    {section.lines.map((line, index) => <li key={`${section.widgetId}-${index}`} className="whitespace-pre-wrap">{line}</li>)}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.completion_notes && (
                          <div>
                            <p className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'} mb-1 flex items-center gap-1`}>
                              <MessageSquare className="w-3 h-3" /> My Reflection
                            </p>
                            <FormattedAIContent content={item.completion_notes} className={isDark ? 'text-emerald-200' : 'text-emerald-700'} />
                          </div>
                        )}
                      </div>
                    )}

                    {item.completed_at && (
                      <p className={`text-xs ${textMuted} mt-2`}>
                        Completed {new Date(item.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                    <p className={`text-xs ${textMuted} mt-1`}>
                      Assigned {new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientHomework;
