import { useState } from 'react';
import { Book, Video, Headphones, ExternalLink, Download, Search } from 'lucide-react';

const Resources = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const resources = [
    {
      id: 1,
      title: 'No Bad Parts',
      author: 'Richard Schwartz',
      type: 'book',
      category: 'foundational',
      description: 'The definitive guide to Internal Family Systems therapy by its creator.',
      link: 'https://www.amazon.com/No-Bad-Parts-Restoring-Wholeness/dp/1683646681'
    },
    {
      id: 2,
      title: 'Internal Family Systems Therapy',
      author: 'Richard Schwartz',
      type: 'book',
      category: 'foundational',
      description: 'The original textbook on IFS therapy, essential for understanding the model.',
      link: 'https://www.amazon.com/Internal-Family-Systems-Therapy-Second/dp/1462541461'
    },
    {
      id: 3,
      title: 'Self-Therapy',
      author: 'Jay Earley',
      type: 'book',
      category: 'practical',
      description: 'A step-by-step guide to using IFS on your own for personal growth.',
      link: 'https://www.amazon.com/Self-Therapy-Step-Step-Cutting-Edge-Psychotherapy/dp/0984392777'
    },
    {
      id: 4,
      title: 'Greater Than the Sum of Our Parts',
      author: 'Richard Schwartz',
      type: 'book',
      category: 'foundational',
      description: 'Discover your true Self and heal your inner world with IFS.',
      link: 'https://www.amazon.com/Greater-Than-Sum-Our-Parts/dp/1683646797'
    },
    {
      id: 5,
      title: 'Introduction to IFS',
      author: 'IFS Institute',
      type: 'video',
      category: 'foundational',
      description: 'Official introduction to Internal Family Systems from the IFS Institute.',
      link: 'https://ifs-institute.com'
    },
    {
      id: 6,
      title: 'IFS Guided Meditations',
      author: 'Various',
      type: 'audio',
      category: 'practical',
      description: 'Collection of guided meditations for connecting with your parts.',
      link: 'https://ifs-institute.com/resources/meditations'
    },
    {
      id: 7,
      title: 'The Body Keeps the Score',
      author: 'Bessel van der Kolk',
      type: 'book',
      category: 'trauma',
      description: 'Understanding trauma and its effects on the body and mind.',
      link: 'https://www.amazon.com/Body-Keeps-Score-Healing-Trauma/dp/0143127748'
    },
    {
      id: 8,
      title: 'Complex PTSD: From Surviving to Thriving',
      author: 'Pete Walker',
      type: 'book',
      category: 'trauma',
      description: 'A guide to understanding and healing from complex trauma.',
      link: 'https://www.amazon.com/Complex-PTSD-Surviving-RECOVERING-CHILDHOOD/dp/1492871842'
    },
    {
      id: 9,
      title: 'IFS Online Courses',
      author: 'IFS Institute',
      type: 'video',
      category: 'training',
      description: 'Professional training and courses in IFS therapy.',
      link: 'https://ifs-institute.com/trainings'
    },
    {
      id: 10,
      title: 'The IFS Podcast',
      author: 'Various Therapists',
      type: 'audio',
      category: 'foundational',
      description: 'Conversations about IFS therapy, healing, and personal growth.',
      link: 'https://ifs-institute.com/resources/podcasts'
    }
  ];

  const categories = [
    { id: 'all', label: 'All Resources' },
    { id: 'foundational', label: 'Foundational' },
    { id: 'practical', label: 'Practical Guides' },
    { id: 'trauma', label: 'Trauma Healing' },
    { id: 'training', label: 'Training' }
  ];

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || resource.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'book':
        return Book;
      case 'video':
        return Video;
      case 'audio':
        return Headphones;
      default:
        return Book;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'book':
        return 'bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/40 dark:text-brand-gold-500';
      case 'video':
        return 'bg-brand-emerald-50 text-brand-emerald-700 dark:bg-brand-emerald-950/40 dark:text-brand-emerald-100';
      case 'audio':
        return 'bg-brand-stone-100 text-brand-stone-600 dark:bg-slate-800/60 dark:text-slate-200';
      default:
        return 'bg-brand-stone-100 text-brand-stone-600 dark:bg-slate-800/60 dark:text-slate-200';
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-gold-500 to-brand-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-gold-500/20">
              <Book className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-6xl font-serif font-normal mb-5 text-brand-stone-900 dark:text-slate-100">
            Resource Library
          </h1>
          <p className="text-lg text-brand-stone-600 dark:text-slate-400 max-w-3xl mx-auto">
            Curated books, videos, and audio resources to deepen your IFS practice
          </p>
        </div>

        {/* Search Bar */}
        <div className="soft-card mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-stone-400 w-6 h-6" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search resources..."
              className="w-full pl-14 pr-4 py-4 rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 text-brand-stone-900 dark:text-slate-100 placeholder-brand-stone-400 focus:ring-2 focus:ring-brand-gold-600 focus:outline-none text-lg"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                activeCategory === category.id
                  ? 'bg-brand-gold-50 dark:bg-brand-gold-950/30 text-brand-gold-700 dark:text-brand-gold-500 shadow-sm'
                  : 'bg-white/70 dark:bg-brand-cardDark/60 text-brand-stone-600 dark:text-slate-400 hover:text-brand-stone-900 dark:hover:text-slate-100 border border-brand-stone-200/50 dark:border-slate-800/60'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="soft-card text-center py-12">
            <Book className="w-16 h-16 text-brand-stone-400 mx-auto mb-4" />
            <p className="text-xl text-brand-stone-600 dark:text-slate-400">No resources found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => {
              const Icon = getTypeIcon(resource.type);
              return (
                <div key={resource.id} className="soft-card-interactive">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 ${getTypeColor(resource.type)} rounded-2xl flex items-center justify-center`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="px-3 py-1 bg-brand-stone-100 text-brand-stone-600 dark:bg-slate-800/60 dark:text-slate-200 rounded-full text-sm font-semibold capitalize">
                      {resource.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-brand-stone-900 dark:text-slate-100 mb-2">{resource.title}</h3>
                  <p className="text-sm text-brand-stone-500 dark:text-slate-500 mb-3">by {resource.author}</p>
                  <p className="text-brand-stone-600 dark:text-slate-400 mb-4">{resource.description}</p>
                  <a
                    href={resource.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-brand-gold-700 dark:text-brand-gold-500 font-semibold hover:underline transition-colors"
                  >
                    <span>Learn More</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* Additional Resources Section */}
        <div className="mt-12 space-y-6">
          <div className="soft-card bg-brand-stone-100/80 dark:bg-brand-cardDark/60">
            <h2 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-4">Official IFS Resources</h2>
            <div className="space-y-3">
              <a
                href="https://ifs-institute.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-white/70 dark:bg-slate-900/40 rounded-2xl hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">IFS Institute</h3>
                  <p className="text-brand-stone-600 dark:text-slate-400">Official website with trainings, resources, and advisor directory</p>
                </div>
                <ExternalLink className="w-5 h-5 text-brand-gold-700 dark:text-brand-gold-500" />
              </a>
              <a
                href="https://selfleadership.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-white/70 dark:bg-slate-900/40 rounded-2xl hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">Center for Self Leadership</h3>
                  <p className="text-brand-stone-600 dark:text-slate-400">Resources for applying IFS principles to leadership and organizations</p>
                </div>
                <ExternalLink className="w-5 h-5 text-brand-gold-700 dark:text-brand-gold-500" />
              </a>
            </div>
          </div>

          <div className="soft-card bg-brand-gold-50/70 dark:bg-brand-gold-950/20">
            <h2 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-4">Find a Advisor</h2>
            <p className="text-lg text-brand-stone-600 dark:text-slate-400 mb-4">
              While self-work is valuable, working with a trained IFS advisor can provide deeper healing and support.
            </p>
            <a
              href="https://ifs-institute.com/practitioners"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 btn-primary"
            >
              <span>Find an IFS Advisor</span>
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>

          <div className="soft-card bg-gradient-to-br from-brand-emerald-600 to-brand-emerald-700 text-white p-8">
            <h2 className="text-3xl font-serif font-normal mb-4">Downloadable Resources</h2>
            <p className="text-lg text-brand-emerald-50/90 mb-6">
              Access printable worksheets, guides, and tools to support your IFS practice.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/15 backdrop-blur-lg p-4 rounded-2xl">
                <div className="flex items-center space-x-3 mb-2">
                  <Download className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Parts Mapping Worksheet</h3>
                </div>
                <p className="text-brand-emerald-50/90">Template for mapping your internal system</p>
              </div>
              <div className="bg-white/15 backdrop-blur-lg p-4 rounded-2xl">
                <div className="flex items-center space-x-3 mb-2">
                  <Download className="w-6 h-6" />
                  <h3 className="text-xl font-bold">8 C's Checklist</h3>
                </div>
                <p className="text-brand-emerald-50/90">Daily practice for cultivating Self-energy</p>
              </div>
              <div className="bg-white/15 backdrop-blur-lg p-4 rounded-2xl">
                <div className="flex items-center space-x-3 mb-2">
                  <Download className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Unburdening Guide</h3>
                </div>
                <p className="text-brand-emerald-50/90">Step-by-step process for releasing burdens</p>
              </div>
              <div className="bg-white/15 backdrop-blur-lg p-4 rounded-2xl">
                <div className="flex items-center space-x-3 mb-2">
                  <Download className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Journal Prompts</h3>
                </div>
                <p className="text-brand-emerald-50/90">Daily prompts for self-reflection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resources;
