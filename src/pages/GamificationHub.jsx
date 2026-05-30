import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, Star, Flame, Trophy, Target, Heart, Shield, BookOpen,
  Calendar, TrendingUp, Lock, Unlock, CheckCircle, Sparkles,
  Crown, Zap, Sun, Moon, Gift
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const LEVEL_NAMES = [
  'Curious Explorer',
  'Brave Beginner',
  'Growing Healer',
  'Self-Energy Practitioner',
  'Parts Whisperer',
  'Healing Warrior',
  'Inner Wisdom Keeper',
  'Compassion Master',
  'Integration Expert',
  'IFS Guardian'
];

const XP_PER_LEVEL = 500;

const XP_ACTIONS = [
  { action: 'Complete a journal entry', xp: 25 },
  { action: 'Finish a learning module', xp: 100 },
  { action: 'Complete an exercise', xp: 30 },
  { action: 'Take an assessment', xp: 50 },
  { action: 'Daily login streak', xp: 10 },
  { action: 'Complete a weekly challenge', xp: 75 },
  { action: 'Explore parts mapping', xp: 20 },
  { action: 'Practice meditation', xp: 15 },
];

const BADGE_DEFINITIONS = [
  { id: 'first_login', name: 'First Steps', description: 'Log in for the first time', icon: Star, category: 'Journey', maxProgress: 1, xpReward: 50 },
  { id: 'streak_7', name: '7-Day Streak', description: 'Log in 7 consecutive days', icon: Flame, category: 'Journey', maxProgress: 7, xpReward: 100 },
  { id: 'streak_30', name: '30-Day Streak', description: 'Log in 30 consecutive days', icon: Crown, category: 'Journey', maxProgress: 30, xpReward: 300 },
  { id: 'streak_3', name: 'Getting Started', description: 'Log in 3 consecutive days', icon: Calendar, category: 'Journey', maxProgress: 3, xpReward: 50 },
  { id: 'module_1', name: 'Module 1 Complete', description: 'Complete the first learning module', icon: BookOpen, category: 'Learning', maxProgress: 1, xpReward: 100 },
  { id: 'all_modules', name: 'Scholar', description: 'Complete all learning modules', icon: Trophy, category: 'Learning', maxProgress: 8, xpReward: 500 },
  { id: 'quiz_master', name: 'Quiz Master', description: 'Score 100% on any quiz', icon: Zap, category: 'Learning', maxProgress: 1, xpReward: 75 },
  { id: 'knowledge_seeker', name: 'Knowledge Seeker', description: 'Complete 5 learning modules', icon: TrendingUp, category: 'Learning', maxProgress: 5, xpReward: 200 },
  { id: 'first_assessment', name: 'Self-Discovery', description: 'Complete your first assessment', icon: Target, category: 'Healing', maxProgress: 1, xpReward: 50 },
  { id: 'parts_explorer', name: 'Parts Explorer', description: 'Map 5 different parts', icon: Heart, category: 'Healing', maxProgress: 5, xpReward: 150 },
  { id: 'self_energy', name: 'Self-Energy Master', description: 'Complete all Self qualities exercises', icon: Sun, category: 'Healing', maxProgress: 8, xpReward: 300 },
  { id: 'wound_healer', name: 'Wound Healer', description: 'Work through 3 wound assessments', icon: Shield, category: 'Healing', maxProgress: 3, xpReward: 150 },
  { id: 'exercises_10', name: 'Practice Makes Progress', description: 'Complete 10 exercises', icon: Award, category: 'Practice', maxProgress: 10, xpReward: 100 },
  { id: 'daily_practice', name: 'Daily Devotion', description: 'Practice 14 days in a row', icon: Sparkles, category: 'Practice', maxProgress: 14, xpReward: 200 },
  { id: 'meditation_master', name: 'Meditation Master', description: 'Complete 20 meditation sessions', icon: Moon, category: 'Practice', maxProgress: 20, xpReward: 250 },
  { id: 'journal_keeper', name: 'Journal Keeper', description: 'Write 15 journal entries', icon: BookOpen, category: 'Practice', maxProgress: 15, xpReward: 150 },
  { id: 'gift_giver', name: 'Gift of Compassion', description: 'Practice self-compassion 10 times', icon: Gift, category: 'Practice', maxProgress: 10, xpReward: 100 },
];

const DEFAULT_WEEKLY_CHALLENGES = [
  { id: 'journal_3', title: 'Complete 3 journal entries', progress: 0, goal: 3, xpReward: 75 },
  { id: 'new_exercise', title: 'Try a new exercise', progress: 0, goal: 1, xpReward: 50 },
  { id: 'meditation_10', title: 'Spend 10 minutes in meditation', progress: 0, goal: 10, xpReward: 75 },
];

