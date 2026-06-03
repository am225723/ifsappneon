import LifePracticeShell from './LifePracticeShell';
import { lifePracticeConfigs } from './practiceConfig';

export default function RepairAfterConflictPractice() {
  return <LifePracticeShell type="repair_after_conflict" config={lifePracticeConfigs.repair_after_conflict} />;
}
