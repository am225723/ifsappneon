export const AI_PROVIDER_RULES = {
  session_summary: 'openrouter',
  advisor_note: 'openrouter',
  assigned_practice: 'openrouter',
  curriculum: 'openrouter',
  life_integration: 'openrouter',
  parts_work: 'openrouter',
  educational_content: 'openrouter',
  generic_copy: 'openrouter'
};

export function getAIProviderForWorkflow(workflow) {
  return AI_PROVIDER_RULES[workflow] || 'openrouter';
}
