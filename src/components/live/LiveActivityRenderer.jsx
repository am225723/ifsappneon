import GuidedBreathingLive from '../GuidedBreathingLive';
import { STEP_BASED_ACTIVITY_IDS } from '../../lib/liveActivityDefinitions';
import StepBasedLivePractice from './StepBasedLivePractice';
import SharedPartsMapLive from './SharedPartsMapLive';

export default function LiveActivityRenderer({ currentActivity, activityState = {}, sessionStatus = 'active', compact = false, sessionId, role = 'client', onSessionUpdate }) {
  if (currentActivity === 'shared_parts_map') {
    return <SharedPartsMapLive sessionId={sessionId} activityState={activityState} role={role} onSessionUpdate={onSessionUpdate} />;
  }

  if (currentActivity === 'guided_breathing') {
    return <GuidedBreathingLive activityState={activityState} sessionStatus={sessionStatus} compact={compact} />;
  }

  if (STEP_BASED_ACTIVITY_IDS.includes(currentActivity)) {
    return <StepBasedLivePractice activityId={currentActivity} activityState={activityState} sessionStatus={sessionStatus} compact={compact} />;
  }

  return null;
}
