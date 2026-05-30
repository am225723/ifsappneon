import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  PenTool,
  ArrowLeft,
  Star,
  BookOpen,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Baby,
  Shield,
  Clock,
  Check
} from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { clientAuth } from '../lib/supabasePersonalization';

const WOUND_PROMPTS = {
  abandonment: {
    label: 'Abandonment',
    color: 'from-blue-400 to-blue-600',
    toChild: {
      starter: "Dear little one, I want you to know I'm not going anywhere...",
      prompts: [
        "I see how scared you are of being left alone...",
        "You didn't deserve to be abandoned...",
        "I promise to stay with you, no matter what..."
      ]
    },
    fromChild: {
      starter: "Dear big me, I need you to know how scared I feel...",
      prompts: [
        "When you leave me alone, I feel...",
        "What I really need from you is...",
        "I'm afraid that if I tell you the truth..."
      ]
    }
  },
  shame: {
    label: 'Shame',
    color: 'from-purple-400 to-purple-600',
    toChild: {
      starter: "Dear precious child, there is nothing wrong with you...",
      prompts: [
        "The shame you carry was never yours to hold...",
        "You are worthy of love exactly as you are...",
        "I see your true beauty and goodness..."
      ]
    },
    fromChild: {
      starter: "Dear big me, I feel so small and broken...",
      prompts: [
        "I hide because I believe...",
        "The thing I'm most ashamed of is...",
        "If you really saw me, you would..."
      ]
    }
  },
  neglect: {
    label: 'Neglect',
    color: 'from-teal-400 to-teal-600',
    toChild: {
      starter: "Dear forgotten one, I see you now and I'm paying attention...",
      prompts: [
        "Your needs matter, and I'm listening...",
        "I'm sorry no one was there when you needed them...",
        "From now on, I will notice you and care for you..."
      ]
    },
    fromChild: {
      starter: "Dear big me, do you even know I'm here?",
      prompts: [
        "I've been waiting so long for someone to notice...",
        "What I need most right now is...",
        "When you ignore me, I feel..."
      ]
    }
  },
  betrayal: {
    label: 'Betrayal',
    color: 'from-red-400 to-red-600',
    toChild: {
      starter: "Dear brave one, I promise to be honest with you always...",
      prompts: [
        "You were right not to trust them, and I understand your walls...",
        "I will earn your trust, one day at a time...",
        "Your instincts are good; I will protect you..."
      ]
    },
    fromChild: {
      starter: "Dear big me, how can I trust you won't hurt me too?",
      prompts: [
        "The hardest part about being betrayed was...",
        "I built these walls because...",
        "Before I can trust you, I need..."
      ]
    }
  },
  helplessness: {
    label: 'Helplessness',
    color: 'from-amber-400 to-amber-600',
    toChild: {
      starter: "Dear strong one, you are more powerful than you know...",
      prompts: [
        "You survived things no child should have to face...",
        "Your strength carried us through, and now I can take over...",
        "You don't have to fight alone anymore..."
      ]
    },
    fromChild: {
      starter: "Dear big me, I feel so small and powerless...",
      prompts: [
        "When everything felt out of control, I...",
        "I need you to take charge because...",
        "The thing that makes me feel most helpless is..."
      ]
    }
  }
};

const LETTER_SECTIONS = [
  { id: 'acknowledgment', label: 'Acknowledgment', hint: 'Acknowledge what your inner child experienced or feels...' },
  { id: 'validation', label: 'Validation', hint: 'Validate their feelings and experiences as real and important...' },
  { id: 'promise', label: 'Promise', hint: 'Make a commitment to your inner child about the future...' },
  { id: 'closing', label: 'Closing', hint: 'Close with love, warmth, and reassurance...' }
];

