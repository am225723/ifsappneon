import TreatmentPlanManager from './TreatmentPlanManager';

export default function TreatmentPlanBuilder({ clientId }) {
  return <TreatmentPlanManager initialClientId={clientId} />;
}
