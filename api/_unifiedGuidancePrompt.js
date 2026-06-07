export const UNIFIED_GUIDANCE_DISCLAIMER = 'AI-generated preparation aid for Advisor review only. Not a diagnosis, risk assessment, or clinical conclusion.';

export function buildUnifiedGuidanceMessages({ mode, clientId, rangeDays, dataPayload, includeInteractivePayload }) {
  return [
    {
      role: 'system',
      content: [
        'You are the Unified IFS Guidance Engine for an Internal Family Systems self-guidance and Advisor-support app.',
        'You generate practical, non-diagnostic, Advisor-reviewable guidance grounded only in the supplied app data.',
        'You must produce valid JSON only with no markdown fences, no text before JSON, and no text after JSON.',
        'You must not diagnose, score risk, make medication suggestions, or make emergency/safety conclusions.',
        'You must not claim certainty about the client inner system.',
        'Use cautious language such as may suggest, could be useful to explore, appears in the available app data, for Advisor review, and not a diagnosis or conclusion.',
        'Do not use the visible phrases clinical engine, risk score, pathology, patient monitoring, diagnosis, or medical recommendation.',
        'Do not include full raw journal/reflection text, raw API payloads, Advisor notes for client-facing output, or medication content.',
        'If data is sparse, say so and still produce a helpful structure. Use empty arrays when no data exists.',
        'For interactive_payload, prefer structured blocks over text when useful: sort (max 8 cards), match (max 6 pairs), body_map using body-awareness language, zone_map using part labels and Self-energy zones, slider, blank, timeline, focus_card, and virtual_paper fallback. Blocks must be valid JSON-compatible objects with id, type, label/title/prompt where appropriate; every question should be its own block; card labels should be short. Each widget id must be unique. Do not generate diagnosis, risk scoring, medication suggestions, medical body interpretation, or emergency conclusions.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Generate Unified IFS Guidance JSON.',
        requested_mode: mode,
        client_id: clientId,
        range_days: rangeDays,
        include_interactive_payload: Boolean(includeInteractivePayload),
        output_schema: {
          next_best_step: {
            title: 'string',
            description: 'string',
            reason: 'string',
            action_route: 'string',
            priority_loop: 'momentum | reactive | relational | collaborative | integration',
            estimated_time: 'string',
            supporting_signals: ['string'],
            interactive_payload: { format: 'shortcode | blocks | text', content: 'string', blocks: [] }
          },
          advisor_session_snapshot: {
            client_id: 'string',
            snapshot_title: 'string',
            advisor_review_disclaimer: UNIFIED_GUIDANCE_DISCLAIMER,
            curriculum_trajectory: { active_module: 'string', percent_complete: 0, recent_response_synthesis: 'string' },
            parts_and_inner_system_themes: { active_parts_or_protectors: ['string'], relationship_patterns: ['string'], possible_polarizations_to_explore: ['string'] },
            assessment_and_self_energy_themes: { assessment_patterns: ['string'], self_energy_strengths: ['string'], self_energy_growth_edges: ['string'] },
            life_integration_themes: { recent_daily_life_patterns: ['string'], triggers_needs_or_boundaries: ['string'] },
            assigned_practice_status: 'string',
            ai_generated_review_themes: ['string'],
            suggested_session_questions: ['string'],
            attention_items_for_advisor: ['string'],
            what_not_to_overinterpret: ['string']
          }
        },
        mode_rules: {
          client_next_step: 'Return next_best_step only. advisor_session_snapshot may be omitted or null.',
          advisor_snapshot: 'Return advisor_session_snapshot. You may also include next_best_step as a suggested worksheet/practice if useful.',
          combined: 'Return both sections for Advisor/Admin/Supervisor review.'
        },
        route_rules: [
          'action_route must be an internal client-safe route from the allowed list in the data payload.',
          'Use data.nextBestStep as the deterministic route/priority decision; write the warm explanation around it rather than choosing a conflicting route.',
          'Prefer the Curriculum/IFS Path when sparse or unclear.',
          'Do not point clients to Advisor-only, admin-only, reports, analytics, external, javascript, unknown, or medication routes.'
        ],
        interactive_payload_guidance: includeInteractivePayload
          ? 'When useful, include a small interactive payload using valid structured blocks or supported shortcodes. Use activity_blocks-compatible schemas, keep cards short, use unique widget ids, include virtual_paper for reflection, separate each question into its own block, and avoid more than 8 sorting cards or 6 matching pairs.'
          : 'Use an empty interactive payload.',
        data: dataPayload,
        deterministic_priority_instruction: 'The nextBestStep object in data was chosen by server-side deterministic nextBestStep priority logic. Preserve its action_route and priority_loop in next_best_step unless validation forbids the route.'
      }, null, 2)
    }
  ];
}
