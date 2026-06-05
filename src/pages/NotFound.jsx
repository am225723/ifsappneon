import { Link } from 'react-router-dom';
import { ClipboardList, Home, ShieldCheck, Sparkles, Wrench } from 'lucide-react';

export default function NotFound({ canAccessAdvisor = false, canAccessAdmin = false }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-6 py-12">
      <section className="soft-card w-full p-6 text-center sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-emerald-50 text-brand-emerald-700 dark:bg-brand-emerald-950/30 dark:text-brand-emerald-100">
          <CompassIcon />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-emerald-700 dark:text-brand-emerald-100">Route recovery</p>
        <h1 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">We could not find that page.</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">
          You can return to your IFS path or open the Tools Directory.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/my-ifs" className="btn-sanctuary-primary"><Sparkles className="h-4 w-4" /> My IFS Work</Link>
          <Link to="/" className="btn-sanctuary-secondary"><Home className="h-4 w-4" /> Home</Link>
          <Link to="/tools" className="btn-sanctuary-secondary"><Wrench className="h-4 w-4" /> Tools</Link>
          {canAccessAdvisor && <Link to="/therapist-dashboard" className="btn-sanctuary-secondary"><ClipboardList className="h-4 w-4" /> Advisor Dashboard</Link>}
          {canAccessAdmin && <Link to="/admin-hub" className="btn-sanctuary-secondary"><ShieldCheck className="h-4 w-4" /> Admin Hub</Link>}
        </div>
      </section>
    </main>
  );
}

function CompassIcon() {
  return <Wrench className="h-7 w-7" />;
}
