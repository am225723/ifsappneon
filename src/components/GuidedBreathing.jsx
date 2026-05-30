import { useEffect, useState } from 'react';

const phases = [
  { label: 'Inhale', seconds: 4, scale: 'scale-125' },
  { label: 'Hold', seconds: 4, scale: 'scale-125' },
  { label: 'Exhale', seconds: 6, scale: 'scale-90' }
];

export default function GuidedBreathing({ onClose }) {
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(phases[0].seconds);
  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(prev => {
        if (prev > 1) return prev - 1;
        setIndex(current => {
          const next = (current + 1) % phases.length;
          setRemaining(phases[next].seconds);
          return next;
        });
        return phases[(index + 1) % phases.length].seconds;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [index]);
  const phase = phases[index];
  return <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center"><div className="rounded-3xl bg-white p-8 text-center shadow-2xl max-w-sm w-full mx-4"><div className={`mx-auto mb-6 h-40 w-40 rounded-full bg-gradient-to-br from-blue-300 to-amber-300 transition-transform duration-1000 ${phase.scale}`} /><h2 className="text-2xl font-bold text-gray-900">{phase.label}</h2><p className="text-5xl font-bold text-amber-600 my-3">{remaining}</p><p className="text-sm text-gray-500 mb-5">Therapist-started grounding exercise</p><button onClick={onClose} className="rounded-lg bg-gray-900 px-4 py-2 text-white">Close</button></div></div>;
}
