import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardCheck, ShieldCheck } from 'lucide-react';
import Home from './Home';
import { loadMyIFSProfile } from '../lib/myIFSProfile';
import PageHero, { heroPrimaryButtonClass, heroSecondaryButtonClass } from '../components/PageHero';

const MY_IFS_WORK_HERO_IMAGE = '/images/dashboard/hero-sunrise.jpg';

const adminRoles = new Set(['therapist', 'advisor', 'admin', 'supervisor']);

export default function MyIFSWork({ currentClient }) {
  const [state, setState] = useState({ loading: true, result: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState({ loading: true, result: null, error: '' });
      try {
        const result = await loadMyIFSProfile(currentClient);
        if (import.meta.env.DEV && result?.optionalQueryFailures?.length) {
          console.warn('[MyIFSWork] self profile query failures', result.optionalQueryFailures.map((item) => ({
            table: item.table,
            status: item.status,
            effectiveClientId: item.effectiveClientId,
            selfProfilePresent: Boolean(result?.profile?.id)
          })));
        }
        if (!cancelled) setState({ loading: false, result, error: '' });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[MyIFSWork] profile resolution failed', { message: error?.message || 'Unable to resolve profile' });
        }
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
          <p className="text-sm text-brand-stone-600 dark:text-slate-400">Loading your IFS path…</p>
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
        <PageHero
          image={MY_IFS_WORK_HERO_IMAGE}
          eyebrow="My IFS Work"
          title="Your personal IFS path is not connected yet."
          subtitle="Your personal IFS profile could not be connected right now. Please refresh or try again. If this is a new profile, start with the curriculum or an assessment to begin your IFS path."
          actions={(
            <>
              <Link to="/curriculum" className={heroPrimaryButtonClass}><BookOpen className="h-4 w-4" /> Start Curriculum</Link>
              <Link to="/assessments" className={heroSecondaryButtonClass}><ClipboardCheck className="h-4 w-4" /> Take Assessment</Link>
              {isAdminModeUser && <Link to="/settings" className={heroSecondaryButtonClass}><ShieldCheck className="h-4 w-4" /> Connect My IFS Profile</Link>}
            </>
          )}
        />
        {isAdminModeUser && (
          <p className="rounded-2xl bg-brand-stone-100 px-4 py-3 text-xs text-brand-stone-600 dark:bg-slate-900/50 dark:text-slate-400">
            Advisor/Admin note: if your personal self-work lives in a separate profile, verify the correct profile connection before using this workspace. Name-only matching is intentionally not used.
          </p>
        )}
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
