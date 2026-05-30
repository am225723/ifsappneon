import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Book, Video, Headphones, ExternalLink, Search, Filter, Star, Heart, Shield, Flame, Eye, ArrowLeft, Sparkles, BookOpen, Activity, Moon, Feather, Brain } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const woundTypes = ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'];

const healingStages = [
  { id: 'discovery', label: 'Discovery', description: 'Understanding your wounds' },
  { id: 'understanding', label: 'Understanding', description: 'Learning about your parts' },
  { id: 'protector_work', label: 'Protector Work', description: 'Working with managers & firefighters' },
  { id: 'unburdening', label: 'Unburdening', description: 'Releasing stored pain' },
  { id: 'integration', label: 'Integration', description: 'Bringing it all together' },
];

const contentTypes = [
  { id: 'all', label: 'All', icon: Star },
  { id: 'book', label: 'Books', icon: Book },
  { id: 'article', label: 'Articles', icon: BookOpen },
  { id: 'exercise', label: 'Exercises', icon: Activity },
  { id: 'meditation', label: 'Meditations', icon: Moon },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'audio', label: 'Audio', icon: Headphones },
];

const woundIcons = {
  abandonment: Heart,
  shame: Shield,
  neglect: Eye,
  betrayal: Flame,
  helplessness: Brain,
};

