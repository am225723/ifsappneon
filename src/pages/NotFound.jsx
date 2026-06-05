import { Link } from 'react-router-dom';
import { ClipboardList, Grid3X3, Home, ShieldCheck, Sparkles } from 'lucide-react';

export default function NotFound({ currentClient }) {
  const role = currentClient?.user_role;
  const canOpenAdvisor = ['therapist', 'advisor', 'admin', 'supervisor'].includes(role);
  const canOpenAdmin = ['admin', 'supervisor'].includes(role);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center px-6 py-12">
      <div className="soft-card w-full p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/30 dark:text-brand-gold-500">
          <Grid3X3 className="h-7 w-7" />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-500">Page not found</p>
        <h1 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">We could not find that page.</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">
          You can return to your IFS path or open the Tools Directory.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/my-ifs" className="btn-sanctuary-primary"><Sparkles className="h-4 w-4" /> My IFS Work</Link>
          <Link to="/" className="btn-sanctuary-secondary"><Home className="h-4 w-4" /> Home</Link>
          <Link to="/tools" className="btn-sanctuary-secondary"><Grid3X3 className="h-4 w-4" /> Tools</Link>
          {canOpenAdvisor && <Link to="/therapist-dashboard" className="btn-sanctuary-secondary"><ClipboardList className="h-4 w-4" /> Advisor Dashboard</Link>}
          {canOpenAdmin && <Link to="/admin-hub" className="btn-sanctuary-secondary"><ShieldCheck className="h-4 w-4" /> Admin Hub</Link>}
        </div>
      </div>
    </div>
  );
}
