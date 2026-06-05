import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Heart, Copy, Check, Sparkles, Volume2, Star, BookOpen } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabaseHelpers, supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const woundAffirmations = {
  abandonment: {
    core: [
      "I am worthy of lasting love and connection.",
      "People can leave, and I will still be whole.",
      "I choose myself, again and again.",
      "My presence is a gift worth staying for.",
      "I attract people who value and cherish me.",
      "I am safe to open my heart to love.",
      "My needs for connection are valid and important.",
      "I release the fear that everyone will leave.",
      "I am learning to trust that I will be okay.",
      "The love I need starts with loving myself."
    ],
    healing: [
      "I am healing my fear of being left behind.",
      "Each day, I build more trust in lasting connections.",
      "I deserve relationships where I feel secure.",
      "My inner child knows they will never be abandoned by me.",
      "I am rewriting my story of love and belonging."
    ]
  },
  shame: {
    core: [
      "I am enough, exactly as I am right now.",
      "My worth is not determined by my mistakes.",
      "I release the shame that was never mine to carry.",
      "I am worthy of love, even in my imperfection.",
      "There is nothing fundamentally wrong with me.",
      "I embrace all parts of myself with compassion.",
      "My flaws make me human, not unworthy.",
      "I deserve to take up space in this world.",
      "I am learning to see myself with kind eyes.",
      "I am not what happened to me. I am what I choose to become."
    ],
    healing: [
      "I am healing the parts of me that feel broken.",
      "Each day, I see more of my inherent goodness.",
      "I am worthy of being seen and known.",
      "My story includes struggle, but it doesn't define me.",
      "I am reclaiming the self-worth that shame stole."
    ]
  },
  neglect: {
    core: [
      "My needs matter and deserve attention.",
      "I am learning to give myself the care I missed.",
      "I am worthy of being noticed and prioritized.",
      "My feelings are valid and worth expressing.",
      "I deserve to be nurtured and supported.",
      "I am visible, valuable, and important.",
      "It's safe for me to ask for what I need.",
      "I am worthy of receiving help and support.",
      "My inner child deserves the attention I now give.",
      "I am enough to be cared for without earning it."
    ],
    healing: [
      "I am becoming my own loving parent.",
      "Each day, I meet my needs with more awareness.",
      "I am healing the invisible wound of being overlooked.",
      "My needs are not too much. They are exactly right.",
      "I am learning what true nurturing feels like."
    ]
  },
  betrayal: {
    core: [
      "I am learning to trust myself again.",
      "I can protect myself while staying open to love.",
      "My boundaries keep me safe without closing me off.",
      "I trust my ability to recognize trustworthy people.",
      "What others did to me does not define my worth.",
      "I am safe to trust in gradual, measured steps.",
      "My intuition is growing stronger each day.",
      "I release the betrayal that lives in my body.",
      "I choose to believe in the goodness of some people.",
      "I am building a life with people who honor my trust."
    ],
    healing: [
      "I am healing from the wounds of broken trust.",
      "Each day, I become more skilled at protecting my peace.",
      "I am not naive for wanting to trust again.",
      "My past betrayals are teaching me, not defining me.",
      "I am reclaiming my ability to trust wisely."
    ]
  }
};

const generalAffirmations = [
  "I am on a journey of healing, and every step matters.",
  "My inner child is safe with me now.",
  "I approach myself with curiosity and compassion.",
  "All of my parts are welcome here.",
  "I am more than my protective patterns.",
  "Healing is not linear, and I am doing beautifully.",
  "I trust the wisdom of my internal system.",
  "I am learning to lead with Self-energy.",
  "My healing journey is unique and valid.",
  "I am creating safety within myself."
];