const woundColors = {
  abandonment: { bg: 'from-blue-500 to-blue-700', light: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  shame: { bg: 'from-purple-500 to-purple-700', light: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
  neglect: { bg: 'from-teal-500 to-teal-700', light: 'bg-teal-100 text-teal-700', border: 'border-teal-200' },
  betrayal: { bg: 'from-red-500 to-red-700', light: 'bg-red-100 text-red-700', border: 'border-red-200' },
  helplessness: { bg: 'from-amber-500 to-amber-700', light: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
};

const resources = [
  {
    id: 1,
    title: 'No Bad Parts',
    author: 'Richard Schwartz',
    type: 'book',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'discovery',
    description: 'The definitive guide to Internal Family Systems therapy. Essential reading for understanding how your internal system works and why there are truly no bad parts.',
    link: 'https://www.amazon.com/No-Bad-Parts-Restoring-Wholeness/dp/1683646681',
  },
  {
    id: 2,
    title: 'Self-Therapy',
    author: 'Jay Earley',
    type: 'book',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'understanding',
    description: 'A practical step-by-step guide to using IFS on your own. Perfect for deepening your self-work between sessions.',
    link: 'https://www.amazon.com/Self-Therapy-Step-Step-Cutting-Edge-Psychotherapy/dp/0984392777',
  },
  {
    id: 3,
    title: 'Greater Than the Sum of Our Parts',
    author: 'Richard Schwartz',
    type: 'book',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'integration',
    description: 'Discover your true Self and explore the spiritual dimensions of IFS healing.',
    link: 'https://www.amazon.com/Greater-Than-Sum-Our-Parts/dp/1683646797',
  },
  {
    id: 4,
    title: 'The Body Keeps the Score',
    author: 'Bessel van der Kolk',
    type: 'book',
    wounds: ['abandonment', 'betrayal', 'helplessness'],
    stage: 'discovery',
    description: 'Understanding how trauma lives in the body and affects your entire system. Essential for understanding somatic responses.',
    link: 'https://www.amazon.com/Body-Keeps-Score-Healing-Trauma/dp/0143127748',
  },
  {
    id: 5,
    title: 'Complex PTSD: From Surviving to Thriving',
    author: 'Pete Walker',
    type: 'book',
    wounds: ['abandonment', 'neglect', 'betrayal'],
    stage: 'understanding',
    description: 'A comprehensive guide to healing from complex trauma, with practical tools for managing emotional flashbacks.',
    link: 'https://www.amazon.com/Complex-PTSD-Surviving-RECOVERING-CHILDHOOD/dp/1492871842',
  },
  {
    id: 6,
    title: 'Healing the Shame That Binds You',
    author: 'John Bradshaw',
    type: 'book',
    wounds: ['shame'],
    stage: 'understanding',
    description: 'A powerful exploration of toxic shame and its role in addiction, codependency, and depression. Offers pathways to release internalized shame.',
    link: 'https://www.amazon.com/Healing-Shame-Binds-Recovery-Classics/dp/0757303234',
  },
  {
    id: 7,
    title: 'Running on Empty',
    author: 'Jonice Webb',
    type: 'book',
    wounds: ['neglect'],
    stage: 'discovery',
    description: 'Understanding childhood emotional neglect and its invisible effects on adult life. Helps identify patterns you may not have recognized.',
    link: 'https://www.amazon.com/Running-Empty-Overcome-Childhood-Emotional/dp/161448242X',
  },
  {
    id: 8,
    title: 'Attached',
    author: 'Amir Levine & Rachel Heller',
    type: 'book',
    wounds: ['abandonment', 'betrayal'],
    stage: 'understanding',
    description: 'Understanding attachment styles and how early bonds shape your relationships. Invaluable for abandonment and betrayal wounds.',
    link: 'https://www.amazon.com/Attached-Science-Adult-Attachment-YouFind/dp/1585429139',
  },
  {
    id: 9,
    title: 'Understanding Your Abandonment Wound',
    author: 'IFS Healing Guide',
    type: 'article',
    wounds: ['abandonment'],
    stage: 'discovery',
    description: 'How abandonment creates protective parts that fear rejection and cling to relationships. Learn to recognize these patterns in your system.',
    appLink: '/wounds',
  },
  {
    id: 10,
    title: 'The Shame Shield: How Parts Protect You',
    author: 'IFS Healing Guide',
    type: 'article',
    wounds: ['shame'],
    stage: 'discovery',
    description: 'Understanding how manager parts create perfectionism and people-pleasing to protect shame-carrying exiles.',
    appLink: '/wounds',
  },
  {
    id: 11,
    title: 'When Needs Were Invisible: Neglect Patterns',
    author: 'IFS Healing Guide',
    type: 'article',
    wounds: ['neglect'],
    stage: 'discovery',
    description: 'Recognizing how emotional neglect creates parts that minimize needs and struggle with self-care.',
    appLink: '/wounds',
  },
  {
    id: 12,
    title: 'Rebuilding Trust After Betrayal',
    author: 'IFS Healing Guide',
    type: 'article',
    wounds: ['betrayal'],
    stage: 'understanding',
    description: 'How betrayal creates hypervigilant protectors and how to work with them to restore the ability to trust.',
    appLink: '/wounds',
  },
  {
    id: 13,
    title: 'Reclaiming Power from Helplessness',
    author: 'IFS Healing Guide',
    type: 'article',
    wounds: ['helplessness'],
    stage: 'understanding',
    description: 'Understanding how helplessness creates parts that either freeze or over-control, and how Self can restore agency.',
    appLink: '/wounds',
  },
  {
    id: 14,
    title: 'Parts Mapping Exercise',
    author: 'In-App Exercise',
    type: 'exercise',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'understanding',
    description: 'Create a visual map of your internal parts system. Identify protectors, exiles, and their relationships.',
    appLink: '/parts-mapping',
  },
  {
    id: 15,
    title: 'Parts Dialogue Practice',
    author: 'In-App Exercise',
    type: 'exercise',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'protector_work',
    description: 'Practice direct communication with your parts. Build relationships with protectors before approaching exiles.',
    appLink: '/parts-dialogue',
  },
  {
    id: 16,
    title: 'Unburdening Protocol',
    author: 'In-App Exercise',
    type: 'exercise',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'unburdening',
    description: 'A guided process for helping exiles release the burdens they carry. The core healing step in IFS.',
    appLink: '/unburdening',
  },
  {
    id: 17,
    title: 'Parts Relationship Map',
    author: 'In-App Exercise',
    type: 'exercise',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'protector_work',
    description: 'Visualize how your parts interact with each other. Understand alliances, conflicts, and polarizations.',
    appLink: '/parts-relationships',
  },
  {
    id: 18,
    title: 'Self-Energy Meditation',
    author: 'In-App Meditation',
    type: 'meditation',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'discovery',
    description: 'A guided meditation to connect with your core Self — the calm, compassionate presence within you.',
    appLink: '/meditation',
  },
  {
    id: 19,
    title: 'Inner Child Connection Meditation',
    author: 'In-App Meditation',
    type: 'meditation',
    wounds: ['abandonment', 'neglect', 'helplessness'],
    stage: 'protector_work',
    description: 'Gently connect with your younger exile parts. Practice bringing compassion and presence to wounded inner children.',
    appLink: '/meditation',
  },
  {
    id: 20,
    title: 'Releasing Shame Meditation',
    author: 'In-App Meditation',
    type: 'meditation',
    wounds: ['shame'],
    stage: 'unburdening',
    description: 'A gentle guided meditation specifically designed to help release internalized shame burdens.',
    appLink: '/meditation',
  },
  {
    id: 21,
    title: 'Protector Appreciation Meditation',
    author: 'In-App Meditation',
    type: 'meditation',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'protector_work',
    description: 'Honor and appreciate the parts that have been protecting you. Build trust with your managers and firefighters.',
    appLink: '/meditation',
  },
  {
    id: 22,
    title: 'Daily Affirmations for Abandonment Healing',
    author: 'In-App Tool',
    type: 'exercise',
    wounds: ['abandonment'],
    stage: 'integration',
    description: 'Personalized affirmations to remind your system that you are worthy of love and will not be abandoned.',
    appLink: '/affirmations',
  },
  {
    id: 23,
    title: 'Daily Affirmations for Shame Healing',
    author: 'In-App Tool',
    type: 'exercise',
    wounds: ['shame'],
    stage: 'integration',
    description: 'Affirmations designed to counter internalized shame messages and build authentic self-worth.',
    appLink: '/affirmations',
  },
  {
    id: 24,
    title: 'IFS Talks & Interviews',
    author: 'IFS Institute',
    type: 'video',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'discovery',
    description: 'Official video resources from the IFS Institute featuring talks, demonstrations, and interviews.',
    link: 'https://ifs-institute.com',
  },
  {
    id: 25,
    title: 'The IFS Podcast',
    author: 'Various Therapists',
    type: 'audio',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'discovery',
    description: 'Conversations about IFS therapy, healing, and personal growth from practicing therapists.',
    link: 'https://ifs-institute.com/resources/podcasts',
  },
  {
    id: 26,
    title: 'IFS Guided Meditations Collection',
    author: 'IFS Institute',
    type: 'audio',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'understanding',
    description: 'Professional guided meditations for connecting with your parts and accessing Self energy.',
    link: 'https://ifs-institute.com/resources/meditations',
  },
  {
    id: 27,
    title: 'Mood Tracking & Patterns',
    author: 'In-App Tool',
    type: 'exercise',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'discovery',
    description: 'Track your daily mood and energy to discover patterns connected to your wounds and parts activation.',
    appLink: '/mood-tracker',
  },
  {
    id: 28,
    title: 'Micro-Learning: 2-Minute IFS Lessons',
    author: 'In-App Tool',
    type: 'exercise',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'understanding',
    description: 'Quick bite-sized lessons on IFS concepts. Perfect for busy days when you still want to engage with your healing.',
    appLink: '/micro-learning',
  },
  {
    id: 29,
    title: 'You Are the One You\'ve Been Waiting For',
    author: 'Richard Schwartz',
    type: 'book',
    wounds: ['abandonment', 'betrayal'],
    stage: 'integration',
    description: 'Applying IFS to intimate relationships. Learn how your parts interact in partnerships and how Self can lead.',
    link: 'https://www.amazon.com/Youve-Been-Waiting-Bringing-Relationship/dp/0615249329',
  },
  {
    id: 30,
    title: 'Internal Family Systems Skills Training Manual',
    author: 'Frank Anderson, Martha Sweezy, Richard Schwartz',
    type: 'book',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'protector_work',
    description: 'Comprehensive clinical manual with practical exercises and techniques for IFS work.',
    link: 'https://www.amazon.com/Internal-Family-Systems-Skills-Training/dp/1683731506',
  },
  {
    id: 31,
    title: 'Daily Check-In Practice',
    author: 'In-App Tool',
    type: 'exercise',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'integration',
    description: 'Build a daily habit of checking in with your parts. Notice who is active and what they need from Self.',
    appLink: '/daily-checkin',
  },
  {
    id: 32,
    title: 'Healing Journal',
    author: 'In-App Tool',
    type: 'exercise',
    wounds: ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'],
    stage: 'understanding',
    description: 'Write about your experiences with parts, process sessions, and track insights in your healing journey.',
    appLink: '/journal',
  },
];

const typeColors = {
  book: 'from-blue-400 to-blue-600',
  article: 'from-emerald-400 to-emerald-600',
  exercise: 'from-amber-400 to-amber-600',
  meditation: 'from-indigo-400 to-indigo-600',
  video: 'from-red-400 to-red-600',
  audio: 'from-green-400 to-green-600',
};

const ResourceLibrary = () => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [activeWound, setActiveWound] = useState('all');
  const [activeStage, setActiveStage] = useState('all');
  const [userWound, setUserWound] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadUserWound = async () => {
      const client = clientAuth.getCurrentClient();
      if (!client?.id) return;
      try {
        const { data } = await supabase
          .from('ifs_interactive_data')
          .select('data')
          .eq('client_id', client.id)
          .eq('module_id', 'assessment_wounds')
          .maybeSingle();
        if (data?.data?.primary) {
          setUserWound(data.data.primary);
        }
      } catch (err) {
        console.error('Error loading wound data:', err);
      }
    };
    loadUserWound();
  }, []);

  const filteredResources = resources.filter(r => {
    const matchesSearch = !searchTerm ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = activeType === 'all' || r.type === activeType;
    const matchesWound = activeWound === 'all' || r.wounds.includes(activeWound);
    const matchesStage = activeStage === 'all' || r.stage === activeStage;
    return matchesSearch && matchesType && matchesWound && matchesStage;
  });

  const recommendedResources = userWound
    ? resources.filter(r => r.wounds.includes(userWound)).slice(0, 6)
    : [];

  const getTypeIcon = (type) => {
    const found = contentTypes.find(c => c.id === type);
    return found ? found.icon : Book;
  };

  const renderResourceCard = (resource) => {
    const Icon = getTypeIcon(resource.type);
    const isAppLink = !!resource.appLink;

    const cardContent = (
      <div className={`rounded-2xl border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
        theme.isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-gray-200 hover:border-gray-300'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${typeColors[resource.type] || 'from-gray-400 to-gray-600'} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {resource.wounds.slice(0, 2).map(w => (
              <span key={w} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${woundColors[w]?.light || 'bg-gray-100 text-gray-600'}`}>
                {w}
              </span>
            ))}
            {resource.wounds.length > 2 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${theme.isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500'}`}>
                +{resource.wounds.length - 2}
              </span>
            )}
          </div>
        </div>
        <h3 className={`text-base font-bold mb-1 ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>{resource.title}</h3>
        <p className={`text-xs mb-2 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>by {resource.author}</p>
        <p className={`text-sm mb-3 line-clamp-2 ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>{resource.description}</p>
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize ${theme.isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
            {resource.stage.replace('_', ' ')}
          </span>
          <span className={`text-sm font-medium flex items-center gap-1 ${isAppLink ? 'text-amber-600' : 'text-teal-600'}`}>
            {isAppLink ? 'Open in App' : 'Learn More'}
            <ExternalLink className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    );

    if (isAppLink) {
      return (
        <Link key={resource.id} to={resource.appLink} className="block">
          {cardContent}
        </Link>
      );
    }

    return (
      <a key={resource.id} href={resource.link} target="_blank" rel="noopener noreferrer" className="block">
        {cardContent}
      </a>
    );
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className={`p-2 rounded-xl ${theme.isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
            <ArrowLeft className={`w-5 h-5 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`} />
          </Link>
          <div>
            <h1 className={`text-2xl font-bold ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>Healing Library</h1>
            <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Curated IFS resources for your healing journey</p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search resources..."
            className={`w-full pl-11 pr-12 py-3 rounded-xl border text-sm ${
              theme.isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-amber-500/50`}
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
              showFilters
                ? 'bg-amber-100 text-amber-700'
                : theme.isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {contentTypes.map(ct => {
            const CTIcon = ct.icon;
            return (
              <button
                key={ct.id}
                onClick={() => setActiveType(ct.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeType === ct.id
                    ? 'bg-gradient-to-r from-amber-500 to-emerald-600 text-white shadow-md'
                    : theme.isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <CTIcon className="w-3.5 h-3.5" />
                {ct.label}
              </button>
            );
          })}
        </div>

        {showFilters && (
          <div className={`rounded-2xl border p-4 mb-4 space-y-4 ${theme.isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Wound Type</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveWound('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeWound === 'all'
                      ? 'bg-amber-100 text-amber-700'
                      : theme.isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  All Wounds
                </button>
                {woundTypes.map(w => {
                  const WIcon = woundIcons[w];
                  return (
                    <button
                      key={w}
                      onClick={() => setActiveWound(w)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                        activeWound === w
                          ? woundColors[w]?.light || 'bg-amber-100 text-amber-700'
                          : theme.isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <WIcon className="w-3.5 h-3.5" />
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Healing Stage</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveStage('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeStage === 'all'
                      ? 'bg-amber-100 text-amber-700'
                      : theme.isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  All Stages
                </button>
                {healingStages.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveStage(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                      activeStage === s.id
                        ? 'bg-emerald-100 text-emerald-700'
                        : theme.isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {userWound && activeType === 'all' && activeWound === 'all' && activeStage === 'all' && !searchTerm && (
          <div className={`rounded-2xl border p-5 mb-6 ${
            theme.isDark ? 'bg-gradient-to-br from-slate-800 to-slate-800/50 border-amber-800/30' : 'bg-gradient-to-br from-amber-50 to-emerald-50 border-amber-200/50'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className={`text-lg font-bold ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                Recommended for Your <span className="capitalize">{userWound}</span> Healing
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendedResources.map(r => renderResourceCard(r))}
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between">
          <h2 className={`text-lg font-bold ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            {activeType === 'all' && activeWound === 'all' && activeStage === 'all' && !searchTerm
              ? 'All Resources'
              : `Results (${filteredResources.length})`}
          </h2>
        </div>

        {filteredResources.length === 0 ? (
          <div className={`rounded-2xl border p-12 text-center ${theme.isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <Book className={`w-12 h-12 mx-auto mb-3 ${theme.isDark ? 'text-slate-600' : 'text-gray-300'}`} />
            <p className={`text-lg font-medium ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>No resources match your filters</p>
            <button
              onClick={() => { setActiveType('all'); setActiveWound('all'); setActiveStage('all'); setSearchTerm(''); }}
              className="mt-3 text-amber-600 text-sm font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredResources.map(r => renderResourceCard(r))}
          </div>
        )}

        <div className={`rounded-2xl border p-5 mt-6 ${theme.isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200/50'}`}>
          <h2 className={`text-lg font-bold mb-3 ${theme.isDark ? 'text-slate-100' : 'text-gray-900'}`}>Official IFS Resources</h2>
          <div className="space-y-2">
            <a
              href="https://ifs-institute.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                theme.isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-white hover:shadow-md'
              }`}
            >
              <div>
                <h3 className={`font-bold ${theme.isDark ? 'text-slate-100' : 'text-gray-800'}`}>IFS Institute</h3>
                <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-600'}`}>Trainings, resources, and practitioner directory</p>
              </div>
              <ExternalLink className={`w-4 h-4 flex-shrink-0 ${theme.isDark ? 'text-slate-500' : 'text-teal-600'}`} />
            </a>
            <a
              href="https://selfleadership.org"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                theme.isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-white hover:shadow-md'
              }`}
            >
              <div>
                <h3 className={`font-bold ${theme.isDark ? 'text-slate-100' : 'text-gray-800'}`}>Center for Self Leadership</h3>
                <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-600'}`}>IFS principles for leadership and organizations</p>
              </div>
              <ExternalLink className={`w-4 h-4 flex-shrink-0 ${theme.isDark ? 'text-slate-500' : 'text-teal-600'}`} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceLibrary;