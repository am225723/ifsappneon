import LifePracticeShell from './LifePracticeShell';
import { lifePracticeConfigs } from './practiceConfig';

export default function ProtectorCheckInPractice() {
  return <LifePracticeShell type="protector_check_in" config={lifePracticeConfigs.protector_check_in} />;
}