export default function Affirmations() {
  const { theme, getAnimationClass } = useTheme();
  const [savedAssessment, setSavedAssessment] = useState(null);
  const [currentAffirmation, setCurrentAffirmation] = useState('');
  const [copied, setCopied] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showAllWound, setShowAllWound] = useState(false);

  async function loadFavorites() {
    const client = clientAuth.getCurrentClient();
    const clientId = client?.id;
    if (!clientId) return;
    try {
      const prefs = await supabaseHelpers.getPreferences(clientId);
      if (prefs?.favorite_affirmations) {
        setFavorites(prefs.favorite_affirmations);
      }
    } catch { /* ignore */ }
  }

  async function loadAssessment() {
    const client = clientAuth.getCurrentClient();
    if (client) {
      const { data } = await supabase
        .from('ifs_interactive_data')
        .select('data, updated_at')
        .eq('client_id', client.id)
        .eq('module_id', 'assessment_wounds')
        .maybeSingle();
      if (data?.data) {
        const wd = data.data;
        setSavedAssessment({
          primary_wound: wd.primary,
          secondary_wound: wd.secondary,
          assessment_date: wd.completedAt || data.updated_at
        });
      }
    }
  }
  useEffect(() => {
    loadAssessment();
    loadFavorites();
  }, []);


  function generateAffirmation() {
    if (savedAssessment?.primary_wound) {
      const woundData = woundAffirmations[savedAssessment.primary_wound];
      const allAffirmations = [...woundData.core, ...woundData.healing];
      const random = allAffirmations[Math.floor(Math.random() * allAffirmations.length)];
      setCurrentAffirmation(random);
    } else {
      setCurrentAffirmation(generalAffirmations[Math.floor(Math.random() * generalAffirmations.length)]);
    }
  }
  useEffect(() => {
    if (savedAssessment?.primary_wound) {
      generateAffirmation();
    } else {
      setCurrentAffirmation(generalAffirmations[Math.floor(Math.random() * generalAffirmations.length)]);
    }
  }, [savedAssessment]);


  const copyAffirmation = () => {
    navigator.clipboard.writeText(currentAffirmation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFavorite = async (affirmation) => {
    const newFavorites = favorites.includes(affirmation)
      ? favorites.filter(f => f !== affirmation)
      : [...favorites, affirmation];
    setFavorites(newFavorites);
    const client = clientAuth.getCurrentClient();
    const clientId = client?.id;
    if (clientId) {
      await supabaseHelpers.savePreferences(clientId, { favoriteAffirmations: newFavorites });
    }
  };

  const primaryWound = savedAssessment?.primary_wound;
  const woundData = primaryWound ? woundAffirmations[primaryWound] : null;

  return (
    <div className={`min-h-screen ${theme.isDark ? 'text-slate-100' : ''}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          to="/" 
          className={`inline-flex items-center gap-2 ${theme.isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} mb-6 ${getAnimationClass('transition')}`}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${theme.isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            Custom Affirmations
          </h1>
          <p className={theme.isDark ? 'text-slate-300' : 'text-gray-600'}>
            {primaryWound 
              ? `Personalized affirmations for your ${primaryWound} wound healing journey.`
              : 'Healing affirmations to support your IFS journey.'}
          </p>
        </div>

        <div className={`${theme.cardBg} backdrop-blur-sm rounded-3xl shadow-xl border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-8 mb-8 text-center`}>
          <Sparkles className="w-10 h-10 mx-auto mb-4" style={{ color: theme.accentColor }} />
          
          <p className={`text-2xl md:text-3xl font-medium leading-relaxed mb-8 ${theme.isDark ? 'text-white' : 'text-gray-800'}`}>
            "{currentAffirmation}"
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={generateAffirmation}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium ${getAnimationClass('transition')} ${getAnimationClass('hover')}`}
              style={{ backgroundColor: theme.accentColor }}
            >
              <RefreshCw className="w-5 h-5" />
              New Affirmation
            </button>
            <button
              onClick={copyAffirmation}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium ${getAnimationClass('transition')} ${theme.isDark ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => toggleFavorite(currentAffirmation)}
              className={`p-3 rounded-xl ${getAnimationClass('transition')} ${theme.isDark ? 'bg-slate-700' : 'bg-gray-100'}`}
            >
              <Star className={`w-5 h-5 ${favorites.includes(currentAffirmation) ? 'fill-yellow-400 text-yellow-400' : theme.isDark ? 'text-slate-400' : 'text-gray-400'}`} />
            </button>
          </div>
        </div>

        {favorites.length > 0 && (
          <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6 mb-8`}>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>Your Favorites</h3>
            </div>
            <div className="space-y-3">
              {favorites.map((aff, i) => (
                <div 
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${theme.isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}
                >
                  <p className={`text-sm ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>"{aff}"</p>
                  <button
                    onClick={() => toggleFavorite(aff)}
                    className="p-1 hover:bg-red-100 rounded"
                  >
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {woundData && (
          <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" style={{ color: theme.accentColor }} />
                <h3 className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'} capitalize`}>
                  All {primaryWound} Affirmations
                </h3>
              </div>
              <button
                onClick={() => setShowAllWound(!showAllWound)}
                className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}
              >
                {showAllWound ? 'Hide' : 'Show All'}
              </button>
            </div>

            {showAllWound && (
              <div className="space-y-4">
                <div>
                  <h4 className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-600'} mb-2`}>Core Affirmations</h4>
                  <div className="grid gap-2">
                    {woundData.core.map((aff, i) => (
                      <div 
                        key={i}
                        className={`flex items-center justify-between p-3 rounded-lg ${theme.isDark ? 'bg-slate-700/50' : 'bg-gray-50'} ${getAnimationClass('transition')}`}
                      >
                        <p className={`text-sm ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>"{aff}"</p>
                        <button
                          onClick={() => toggleFavorite(aff)}
                          className="p-1 hover:bg-yellow-100 rounded"
                        >
                          <Star className={`w-4 h-4 ${favorites.includes(aff) ? 'fill-yellow-400 text-yellow-400' : theme.isDark ? 'text-slate-500' : 'text-gray-300'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-600'} mb-2`}>Healing Journey</h4>
                  <div className="grid gap-2">
                    {woundData.healing.map((aff, i) => (
                      <div 
                        key={i}
                        className={`flex items-center justify-between p-3 rounded-lg ${theme.isDark ? 'bg-slate-700/50' : 'bg-gray-50'} ${getAnimationClass('transition')}`}
                      >
                        <p className={`text-sm ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>"{aff}"</p>
                        <button
                          onClick={() => toggleFavorite(aff)}
                          className="p-1 hover:bg-yellow-100 rounded"
                        >
                          <Star className={`w-4 h-4 ${favorites.includes(aff) ? 'fill-yellow-400 text-yellow-400' : theme.isDark ? 'text-slate-500' : 'text-gray-300'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
