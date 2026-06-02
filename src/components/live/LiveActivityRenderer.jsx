import GuidedBreathingLive from '../GuidedBreathingLive';
import { STEP_BASED_ACTIVITY_IDS } from '../../lib/liveActivityDefinitions';
import StepBasedLivePractice from './StepBasedLivePractice';

export default function LiveActivityRenderer({ currentActivity, activityState = {}, sessionStatus = 'active', compact = false }) {
  if (currentActivity === 'guided_breathing') {
    return <GuidedBreathingLive activityState={activityState} sessionStatus={sessionStatus} compact={compact} />;
  }

  if (STEP_BASED_ACTIVITY_IDS.includes(currentActivity)) {
    return <StepBasedLivePractice activityId={currentActivity} activityState={activityState} sessionStatus={sessionStatus} compact={compact} />;
  }

  return null;
}
