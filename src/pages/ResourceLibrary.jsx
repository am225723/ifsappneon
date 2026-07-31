import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Book, Video, Headphones, ExternalLink, Search, Filter, Star, Heart, Shield, Flame, Eye, ArrowLeft, Sparkles, BookOpen, Activity, Moon, Feather, Brain } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { resources } from '../data/resourceLibraryData.js';

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