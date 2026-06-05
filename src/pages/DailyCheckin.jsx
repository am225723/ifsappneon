import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, Heart, Sun, Cloud, CloudRain, Smile, Meh, Frown,
  CheckCircle, ChevronRight, ChevronLeft, ArrowLeft,
  Sparkles, Shield, User, Star, Flame, Save, Calendar,
  Battery, Brain, Target, BookOpen
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const DEFAULT_PARTS = [
  { id: 'inner-critic', name: 'Inner Critic', type: 'manager', emoji: '⚖️' },
  { id: 'people-pleaser', name: 'People Pleaser', type: 'manager', emoji: '🤝' },
  { id: 'caretaker', name: 'Caretaker', type: 'manager', emoji: '💛' },
  { id: 'perfectionist', name: 'Perfectionist', type: 'manager', emoji: '📐' },
  { id: 'controller', name: 'Controller', type: 'manager', emoji: '🎛️' },
  { id: 'inner-child', name: 'Inner Child', type: 'exile', emoji: '🧒' },
  { id: 'wounded-one', name: 'Wounded One', type: 'exile', emoji: '💔' },
  { id: 'angry-part', name: 'Angry Part', type: 'firefighter', emoji: '🔥' },
  { id: 'numbing-part', name: 'Numbing Part', type: 'firefighter', emoji: '🌫️' },
  { id: 'self', name: 'Self / Witness', type: 'self', emoji: '✨' },
];

