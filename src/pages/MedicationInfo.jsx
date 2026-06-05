import { Link } from 'react-router-dom';
import { AlertTriangle, Home, Wrench } from 'lucide-react';

export default function MedicationInfo() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="soft-card p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-stone-100 text-brand-stone-600 dark:bg-slate-800 dark:text-slate-300">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-500">Medication information</p>
        <h1 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">Medication information is not available in this app right now.</h1>
        <p className="mt-3 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">
          This app does not provide medication advice, prescribing support, or medication-management guidance. Please contact your qualified healthcare professional for medication questions.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/home" className="btn-sanctuary-primary"><Home className="h-4 w-4" /> Go to Home</Link>
          <Link to="/tools" className="btn-sanctuary-secondary"><Wrench className="h-4 w-4" /> Open Tools</Link>
        </div>
      </div>
    </div>
  );
}
