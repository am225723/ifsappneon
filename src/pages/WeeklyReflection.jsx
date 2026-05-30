import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Heart,
  Brain,
  Activity,
  Flame,
  Sparkles,
  Send,
  Check,
  Calendar,
  Users
} from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { clientAuth } from '../lib/supabasePersonalization';

function getWeekId() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 604800000;
  const weekNum = Math.ceil((diff / oneWeek) + 1);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return { start: startOfWeek, end: endOfWeek };
}

function MiniLineChart({ data, color = '#f59e0b', height = 60, width = 200 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((val, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - ((val - min) / range) * (height - 10) - 5;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((val, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * width;
        const y = height - ((val - min) / range) * (height - 10) - 5;
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

function MiniBarChart({ data, labels, color = '#10b981', height = 60, width = 200 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const barWidth = Math.min(24, (width / data.length) - 4);

  return (
    <svg width={width} height={height + 20} className="overflow-visible">
      {data.map((val, i) => {
        const barHeight = (val / max) * height;
        const x = (i / data.length) * width + barWidth / 2;
        const y = height - barHeight;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="3"
              fill={color}
              opacity="0.8"
            />
            {labels && labels[i] && (
              <text x={x + barWidth / 2} y={height + 14} textAnchor="middle" fontSize="9" fill="#9ca3af">
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function WeeklyReflection() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState(null);
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingReflection, setExistingReflection] = useState(null);

  const weekId = getWeekId();
  const moduleId = `weekly_reflection_${weekId}`;
  const { start: weekStart, end: weekEnd } = getWeekRange();

  useEffect(() => {
    loadWeekData();
  }, []);

  const loadWeekData = async () => {
    const client = clientAuth.getCurrentClient();
    if (!client?.id) {
      setLoading(false);
      return;
    }
    const clientId = client.id;
    const startISO = weekStart.toISOString();
    const endISO = weekEnd.toISOString();

    try {
      const [moodRes, journalRes, progressRes, gamRes, checkinRes, existingRes] = await Promise.all([
        supabase
          .from('ifs_mood_entries')
          .select('mood, energy, emotions, date')
          .eq('client_id', clientId)
          .gte('date', startISO)
          .lte('date', endISO)
          .order('date', { ascending: true }),
        supabase
          .from('ifs_journal_entries')
          .select('id, title, created_at')
          .eq('client_id', clientId)
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        supabase
          .from('ifs_client_progress')
          .select('module_id, completed, updated_at')
          .eq('client_id', clientId)
          .gte('updated_at', startISO)
          .lte('updated_at', endISO),
        supabaseHelpers.getGamification(clientId),
        supabase
          .from('ifs_interactive_data')
          .select('module_id, data, updated_at')
          .eq('client_id', clientId)
          .like('module_id', 'daily_checkin_%')
          .gte('updated_at', startISO)
          .lte('updated_at', endISO),
        supabase
          .from('ifs_interactive_data')
          .select('data')
          .eq('client_id', clientId)
          .eq('module_id', moduleId)
          .maybeSingle()
      ]);

      const moods = moodRes.data || [];
      const journals = journalRes.data || [];
      const progress = progressRes.data || [];
      const gamification = gamRes;
      const checkins = checkinRes.data || [];
      const existing = existingRes.data;

      const moodValues = moods.map(m => m.mood).filter(v => typeof v === 'number');
      const energyValues = moods.map(m => m.energy).filter(v => typeof v === 'number');
      const avgMood = moodValues.length > 0 ? (moodValues.reduce((a, b) => a + b, 0) / moodValues.length) : null;
      const highMood = moodValues.length > 0 ? Math.max(...moodValues) : null;
      const lowMood = moodValues.length > 0 ? Math.min(...moodValues) : null;
      const avgEnergy = energyValues.length > 0 ? (energyValues.reduce((a, b) => a + b, 0) / energyValues.length) : null;

      const moodTrend = moodValues.length >= 2 
        ? (moodValues[moodValues.length - 1] > moodValues[0] ? 'up' : moodValues[moodValues.length - 1] < moodValues[0] ? 'down' : 'stable')
        : 'stable';

      const partsActive = {};
      checkins.forEach(c => {
        const data = c.data;
        if (data?.activeParts) {
          (Array.isArray(data.activeParts) ? data.activeParts : []).forEach(p => {
            const name = typeof p === 'string' ? p : p?.name || 'Unknown';
            partsActive[name] = (partsActive[name] || 0) + 1;
          });
        }
        if (data?.parts) {
          (Array.isArray(data.parts) ? data.parts : []).forEach(p => {
            const name = typeof p === 'string' ? p : p?.name || 'Unknown';
            partsActive[name] = (partsActive[name] || 0) + 1;
          });
        }
      });
      const topParts = Object.entries(partsActive)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const modulesWorkedOn = progress.map(p => p.module_id);
      const modulesCompleted = progress.filter(p => p.completed).map(p => p.module_id);

      let selfEnergyScores = [];
      checkins.forEach(c => {
        const data = c.data;
        if (data?.selfEnergy !== undefined && data?.selfEnergy !== null) {
          selfEnergyScores.push(data.selfEnergy);
        }
        if (data?.self_energy !== undefined && data?.self_energy !== null) {
          selfEnergyScores.push(data.self_energy);
        }
      });
      const avgSelfEnergy = selfEnergyScores.length > 0 
        ? (selfEnergyScores.reduce((a, b) => a + b, 0) / selfEnergyScores.length)
        : null;

      const streak = gamification?.streak_current || 0;

      if (existing?.data) {
        setExistingReflection(existing.data);
        setReflection(existing.data.reflection || '');
        setSaved(true);
      }

      setWeekData({
        moodValues,
        energyValues,
        avgMood,
        highMood,
        lowMood,
        avgEnergy,
        moodTrend,
        journalCount: journals.length,
        modulesWorkedOn,
        modulesCompleted,
        topParts,
        avgSelfEnergy,
        selfEnergyScores,
        streak,
        checkinCount: checkins.length,
        moodDates: moods.map(m => {
          const d = new Date(m.date);
          return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
        })
      });
    } catch (err) {
      console.error('Error loading weekly data:', err);
    }
    setLoading(false);
  };

  const saveReflection = async () => {
    const client = clientAuth.getCurrentClient();
    if (!client?.id || !reflection.trim()) return;

    setSaving(true);
    try {
      await supabaseHelpers.saveInteractiveData(client.id, moduleId, {
        reflection: reflection.trim(),
        weekId,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        savedAt: new Date().toISOString(),
        summary: weekData ? {
          avgMood: weekData.avgMood,
          journalCount: weekData.journalCount,
          modulesCount: weekData.modulesWorkedOn.length,
          streak: weekData.streak,
          avgSelfEnergy: weekData.avgSelfEnergy
        } : null
      });
      setSaved(true);
      setExistingReflection({ reflection: reflection.trim() });
    } catch (err) {
      console.error('Error saving reflection:', err);
    }
    setSaving(false);
  };

  const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const cardClass = `${theme.isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} rounded-2xl border p-5 shadow-sm`;
  const labelClass = `text-xs font-medium uppercase tracking-wider ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`;
  const valueClass = `text-2xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className={theme.isDark ? 'text-slate-300' : 'text-gray-600'}>Generating your weekly summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className={`p-2 rounded-lg ${theme.isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className={`text-2xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            Weekly Reflection
          </h1>
          <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            {formatDate(weekStart)} – {formatDate(weekEnd)}
          </p>
        </div>
      </div>

      {!weekData ? (
        <div className={cardClass}>
          <p className={theme.isDark ? 'text-slate-300' : 'text-gray-600'}>
            No data available for this week yet. Start using the app to see your weekly summary!
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-rose-500" />
                <span className={labelClass}>Mood</span>
                {weekData.moodTrend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500 ml-auto" />}
                {weekData.moodTrend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 ml-auto" />}
                {weekData.moodTrend === 'stable' && <Minus className="w-4 h-4 text-amber-500 ml-auto" />}
              </div>
              {weekData.avgMood !== null ? (
                <>
                  <p className={valueClass}>{weekData.avgMood.toFixed(1)}<span className="text-sm font-normal opacity-60">/10</span></p>
                  <div className="flex gap-3 mt-1">
                    <span className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      High: {weekData.highMood}
                    </span>
                    <span className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Low: {weekData.lowMood}
                    </span>
                  </div>
                  {weekData.moodValues.length > 1 && (
                    <div className="mt-3">
                      <MiniLineChart data={weekData.moodValues} color="#f43f5e" width={140} height={40} />
                    </div>
                  )}
                </>
              ) : (
                <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>No mood entries</p>
              )}
            </div>

            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className={labelClass}>Energy</span>
              </div>
              {weekData.avgEnergy !== null ? (
                <>
                  <p className={valueClass}>{weekData.avgEnergy.toFixed(1)}<span className="text-sm font-normal opacity-60">/10</span></p>
                  {weekData.energyValues.length > 1 && (
                    <div className="mt-3">
                      <MiniLineChart data={weekData.energyValues} color="#3b82f6" width={140} height={40} />
                    </div>
                  )}
                </>
              ) : (
                <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>No energy data</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span className={labelClass}>Journal</span>
              </div>
              <p className={valueClass}>{weekData.journalCount}</p>
              <p className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {weekData.journalCount === 1 ? 'entry' : 'entries'}
              </p>
            </div>

            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-emerald-500" />
                <span className={labelClass}>Modules</span>
              </div>
              <p className={valueClass}>{weekData.modulesWorkedOn.length}</p>
              <p className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {weekData.modulesCompleted.length} completed
              </p>
            </div>

            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className={labelClass}>Streak</span>
              </div>
              <p className={valueClass}>{weekData.streak}</p>
              <p className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {weekData.streak === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>

          {weekData.avgSelfEnergy !== null && (
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className={labelClass}>Self-Energy Average</span>
              </div>
              <div className="flex items-center gap-4">
                <p className={valueClass}>{weekData.avgSelfEnergy.toFixed(1)}<span className="text-sm font-normal opacity-60">/10</span></p>
                {weekData.selfEnergyScores.length > 1 && (
                  <MiniLineChart data={weekData.selfEnergyScores} color="#6366f1" width={180} height={40} />
                )}
              </div>
            </div>
          )}

          {weekData.topParts.length > 0 && (
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-purple-500" />
                <span className={labelClass}>Most Active Parts</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {weekData.topParts.map(([name, count]) => (
                  <span
                    key={name}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${theme.isDark ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'}`}
                  >
                    {name} <span className="opacity-60">×{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {weekData.modulesWorkedOn.length > 0 && (
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-emerald-500" />
                <span className={labelClass}>Modules This Week</span>
              </div>
              <div className="space-y-2">
                {weekData.modulesWorkedOn.map(mod => (
                  <div key={mod} className="flex items-center gap-2">
                    {weekData.modulesCompleted.includes(mod) ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <div className={`w-4 h-4 rounded-full border-2 ${theme.isDark ? 'border-slate-600' : 'border-gray-300'}`} />
                    )}
                    <span className={`text-sm ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                      {mod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`${theme.isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-amber-50 to-stone-50 border-amber-200'} rounded-2xl border p-6`}>
            <h3 className={`font-semibold ${theme.isDark ? 'text-slate-100' : 'text-gray-800'} mb-2 flex items-center gap-2`}>
              <Sparkles className="w-5 h-5 text-amber-500" />
              How do you feel about this week?
            </h3>
            <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'} mb-4`}>
              Take a moment to reflect on your healing journey this week.
            </p>
            <textarea
              value={reflection}
              onChange={(e) => {
                setReflection(e.target.value);
                if (saved) setSaved(false);
              }}
              placeholder="What stood out to you this week? What are you grateful for? What would you like to focus on next week?"
              rows={4}
              className={`w-full rounded-xl border p-4 text-sm resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${theme.isDark ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-500' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'}`}
            />
            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {reflection.length} characters
              </span>
              <button
                onClick={saveReflection}
                disabled={saving || !reflection.trim()}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  saved
                    ? 'bg-emerald-100 text-emerald-700'
                    : saving
                    ? 'bg-gray-200 text-gray-400 cursor-wait'
                    : 'bg-gradient-to-r from-amber-500 to-emerald-600 text-white hover:from-amber-600 hover:to-emerald-700 shadow-sm hover:shadow'
                } disabled:opacity-50`}
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved
                  </>
                ) : saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Save Reflection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