const PART_TYPE_COLORS = {
  manager:     { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-700 dark:text-blue-300',   ring: 'ring-blue-400' },
  firefighter: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-400' },
  exile:       { bg: 'bg-rose-100 dark:bg-rose-900/40',   text: 'text-rose-700 dark:text-rose-300',   ring: 'ring-rose-400' },
  self:        { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-400' },
};

const MOOD_OPTIONS = [
  { value: 1, label: 'Struggling', icon: CloudRain, color: 'text-indigo-500', ringColor: 'ring-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
  { value: 2, label: 'Low',        icon: Cloud,     color: 'text-gray-500',   ringColor: 'ring-gray-400',   bg: 'bg-gray-50 dark:bg-gray-700/30' },
  { value: 3, label: 'Okay',       icon: Meh,       color: 'text-blue-500',   ringColor: 'ring-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/30' },
  { value: 4, label: 'Good',       icon: Smile,     color: 'text-green-500',  ringColor: 'ring-green-400',  bg: 'bg-green-50 dark:bg-green-900/30' },
  { value: 5, label: 'Great',      icon: Sun,       color: 'text-yellow-500', ringColor: 'ring-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30' },
];

const INTENTION_PROMPTS = [
  'Be patient with myself today',
  'Stay curious about my parts',
  'Bring compassion to hard feelings',
  'Trust the healing process',
  'Notice without judgment',
  'Let Self lead today',
  'Reach out if I need support',
  'Honor my pace and progress',
];

function SelfEnergySlider({ value, onChange, isDark }) {
  const getColor = (v) => {
    if (v <= 3) return '#EF4444';
    if (v <= 5) return '#F59E0B';
    if (v <= 7) return '#22C55E';
    return '#10B981';
  };
  const label = value <= 2 ? 'Minimal — Parts are leading' :
                value <= 4 ? 'Low — Some blending with parts' :
                value <= 6 ? 'Moderate — Self and parts co-present' :
                value <= 8 ? 'Strong — Self largely leading' :
                             'Full — Deep Self presence';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          Self-Energy Level: <span style={{ color: getColor(value) }}>{value}/10</span>
        </span>
        <Zap className="w-4 h-4" style={{ color: getColor(value) }} />
      </div>
      <input
        type="range" min="1" max="10" value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: getColor(value) }}
      />
      <div className="flex justify-between text-xs mt-1" style={{ color: isDark ? '#94A3B8' : '#9CA3AF' }}>
        <span>Parts leading</span><span>Self leading</span>
      </div>
      <p className={`text-xs mt-2 italic ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
    </div>
  );
}

export default function DailyCheckin() {
  const { theme } = useTheme();
  const isDark = theme.isDark;

  const [step, setStep] = useState(1);
  const [selfEnergy, setSelfEnergy] = useState(5);
  const [mood, setMood] = useState(null);
  const [activeParts, setActiveParts] = useState([]);
  const [partsNotes, setPartsNotes] = useState({});
  const [reflection, setReflection] = useState('');
  const [intention, setIntention] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [todayData, setTodayData] = useState(null);
  const [clientParts, setClientParts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const client = clientAuth.getCurrentClient();
  const clientId = client?.id;

  async function loadData() {
    const today = new Date().toISOString().split('T')[0];
    try {
      const [partsRes, checkinRes, historyRes] = await Promise.all([
        supabaseHelpers.getParts(clientId),
        supabase.from('ifs_interactive_data')
          .select('*').eq('client_id', clientId)
          .eq('module_id', `daily_checkin_${today}`).maybeSingle(),
        supabase.from('ifs_interactive_data')
          .select('*').eq('client_id', clientId)
          .like('module_id', 'daily_checkin_%')
          .order('updated_at', { ascending: false }).limit(7),
      ]);

      const myParts = (partsRes || []).map(p => ({
        id: p.id, name: p.name || p.part_name, type: p.type || p.part_type || 'manager', emoji: '🔷',
      }));
      const allParts = [...myParts, ...DEFAULT_PARTS.filter(d => !myParts.find(m => m.name === d.name))];
      setClientParts(allParts);

      if (checkinRes.data?.data) {
        const d = checkinRes.data.data;
        setSelfEnergy(d.selfEnergy || 5);
        setMood(d.mood || null);
        setActiveParts(d.activeParts || []);
        setPartsNotes(d.partsNotes || {});
        setReflection(d.reflection || '');
        setIntention(d.intention || '');
        setAlreadyCheckedIn(true);
        setTodayData(d);
        setSaved(true);
      }

      const hist = (historyRes.data || []).map(r => ({ ...r.data, date: r.module_id.replace('daily_checkin_', '') }));
      setHistory(hist);
    } catch (e) {
      console.error('Error loading check-in data:', e);
      setClientParts(DEFAULT_PARTS);
    }
    setLoading(false);
  }
  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    loadData();
  }, [clientId]);


  const togglePart = (partId) => {
    setActiveParts(prev => prev.includes(partId) ? prev.filter(id => id !== partId) : [...prev, partId]);
  };

  const handleSave = async () => {
    if (!clientId || !mood) return;
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const data = { selfEnergy, mood, activeParts, partsNotes, reflection, intention, completedAt: new Date().toISOString() };

    try {
      await supabase.from('ifs_interactive_data').upsert({
        client_id: clientId, module_id: `daily_checkin_${today}`, data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,module_id' });

      await supabaseHelpers.saveMoodEntry(clientId, {
        mood, energy: selfEnergy, emotions: activeParts,
        notes: reflection || undefined, date: new Date().toISOString(),
      });

      if (selfEnergy <= 2 || mood <= 1) {
        const { data: advisors } = await supabase.from('ifs_clients')
          .select('id').eq('user_role', 'therapist');
        if (advisors && advisors.length > 0) {
          const activePartNames = activeParts.map(id => {
            const p = clientParts.find(cp => cp.id === id);
            return p ? p.name : id;
          }).join(', ');
          const alertMsg = `[CHECK-IN ALERT] ${client.name} reported very low self-energy (${selfEnergy}/10) and/or mood today. Active parts: ${activePartNames || 'none noted'}.`;
          for (const advisor of advisors) {
            await supabase.from('ifs_messages').insert({
              sender_id: clientId, recipient_id: advisor.id,
              sender_role: 'client', content: alertMsg,
              is_read: false, created_at: new Date().toISOString()
            });
          }
        }
      }

      setSaved(true);
      setAlreadyCheckedIn(true);
      setTodayData(data);
      setStep(4);
    } catch (e) {
      console.error('Error saving check-in:', e);
    }
    setSaving(false);
  };

  const bg = isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-amber-50 via-orange-50/30 to-rose-50/30';
  const cardBg = isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-amber-100';
  const textPrimary = isDark ? 'text-slate-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-400';

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="text-center px-6">
          <h2 className={`text-xl font-bold mb-2 ${textPrimary}`}>Please log in to check in</h2>
          <Link to="/" className="text-amber-500 underline">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-32 ${bg}`}>
      <div className={`sticky top-0 z-20 backdrop-blur-xl border-b ${isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-amber-100'}`}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/home" className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-amber-100 text-gray-600'}`}>
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className={`text-xl font-bold ${textPrimary}`}>Daily Check-In</h1>
            <p className={`text-xs ${textMuted}`}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          {alreadyCheckedIn && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 px-3 py-1 rounded-full">
              <CheckCircle size={12} /> Done today
            </span>
          )}
        </div>
        {step < 4 && (
          <div className="max-w-2xl mx-auto px-4 pb-3">
            <div className="flex gap-2">
              {[1,2,3].map(s => (
                <div key={s} className={`flex-1 h-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-amber-500' : isDark ? 'bg-slate-700' : 'bg-amber-100'}`} />
              ))}
            </div>
            <p className={`text-xs mt-1 ${textMuted}`}>Step {step} of 3</p>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {step === 1 && (
          <>
            <div className={`rounded-2xl border backdrop-blur-xl p-6 ${cardBg}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={`font-bold text-lg ${textPrimary}`}>How present is your Self right now?</h2>
                  <p className={`text-sm ${textMuted}`}>Self-energy is the calm, compassionate core that can witness parts without being overwhelmed.</p>
                </div>
              </div>
              <SelfEnergySlider value={selfEnergy} onChange={setSelfEnergy} isDark={isDark} />
            </div>

            <div className={`rounded-2xl border backdrop-blur-xl p-6 ${cardBg}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={`font-bold text-lg ${textPrimary}`}>Overall, how are you feeling?</h2>
                  <p className={`text-sm ${textMuted}`}>Take a moment to notice your general state right now.</p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {MOOD_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const sel = mood === opt.value;
                  return (
                    <button key={opt.value} onClick={() => setMood(opt.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${sel ? `${opt.bg} border-current ring-2 ${opt.ringColor}` : `${isDark ? 'border-slate-700 hover:border-slate-500' : 'border-gray-200 hover:border-amber-200'}`}`}
                    >
                      <Icon size={24} className={sel ? opt.color : textMuted} />
                      <span className={`text-xs font-medium ${sel ? opt.color : textMuted}`}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!mood}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed">
              Continue <ChevronRight size={18} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className={`rounded-2xl border backdrop-blur-xl p-6 ${cardBg}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={`font-bold text-lg ${textPrimary}`}>Which parts do you notice?</h2>
                  <p className={`text-sm ${textMuted}`}>Select any parts that feel active or present right now. It's okay if many are active — that's valuable information.</p>
                </div>
              </div>

              {['self','manager','firefighter','exile'].map(type => {
                const parts = clientParts.filter(p => p.type === type);
                if (!parts.length) return null;
                const colors = PART_TYPE_COLORS[type] || PART_TYPE_COLORS.manager;
                const typeLabel = type === 'self' ? 'Self' : type.charAt(0).toUpperCase() + type.slice(1) + ' Parts';
                return (
                  <div key={type} className="mb-5">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${colors.text}`}>{typeLabel}</p>
                    <div className="flex flex-wrap gap-2">
                      {parts.map(part => {
                        const sel = activeParts.includes(part.id);
                        return (
                          <button key={part.id} onClick={() => togglePart(part.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${sel ? `${colors.bg} ${colors.text} border-current ring-2 ${colors.ring}` : `${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'} hover:border-amber-300`}`}
                          >
                            <span>{part.emoji}</span> {part.name}
                          </button>
                        );
                      })}
                    </div>
                    {activeParts.some(id => parts.find(p => p.id === id)) && (
                      <div className="mt-2 space-y-1">
                        {parts.filter(p => activeParts.includes(p.id)).map(part => (
                          <div key={part.id} className="flex items-center gap-2">
                            <span className={`text-xs ${colors.text} font-medium min-w-24`}>{part.name}:</span>
                            <input type="text" placeholder="What is this part doing or saying? (optional)"
                              value={partsNotes[part.id] || ''}
                              onChange={e => setPartsNotes(prev => ({ ...prev, [part.id]: e.target.value }))}
                              className={`flex-1 text-xs px-2 py-1 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500' : 'bg-white border-gray-200 text-gray-700 placeholder-gray-400'}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {activeParts.length === 0 && (
                <p className={`text-sm italic text-center py-4 ${textMuted}`}>
                  No parts selected yet — or maybe Self is leading today ✨
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className={`flex-1 py-3 rounded-xl border font-medium transition-all ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <ChevronLeft size={16} className="inline mr-1" /> Back
              </button>
              <button onClick={() => setStep(3)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25">
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className={`rounded-2xl border backdrop-blur-xl p-6 ${cardBg}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={`font-bold text-lg ${textPrimary}`}>Reflection & Intention</h2>
                  <p className={`text-sm ${textMuted}`}>A brief reflection anchors your awareness. An intention gives your parts direction.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`text-sm font-semibold block mb-1.5 ${textSecondary}`}>Brief reflection (optional)</label>
                  <textarea
                    rows={3} value={reflection} onChange={e => setReflection(e.target.value)}
                    placeholder="What do you notice right now? Is there anything your parts want you to hear?"
                    className={`w-full px-4 py-3 rounded-xl border text-sm resize-none ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500' : 'bg-white border-gray-200 text-gray-700 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-amber-400`}
                  />
                </div>

                <div>
                  <label className={`text-sm font-semibold block mb-2 ${textSecondary}`}>Today's intention</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {INTENTION_PROMPTS.map(p => (
                      <button key={p} onClick={() => setIntention(p === intention ? '' : p)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${intention === p ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-400' : `${isDark ? 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-amber-300'}`}`}
                      >{p}</button>
                    ))}
                  </div>
                  <input type="text" value={intention} onChange={e => setIntention(e.target.value)}
                    placeholder="Or write your own intention..."
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500' : 'bg-white border-gray-200 text-gray-700 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-amber-400`}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className={`flex-1 py-3 rounded-xl border font-medium transition-all ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <ChevronLeft size={16} className="inline mr-1" /> Back
              </button>
              <button onClick={handleSave} disabled={saving || !mood}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Complete Check-In'}
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className={`rounded-2xl border backdrop-blur-xl p-8 text-center ${cardBg}`}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>Check-In Complete ✨</h2>
              <p className={`text-sm mb-6 ${textSecondary}`}>
                Your Self-energy today: <strong>{selfEnergy}/10</strong>
                {intention && <span> · Intention: <em>"{intention}"</em></span>}
              </p>

              {activeParts.length > 0 && (
                <div className="mb-6">
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${textMuted}`}>Parts noticed today</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {activeParts.map(id => {
                      const p = clientParts.find(cp => cp.id === id);
                      if (!p) return null;
                      const colors = PART_TYPE_COLORS[p.type] || PART_TYPE_COLORS.manager;
                      return (
                        <span key={id} className={`text-xs px-3 py-1 rounded-full font-medium ${colors.bg} ${colors.text}`}>
                          {p.emoji} {p.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {selfEnergy <= 3 && (
                <div className={`rounded-xl p-4 mb-4 text-left ${isDark ? 'bg-amber-900/20 border border-amber-700/40' : 'bg-amber-50 border border-amber-200'}`}>
                  <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>💛 Gentle reminder</p>
                  <p className={`text-sm ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                    Your Self-energy is low today. That's okay — this is exactly what parts work is for. Consider a grounding exercise, gentle meditation, or reaching out to your advisor.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/mood-tracker" className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium border transition-all ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  View Mood Tracker
                </Link>
                <Link to="/home" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all">
                  <Star size={16} /> Back to Home
                </Link>
              </div>
            </div>

            {history.length > 1 && (
              <div className={`rounded-2xl border backdrop-blur-xl p-5 ${cardBg}`}>
                <h3 className={`text-sm font-bold mb-3 ${textSecondary}`}>Recent Check-In History</h3>
                <div className="space-y-2">
                  {history.slice(0, 5).map((h, i) => {
                    const moodOpt = MOOD_OPTIONS.find(m => m.value === h.mood);
                    const MIcon = moodOpt?.icon || Meh;
                    return (
                      <div key={i} className={`flex items-center gap-3 py-2 border-b last:border-0 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                        <MIcon size={16} className={moodOpt?.color || textMuted} />
                        <span className={`text-sm flex-1 ${textSecondary}`}>{h.date}</span>
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>Self: {h.selfEnergy}/10</span>
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{(h.activeParts || []).length} parts</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && alreadyCheckedIn && step !== 4 && (
          <div className={`rounded-xl p-4 ${isDark ? 'bg-emerald-900/20 border border-emerald-700/40' : 'bg-emerald-50 border border-emerald-200'}`}>
            <p className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              <CheckCircle size={14} className="inline mr-1" />
              You've already checked in today. You can update your entry by completing the form again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
