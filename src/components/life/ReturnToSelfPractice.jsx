import LifePracticeShell from './LifePracticeShell';
import { lifePracticeConfigs } from './practiceConfig';

export default function ReturnToSelfPractice() {
  return <LifePracticeShell type="return_to_self" config={lifePracticeConfigs.return_to_self} />;
}
