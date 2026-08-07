import { useState } from 'react';
import { commonWounds } from '../data/ifsData';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PageHero from '../components/PageHero';
import PhotoTile from '../components/PhotoTile';

const WOUNDS_HERO_IMAGE = '/images/dashboard/deep-wound-assessment.jpg';

const WOUND_IMAGES = {
  ABANDONMENT: '/images/wounds/abandonment.jpg',
  NEGLECT: '/images/wounds/neglect.jpg',
  REJECTION: '/images/wounds/rejection.jpg',
  'CRITICISM/SHAME': '/images/wounds/criticism-shame.jpg',
  BETRAYAL: '/images/wounds/betrayal.jpg',
  HUMILIATION: '/images/wounds/humiliation.jpg',
  INJUSTICE: '/images/wounds/injustice.jpg',
  'LOSS/GRIEF': '/images/wounds/loss-grief.jpg',
  'EMOTIONAL INVALIDATION': '/images/wounds/emotional-invalidation.jpg',
  TRAUMA: '/images/wounds/trauma.jpg'
};

const Wounds = () => {
  const [expandedWound, setExpandedWound] = useState(null);

  const toggleWound = (id) => {
    setExpandedWound(expandedWound === id ? null : id);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        {/* Header */}
        <PageHero
          image={WOUNDS_HERO_IMAGE}
          eyebrow="Inner Child"
          title="10 Common Wounds of the Inner Child"
          subtitle={'The "wounds" of the inner child refer to unresolved emotional pain, unmet needs, or traumatic experiences from childhood that continue to affect us. Below are 10 common inner child wounds and their manifestations.'}
        />

        {/* Introduction Card */}
        <div className="soft-card mb-12 bg-brand-stone-100/80 dark:bg-brand-cardDark/60">
          <h2 className="text-2xl font-serif font-normal text-brand-stone-900 dark:text-slate-100 mb-4">Understanding Your Wounds</h2>
          <p className="text-brand-stone-600 dark:text-slate-400 leading-relaxed mb-4">
            These wounds are not signs of weakness or failure. They are natural responses to difficult experiences 
            that shaped your protective parts. By understanding these wounds, you can begin to heal them with 
            compassion and care.
          </p>
          <p className="text-brand-stone-600 dark:text-slate-400 leading-relaxed">
            Each wound has a <strong>Root Cause</strong> (what created it), <strong>Child Manifestations</strong> (how 
            it showed up in childhood), and <strong>Adult Manifestations</strong> (how it affects you today).
          </p>
        </div>

        {/* Wounds Grid */}
        <div className="space-y-4">
          {commonWounds.map((wound) => (
            <div key={wound.id}>
              <PhotoTile
                onClick={() => toggleWound(wound.id)}
                image={WOUND_IMAGES[wound.title] || WOUNDS_HERO_IMAGE}
                title={`${wound.id}. ${wound.title}`}
                detail={wound.rootCause}
                tone="deep"
                wide
                full
              >
                <span className="ml-2 shrink-0 rounded-full bg-white/15 p-2 backdrop-blur">
                  {expandedWound === wound.id ? (
                    <ChevronUp className="h-5 w-5 text-white" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-white" />
                  )}
                </span>
              </PhotoTile>

              {expandedWound === wound.id && (
                <div className="mt-3 space-y-4 rounded-[22px] border border-brand-stone-200/60 bg-white/70 p-6 dark:border-slate-800/60 dark:bg-slate-900/50 animate-fadeIn">
                  <div className="bg-brand-gold-50/80 dark:bg-brand-gold-950/20 p-4 rounded-2xl">
                    <h4 className="text-lg font-semibold text-brand-gold-700 dark:text-brand-gold-500 mb-2">Child Manifestations</h4>
                    <p className="text-brand-stone-600 dark:text-slate-400">{wound.childManifestations}</p>
                  </div>
                  <div className="bg-brand-emerald-50/80 dark:bg-brand-emerald-950/20 p-4 rounded-2xl">
                    <h4 className="text-lg font-semibold text-brand-emerald-700 dark:text-brand-emerald-100 mb-2">Adult Manifestations</h4>
                    <p className="text-brand-stone-600 dark:text-slate-400">{wound.adultManifestations}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Healing Message */}
        <div className="soft-card mt-12 bg-gradient-to-br from-brand-emerald-600 to-brand-emerald-700 text-white p-8 lg:p-10">
          <h2 className="text-3xl font-serif font-normal mb-4">Remember: You Can Heal</h2>
          <p className="text-lg leading-relaxed mb-4 text-brand-emerald-50/90">
            These wounds were created in the past, but they don't have to define your future. Through IFS therapy, 
            you can identify the parts carrying these wounds (your Exiles), understand the protectors that developed 
            to shield you from this pain, and ultimately heal these wounds with compassion and Self-leadership.
          </p>
          <p className="text-lg leading-relaxed text-brand-emerald-50/90">
            Every wound you carry is a testament to your resilience. You survived. Now, you can thrive.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Wounds;
