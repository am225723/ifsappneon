import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardCheck, Link2, ShieldCheck } from 'lucide-react';
import Home from './Home';
import { loadMyIFSProfile } from '../lib/myIFSProfile';

const adminRoles = new Set(['therapist', 'advisor', 'admin', 'supervisor']);

export default function MyIFSWork({ currentClient }) {
  const [state, setState] = useState({ loading: true, result: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState({ loading: true, result: null, error: '' });
      try {
        const result = await loadMyIFSProfile(currentClient);
        if (!cancelled) setState({ loading: false, result, error: '' });
      } catch (error) {
        console.error('Error resolving My IFS profile:', error);
        if (!cancelled) setState({ loading: false, result: null, error: error.message || 'Unable to resolve your personal IFS workspace.' });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [currentClient?.id, currentClient?.clerk_user_id]);

  if (state.loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="soft-card p-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-brand-gold-600" />
          <p className="text-sm text-brand-stone-600 dark:text-slate-400">Opening your personal IFS workspace…</p>
        </div>
      </div>
    );
  }

  const result = state.result;
  const profile = result?.profile;

  if (state.error || !profile?.id) {
    const isAdminModeUser = adminRoles.has(currentClient?.user_role);
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="soft-card p-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/30 dark:text-brand-gold-500">
            <Link2 className="h-7 w-7" />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-500">My IFS Work</p>
          <h1 className="text-3xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">Your personal IFS workspace is not connected yet.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-stone-600 dark:text-slate-400">
            We could not find an IFS client profile safely linked to your current Clerk account. We only use the authenticated user’s own Clerk-linked IFS record for this area, so no other client’s results are shown here.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/curriculum" className="btn-sanctuary-primary"><BookOpen className="h-4 w-4" /> Start Curriculum</Link>
            <Link to="/assessments" className="btn-sanctuary-secondary"><ClipboardCheck className="h-4 w-4" /> Take Assessment</Link>
            {isAdminModeUser && <Link to="/settings" className="btn-sanctuary-secondary"><ShieldCheck className="h-4 w-4" /> Connect My IFS Profile</Link>}
          </div>
          {isAdminModeUser && (
            <p className="mt-5 rounded-2xl bg-brand-stone-100 px-4 py-3 text-xs text-brand-stone-600 dark:bg-slate-900/50 dark:text-slate-400">
              Admin/advisor note: if your self-work data is stored in a separate client row, manually verify the correct row and link it by Clerk user ID or verified email before using this workspace. Name-only matching is intentionally not used.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (import.meta.env.DEV) {
    console.info('[MyIFSWork] resolved self profile', {
      mode: 'my-ifs',
      resolvedSelfProfileId: profile.id,
      effectiveClientId: profile.id,
      formalWoundCount: result?.counts?.formalWoundCount || 0,
      interactiveDataCount: result?.counts?.interactiveDataCount || 0,
      interactiveAssessmentCount: result?.counts?.interactiveAssessmentCount || 0,
      interactiveModuleCount: result?.counts?.interactiveModuleCount || 0,
      curriculumProgressCount: result?.counts?.curriculumProgressCount || 0,
      legacyPartsMapFound: Boolean(result?.counts?.legacyPartsMapFound),
      legacyPartsCount: result?.counts?.legacyPartsCount || 0,
      persistentPartsCount: result?.counts?.persistentPartsCount || 0
    });
  }

  return <Home clientId={profile.id} client={profile} mode="my-ifs" selfProfile={profile} selfProfileResult={result} />;
}
