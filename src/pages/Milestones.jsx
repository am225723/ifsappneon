import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, Star, BookOpen, Target, Heart, Shield, CheckCircle,
  Sparkles, Trophy, Flame, Crown, ArrowLeft, Lock, Unlock,
  PenLine, Map, Zap
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const MILESTONES = [
  {
    id: 'first_module',
    title: 'First Steps',
    description: 'Complete your first learning module',
    icon: BookOpen,
    color: 'from-emerald-400 to-emerald-600',
    bg: 'bg-emerald-100',
    text: 'text-emerald-600',
    category: 'Learning'
  },
  {
    id: 'first_assessment',
    title: 'Self-Discovery',
    description: 'Complete your first assessment',
    icon: Target,
    color: 'from-blue-400 to-blue-600',
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    category: 'Healing'
  },
  {
    id: 'streak_7',
    title: 'Weekly Warrior',
    description: 'Maintain a 7-day engagement streak',
    icon: Flame,
    color: 'from-orange-400 to-orange-600',
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    category: 'Journey'
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Maintain a 30-day engagement streak',
    icon: Crown,
    color: 'from-amber-400 to-amber-600',
    bg: 'bg-amber-100',
    text: 'text-amber-600',
    category: 'Journey'
  },
  {
    id: 'all_assessments',
    title: 'Full Insight',
    description: 'Complete all available assessments',
    icon: Shield,
    color: 'from-indigo-400 to-indigo-600',
    bg: 'bg-indigo-100',
    text: 'text-indigo-600',
    category: 'Healing'
  },
  {
    id: 'first_journal',
    title: 'Dear Diary',
    description: 'Write your first journal entry',
    icon: PenLine,
    color: 'from-rose-400 to-rose-600',
    bg: 'bg-rose-100',
    text: 'text-rose-600',
    category: 'Healing'
  },
  {
    id: 'journal_10',
    title: 'Reflective Soul',
    description: 'Write 10 journal entries',
    icon: Heart,
    color: 'from-pink-400 to-pink-600',
    bg: 'bg-pink-100',
    text: 'text-pink-600',
    category: 'Healing'
  },
  {
    id: 'first_parts_map',
    title: 'Parts Explorer',
    description: 'Create your first parts map',
    icon: Map,
    color: 'from-purple-400 to-purple-600',
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    category: 'Healing'
  },
  {
    id: 'module_5',
    title: 'Halfway There',
    description: 'Complete Module 5 — the midpoint of your journey',
    icon: Zap,
    color: 'from-yellow-400 to-yellow-600',
    bg: 'bg-yellow-100',
    text: 'text-yellow-600',
    category: 'Learning'
  },
  {
    id: 'all_modules',
    title: 'Journey Complete',
    description: 'Complete all learning modules',
    icon: Trophy,
    color: 'from-amber-500 to-emerald-500',
    bg: 'bg-gradient-to-r from-amber-100 to-emerald-100',
    text: 'text-amber-700',
    category: 'Learning'
  }
];

