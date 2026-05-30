import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Download, Search, User, TrendingUp, BarChart3,
  Calendar, Heart, BookOpen, Award, Flame, Clock, CheckCircle,
  RefreshCw, ChevronDown, Printer
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadAssignedClients } from '../lib/therapistAssignments';

const TherapistReports = () => {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const therapist = clientAuth.getCurrentClient();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const reportRef = useRef(null);

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-slate-800/60' : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700/50' : 'border-gray-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900';

  useEffect(() => {
    const loadClients = async () => {
      if (!therapist?.id) return;
      const data = await loadAssignedClients(therapist.id, 'id, name, user_role, created_at');
      setClients(data);
      setLoading(false);
    };
    loadClients();
  }, [therapist?.id]);

  const getDateFilter = useCallback(() => {
    const now = new Date();
    if (dateRange === '7d') return new Date(now - 7 * 86400000).toISOString();
    if (dateRange === '30d') return new Date(now - 30 * 86400000).toISOString();
    if (dateRange === '90d') return new Date(now - 90 * 86400000).toISOString();
    return null;
  }, [dateRange]);

  const generateReport = useCallback(async () => {
    if (!selectedClient) return;
    setGenerating(true);
    const dateFilter = getDateFilter();
    const client = clients.find(c => c.id === selectedClient);

    try {
      const queries = [
        supabase.from('ifs_assessment_results').select('*').eq('client_id', selectedClient).order('created_at', { ascending: false }).limit(1),
        supabase.from('ifs_client_progress').select('*').eq('client_id', selectedClient),
        supabase.from('ifs_journal_entries').select('id, title, created_at, mood').eq('client_id', selectedClient).order('created_at', { ascending: false }),
        supabase.from('ifs_mood_entries').select('*').eq('client_id', selectedClient).order('date', { ascending: false }),
        supabase.from('ifs_gamification').select('*').eq('client_id', selectedClient).limit(1),
        supabase.from('ifs_therapy_homework').select('*').eq('client_id', selectedClient),
        supabase.from('ifs_therapist_notes').select('*').eq('client_id', selectedClient).order('created_at', { ascending: false }),
        supabase.from('ifs_exercise_progress').select('*').eq('client_id', selectedClient),
      ];

      const results = await Promise.all(queries);
      const [assessment, progress, journals, moods, gamification, homework, notes, exercises] = results.map(r => r.data);

      const latestAssessment = assessment?.[0] || null;
      const filteredJournals = dateFilter ? journals?.filter(j => j.created_at >= dateFilter) : journals;
      const filteredMoods = dateFilter ? moods?.filter(m => m.date >= dateFilter) : moods;

      const avgMood = filteredMoods?.length > 0
        ? (filteredMoods.reduce((sum, m) => sum + (m.mood || 0), 0) / filteredMoods.length).toFixed(1)
        : null;
      const avgEnergy = filteredMoods?.length > 0
        ? (filteredMoods.reduce((sum, m) => sum + (m.energy || 0), 0) / filteredMoods.length).toFixed(1)
        : null;

      const completedModules = progress?.filter(p => p.completed).length || 0;
      const totalModules = progress?.length || 8;
      const completedHomework = homework?.filter(h => h.completed).length || 0;
      const totalHomework = homework?.length || 0;
      const completedExercises = exercises?.filter(e => e.completed).length || 0;

      const gam = gamification?.[0] || {};

      setReportData({
        client,
        generatedAt: new Date().toISOString(),
        dateRange,
        assessment: latestAssessment,
        progress: { completedModules, totalModules, percentage: Math.round((completedModules / totalModules) * 100) },
        journals: { total: filteredJournals?.length || 0, recent: filteredJournals?.slice(0, 5) || [] },
        mood: { average: avgMood, averageEnergy: avgEnergy, entries: filteredMoods?.length || 0 },
        homework: { completed: completedHomework, total: totalHomework, rate: totalHomework > 0 ? Math.round((completedHomework / totalHomework) * 100) : 0 },
        exercises: { completed: completedExercises, total: exercises?.length || 0 },
        gamification: { xp: gam.xp || 0, level: gam.level || 1, currentStreak: gam.current_streak || 0, longestStreak: gam.longest_streak || 0, badges: gam.badges || [] },
        notes: { total: notes?.length || 0, recent: notes?.slice(0, 3) || [] },
      });
    } catch (err) {
      console.error('Report generation error:', err);
    }
    setGenerating(false);
  }, [selectedClient, dateRange, clients, getDateFilter]);

  const downloadPDF = () => {
    if (!reportData) return;
    const r = reportData;
    const normalizeScore = (s) => {
      if (s === null || s === undefined) return 0;
      const num = Number(s);
      if (isNaN(num)) return 0;
      return num <= 5 ? Math.round(num * 5) : Math.round(num);
    };

    const period = dateRange === 'all' ? 'All Time' : dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : 'Last 90 Days';
    const genDate = new Date(r.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const woundScores = r.assessment ? [
      { name: 'Abandonment', score: normalizeScore(r.assessment.abandonment_score), color: '#d97706' },
      { name: 'Shame', score: normalizeScore(r.assessment.shame_score), color: '#dc2626' },
      { name: 'Neglect', score: normalizeScore(r.assessment.neglect_score), color: '#7c3aed' },
      { name: 'Betrayal', score: normalizeScore(r.assessment.betrayal_score), color: '#2563eb' },
      { name: 'Helplessness', score: normalizeScore(r.assessment.helplessness_score || 0), color: '#059669' },
    ] : [];

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>IFS Report - ${r.client?.name || 'Client'}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.6; background: white; }
  .header { text-align: center; padding: 24px 0; border-bottom: 3px solid #d97706; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #92400e; margin-bottom: 4px; letter-spacing: 1px; }
  .header .subtitle { font-size: 14px; color: #78716c; }
  .meta { display: flex; justify-content: space-between; background: #fef3c7; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; }
  .meta span { color: #92400e; }
  .section { margin-bottom: 20px; page-break-inside: avoid; }
  .section h2 { font-size: 15px; color: #92400e; border-bottom: 2px solid #fbbf24; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .score-row { display: flex; align-items: center; margin-bottom: 8px; }
  .score-label { width: 120px; font-size: 13px; font-weight: 600; }
  .score-bar-bg { flex: 1; height: 18px; background: #f3f4f6; border-radius: 9px; overflow: hidden; margin: 0 10px; }
  .score-bar { height: 100%; border-radius: 9px; transition: width 0.3s; }
  .score-val { width: 50px; text-align: right; font-size: 13px; font-weight: 600; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
  .card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .card .value { font-size: 22px; font-weight: 700; color: #1f2937; margin-top: 2px; }
  .card .sub { font-size: 11px; color: #9ca3af; }
  .badge-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .badge { background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .note { background: #f9fafb; border-left: 3px solid #d97706; padding: 8px 12px; margin-bottom: 8px; border-radius: 0 6px 6px 0; }
  .note .date { font-size: 11px; color: #9ca3af; }
  .note .text { font-size: 13px; }
  .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px; font-size: 11px; color: #9ca3af; }
  .primary-wound { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 6px; font-weight: 600; font-size: 13px; margin-right: 8px; }
</style></head><body>
<div class="header">
  <h1>Intrinsic Therapeutic Solutions</h1>
  <div class="subtitle">IFS Self-Therapy Program &mdash; Client Progress Report</div>
</div>
<div class="meta">
  <span><strong>Client:</strong> ${r.client?.name || 'Unknown'}</span>
  <span><strong>Period:</strong> ${period}</span>
  <span><strong>Generated:</strong> ${genDate}</span>
</div>

${r.assessment ? `<div class="section">
  <h2>Wound Assessment</h2>
  <p style="margin-bottom:12px">
    <span class="primary-wound">Primary: ${r.assessment.primary_wound || 'N/A'}</span>
    <span class="primary-wound">Secondary: ${r.assessment.secondary_wound || 'N/A'}</span>
  </p>
  ${woundScores.map(w => `<div class="score-row">
    <span class="score-label">${w.name}</span>
    <div class="score-bar-bg"><div class="score-bar" style="width:${(w.score / 25) * 100}%;background:${w.color}"></div></div>
    <span class="score-val">${w.score}/25</span>
  </div>`).join('')}
</div>` : ''}

<div class="section">
  <h2>Progress Overview</h2>
  <div class="grid">
    <div class="card"><div class="label">Module Completion</div><div class="value">${r.progress.percentage}%</div><div class="sub">${r.progress.completedModules} of ${r.progress.totalModules} modules</div></div>
    <div class="card"><div class="label">Exercises</div><div class="value">${r.exercises.completed}</div><div class="sub">Completed activities</div></div>
    <div class="card"><div class="label">Journal Entries</div><div class="value">${r.journals.total}</div><div class="sub">Total reflections</div></div>
    <div class="card"><div class="label">Mood Check-ins</div><div class="value">${r.mood.entries}</div><div class="sub">Avg Mood: ${r.mood.average || 'N/A'}/10 &middot; Energy: ${r.mood.averageEnergy || 'N/A'}/10</div></div>
  </div>
</div>

<div class="section">
  <h2>Homework</h2>
  <div class="grid">
    <div class="card"><div class="label">Completion Rate</div><div class="value">${r.homework.rate}%</div><div class="sub">${r.homework.completed} of ${r.homework.total} assignments</div></div>
    <div class="card"><div class="label">Gamification</div><div class="value">${r.gamification.xp} XP</div><div class="sub">Level ${r.gamification.level} &middot; ${r.gamification.currentStreak}-day streak (best: ${r.gamification.longestStreak})</div></div>
  </div>
  ${r.gamification.badges?.length > 0 ? `<div class="badge-list">${r.gamification.badges.map(b => `<span class="badge">${typeof b === 'string' ? b : b.name || b.id}</span>`).join('')}</div>` : ''}
</div>

${r.notes.recent.length > 0 ? `<div class="section">
  <h2>Recent Advisor Notes</h2>
  ${r.notes.recent.map(n => `<div class="note">
    <div class="date">${new Date(n.created_at).toLocaleDateString()}</div>
    <div class="text">${(n.content || 'No content').slice(0, 300)}</div>
  </div>`).join('')}
</div>` : ''}

<div class="footer">
  <p>Intrinsic Therapeutic Solutions &mdash; IFS Self-Therapy Program</p>
  <p>This report is confidential. Generated on ${genDate}.</p>
</div>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const ScoreBar = ({ label, score, max = 25, color = 'bg-blue-500' }) => (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-xs font-medium ${textSecondary}`}>{label}</span>
        <span className={`text-xs font-bold ${textPrimary}`}>{score}/{max}</span>
      </div>
      <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
        <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${(score / max) * 100}%` }} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className={`text-xl font-bold ${textPrimary}`}>Progress Reports</h1>
          <p className={`text-sm ${textMuted}`}>Generate comprehensive client progress reports</p>
        </div>
      </div>

      <div className={`${cardBg} rounded-2xl border ${cardBorder} p-6 mb-6`}>
        <h2 className={`text-sm font-semibold ${textPrimary} mb-4`}>Generate Report</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className={`block text-xs font-medium ${textMuted} mb-1.5`}>Client</label>
            <select
              value={selectedClient}
              onChange={e => { setSelectedClient(e.target.value); setReportData(null); }}
              className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-emerald-500 outline-none`}
            >
              <option value="">Select a client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className={`block text-xs font-medium ${textMuted} mb-1.5`}>Time Period</label>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-emerald-500 outline-none`}
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={!selectedClient || generating}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Generate
            </button>
          </div>
        </div>
      </div>

      {reportData && (
        <div ref={reportRef} className="print-report">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-bold ${textPrimary}`}>
              Report: {reportData.client?.name}
            </h2>
            <div className="flex gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${cardBorder} text-sm font-medium ${textSecondary} hover:${isDark ? 'bg-slate-700' : 'bg-gray-50'} transition-colors`}
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all"
              >
                <Download className="w-4 h-4" /> Export Report
              </button>
            </div>
          </div>
          <p className={`text-xs ${textMuted} mb-6`}>
            Generated {new Date(reportData.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })} •
            Period: {dateRange === 'all' ? 'All Time' : dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Modules', value: `${reportData.progress.completedModules}/${reportData.progress.totalModules}`, sub: `${reportData.progress.percentage}%`, icon: BookOpen, color: 'from-blue-500 to-blue-600' },
              { label: 'Journals', value: reportData.journals.total, sub: 'entries', icon: FileText, color: 'from-purple-500 to-purple-600' },
              { label: 'Mood Avg', value: reportData.mood.average || '—', sub: '/10', icon: Heart, color: 'from-rose-500 to-rose-600' },
              { label: 'Streak', value: reportData.gamification.currentStreak, sub: 'days', icon: Flame, color: 'from-amber-500 to-amber-600' },
            ].map(s => (
              <div key={s.label} className={`${cardBg} rounded-xl border ${cardBorder} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                    <s.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className={`text-xs font-medium ${textMuted}`}>{s.label}</span>
                </div>
                <p className={`text-xl font-bold ${textPrimary}`}>{s.value} <span className={`text-xs font-normal ${textMuted}`}>{s.sub}</span></p>
              </div>
            ))}
          </div>

          {reportData.assessment && (
            <div className={`${cardBg} rounded-xl border ${cardBorder} p-5 mb-4`}>
              <h3 className={`text-sm font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
                <TrendingUp className="w-4 h-4 text-amber-500" /> Wound Assessment Profile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className={`p-3 rounded-lg ${isDark ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-200'}`}>
                  <p className={`text-xs font-medium ${textMuted} mb-0.5`}>Primary Wound</p>
                  <p className={`text-base font-bold capitalize ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{reportData.assessment.primary_wound || 'N/A'}</p>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50 border border-slate-600' : 'bg-gray-50 border border-gray-200'}`}>
                  <p className={`text-xs font-medium ${textMuted} mb-0.5`}>Secondary Wound</p>
                  <p className={`text-base font-bold capitalize ${textPrimary}`}>{reportData.assessment.secondary_wound || 'N/A'}</p>
                </div>
              </div>
              {(() => {
                const normalizeScore = (s) => {
                  if (s === null || s === undefined) return 0;
                  const num = Number(s);
                  if (isNaN(num)) return 0;
                  return num <= 5 ? Math.round(num * 5) : Math.round(num);
                };
                return (
                  <div>
                    <ScoreBar label="Abandonment" score={normalizeScore(reportData.assessment.abandonment_score)} color="bg-blue-500" />
                    <ScoreBar label="Shame" score={normalizeScore(reportData.assessment.shame_score)} color="bg-amber-500" />
                    <ScoreBar label="Neglect" score={normalizeScore(reportData.assessment.neglect_score)} color="bg-amber-500" />
                    <ScoreBar label="Betrayal" score={normalizeScore(reportData.assessment.betrayal_score)} color="bg-red-500" />
                    <ScoreBar label="Helplessness" score={normalizeScore(reportData.assessment.helplessness_score || 0)} color="bg-rose-500" />
                  </div>
                );
              })()}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
              <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                <ClipboardIcon className="w-4 h-4 text-amber-500" /> Homework Progress
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke={isDark ? '#334155' : '#e5e7eb'} strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#10b981" strokeWidth="3"
                      strokeDasharray={`${reportData.homework.rate}, 100`} />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${textPrimary}`}>
                    {reportData.homework.rate}%
                  </span>
                </div>
                <div>
                  <p className={`text-sm ${textPrimary}`}><span className="font-bold">{reportData.homework.completed}</span> of {reportData.homework.total} completed</p>
                  <p className={`text-xs ${textMuted} mt-0.5`}>Homework completion rate</p>
                </div>
              </div>
            </div>

            <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
              <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                <Award className="w-4 h-4 text-amber-500" /> Gamification
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={`text-xs ${textMuted}`}>XP Earned</p>
                  <p className={`text-lg font-bold ${textPrimary}`}>{reportData.gamification.xp}</p>
                </div>
                <div>
                  <p className={`text-xs ${textMuted}`}>Level</p>
                  <p className={`text-lg font-bold ${textPrimary}`}>{reportData.gamification.level}</p>
                </div>
                <div>
                  <p className={`text-xs ${textMuted}`}>Current Streak</p>
                  <p className={`text-lg font-bold ${textPrimary}`}>{reportData.gamification.currentStreak}d</p>
                </div>
                <div>
                  <p className={`text-xs ${textMuted}`}>Best Streak</p>
                  <p className={`text-lg font-bold ${textPrimary}`}>{reportData.gamification.longestStreak}d</p>
                </div>
              </div>
            </div>
          </div>

          {reportData.mood.entries > 0 && (
            <div className={`${cardBg} rounded-xl border ${cardBorder} p-5 mb-4`}>
              <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                <Heart className="w-4 h-4 text-rose-500" /> Mood & Energy Overview
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${textPrimary}`}>{reportData.mood.average}</p>
                  <p className={`text-xs ${textMuted}`}>Avg Mood /10</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${textPrimary}`}>{reportData.mood.averageEnergy}</p>
                  <p className={`text-xs ${textMuted}`}>Avg Energy /10</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${textPrimary}`}>{reportData.mood.entries}</p>
                  <p className={`text-xs ${textMuted}`}>Check-ins</p>
                </div>
              </div>
            </div>
          )}

          {reportData.notes.recent.length > 0 && (
            <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
              <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                <FileText className="w-4 h-4 text-purple-500" /> Recent Advisor Notes
              </h3>
              <div className="space-y-3">
                {reportData.notes.recent.map(note => (
                  <div key={note.id} className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <p className={`text-xs ${textMuted} mb-1`}>
                      {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {note.note_type && ` • ${note.note_type}`}
                    </p>
                    <p className={`text-sm ${textSecondary} leading-relaxed`}>{note.content?.slice(0, 300) || 'No content'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!reportData && !generating && (
        <div className={`${cardBg} rounded-2xl border ${cardBorder} p-12 text-center`}>
          <FileText className={`w-16 h-16 mx-auto mb-4 ${textMuted} opacity-20`} />
          <p className={`text-lg font-semibold ${textSecondary}`}>Select a client and generate a report</p>
          <p className={`text-sm ${textMuted} mt-2`}>Reports include assessment scores, module progress, mood trends, homework completion, and gamification stats</p>
        </div>
      )}
    </div>
  );
};

const ClipboardIcon = CheckCircle;

export default TherapistReports;