const LetterWriting = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [clientId, setClientId] = useState(null);
  const [primaryWound, setPrimaryWound] = useState(null);
  const [mode, setMode] = useState(null);
  const [selectedWound, setSelectedWound] = useState(null);
  const [letterSections, setLetterSections] = useState({
    acknowledgment: '',
    validation: '',
    promise: '',
    closing: ''
  });
  const [freeformContent, setFreeformContent] = useState('');
  const [useStructured, setUseStructured] = useState(true);
  const [savedLetters, setSavedLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPastLetters, setShowPastLetters] = useState(false);
  const [expandedLetter, setExpandedLetter] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const client = clientAuth.getCurrentClient();
    if (client?.id) {
      setClientId(client.id);
      loadData(client.id);
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async (id) => {
    try {
      const [assessmentResult, lettersResult] = await Promise.all([
        supabase
          .from('ifs_interactive_data')
          .select('data')
          .eq('client_id', id)
          .eq('module_id', 'assessment_wounds')
          .maybeSingle(),
        supabase
          .from('ifs_interactive_data')
          .select('*')
          .eq('client_id', id)
          .like('module_id', 'letter_%')
          .order('updated_at', { ascending: false })
      ]);

      if (assessmentResult.data?.data?.primary) {
        const wound = assessmentResult.data.data.primary.toLowerCase();
        setPrimaryWound(wound);
        setSelectedWound(wound);
      }

      if (lettersResult.data) {
        setSavedLetters(lettersResult.data.map(l => ({
          id: l.module_id,
          ...l.data,
          updatedAt: l.updated_at
        })));
      }
    } catch (err) {
      console.error('Error loading letter data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFullLetterContent = () => {
    if (useStructured) {
      return LETTER_SECTIONS
        .filter(s => letterSections[s.id]?.trim())
        .map(s => `**${s.label}:**\n${letterSections[s.id]}`)
        .join('\n\n');
    }
    return freeformContent;
  };

  const handleSave = async () => {
    if (!clientId) return;
    const content = getFullLetterContent();
    if (!content.trim()) return;

    setSaving(true);
    try {
      const timestamp = Date.now();
      const moduleId = `letter_${timestamp}`;
      const letterData = {
        mode,
        woundType: selectedWound,
        content,
        sections: useStructured ? letterSections : null,
        freeform: !useStructured ? freeformContent : null,
        structured: useStructured,
        favorite: false,
        createdAt: new Date().toISOString()
      };

      await supabaseHelpers.saveInteractiveData(clientId, moduleId, letterData);

      setSavedLetters(prev => [{
        id: moduleId,
        ...letterData,
        updatedAt: new Date().toISOString()
      }, ...prev]);

      setLetterSections({ acknowledgment: '', validation: '', promise: '', closing: '' });
      setFreeformContent('');
      setMode(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving letter:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async (letter) => {
    if (!clientId) return;
    const updated = { ...letter, favorite: !letter.favorite };
    delete updated.id;
    delete updated.updatedAt;
    await supabaseHelpers.saveInteractiveData(clientId, letter.id, updated);
    setSavedLetters(prev => prev.map(l => l.id === letter.id ? { ...l, favorite: !l.favorite } : l));
  };

  const handleDelete = async (letterId) => {
    if (!clientId) return;
    try {
      await supabase
        .from('ifs_interactive_data')
        .delete()
        .eq('client_id', clientId)
        .eq('module_id', letterId);
      setSavedLetters(prev => prev.filter(l => l.id !== letterId));
    } catch (err) {
      console.error('Error deleting letter:', err);
    }
  };

  const woundConfig = selectedWound ? WOUND_PROMPTS[selectedWound] : null;
  const modeConfig = woundConfig && mode ? woundConfig[mode] : null;

  const cardClass = theme.isDark
    ? 'bg-slate-800/80 border-slate-700/50'
    : 'bg-white/90 border-gray-200/60';
  const textClass = theme.isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = theme.isDark ? 'text-slate-400' : 'text-gray-500';
  const inputClass = theme.isDark
    ? 'bg-slate-700/60 border-slate-600 text-white placeholder-slate-400 focus:border-amber-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-amber-500';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className={`p-2 rounded-lg ${theme.isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`text-2xl font-bold ${textClass}`}>Inner Child Letters</h1>
          <p className={`text-sm ${mutedClass}`}>Write healing letters to and from your inner child</p>
        </div>
        <Baby className="w-8 h-8 text-amber-500 ml-auto" />
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">Letter saved successfully!</span>
        </div>
      )}

      {!mode ? (
        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${cardClass}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center">
                <PenTool className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`font-semibold ${textClass}`}>Choose Your Letter Mode</h2>
                <p className={`text-sm ${mutedClass}`}>Select how you'd like to connect with your inner child</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setMode('toChild')}
                className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.01] ${theme.isDark ? 'border-slate-600 hover:border-amber-500/50 hover:bg-slate-700/50' : 'border-gray-200 hover:border-amber-400/50 hover:bg-amber-50/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${textClass}`}>Write TO Your Inner Child</h3>
                    <p className={`text-sm ${mutedClass}`}>Offer comfort, love, and reassurance from your adult Self</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode('fromChild')}
                className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.01] ${theme.isDark ? 'border-slate-600 hover:border-purple-500/50 hover:bg-slate-700/50' : 'border-gray-200 hover:border-purple-400/50 hover:bg-purple-50/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <Baby className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${textClass}`}>Write FROM Your Inner Child</h3>
                    <p className={`text-sm ${mutedClass}`}>Give voice to your inner child's feelings and needs</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {savedLetters.length > 0 && (
            <div className={`rounded-2xl border p-6 ${cardClass}`}>
              <button
                onClick={() => setShowPastLetters(!showPastLetters)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className={`w-5 h-5 ${mutedClass}`} />
                  <h2 className={`font-semibold ${textClass}`}>Past Letters ({savedLetters.length})</h2>
                </div>
                {showPastLetters ? <ChevronUp className={`w-5 h-5 ${mutedClass}`} /> : <ChevronDown className={`w-5 h-5 ${mutedClass}`} />}
              </button>

              {showPastLetters && (
                <div className="mt-4 space-y-3">
                  {savedLetters.map((letter) => (
                    <div key={letter.id} className={`rounded-xl border p-4 ${theme.isDark ? 'border-slate-600/50 bg-slate-700/30' : 'border-gray-200 bg-gray-50/50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${letter.mode === 'toChild' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {letter.mode === 'toChild' ? 'To Inner Child' : 'From Inner Child'}
                          </span>
                          {letter.woundType && WOUND_PROMPTS[letter.woundType] && (
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${WOUND_PROMPTS[letter.woundType].color} text-white`}>
                              {WOUND_PROMPTS[letter.woundType].label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleToggleFavorite(letter)} className="p-1.5 rounded-lg hover:bg-amber-500/20 transition-colors">
                            <Star className={`w-4 h-4 ${letter.favorite ? 'text-amber-400 fill-amber-400' : mutedClass}`} />
                          </button>
                          <button onClick={() => handleDelete(letter.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                            <Trash2 className={`w-4 h-4 ${mutedClass} hover:text-red-400`} />
                          </button>
                        </div>
                      </div>
                      <p className={`text-xs ${mutedClass} mb-2`}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(letter.createdAt || letter.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <button
                        onClick={() => setExpandedLetter(expandedLetter === letter.id ? null : letter.id)}
                        className={`text-sm ${mutedClass} hover:underline`}
                      >
                        {expandedLetter === letter.id ? 'Hide letter' : 'Read letter'}
                      </button>
                      {expandedLetter === letter.id && (
                        <div className={`mt-3 text-sm whitespace-pre-wrap ${textClass}`}>
                          {letter.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className={`rounded-2xl border p-5 ${cardClass}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${mode === 'toChild' ? 'from-amber-400 to-amber-600' : 'from-purple-400 to-purple-600'} flex items-center justify-center`}>
                  {mode === 'toChild' ? <Heart className="w-5 h-5 text-white" /> : <Baby className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h2 className={`font-semibold ${textClass}`}>
                    {mode === 'toChild' ? 'Letter TO Your Inner Child' : 'Letter FROM Your Inner Child'}
                  </h2>
                  <p className={`text-sm ${mutedClass}`}>
                    {mode === 'toChild' ? 'Speak from your compassionate adult Self' : 'Let your inner child express freely'}
                  </p>
                </div>
              </div>
              <button onClick={() => setMode(null)} className={`text-sm ${mutedClass} hover:underline`}>
                Change
              </button>
            </div>

            <div className="mb-4">
              <label className={`text-sm font-medium ${textClass} block mb-2`}>Wound Focus</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(WOUND_PROMPTS).map(([key, wound]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedWound(key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedWound === key
                        ? `bg-gradient-to-r ${wound.color} text-white shadow-md`
                        : theme.isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {wound.label}
                    {primaryWound === key && <Sparkles className="w-3 h-3 inline ml-1" />}
                  </button>
                ))}
              </div>
              {primaryWound && (
                <p className={`text-xs mt-1 ${mutedClass}`}>
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  Based on your assessment, your primary wound is {WOUND_PROMPTS[primaryWound]?.label}
                </p>
              )}
            </div>
          </div>

          {modeConfig && (
            <div className={`rounded-2xl border p-5 ${cardClass}`}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className={`text-sm font-semibold ${textClass}`}>Suggested Starter</h3>
              </div>
              <p className={`text-sm italic ${mutedClass} p-3 rounded-xl ${theme.isDark ? 'bg-slate-700/40' : 'bg-amber-50'}`}>
                "{modeConfig.starter}"
              </p>
              <div className="mt-3 space-y-2">
                <p className={`text-xs font-medium ${mutedClass}`}>Inspiration prompts:</p>
                {modeConfig.prompts.map((prompt, i) => (
                  <p key={i} className={`text-xs ${mutedClass} flex items-start gap-2`}>
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span className="italic">"{prompt}"</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className={`rounded-2xl border p-5 ${cardClass}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${textClass}`}>Your Letter</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUseStructured(true)}
                  className={`text-xs px-3 py-1 rounded-full transition-all ${useStructured ? 'bg-amber-500/20 text-amber-500 font-medium' : `${mutedClass}`}`}
                >
                  Guided
                </button>
                <button
                  onClick={() => setUseStructured(false)}
                  className={`text-xs px-3 py-1 rounded-full transition-all ${!useStructured ? 'bg-amber-500/20 text-amber-500 font-medium' : `${mutedClass}`}`}
                >
                  Free Write
                </button>
              </div>
            </div>

            {useStructured ? (
              <div className="space-y-4">
                {LETTER_SECTIONS.map((section) => (
                  <div key={section.id}>
                    <label className={`text-sm font-medium ${textClass} block mb-1`}>{section.label}</label>
                    <p className={`text-xs ${mutedClass} mb-2`}>{section.hint}</p>
                    <textarea
                      value={letterSections[section.id]}
                      onChange={(e) => setLetterSections(prev => ({ ...prev, [section.id]: e.target.value }))}
                      placeholder={section.hint}
                      rows={3}
                      className={`w-full rounded-xl border p-3 text-sm resize-none transition-colors ${inputClass}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                value={freeformContent}
                onChange={(e) => setFreeformContent(e.target.value)}
                placeholder={modeConfig?.starter || "Begin your letter here..."}
                rows={12}
                className={`w-full rounded-xl border p-4 text-sm resize-none transition-colors ${inputClass}`}
              />
            )}

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setMode(null)}
                className={`px-4 py-2 rounded-xl text-sm ${mutedClass} ${theme.isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !getFullLetterContent().trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save Letter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LetterWriting;
