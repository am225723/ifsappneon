import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, ArrowLeft, BarChart3,
  Calendar, Zap, Heart, Brain, Sun, Cloud, CloudRain, Smile, Meh,
  Users, ChevronDown, RefreshCw, Activity, Star, Flame
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { loadAssignedClients } from '../lib/therapistAssignments';

const MOOD_LABELS = { 1: 'Struggling', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' };
const MOOD_COLORS = { 1: '#6366F1', 2: '#6B7280', 3: '#3B82F6', 4: '#22C55E', 5: '#EAB308' };
const MOOD_ICONS  = { 1: CloudRain, 2: Cloud, 3: Meh, 4: Smile, 5: Sun };
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function SVGLineChart({ data, color = '#F59E0B', max = 10, min = 1, height = 120, isDark }) {
  if (!data || data.length < 2) return (
    <div className={`flex items-center justify-center h-${Math.round(height/4)} text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Not enough data yet</div>
  );
  const w = 400, h = height;
  const pad = { top: 10, bottom: 20, left: 30, right: 10 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  const xStep = cw / (data.length - 1);

  const toX = (i) => pad.left + i * xStep;
  const toY = (v) => pad.top + ch - ((v - min) / (max - min)) * ch;

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const area = `M${toX(0)},${toY(data[0].value)} ` +
    data.map((d, i) => `L${toX(i)},${toY(d.value)}`).join(' ') +
    ` L${toX(data.length - 1)},${pad.top + ch} L${toX(0)},${pad.top + ch} Z`;

  const gridLines = [min, Math.round((min + max) / 2), max];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      {gridLines.map(v => (
        <g key={v}>
          <line x1={pad.left} y1={toY(v)} x2={w - pad.right} y2={toY(v)}
            stroke={isDark ? '#334155' : '#F1F5F9'} strokeWidth="1" strokeDasharray="4,4" />
          <text x={pad.left - 4} y={toY(v) + 4} textAnchor="end" fontSize="9"
            fill={isDark ? '#64748B' : '#94A3B8'}>{v}</text>
        </g>
      ))}
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color.replace('#','')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.value)} r="4" fill={color} stroke={isDark ? '#1E293B' : 'white'} strokeWidth="2">
          <title>{d.label}: {d.value}</title>
        </circle>
      ))}
      {data.map((d, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0 && (
        <text key={`l${i}`} x={toX(i)} y={h - 4} textAnchor="middle" fontSize="8" fill={isDark ? '#64748B' : '#94A3B8'}>
          {d.label}
        </text>
      ))}
    </svg>
  );
}

function HorizontalBar({ label, value, max, color, isDark }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs w-28 truncate ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{label}</span>
      <div className={`flex-1 h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
        <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className={`text-xs w-6 text-right font-semibold ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, isDark }) {
  return (
    <div className={`rounded-2xl border p-4 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{value}</p>
      <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
      {sub && <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  );
}

export default function MoodAnalytics() {
  const { theme } = useTheme();
  const isDark = theme.isDark;

  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30');
  const [moodEntries, setMoodEntries] = useState([]);
  const [checkinData, setCheckinData] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isAdvisor, setIsAdvisor] = useState(false);

  const currentClient = clientAuth.getCurrentClient();
  const currentClientId = currentClient?.id;

  useEffect(() => {
    if (!currentClientId) { setLoading(false); return; }
    const role = currentClient?.user_role;
    if (role === 'therapist') {
      setIsAdvisor(true);
      loadAdvisorClients();
    } else {
      loadClientData(currentClientId);
    }
  }, [currentClientId]);

  useEffect(() => {
    if (selectedClient) loadClientData(selectedClient);
  }, [selectedClient, range]);

  const loadAdvisorClients = async () => {
    const data = await loadAssignedClients(currentClientId, 'id, name');
    setClients(data || []);
    if (data && data.length > 0) {
      setSelectedClient(data[0].id);
    }
    setLoading(false);
  };

  const loadClientData = async (clientId) => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - parseInt(range));
    const sinceIso = since.toISOString();

    try {
      const [moodRes, checkinRes] = await Promise.all([
        supabase.from('ifs_mood_entries')
          .select('*').eq('client_id', clientId)
          .gte('date', sinceIso).order('date', { ascending: true }),
        supabase.from('ifs_interactive_data')
          .select('*').eq('client_id', clientId)
          .like('module_id', 'daily_checkin_%')
          .order('updated_at', { ascending: true }),
      ]);

      setMoodEntries(moodRes.data || []);
      const checkins = (checkinRes.data || []).map(r => ({
        ...r.data,
        date: r.module_id.replace('daily_checkin_', ''),
        updatedAt: r.updated_at,
      })).filter(c => new Date(c.date) >= since);
      setCheckinData(checkins);
    } catch (e) {
      console.error('Error loading analytics:', e);
    }
    setLoading(false);
  };

  const analytics = useMemo(() => {
    if (!moodEntries.length && !checkinData.length) return null;

    const allMoods = moodEntries.map(e => e.mood).filter(Boolean);
    const allEnergies = moodEntries.map(e => e.energy).filter(Boolean);
    const allSelfEnergy = checkinData.map(c => c.selfEnergy).filter(Boolean);
    const avgMood = allMoods.length ? (allMoods.reduce((s, v) => s + v, 0) / allMoods.length).toFixed(1) : null;
    const avgEnergy = allEnergies.length ? (allEnergies.reduce((s, v) => s + v, 0) / allEnergies.length).toFixed(1) : null;
    const avgSelf = allSelfEnergy.length ? (allSelfEnergy.reduce((s, v) => s + v, 0) / allSelfEnergy.length).toFixed(1) : null;

    const dayStreak = (() => {
      const dates = new Set([
        ...moodEntries.map(e => new Date(e.date).toDateString()),
        ...checkinData.map(c => new Date(c.date).toDateString()),
      ]);
      let streak = 0;
      const d = new Date();
      while (dates.has(d.toDateString())) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
      return streak;
    })();

    const moodTrend = moodEntries.map(e => ({
      value: e.mood,
      label: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    const energyTrend = moodEntries.map(e => ({
      value: e.energy,
      label: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    const selfEnergyTrend = checkinData.map(c => ({
      value: c.selfEnergy,
      label: new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    const emotionCounts = {};
    moodEntries.forEach(e => (e.emotions || []).forEach(em => { emotionCounts[em] = (emotionCounts[em] || 0) + 1; }));
    const topEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const partCounts = {};
    checkinData.forEach(c => (c.activeParts || []).forEach(p => { partCounts[p] = (partCounts[p] || 0) + 1; }));
    const topParts = Object.entries(partCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const dayOfWeekMoods = Array(7).fill(null).map(() => []);
    moodEntries.forEach(e => { const d = new Date(e.date).getDay(); dayOfWeekMoods[d].push(e.mood); });
    const dayAvgMoods = dayOfWeekMoods.map(arr => arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length) : null);

    const trend = allMoods.length >= 3 ? (() => {
      const first = allMoods.slice(0, Math.floor(allMoods.length / 2));
      const last = allMoods.slice(Math.floor(allMoods.length / 2));
      const a1 = first.reduce((s, v) => s + v, 0) / first.length;
      const a2 = last.reduce((s, v) => s + v, 0) / last.length;
      return a2 - a1 > 0.3 ? 'up' : a1 - a2 > 0.3 ? 'down' : 'stable';
    })() : 'stable';

    return { avgMood, avgEnergy, avgSelf, dayStreak, moodTrend, energyTrend, selfEnergyTrend, topEmotions, topParts, dayAvgMoods, trend, totalEntries: moodEntries.length + checkinData.length };
  }, [moodEntries, checkinData]);

  const bg = isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50/30 to-rose-50/30';
  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-amber-100';
  const textPrimary = isDark ? 'text-slate-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-400';

  const clientName = isAdvisor
    ? (clients.find(c => c.id === selectedClient)?.name || 'Client')
    : (currentClient?.name || 'Your');

  return (
    <div className={`min-h-screen pb-32 ${bg}`}>
      <div className={`sticky top-0 z-20 backdrop-blur-xl border-b ${isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to={isAdvisor ? '/therapist-dashboard' : '/home'} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-amber-100 text-gray-600'}`}>
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className={`text-xl font-bold ${textPrimary}`}>
              {isAdvisor ? `${clientName}'s Analytics` : 'Mood & Parts Analytics'}
            </h1>
            <p className={`text-xs ${textMuted}`}>Trends, patterns, and parts activity</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdvisor && clients.length > 0 && (
              <div className="relative">
                <select
                  value={selectedClient || ''}
                  onChange={e => setSelectedClient(e.target.value)}
                  className={`text-sm pl-3 pr-8 py-1.5 rounded-xl border appearance-none cursor-pointer ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-amber-200 text-gray-700'}`}
                >
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className={`absolute right-2.5 top-2.5 pointer-events-none ${textMuted}`} />
              </div>
            )}
            <select value={range} onChange={e => { setRange(e.target.value); if (!isAdvisor) loadClientData(currentClientId); }}
              className={`text-sm pl-3 pr-8 py-1.5 rounded-xl border appearance-none cursor-pointer ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-amber-200 text-gray-700'}`}>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : !analytics ? (
          <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${isDark ? 'border-slate-700' : 'border-amber-200'}`}>
            <BarChart3 size={48} className={`mx-auto mb-4 opacity-40 ${textMuted}`} />
            <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>No data yet</h3>
            <p className={`text-sm mb-6 ${textMuted}`}>
              {isAdvisor ? 'This client has no mood or check-in entries yet.' : 'Start tracking your mood and doing daily check-ins to see patterns here.'}
            </p>
            {!isAdvisor && (
              <div className="flex justify-center gap-3">
                <Link to="/mood-tracker" className={`px-5 py-2.5 rounded-xl font-medium border transition-all ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Mood Tracker</Link>
                <Link to="/daily-checkin" className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all">
                  Daily Check-In
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Avg Mood" value={analytics.avgMood ? `${analytics.avgMood}/5` : '—'} sub={analytics.avgMood ? MOOD_LABELS[Math.round(analytics.avgMood)] : 'No data'}
                icon={analytics.trend === 'up' ? TrendingUp : analytics.trend === 'down' ? TrendingDown : Minus}
                color={analytics.trend === 'up' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : analytics.trend === 'down' ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}
                isDark={isDark} />
              <StatCard label="Avg Energy" value={analytics.avgEnergy ? `${analytics.avgEnergy}/10` : '—'} sub="Mood tracker"
                icon={Zap} color="bg-gradient-to-br from-amber-500 to-orange-500" isDark={isDark} />
              <StatCard label="Self-Energy" value={analytics.avgSelf ? `${analytics.avgSelf}/10` : '—'} sub="From check-ins"
                icon={Sparkles || Star} color="bg-gradient-to-br from-emerald-500 to-teal-600" isDark={isDark} />
              <StatCard label="Check-In Streak" value={`${analytics.dayStreak}d`} sub={`${analytics.totalEntries} total entries`}
                icon={Flame} color="bg-gradient-to-br from-rose-500 to-pink-600" isDark={isDark} />
            </div>

            {/* Mood Trend Chart */}
            {analytics.moodTrend.length >= 2 && (
              <div className={`rounded-2xl border backdrop-blur-xl p-5 ${cardBg}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-bold ${textPrimary}`}>Mood Over Time</h3>
                  <div className="flex items-center gap-1.5">
                    {analytics.trend === 'up' && <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1"><TrendingUp size={12} /> Improving</span>}
                    {analytics.trend === 'down' && <span className="text-xs text-rose-500 font-semibold flex items-center gap-1"><TrendingDown size={12} /> Declining</span>}
                    {analytics.trend === 'stable' && <span className="text-xs text-blue-500 font-semibold flex items-center gap-1"><Minus size={12} /> Stable</span>}
                  </div>
                </div>
                <SVGLineChart data={analytics.moodTrend} color={MOOD_COLORS[Math.round(parseFloat(analytics.avgMood || 3))]} max={5} min={1} height={130} isDark={isDark} />
                <div className="flex justify-between mt-2">
                  {[1,2,3,4,5].map(v => (
                    <div key={v} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MOOD_COLORS[v] }} />
                      <span className={`text-xs ${textMuted}`}>{MOOD_LABELS[v]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Energy + Self-Energy Trends */}
            {(analytics.energyTrend.length >= 2 || analytics.selfEnergyTrend.length >= 2) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analytics.energyTrend.length >= 2 && (
                  <div className={`rounded-2xl border backdrop-blur-xl p-5 ${cardBg}`}>
                    <h3 className={`font-bold mb-3 ${textPrimary}`}>Energy Level</h3>
                    <SVGLineChart data={analytics.energyTrend} color="#F59E0B" max={10} min={1} height={110} isDark={isDark} />
                  </div>
                )}
                {analytics.selfEnergyTrend.length >= 2 && (
                  <div className={`rounded-2xl border backdrop-blur-xl p-5 ${cardBg}`}>
                    <h3 className={`font-bold mb-3 ${textPrimary}`}>Self-Energy (from Check-Ins)</h3>
                    <SVGLineChart data={analytics.selfEnergyTrend} color="#10B981" max={10} min={1} height={110} isDark={isDark} />
                  </div>
                )}
              </div>
            )}

            {/* Day of Week Heatmap */}
            {analytics.dayAvgMoods.some(v => v !== null) && (
              <div className={`rounded-2xl border backdrop-blur-xl p-5 ${cardBg}`}>
                <h3 className={`font-bold mb-4 ${textPrimary}`}>Average Mood by Day of Week</h3>
                <div className="flex gap-2 items-end">
                  {DAYS.map((day, i) => {
                    const val = analytics.dayAvgMoods[i];
                    const pct = val ? ((val - 1) / 4) * 100 : 0;
                    const col = val ? MOOD_COLORS[Math.round(val)] : (isDark ? '#334155' : '#E2E8F0');
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`text-xs font-semibold ${val ? '' : textMuted}`} style={{ color: val ? col : undefined }}>
                          {val ? val.toFixed(1) : '—'}
                        </div>
                        <div className="w-full rounded-t-lg transition-all duration-700" style={{
                          height: `${Math.max(8, pct)}px`, backgroundColor: col, minHeight: '8px'
                        }} title={val ? `${day}: ${val.toFixed(1)}/5` : `${day}: no data`} />
                        <span className={`text-xs ${textMuted}`}>{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Emotions & Parts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {analytics.topEmotions.length > 0 && (
                <div className={`rounded-2xl border backdrop-blur-xl p-5 ${cardBg}`}>
                  <h3 className={`font-bold mb-4 ${textPrimary}`}>Most Common Emotions</h3>
                  <div className="space-y-2.5">
                    {analytics.topEmotions.map(([name, count]) => (
                      <HorizontalBar key={name} label={name} value={count}
                        max={analytics.topEmotions[0][1]} color="#F59E0B" isDark={isDark} />
                    ))}
                  </div>
                </div>
              )}
              {analytics.topParts.length > 0 && (
                <div className={`rounded-2xl border backdrop-blur-xl p-5 ${cardBg}`}>
                  <h3 className={`font-bold mb-4 ${textPrimary}`}>Most Active Parts</h3>
                  <div className="space-y-2.5">
                    {analytics.topParts.map(([id, count]) => {
                      const name = id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      return (
                        <HorizontalBar key={id} label={name} value={count}
                          max={analytics.topParts[0][1]} color="#6366F1" isDark={isDark} />
                      );
                    })}
                  </div>
                  <p className={`text-xs mt-3 italic ${textMuted}`}>Based on daily check-in reports</p>
                </div>
              )}
            </div>

            {/* Recent Check-In Summaries */}
            {checkinData.length > 0 && (
              <div className={`rounded-2xl border backdrop-blur-xl p-5 ${cardBg}`}>
                <h3 className={`font-bold mb-4 ${textPrimary}`}>Recent Check-Ins</h3>
                <div className="space-y-3">
                  {checkinData.slice(-7).reverse().map((c, i) => {
                    const moodOpt = [null, ...Object.values(MOOD_LABELS)];
                    const MIcon = c.mood ? MOOD_ICONS[c.mood] : Meh;
                    const moodCol = c.mood ? MOOD_COLORS[c.mood] : '#6B7280';
                    return (
                      <div key={i} className={`flex items-start gap-3 py-3 border-b last:border-0 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                        <MIcon size={18} style={{ color: moodCol, flexShrink: 0, marginTop: 2 }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-sm font-semibold ${textSecondary}`}>{c.date}</span>
                            <span className="text-xs" style={{ color: moodCol }}>{MOOD_LABELS[c.mood] || '—'}</span>
                            {c.selfEnergy && <span className={`text-xs ${textMuted}`}>· Self: {c.selfEnergy}/10</span>}
                          </div>
                          {c.intention && <p className={`text-xs italic mb-1 ${textMuted}`}>"{c.intention}"</p>}
                          {(c.activeParts || []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {(c.activeParts || []).slice(0, 4).map(pid => (
                                <span key={pid} className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                                  {pid.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              ))}
                              {(c.activeParts || []).length > 4 && <span className={`text-xs ${textMuted}`}>+{c.activeParts.length - 4} more</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Insights for Advisor */}
            {isAdvisor && (
              <div className={`rounded-2xl border backdrop-blur-xl p-5 ${isDark ? 'bg-indigo-900/20 border-indigo-700/40' : 'bg-indigo-50 border-indigo-200'}`}>
                <h3 className={`font-bold mb-2 ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>Advisor Insights</h3>
                <ul className={`text-sm space-y-1.5 list-disc pl-4 ${isDark ? 'text-indigo-200/80' : 'text-indigo-700'}`}>
                  {analytics.avgMood && parseFloat(analytics.avgMood) <= 2.5 && (
                    <li>Average mood is low — consider checking in or adjusting session focus to stabilize.</li>
                  )}
                  {analytics.avgSelf && parseFloat(analytics.avgSelf) <= 4 && (
                    <li>Self-energy is low — parts may be running the system. Co-regulation or grounding work recommended.</li>
                  )}
                  {analytics.dayStreak === 0 && (
                    <li>No recent check-ins — consider sending a gentle reminder or assigning a check-in as homework.</li>
                  )}
                  {analytics.topParts.length > 0 && (
                    <li>Most active part: <strong>{analytics.topParts[0][0].replace(/-/g, ' ')}</strong> (active {analytics.topParts[0][1]} times). Consider focused work here.</li>
                  )}
                  {analytics.trend === 'up' && <li>Mood trend is improving — acknowledge progress in next session.</li>}
                  {analytics.trend === 'down' && <li>Mood trend is declining — explore possible triggers or burdens increasing.</li>}
                  {!analytics.avgMood && !analytics.avgSelf && <li>No data available yet for this time range. Encourage client to use the daily check-in.</li>}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
