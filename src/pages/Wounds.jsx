import { useState } from 'react';
import { commonWounds } from '../data/ifsData';
import { Heart, ChevronDown, ChevronUp } from 'lucide-react';

const Wounds = () => {
  const [expandedWound, setExpandedWound] = useState(null);

  const toggleWound = (id) => {
    setExpandedWound(expandedWound === id ? null : id);
  };

  const woundColors = [
    'bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/40 dark:text-brand-gold-500',
    'bg-brand-emerald-50 text-brand-emerald-700 dark:bg-brand-emerald-950/40 dark:text-brand-emerald-100',
    'bg-brand-stone-100 text-brand-stone-600 dark:bg-slate-800/60 dark:text-slate-200'
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-gold-500 to-brand-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-gold-500/20">
              <Heart className="w-8 h-8 text-white" fill="white" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-6xl font-serif font-normal mb-5 text-brand-stone-900 dark:text-slate-100">
            10 Common Wounds of the Inner Child
          </h1>
          <p className="text-lg text-brand-stone-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            The "wounds" of the inner child refer to unresolved emotional pain, unmet needs, or traumatic experiences 
            from childhood that continue to affect us. Below are 10 common inner child wounds and their manifestations.
          </p>
        </div>

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
        <div className="space-y-6">
          {commonWounds.map((wound, index) => (
            <div
              key={wound.id}
              className="soft-card-interactive cursor-pointer"
              onClick={() => toggleWound(wound.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`w-16 h-16 ${woundColors[index % woundColors.length]} rounded-2xl flex items-center justify-center font-bold text-2xl`}>
                    {wound.id}
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">{wound.title}</h3>
                    <p className="text-brand-stone-600 dark:text-slate-400">{wound.rootCause}</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-brand-stone-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  {expandedWound === wound.id ? (
                    <ChevronUp className="w-6 h-6 text-brand-stone-600 dark:text-slate-400" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-brand-stone-600 dark:text-slate-400" />
                  )}
                </button>
              </div>

              {expandedWound === wound.id && (
                <div className="mt-6 pt-6 border-t border-brand-stone-200/60 dark:border-slate-800/60 space-y-4 animate-fadeIn">
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
