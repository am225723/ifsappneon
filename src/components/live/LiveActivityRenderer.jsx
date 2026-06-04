import GuidedBreathingLive from '../GuidedBreathingLive';
import { STEP_BASED_ACTIVITY_IDS } from './liveActivityConfig';
import LiveGuidedActivity from './LiveGuidedActivity';
import SharedPartsMapLive from './SharedPartsMapLive';

export default function LiveActivityRenderer({ currentActivity, activityState = {}, sessionStatus = 'active', compact = false, sessionId, role = 'client', onSessionUpdate }) {
  if (currentActivity === 'shared_parts_map') {
    return <SharedPartsMapLive sessionId={sessionId} activityState={activityState} role={role} onSessionUpdate={onSessionUpdate} />;
  }

  if (currentActivity === 'guided_breathing') {
    return <GuidedBreathingLive activityState={activityState} sessionStatus={sessionStatus} compact={compact} />;
  }

  if (STEP_BASED_ACTIVITY_IDS.includes(currentActivity)) {
    return <LiveGuidedActivity activityId={currentActivity} activityState={activityState} sessionStatus={sessionStatus} compact={compact} />;
  }

  return (
    <div className="rounded-3xl border border-dashed border-brand-stone-200 dark:border-slate-700 p-8 text-center">
      <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Guided practice unavailable</h2>
      <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">Your Advisor may need to end this practice and start a supported live guided practice.</p>
    </div>
  );
}