const ConfettiParticle = ({ delay, left }) => (
  <div
    className="absolute w-2 h-2 rounded-full animate-confetti"
    style={{
      left: `${left}%`,
      animationDelay: `${delay}s`,
      backgroundColor: ['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)]
    }}
  />
);

const Milestones = () => {
  const { theme } = useTheme();
  const [milestoneStatus, setMilestoneStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [celebrating, setCelebrating] = useState(null);
  const [newlyEarned, setNewlyEarned] = useState([]);

  const checkMilestones = useCallback(async () => {
    const client = clientAuth.getCurrentClient();
    if (!client?.id) {
      setLoading(false);
      return;
    }
    const clientId = client.id;
    const status = {};

    try {
      const [progressRes, journalRes, interactiveRes] = await Promise.all([
        supabase.from('ifs_client_progress').select('module_id, completed').eq('client_id', clientId),
        supabase.from('ifs_journal_entries').select('id').eq('client_id', clientId),
        supabase.from('ifs_interactive_data').select('module_id, data').eq('client_id', clientId)
      ]);

      const progress = progressRes.data || [];
      const journals = journalRes.data || [];
      const interactive = interactiveRes.data || [];

      const completedModules = progress.filter(p => p.completed).map(p => p.module_id);
      const moduleNumbers = completedModules
        .map(id => {
          const match = id.match(/module[_-]?(\d+)/i);
          return match ? parseInt(match[1]) : null;
        })
        .filter(Boolean);

      status.first_module = completedModules.length >= 1;

      const assessmentModules = interactive.filter(d =>
        d.module_id && (
          d.module_id.includes('assessment') ||
          d.module_id.includes('self_energy') ||
          d.module_id.includes('protective_parts')
        )
      );
      status.first_assessment = assessmentModules.length >= 1;
      status.all_assessments = assessmentModules.length >= 3;

      status.first_journal = journals.length >= 1;
      status.journal_10 = journals.length >= 10;

      const partsMap = interactive.find(d => d.module_id === 'parts_map');
      status.first_parts_map = !!partsMap;

      status.module_5 = moduleNumbers.includes(5) || completedModules.length >= 5;
      status.all_modules = completedModules.length >= 10;

      let streakData = null;
      try {
        const { data: gamData } = await supabase
          .from('ifs_gamification')
          .select('current_streak')
          .eq('client_id', clientId)
          .maybeSingle();
        streakData = gamData;
      } catch (e) {
        // gamification table may not exist
      }

      const streak = streakData?.current_streak || 0;
      status.streak_7 = streak >= 7;
      status.streak_30 = streak >= 30;

    } catch (err) {
      console.error('Error checking milestones:', err);
    }

    const prevStr = localStorage.getItem(`milestones_${clientId}`);
    const prev = prevStr ? JSON.parse(prevStr) : {};
    const newOnes = [];
    Object.entries(status).forEach(([key, earned]) => {
      if (earned && !prev[key]) {
        newOnes.push(key);
      }
    });
    setNewlyEarned(newOnes);
    localStorage.setItem(`milestones_${clientId}`, JSON.stringify(status));

    setMilestoneStatus(status);
    setLoading(false);

    if (newOnes.length > 0) {
      setCelebrating(newOnes[0]);
      setTimeout(() => setCelebrating(null), 3000);
    }
  }, []);

  useEffect(() => {
    checkMilestones();
  }, [checkMilestones]);

  const earnedCount = Object.values(milestoneStatus).filter(Boolean).length;
  const totalCount = MILESTONES.length;
  const progressPercent = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
          <p className={theme.isDark ? 'text-slate-300' : 'text-gray-600'}>Loading milestones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative overflow-hidden">
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 2.5s ease-in-out forwards;
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 25px rgba(245, 158, 11, 0.6), 0 0 50px rgba(16, 185, 129, 0.3); }
        }
        .animate-glow {
          animation: glow-pulse 1.5s ease-in-out 3;
        }
        @keyframes scale-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.4s ease-out forwards;
        }
      `}</style>

      {celebrating && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle key={i} delay={Math.random() * 1.5} left={Math.random() * 100} />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`${theme.isDark ? 'bg-slate-800' : 'bg-white'} rounded-3xl shadow-2xl p-8 text-center animate-scale-in pointer-events-auto max-w-sm mx-4`}>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                Milestone Earned!
              </h3>
              <p className={`${theme.isDark ? 'text-slate-300' : 'text-gray-600'} mb-4`}>
                {MILESTONES.find(m => m.id === celebrating)?.title}
              </p>
              <button
                onClick={() => setCelebrating(null)}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-emerald-600 text-white rounded-xl font-medium hover:from-amber-600 hover:to-emerald-700 transition-all"
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className={`p-2 rounded-lg ${theme.isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className={`text-3xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            Milestones
          </h1>
          <p className={theme.isDark ? 'text-slate-400' : 'text-gray-500'}>
            Track your healing achievements
          </p>
        </div>
      </div>

      <div className={`${theme.isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-r from-amber-50 to-emerald-50 border-amber-100'} rounded-2xl border p-6 mb-8`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className={`w-5 h-5 ${theme.isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <span className={`font-semibold ${theme.isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              Overall Progress
            </span>
          </div>
          <span className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            {earnedCount} / {totalCount} earned
          </span>
        </div>
        <div className={`w-full ${theme.isDark ? 'bg-slate-700' : 'bg-gray-200'} rounded-full h-3 mb-2`}>
          <div
            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-3 rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {progressPercent}% complete — {earnedCount === totalCount ? 'You\'ve earned every milestone! 🎉' : 'Keep going, you\'re doing great!'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MILESTONES.map((milestone) => {
          const earned = milestoneStatus[milestone.id];
          const isNew = newlyEarned.includes(milestone.id);
          const Icon = milestone.icon;

          return (
            <div
              key={milestone.id}
              className={`relative rounded-2xl border p-5 transition-all duration-300 ${
                earned
                  ? `${theme.isDark ? 'bg-slate-800 border-amber-500/30' : 'bg-white border-amber-200'} ${isNew ? 'animate-glow' : 'shadow-sm hover:shadow-lg'}`
                  : `${theme.isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'} opacity-70`
              }`}
            >
              {isNew && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-emerald-500 text-white text-xs font-bold rounded-full">
                  NEW!
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  earned
                    ? `bg-gradient-to-r ${milestone.color}`
                    : theme.isDark ? 'bg-slate-700' : 'bg-gray-200'
                }`}>
                  {earned ? (
                    <Icon className="w-7 h-7 text-white" />
                  ) : (
                    <Lock className={`w-6 h-6 ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold ${
                      earned
                        ? theme.isDark ? 'text-slate-100' : 'text-gray-900'
                        : theme.isDark ? 'text-slate-400' : 'text-gray-500'
                    }`}>
                      {milestone.title}
                    </h3>
                    {earned && (
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className={`text-sm ${
                    earned
                      ? theme.isDark ? 'text-slate-300' : 'text-gray-600'
                      : theme.isDark ? 'text-slate-500' : 'text-gray-400'
                  }`}>
                    {milestone.description}
                  </p>
                  <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                    earned
                      ? theme.isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                      : theme.isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {milestone.category}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/gamification"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-emerald-600 text-white rounded-xl font-medium hover:from-amber-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Sparkles className="w-5 h-5" />
          View Gamification Hub
        </Link>
      </div>
    </div>
  );
};

export default Milestones;
