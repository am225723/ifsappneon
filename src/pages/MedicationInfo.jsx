import { Link } from 'react-router-dom';
import { HeartPulse, Home, Sparkles } from 'lucide-react';

export default function MedicationInfo() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center px-6 py-12">
      <div className="soft-card w-full p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-stone-100 text-brand-stone-600 dark:bg-slate-800 dark:text-slate-200">
          <HeartPulse className="h-7 w-7" />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-500">Medication</p>
        <h1 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">Medication information is not available in this app right now.</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">
          Return to your IFS path for curriculum, assessments, reflections, and tools.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/my-ifs" className="btn-sanctuary-primary"><Sparkles className="h-4 w-4" /> My IFS Work</Link>
          <Link to="/" className="btn-sanctuary-secondary"><Home className="h-4 w-4" /> Home</Link>
        </div>
      </div>
    </div>
  );
}
