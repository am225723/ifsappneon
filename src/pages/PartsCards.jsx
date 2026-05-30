import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Save, Heart, Shield, Flame,
  Sparkles, ChevronLeft, ChevronRight, BookOpen, Star
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const DEFAULT_PARTS = [
  { id: 'inner-critic', name: 'Inner Critic', type: 'manager', emoji: '⚖️', role: 'Keeps you in line to avoid criticism' },
  { id: 'people-pleaser', name: 'People Pleaser', type: 'manager', emoji: '🤝', role: 'Ensures others approve of you' },
  { id: 'caretaker', name: 'Caretaker', type: 'manager', emoji: '💛', role: 'Takes care of everyone else first' },
  { id: 'perfectionist', name: 'Perfectionist', type: 'manager', emoji: '📐', role: 'Tries to make everything flawless' },
  { id: 'controller', name: 'Controller', type: 'manager', emoji: '🎛️', role: 'Manages situations to feel safe' },
  { id: 'inner-child', name: 'Inner Child', type: 'exile', emoji: '🧒', role: 'Carries childhood pain and longing' },
  { id: 'wounded-one', name: 'Wounded One', type: 'exile', emoji: '💔', role: 'Holds deep emotional wounds' },
  { id: 'lonely-one', name: 'Lonely One', type: 'exile', emoji: '🌧️', role: 'Carries feelings of isolation' },
  { id: 'angry-part', name: 'Angry Part', type: 'firefighter', emoji: '🔥', role: 'Reacts intensely to protect from pain' },
  { id: 'numbing-part', name: 'Numbing Part', type: 'firefighter', emoji: '🌫️', role: 'Shuts down feelings to cope' },
  { id: 'distractor', name: 'Distractor', type: 'firefighter', emoji: '🎮', role: 'Diverts attention from difficult feelings' },
];

const PROMPTS_BY_TYPE = {
  manager: [
    "What are you organizing or controlling today? What would happen if you relaxed?",
    "What responsibility are you carrying right now? Can Self help lighten the load?",
    "What are you worried might go wrong? What reassurance do you need?",
    "How are you trying to keep things safe today? Is it working?",
    "What would you need to hear to feel like you could take a break?",
    "What rule are you enforcing right now? Where did that rule come from?",
  ],
  firefighter: [
    "What feelings are you trying to avoid right now? Can Self hold space for them?",
    "What are you protecting me from feeling? What would happen if I felt it?",
    "When did you first learn to react this way? What were you saving me from?",
    "What do you need right now instead of taking action? Can we pause together?",
    "If you didn't have to protect me, what would you want to do instead?",
    "What's the emotion underneath the urgency you're feeling?",
  ],
  exile: [
    "What do you need to be heard about today? Self is listening.",
    "What feeling have you been holding that needs acknowledgment?",
    "What do you wish someone had told you when you were small?",
    "Where in the body do you live? What does that sensation feel like?",
    "What memory keeps coming back? What do you need me to know about it?",
    "If Self could hold you right now, what would that feel like?",
  ],
  self: [
    "How present do you feel right now? What qualities of Self can you access?",
    "Which part needs your compassionate attention most today?",
    "What does your inner wisdom want you to know right now?",
    "How can you bring more curiosity and calm to this moment?",
  ],
};

const TYPE_CONFIG = {
  manager: {
    label: 'Manager',
    icon: Shield,
    gradient: 'from-blue-500 to-blue-700',
    bgLight: 'bg-blue-50',
    bgDark: 'bg-blue-900/30',
    textLight: 'text-blue-700',
    textDark: 'text-blue-300',
    borderLight: 'border-blue-200',
    borderDark: 'border-blue-700',
    ringColor: 'ring-blue-400',
  },
  firefighter: {
    label: 'Firefighter',
    icon: Flame,
    gradient: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    bgDark: 'bg-amber-900/30',
    textLight: 'text-amber-700',
    textDark: 'text-amber-300',
    borderLight: 'border-amber-200',
    borderDark: 'border-amber-700',
    ringColor: 'ring-amber-400',
  },
  exile: {
    label: 'Exile',
    icon: Heart,
    gradient: 'from-rose-500 to-pink-600',
    bgLight: 'bg-rose-50',
    bgDark: 'bg-rose-900/30',
    textLight: 'text-rose-700',
    textDark: 'text-rose-300',
    borderLight: 'border-rose-200',
    borderDark: 'border-rose-700',
    ringColor: 'ring-rose-400',
  },
  self: {
    label: 'Self',
    icon: Sparkles,
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    bgDark: 'bg-emerald-900/30',
    textLight: 'text-emerald-700',
    textDark: 'text-emerald-300',
    borderLight: 'border-emerald-200',
    borderDark: 'border-emerald-700',
    ringColor: 'ring-emerald-400',
  },
};

