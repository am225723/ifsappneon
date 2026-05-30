import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Brain,
  Play,
  ArrowRight,
  Users,
  Zap,
  BookOpen,
  Compass,
  Sun,
  BarChart3,
  Smile,
  Library,
  Feather,
  Trophy
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Home = ({ clientId, client }) => {
  const navigate = useNavigate();
  const [savedAssessment, setSavedAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    const loadData = async () => {
      if (clientId) {
        try {
          const { data } = await supabase
            .from('ifs_interactive_data')
            .select('data')
            .eq('client_id', clientId)
            .eq('module_id', 'assessment_wounds')
            .maybeSingle();

          if (data?.data) setSavedAssessment(data.data);
        } catch (err) {
          console.error('Error loading home data:', err);
        }
      }
      setLoading(false);
    };

    loadData();
  }, [clientId]);

  const toolCategories = {
    daily: {
      label: "Today's Practice",
      description: 'Nervous system anchors for your current state',
      items: [
        { to: '/exercises', icon: Play, title: 'Guided Meditation', desc: 'Strengthen Self energy', badge: '10 min', color: 'bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/40 dark:text-brand-gold-500' },
        { to: '/journal', icon: BookOpen, title: 'Healing Journal', desc: 'Reflect on your parts', color: 'bg-brand-emerald-50 text-brand-emerald-700 dark:bg-brand-emerald-950/40 dark:text-brand-emerald-100' },
        { to: '/affirmations', icon: Heart, title: 'Affirmations', desc: 'Personalized healing', color: 'bg-brand-stone-100 text-brand-stone-600 dark:bg-slate-800/60 dark:text-slate-200' }
      ]
    },
    explore: {
      label: 'Deep Exploration',
      description: 'Interactive tools to map your internal system',
      items: [
        { to: '/parts-mapping', icon: Compass, title: 'Parts Map', desc: 'Identify protectors and exiles', color: 'bg-brand-emerald-50 text-brand-emerald-700 dark:bg-brand-emerald-950/40 dark:text-brand-emerald-100' },
        { to: '/parts-studio', icon: Users, title: 'Parts Studio', desc: 'Visual relationship canvas', color: 'bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/40 dark:text-brand-gold-500' },
        { to: '/unburdening', icon: Feather, title: 'Unburdening', desc: 'Release structural patterns', color: 'bg-brand-stone-100 text-brand-stone-600 dark:bg-slate-800/60 dark:text-slate-200' }
      ]
    },
    track: {
      label: 'Your Journey',
      description: 'Synthesize insights and track growth',
      items: [
        { to: '/mood-tracker', icon: Smile, title: 'Mood Tracker', desc: 'Log system states', color: 'bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/40 dark:text-brand-gold-500' },
        { to: '/weekly-reflection', icon: BarChart3, title: 'Weekly Review', desc: 'Reflective summary', color: 'bg-brand-emerald-50 text-brand-emerald-700 dark:bg-brand-emerald-950/40 dark:text-brand-emerald-100' },
        { to: '/milestones', icon: Trophy, title: 'Milestones', desc: 'Honor your progress', color: 'bg-brand-stone-100 text-brand-stone-600 dark:bg-slate-800/60 dark:text-slate-200' }
      ]
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
      <section className="mb-20 text-center lg:text-left lg:flex lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-emerald-700 dark:text-brand-emerald-100 mb-4">
            The Luminous Self
          </p>
          <h1 className="text-4xl lg:text-6xl font-normal text-brand-stone-900 dark:text-slate-100 mb-4">
            Hello, <span className="italic font-serif text-brand-gold-700 dark:text-brand-gold-500">{client?.name?.split(' ')[0] || 'friend'}</span>
          </h1>
          <p className="text-lg text-brand-stone-600 dark:text-slate-400 mb-8 leading-relaxed">
            Your internal world is a sacred space. Take a slow breath and choose a trailhead for today's healing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button onClick={() => navigate('/curriculum')} className="btn-sanctuary-primary">
              <Sun className="w-5 h-5" />
              Continue Your Curriculum
            </button>
            {!savedAssessment && (
              <button onClick={() => navigate('/assessments')} className="btn-sanctuary-secondary">
                <Brain className="w-5 h-5" />
                Take Wound Assessment
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">Interactive Suite</h2>
            <p className="text-brand-stone-600 dark:text-slate-400 text-sm mt-1">
              {toolCategories[activeTab].description}
            </p>
          </div>

          <div className="flex p-1 bg-brand-stone-100 dark:bg-slate-900 rounded-2xl border border-brand-stone-200/50 dark:border-slate-800/60">
            {Object.keys(toolCategories).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === key
                    ? 'bg-white dark:bg-brand-cardDark text-brand-gold-700 dark:text-brand-gold-500 shadow-sm'
                    : 'text-brand-stone-500 dark:text-slate-400 hover:text-brand-stone-800 dark:hover:text-slate-100'
                }`}
              >
                {toolCategories[key].label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {toolCategories[activeTab].items.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.to} to={tool.to} className="soft-card-interactive flex items-start gap-5 group">
                <div className={`w-12 h-12 rounded-2xl ${tool.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-sans font-semibold text-brand-stone-900 dark:text-slate-100">{tool.title}</h3>
                    {tool.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand-gold-100 text-brand-gold-700">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-brand-stone-600 dark:text-slate-400 leading-relaxed">{tool.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mb-20">
        <div className="soft-card bg-gradient-to-br from-brand-emerald-600 to-brand-emerald-700 text-white p-8 lg:p-12 overflow-hidden relative">
          <div className="relative z-10 lg:flex items-center justify-between gap-12">
            <div className="max-w-xl">
              <h2 className="text-3xl font-serif mb-4 italic">Healing is a journey, not a destination.</h2>
              <p className="text-brand-emerald-50 opacity-90 mb-8 leading-relaxed">
                You have completed <span className="font-bold">42%</span> of your current module: <span className="italic">Self-Leadership Foundation</span>.
              </p>
              <div className="w-full bg-white/20 rounded-full h-3 mb-8">
                <div className="bg-white h-3 rounded-full transition-all duration-1000" style={{ width: '42%' }} />
              </div>
              <Link to="/curriculum" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:translate-x-2 transition-transform">
                Resume Module <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="hidden lg:block">
              <div className="w-48 h-48 rounded-full border-8 border-white/10 flex items-center justify-center relative">
                <Sun className="w-20 h-20 text-white animate-pulse" />
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="soft-card border-none bg-brand-stone-100 dark:bg-slate-900/40 p-8">
          <Library className="w-8 h-8 text-brand-stone-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Resource Library</h3>
          <p className="text-sm text-brand-stone-600 dark:text-slate-400 mb-6">
            Deepen your understanding of Internal Family Systems with curated books and videos.
          </p>
          <Link to="/resources" className="text-brand-gold-700 dark:text-brand-gold-500 text-sm font-bold hover:underline">
            Browse Library
          </Link>
        </div>

        <div className="soft-card border-none bg-brand-stone-100 dark:bg-slate-900/40 p-8">
          <Zap className="w-8 h-8 text-brand-stone-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">IFS Cheat Sheet</h3>
          <p className="text-sm text-brand-stone-600 dark:text-slate-400 mb-6">
            A quick reference guide to the 6 F's, the 8 C's, and the 5 P's of Self-energy.
          </p>
          <Link to="/cheat-sheet" className="text-brand-gold-700 dark:text-brand-gold-500 text-sm font-bold hover:underline">
            View Reference
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
