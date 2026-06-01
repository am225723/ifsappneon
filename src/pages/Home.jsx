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
  Trophy,
  CalendarCheck,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadClientSessionAgendas } from '../lib/sessionAgendas';
import { loadActiveTreatmentPlansForClient } from '../lib/treatmentPlans';

const Home = ({ clientId, client }) => {
  const navigate = useNavigate();
  const [savedAssessment, setSavedAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [agendaSummary, setAgendaSummary] = useState({ lastSubmitted: null, hasDraft: false });
  const [therapyGoals, setTherapyGoals] = useState([]);

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

          const [agendasResult, goalsResult] = await Promise.all([
            loadClientSessionAgendas(clientId),
            loadActiveTreatmentPlansForClient(clientId)
          ]);
          const agendas = agendasResult.data || [];
          setTherapyGoals((goalsResult.data || []).filter((goal) => ['active', 'completed'].includes(goal.status)).slice(0, 3));
          setAgendaSummary({
            lastSubmitted: agendas.find((agenda) => agenda.status === 'submitted' || agenda.status === 'reviewed')?.created_at || null,
            hasDraft: agendas.some((agenda) => agenda.status === 'draft')
          });
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

      <section className="mb-10">
        <div className="soft-card border border-brand-gold-100 bg-brand-gold-50/70 dark:bg-brand-gold-950/20 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-gold-100 text-brand-gold-700 dark:bg-brand-gold-950/50 dark:text-brand-gold-500 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Pre-Session Check-In</h2>
              <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-1">Complete Pre-Session Check-In before your next therapist visit.</p>
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                {agendaSummary.lastSubmitted && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-brand-emerald-700"><CheckCircle2 className="w-3 h-3" /> Last submitted {new Date(agendaSummary.lastSubmitted).toLocaleDateString()}</span>}
                {agendaSummary.hasDraft && <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">Draft in progress</span>}
              </div>
            </div>
          </div>
          <Link to="/pre-session-checkin" className="btn-sanctuary-primary justify-center">
            Complete Pre-Session Check-In
          </Link>
        </div>
      </section>


      {therapyGoals.length > 0 && (
        <section className="mb-10">
          <div className="soft-card border border-brand-emerald-100 bg-white/80 dark:bg-brand-cardDark p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">My Therapy Goals</h2>
                <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-1">Read-only goals shared by your therapist.</p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-brand-emerald-700 dark:text-brand-emerald-100" />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {therapyGoals.map((goal) => (
                <div key={goal.id} className="rounded-2xl border border-brand-stone-100 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-brand-stone-900 dark:text-slate-100">{goal.goal_title}</h3>
                    <span className="text-[10px] uppercase tracking-wide rounded-full bg-brand-emerald-50 px-2 py-0.5 text-brand-emerald-700">{goal.status}</span>
                  </div>
                  {goal.goal_description && <p className="text-sm text-brand-stone-600 dark:text-slate-400 line-clamp-3">{goal.goal_description}</p>}
                  {Array.isArray(goal.objectives) && goal.objectives.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-brand-stone-500 dark:text-slate-500 list-disc pl-4">
                      {goal.objectives.slice(0, 3).map((objective, index) => <li key={index}>{typeof objective === 'string' ? objective : objective?.text}</li>)}
                    </ul>
                  )}
                  {goal.review_date && <p className="mt-3 text-xs text-brand-stone-500 dark:text-slate-500">Review date: {new Date(goal.review_date).toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