const PartsCards = () => {
  const { theme } = useTheme();
  const [parts, setParts] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pastReflections, setPastReflections] = useState([]);
  const [showPast, setShowPast] = useState(false);
  const [flipAnimation, setFlipAnimation] = useState(false);
  const [drawnToday, setDrawnToday] = useState(false);

  const clientId = clientAuth.getCurrentClient()?.id;
  const todayKey = new Date().toISOString().split('T')[0];

  const loadParts = useCallback(async () => {
    if (!clientId) return;
    try {
      const { data } = await supabase
        .from('ifs_interactive_data')
        .select('data')
        .eq('client_id', clientId)
        .eq('module_id', 'parts_map')
        .maybeSingle();

      let userParts = [];
      if (data?.data?.parts && Array.isArray(data.data.parts)) {
        userParts = data.data.parts.map(p => ({
          id: p.id || p.name?.toLowerCase().replace(/\s+/g, '-'),
          name: p.name || 'Unknown Part',
          type: (p.type || 'manager').toLowerCase(),
          emoji: p.emoji || '🔹',
          role: p.role || p.description || '',
        }));
      }

      if (userParts.length === 0) {
        const dbParts = await supabaseHelpers.getParts(clientId);
        if (dbParts && dbParts.length > 0) {
          userParts = dbParts.map(p => ({
            id: p.id,
            name: p.name || 'Unknown Part',
            type: (p.type || 'manager').toLowerCase(),
            emoji: '🔹',
            role: p.role || p.description || '',
          }));
        }
      }

      setParts(userParts.length > 0 ? userParts : DEFAULT_PARTS);
    } catch (err) {
      console.error('Error loading parts:', err);
      setParts(DEFAULT_PARTS);
    }
  }, [clientId]);

  const loadPastReflections = useCallback(async () => {
    if (!clientId) return;
    try {
      const { data } = await supabase
        .from('ifs_interactive_data')
        .select('module_id, data, updated_at')
        .eq('client_id', clientId)
        .like('module_id', 'parts_card_%')
        .order('updated_at', { ascending: false })
        .limit(30);

      if (data) {
        setPastReflections(data.map(d => ({
          date: d.module_id.replace('parts_card_', ''),
          partName: d.data?.partName || 'Unknown',
          partType: d.data?.partType || 'manager',
          prompt: d.data?.prompt || '',
          reflection: d.data?.reflection || '',
          savedAt: d.updated_at,
        })));

        const todayEntry = data.find(d => d.module_id === `parts_card_${todayKey}`);
        if (todayEntry) {
          setDrawnToday(true);
        }
      }
    } catch (err) {
      console.error('Error loading past reflections:', err);
    }
  }, [clientId, todayKey]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadParts(), loadPastReflections()]);
      setLoading(false);
    };
    init();
  }, [loadParts, loadPastReflections]);

  const drawCard = useCallback(() => {
    if (parts.length === 0) return;
    setFlipAnimation(true);
    setSaved(false);
    setReflection('');

    setTimeout(() => {
      const randomPart = parts[Math.floor(Math.random() * parts.length)];
      const typePrompts = PROMPTS_BY_TYPE[randomPart.type] || PROMPTS_BY_TYPE.manager;
      const randomPrompt = typePrompts[Math.floor(Math.random() * typePrompts.length)];
      setCurrentCard(randomPart);
      setCurrentPrompt(randomPrompt);
      setTimeout(() => setFlipAnimation(false), 300);
    }, 300);
  }, [parts]);

  useEffect(() => {
    if (parts.length > 0 && !currentCard && !drawnToday) {
      drawCard();
    }
  }, [parts, currentCard, drawnToday, drawCard]);

  const saveReflection = async () => {
    if (!clientId || !currentCard || !reflection.trim()) return;
    setSaving(true);
    try {
      await supabaseHelpers.saveInteractiveData(clientId, `parts_card_${todayKey}`, {
        partId: currentCard.id,
        partName: currentCard.name,
        partType: currentCard.type,
        partEmoji: currentCard.emoji,
        prompt: currentPrompt,
        reflection: reflection.trim(),
        savedAt: new Date().toISOString(),
      });
      setSaved(true);
      setDrawnToday(true);
      await loadPastReflections();
    } catch (err) {
      console.error('Error saving reflection:', err);
    } finally {
      setSaving(false);
    }
  };

  const typeConfig = currentCard ? (TYPE_CONFIG[currentCard.type] || TYPE_CONFIG.manager) : TYPE_CONFIG.manager;
  const TypeIcon = typeConfig.icon;

  if (loading) {
    return (
      <div className={`min-h-screen p-4 ${theme.isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className={theme.isDark ? 'text-slate-400' : 'text-gray-500'}>Drawing your card...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 pb-24 ${theme.isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className={`p-2 rounded-lg ${theme.isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-600'}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`text-xl font-bold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
            Parts Check-In Cards
          </h1>
          <button
            onClick={() => setShowPast(!showPast)}
            className={`p-2 rounded-lg ${theme.isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Past reflections"
          >
            <BookOpen className="w-5 h-5" />
          </button>
        </div>

        {!showPast ? (
          <>
            <p className={`text-center text-sm mb-6 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Draw a card to check in with one of your parts today
            </p>

            {currentCard && (
              <div className={`transition-all duration-500 ${flipAnimation ? 'opacity-0 scale-95 rotate-y-90' : 'opacity-100 scale-100'}`}>
                <div className={`rounded-3xl overflow-hidden shadow-2xl border-2 ${theme.isDark ? typeConfig.borderDark : typeConfig.borderLight} mb-6`}>
                  <div className={`bg-gradient-to-br ${typeConfig.gradient} p-6 text-center relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-4 left-4 w-20 h-20 border border-white/30 rounded-full" />
                      <div className="absolute bottom-4 right-4 w-32 h-32 border border-white/20 rounded-full" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-white/10 rounded-full" />
                    </div>
                    <div className="relative z-10">
                      <span className="text-5xl mb-3 block">{currentCard.emoji}</span>
                      <h2 className="text-2xl font-bold text-white mb-1">{currentCard.name}</h2>
                      <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white/90 text-sm">
                        <TypeIcon className="w-3.5 h-3.5" />
                        {typeConfig.label}
                      </div>
                      {currentCard.role && (
                        <p className="text-white/80 text-sm mt-3 italic">"{currentCard.role}"</p>
                      )}
                    </div>
                  </div>

                  <div className={`p-6 ${theme.isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className={`rounded-xl p-4 mb-4 ${theme.isDark ? typeConfig.bgDark : typeConfig.bgLight}`}>
                      <p className={`text-center font-medium leading-relaxed ${theme.isDark ? typeConfig.textDark : typeConfig.textLight}`}>
                        {currentPrompt}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        Your reflection:
                      </label>
                      <textarea
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        placeholder="Take a moment to listen to this part and write what comes up..."
                        rows={4}
                        className={`w-full rounded-xl border p-3 text-sm resize-none focus:outline-none focus:ring-2 ${typeConfig.ringColor} transition-all ${
                          theme.isDark
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500'
                            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                        }`}
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={saveReflection}
                          disabled={saving || !reflection.trim() || saved}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
                            saved
                              ? 'bg-emerald-500 text-white'
                              : saving || !reflection.trim()
                                ? theme.isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-200 text-gray-400'
                                : `bg-gradient-to-r ${typeConfig.gradient} text-white hover:shadow-lg active:scale-[0.98]`
                          }`}
                        >
                          {saved ? (
                            <>
                              <Star className="w-4 h-4" />
                              Saved!
                            </>
                          ) : saving ? (
                            'Saving...'
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save Reflection
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={drawCard}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
                theme.isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Draw Another Card
            </button>

            {drawnToday && saved && (
              <div className={`mt-4 rounded-xl p-4 text-center ${theme.isDark ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-emerald-50 border border-emerald-200'}`}>
                <Sparkles className={`w-6 h-6 mx-auto mb-2 ${theme.isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <p className={`text-sm font-medium ${theme.isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                  Today's check-in complete!
                </p>
                <p className={`text-xs mt-1 ${theme.isDark ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>
                  Great work connecting with your parts.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-lg font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                Past Reflections
              </h2>
              <button
                onClick={() => setShowPast(false)}
                className={`text-sm ${theme.isDark ? 'text-amber-400' : 'text-amber-600'}`}
              >
                Back to cards
              </button>
            </div>

            {pastReflections.length === 0 ? (
              <div className={`rounded-xl p-8 text-center ${theme.isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <BookOpen className={`w-10 h-10 mx-auto mb-3 ${theme.isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  No reflections yet. Draw a card and write your first reflection!
                </p>
              </div>
            ) : (
              pastReflections.map((r, i) => {
                const rConfig = TYPE_CONFIG[r.partType] || TYPE_CONFIG.manager;
                return (
                  <div
                    key={i}
                    className={`rounded-xl overflow-hidden border ${theme.isDark ? `bg-slate-800 ${rConfig.borderDark}` : `bg-white ${rConfig.borderLight}`}`}
                  >
                    <div className={`px-4 py-2 flex items-center justify-between ${theme.isDark ? rConfig.bgDark : rConfig.bgLight}`}>
                      <span className={`text-sm font-medium ${theme.isDark ? rConfig.textDark : rConfig.textLight}`}>
                        {r.partName} · {rConfig.label}
                      </span>
                      <span className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className={`text-xs italic ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        "{r.prompt}"
                      </p>
                      <p className={`text-sm ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        {r.reflection}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartsCards;