const getDefaultGamificationData = () => ({
  xp: 0,
  level: 1,
  badges: BADGE_DEFINITIONS.reduce((acc, badge) => {
    acc[badge.id] = { unlocked: badge.id === 'first_login', progress: badge.id === 'first_login' ? 1 : 0 };
    return acc;
  }, {}),
  weeklyChallenges: DEFAULT_WEEKLY_CHALLENGES,
  weekStartDate: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
});

const getDefaultStreakData = () => ({
  currentStreak: 1,
  longestStreak: 1,
  lastLoginDate: new Date().toISOString().split('T')[0],
  totalLogins: 1,
});

export default function GamificationHub() {
  const { theme } = useTheme();
  const isDark = theme.isDark;

  const [gamificationData, setGamificationData] = useState(getDefaultGamificationData());
  const [streakData, setStreakData] = useState(getDefaultStreakData());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const client = clientAuth.getCurrentClient();
      const clientId = client?.id;
      if (!clientId) { setDataLoaded(true); return; }
      try {
        const data = await supabaseHelpers.getGamification(clientId);
        if (data) {
          setGamificationData({
            xp: data.xp || 0,
            level: data.level || 1,
            badges: data.badges || getDefaultGamificationData().badges,
            weeklyChallenges: data.weekly_challenges || DEFAULT_WEEKLY_CHALLENGES,
            weekStartDate: data.week_start_date || new Date().toISOString(),
            lastUpdated: data.updated_at || new Date().toISOString(),
          });
          setStreakData({
            currentStreak: data.streak_current || 1,
            longestStreak: data.streak_longest || 1,
            lastLoginDate: data.last_login_date || new Date().toISOString().split('T')[0],
            totalLogins: data.total_logins || 1,
          });
        }
      } catch (err) { console.error('Error loading gamification:', err); }
      setDataLoaded(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!dataLoaded) return;
    const saveData = async () => {
      const client = clientAuth.getCurrentClient();
      const clientId = client?.id;
      if (!clientId) return;
      await supabaseHelpers.saveGamification(clientId, {
        xp: gamificationData.xp,
        level: gamificationData.level,
        badges: gamificationData.badges,
        weeklyChallenges: gamificationData.weeklyChallenges,
        streakCurrent: streakData.currentStreak,
        streakLongest: streakData.longestStreak,
        lastLoginDate: streakData.lastLoginDate,
      });
    };
    saveData();
  }, [gamificationData, streakData, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    const today = new Date().toISOString().split('T')[0];
    if (streakData.lastLoginDate !== today) {
      const lastDate = new Date(streakData.lastLoginDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      setStreakData(prev => {
        const newStreak = diffDays === 1 ? prev.currentStreak + 1 : 1;
        return {
          currentStreak: newStreak,
          longestStreak: Math.max(prev.longestStreak, newStreak),
          lastLoginDate: today,
          totalLogins: prev.totalLogins + 1,
        };
      });
    }
  }, [dataLoaded]);

  const currentLevel = Math.min(Math.floor(gamificationData.xp / XP_PER_LEVEL) + 1, 10);
  const xpInCurrentLevel = gamificationData.xp % XP_PER_LEVEL;
  const xpProgress = currentLevel >= 10 ? 100 : (xpInCurrentLevel / XP_PER_LEVEL) * 100;

  const categories = ['All', 'Journey', 'Learning', 'Healing', 'Practice'];
  const filteredBadges = selectedCategory === 'All'
    ? BADGE_DEFINITIONS
    : BADGE_DEFINITIONS.filter(b => b.category === selectedCategory);

  const unlockedCount = Object.values(gamificationData.badges).filter(b => b.unlocked).length;

  return (
    <div className={`max-w-4xl mx-auto px-4 py-6 space-y-6 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-emerald-600 bg-clip-text text-transparent">
          Your Healing Journey
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Track your growth and celebrate your progress
        </p>
      </div>

      <div className={`rounded-2xl p-6 text-center ${isDark ? 'bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-700/30' : 'bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200'}`}>
        <div className="flex items-center justify-center gap-3 mb-2">
          <Flame className="w-10 h-10 text-orange-500 animate-pulse" />
          <span className="text-5xl font-bold text-orange-500">{streakData.currentStreak}</span>
          <Flame className="w-10 h-10 text-orange-500 animate-pulse" />
        </div>
        <p className={`text-lg font-semibold ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
          Day Streak!
        </p>
        <div className="flex justify-center gap-6 mt-3">
          <div className="text-center">
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Longest Streak</p>
            <p className={`text-lg font-bold ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>{streakData.longestStreak} days</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total Logins</p>
            <p className={`text-lg font-bold ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>{streakData.totalLogins}</p>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl p-6 ${isDark ? 'bg-gradient-to-br from-amber-900/40 to-indigo-900/40 border border-amber-700/30' : 'bg-gradient-to-br from-amber-50 to-stone-50 border border-amber-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crown className={`w-6 h-6 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
            <div>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Level {currentLevel}</p>
              <p className={`text-lg font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{LEVEL_NAMES[currentLevel - 1]}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>{gamificationData.xp} XP</p>
            {currentLevel < 10 && (
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {XP_PER_LEVEL - xpInCurrentLevel} XP to next level
              </p>
            )}
          </div>
        </div>
        <div className={`w-full rounded-full h-3 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className="h-3 rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        {currentLevel < 10 && (
          <p className={`text-xs text-center mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Next: {LEVEL_NAMES[currentLevel]}
          </p>
        )}

        <div className="mt-4">
          <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>How to Earn XP:</p>
          <div className="grid grid-cols-2 gap-1">
            {XP_ACTIONS.map((item, i) => (
              <div key={i} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-800/50' : 'bg-white/60'}`}>
                <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>{item.action}</span>
                <span className={`font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>+{item.xp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
            <Award className="w-5 h-5 text-yellow-500" /> Badges
            <span className={`text-sm font-normal ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              ({unlockedCount}/{BADGE_DEFINITIONS.length})
            </span>
          </h2>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white'
                  : isDark
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredBadges.map(badge => {
            const state = gamificationData.badges[badge.id] || { unlocked: false, progress: 0 };
            const Icon = badge.icon;
            const progress = Math.min((state.progress / badge.maxProgress) * 100, 100);

            return (
              <div
                key={badge.id}
                className={`rounded-xl p-4 text-center transition-all ${
                  state.unlocked
                    ? isDark
                      ? 'bg-gradient-to-br from-yellow-900/30 to-amber-900/30 border border-yellow-700/40 shadow-lg'
                      : 'bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-300 shadow-md'
                    : isDark
                      ? 'bg-slate-800/60 border border-slate-700/40 opacity-60'
                      : 'bg-gray-50 border border-gray-200 opacity-60'
                }`}
              >
                <div className="relative inline-block mb-2">
                  <Icon className={`w-8 h-8 ${
                    state.unlocked
                      ? 'text-yellow-500'
                      : isDark ? 'text-slate-500' : 'text-gray-400'
                  }`} />
                  {state.unlocked ? (
                    <CheckCircle className="w-4 h-4 text-green-500 absolute -top-1 -right-1" />
                  ) : (
                    <Lock className="w-3 h-3 text-gray-400 absolute -bottom-0.5 -right-0.5" />
                  )}
                </div>
                <p className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{badge.name}</p>
                <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{badge.description}</p>
                {!state.unlocked && (
                  <div className="mt-2">
                    <div className={`w-full rounded-full h-1.5 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {state.progress}/{badge.maxProgress}
                    </p>
                  </div>
                )}
                {state.unlocked && (
                  <p className={`text-[10px] mt-1 font-semibold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    +{badge.xpReward} XP
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className={`text-lg font-bold flex items-center gap-2 mb-3 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
          <Target className="w-5 h-5 text-blue-500" /> Weekly Challenges
        </h2>
        <div className="space-y-3">
          {gamificationData.weeklyChallenges.map(challenge => {
            const isComplete = challenge.progress >= challenge.goal;
            return (
              <div
                key={challenge.id}
                className={`rounded-xl p-4 ${
                  isComplete
                    ? isDark
                      ? 'bg-green-900/30 border border-green-700/40'
                      : 'bg-green-50 border border-green-200'
                    : isDark
                      ? 'bg-slate-800/60 border border-slate-700/40'
                      : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Target className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    )}
                    <span className={`text-sm font-medium ${isComplete ? (isDark ? 'text-green-300 line-through' : 'text-green-700 line-through') : isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                      {challenge.title}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    +{challenge.xpReward} XP
                  </span>
                </div>
                <div className={`w-full rounded-full h-2 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isComplete
                        ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                        : 'bg-gradient-to-r from-blue-400 to-cyan-400'
                    }`}
                    style={{ width: `${Math.min((challenge.progress / challenge.goal) * 100, 100)}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {challenge.progress}/{challenge.goal} {isComplete ? '— Completed!' : ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <Link
        to="/milestones"
        className={`block rounded-2xl p-6 text-center transition-all hover:shadow-lg ${isDark ? 'bg-slate-800/60 border border-amber-500/30 hover:border-amber-500/50' : 'bg-gradient-to-br from-amber-50 to-emerald-50 border border-amber-200 hover:border-amber-300'}`}
      >
        <Trophy className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
        <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
          View Your Milestones
        </p>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Track achievements and celebrate your progress
        </p>
      </Link>

      <div className={`rounded-2xl p-6 text-center ${isDark ? 'bg-slate-800/60 border border-slate-700/40' : 'bg-gradient-to-br from-rose-50 to-amber-50 border border-amber-200'}`}>
        <Heart className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
        <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
          Your healing journey is personal — no comparison needed.
        </p>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Focus on your own growth. Every step forward matters.
        </p>
      </div>
    </div>
  );
}