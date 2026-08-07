import { useState } from 'react';
import { eightCs, fivePs } from '../data/ifsData';
import PageHero from '../components/PageHero';
import PhotoTile from '../components/PhotoTile';
import { ChevronDown, ChevronUp } from 'lucide-react';

const QUALITIES_HERO_IMAGE = '/images/dashboard/tools-affirmations.jpg';

const QUALITY_IMAGES = {
  Calmness: '/images/qualities/calmness.jpg',
  Curiosity: '/images/qualities/curiosity.jpg',
  Clarity: '/images/qualities/clarity.jpg',
  Compassion: '/images/qualities/compassion.jpg',
  Confidence: '/images/qualities/confidence.jpg',
  Courage: '/images/qualities/courage.jpg',
  Creativity: '/images/qualities/creativity.jpg',
  Connectedness: '/images/qualities/connectedness.jpg',
  Patience: '/images/qualities/patience.jpg',
  Persistence: '/images/qualities/persistence.jpg',
  Presence: '/images/qualities/presence.jpg',
  Playfulness: '/images/qualities/playfulness.jpg',
  Peace: '/images/qualities/peace.jpg'
};

const QualityTile = ({ quality, tone, expanded, onToggle }) => (
  <div>
    <PhotoTile
      onClick={onToggle}
      aria-expanded={expanded}
      image={QUALITY_IMAGES[quality.title] || QUALITIES_HERO_IMAGE}
      title={quality.title}
      detail={quality.description}
      tone={tone}
      wide
      full
    >
      <span className="ml-2 shrink-0 rounded-full bg-white/15 p-2 backdrop-blur">
        {expanded ? <ChevronUp className="h-5 w-5 text-white" /> : <ChevronDown className="h-5 w-5 text-white" />}
      </span>
    </PhotoTile>
    {expanded && (
      <div className="mt-3 rounded-[22px] border border-brand-stone-200/60 bg-white/70 p-6 dark:border-slate-800/60 dark:bg-slate-900/50 animate-fadeIn">
        <p className="leading-relaxed text-brand-stone-600 dark:text-slate-400">{quality.description}</p>
      </div>
    )}
  </div>
);

const Qualities = () => {
  const [activeTab, setActiveTab] = useState('8cs');
  const [expandedQuality, setExpandedQuality] = useState(null);

  const toggleQuality = (title) => {
    setExpandedQuality((current) => (current === title ? null : title));
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <PageHero
          image={QUALITIES_HERO_IMAGE}
          eyebrow="Self Energy"
          title="Qualities of Self"
          subtitle={"The 8 C's and 5 P's embody essential qualities for a healthy mental state and resilience. They act as indicators to measure how much the Self guides responses and navigates challenges."}
        />

        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-full shadow-lg p-2 inline-flex space-x-2">
            <button
              onClick={() => setActiveTab('8cs')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeTab === '8cs'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              8 C's of Self
            </button>
            <button
              onClick={() => setActiveTab('5ps')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeTab === '5ps'
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              5 P's of Self
            </button>
          </div>
        </div>

        {/* 8 C's Content */}
        {activeTab === '8cs' && (
          <div className="space-y-8">
            <div className="card bg-gradient-to-br from-yellow-50 to-orange-50">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">The 8 C's of the Self</h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                The 8 C's of the Self—<strong>calmness, curiosity, compassion, confidence, courage, clarity, 
                creativity, and connectedness</strong>—embody essential qualities for a healthy mental state and resilience. 
                They also act as indicators to measure how much the Self guides responses and navigates challenges, 
                emphasizing a comprehensive approach to well-being.
              </p>
            </div>

            <div className="space-y-4">
              {eightCs.map((quality) => (
                <QualityTile
                  key={quality.title}
                  quality={quality}
                  tone="tools"
                  expanded={expandedQuality === quality.title}
                  onToggle={() => toggleQuality(quality.title)}
                />
              ))}
            </div>

            <div className="card bg-gradient-to-br from-orange-600 to-red-600 text-white">
              <h3 className="text-2xl font-bold mb-4">Why the 8 C's Matter</h3>
              <p className="text-lg leading-relaxed text-orange-100">
                When you're in Self-energy, these qualities naturally emerge. They're not something you have to force 
                or fake—they're your authentic nature when your parts trust you to lead. The more you practice 
                Self-leadership, the more these qualities will shine through in your daily life.
              </p>
            </div>
          </div>
        )}

        {/* 5 P's Content */}
        {activeTab === '5ps' && (
          <div className="space-y-8">
            <div className="card bg-gradient-to-br from-amber-50 to-emerald-50">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">The 5 P's of the Self</h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                The 5 P's—<strong>patience, persistence, presence, playfulness, and peace</strong>—strengthen the Self's 
                stability and toughness. They highlight waiting calmly, sticking to challenges, living in the now, 
                enjoying healing, and keeping inner calm, offering a straightforward path to overall well-being.
              </p>
            </div>

            <div className="space-y-4">
              {fivePs.map((quality) => (
                <QualityTile
                  key={quality.title}
                  quality={quality}
                  tone="daily"
                  expanded={expandedQuality === quality.title}
                  onToggle={() => toggleQuality(quality.title)}
                />
              ))}
            </div>

            <div className="card bg-gradient-to-br from-amber-600 to-emerald-600 text-white">
              <h3 className="text-2xl font-bold mb-4">Cultivating the 5 P's</h3>
              <p className="text-lg leading-relaxed text-amber-100 mb-4">
                The 5 P's are practices that strengthen your Self-leadership over time. They're not about perfection—
                they're about progress. Each time you choose patience over reactivity, persistence over giving up, 
                or presence over distraction, you're building your capacity for Self-led living.
              </p>
              <p className="text-lg leading-relaxed text-amber-100">
                These qualities work together with the 8 C's to create a solid foundation for healing and growth. 
                When you embody these qualities, your parts feel safe enough to trust your leadership.
              </p>
            </div>
          </div>
        )}

        {/* Integration Section */}
        <div className="card mt-12 bg-gradient-to-br from-yellow-100 to-orange-100">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Integrating the Qualities</h2>
          <div className="space-y-4 text-gray-700">
            <p className="text-lg leading-relaxed">
              <strong>Self-Assessment:</strong> Regularly check in with yourself. Which of these qualities do you 
              feel connected to? Which ones feel distant? This awareness helps you understand when you're in 
              Self-energy and when your parts have taken over.
            </p>
            <p className="text-lg leading-relaxed">
              <strong>Practice:</strong> You can't force these qualities, but you can create conditions for them 
              to emerge. When you notice a part has taken over (anxiety, anger, perfectionism), pause and ask: 
              "What would it be like to approach this situation with curiosity? With compassion?"
            </p>
            <p className="text-lg leading-relaxed">
              <strong>Trust the Process:</strong> As you work with your parts and help them unburden, these 
              qualities will naturally become more accessible. They're not goals to achieve—they're your natural 
              state when your parts trust you to lead.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Qualities;