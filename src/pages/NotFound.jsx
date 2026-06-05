import { Link } from 'react-router-dom';
import { Compass, Home, ShieldCheck, Sparkles, Wrench } from 'lucide-react';

export default function NotFound({ canAccessAdvisor = false, canAccessAdmin = false }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="soft-card p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/30 dark:text-brand-gold-500">
          <Compass className="h-7 w-7" />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-500">Page not found</p>
        <h1 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">We could not find that page.</h1>
        <p className="mt-3 text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">
          We could not find that page. You can return to your IFS path or open the Tools Directory.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/my-ifs" replace className="btn-sanctuary-primary"><Sparkles className="h-4 w-4" /> My IFS Work</Link>
          <Link to="/home" replace className="btn-sanctuary-secondary"><Home className="h-4 w-4" /> Home</Link>
          <Link to="/tools" replace className="btn-sanctuary-secondary"><Wrench className="h-4 w-4" /> Tools</Link>
          {canAccessAdvisor && <Link to="/therapist-dashboard" replace className="btn-sanctuary-secondary"><ShieldCheck className="h-4 w-4" /> Advisor Dashboard</Link>}
          {canAccessAdmin && <Link to="/admin-hub" replace className="btn-sanctuary-secondary"><ShieldCheck className="h-4 w-4" /> Admin Hub</Link>}
        </div>
      </div>
    </div>
  );
}
