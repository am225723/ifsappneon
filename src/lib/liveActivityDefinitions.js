export const LIVE_ACTIVITY_DEFINITIONS = {
  guided_breathing: {
    id: 'guided_breathing',
    title: 'Guided Breathing',
    shortTitle: 'Breathing',
    description: 'A paced breathing practice for settling attention and returning to the present moment.',
    tone: 'grounding',
    estimatedMinutes: 3,
    steps: []
  },
  grounding_54321: {
    id: 'grounding_54321',
    title: '5-4-3-2-1 Grounding',
    shortTitle: 'Grounding',
    description: 'A sensory grounding practice for returning to the present moment.',
    tone: 'grounding',
    estimatedMinutes: 4,
    steps: [
      { title: 'Notice 5 things you can see', prompt: 'Look around and gently name five things you can see.', helper: 'Let your eyes move slowly. There is no need to rush.' },
      { title: 'Notice 4 things you can feel', prompt: 'Notice four things you can feel or touch right now.', helper: 'This might be your feet on the floor, clothing on skin, or the chair supporting you.' },
      { title: 'Notice 3 things you can hear', prompt: 'Listen for three sounds around you.', helper: 'Let sounds come to you without needing to search hard.' },
      { title: 'Notice 2 things you can smell', prompt: 'Notice two scents, or simply notice the air around you.', helper: 'If scent is not available, you can name two neutral details in the room.' },
      { title: 'Notice 1 thing you can taste or one slow breath', prompt: 'Notice one taste, or take one slow, steady breath.', helper: 'Let this be simple and present-moment focused.' },
      { title: 'Notice your body in the room', prompt: 'Notice your body here in this room, supported in this moment.', helper: 'Orient to the space around you and let yourself arrive.' }
    ]
  },
  parts_check_in: {
    id: 'parts_check_in',
    title: 'Parts Check-In',
    shortTitle: 'Parts Check-In',
    description: 'A gentle IFS check-in with what is present in the inner system.',
    tone: 'IFS-first',
    estimatedMinutes: 5,
    steps: [
      { title: 'Pause and notice what is present inside', prompt: 'Take a pause and notice what is present inside.', helper: 'You do not have to change anything. Just notice.' },
      { title: 'Ask which part is most active', prompt: 'Gently ask, “Which part of me is most active right now?”', helper: 'Let the answer come as a sensation, image, feeling, thought, or simple knowing.' },
      { title: 'Notice where you sense this part', prompt: 'Notice where you sense this part in or around your body.', helper: 'Stay curious and respectful, without forcing contact.' },
      { title: 'Ask what this part wants you to know', prompt: 'Ask what this part wants you to know.', helper: 'It is okay if the part says a lot, a little, or nothing yet.' },
      { title: 'Thank the part for showing up', prompt: 'Thank the part for showing up in whatever way it did.', helper: 'Appreciation can be quiet and simple.' },
      { title: 'Notice Self-energy', prompt: 'Notice whether more Self-energy is available now.', helper: 'Look for any amount of calm, curiosity, compassion, clarity, or steadiness.' }
    ]
  },
  self_energy_check: {
    id: 'self_energy_check',
    title: 'Self-Energy Check',
    shortTitle: 'Self-Energy',
    description: 'A strengths-based scan for Self-energy qualities that may be available now.',
    tone: 'Self-energy',
    estimatedMinutes: 4,
    steps: [
      { title: 'Notice your inner state', prompt: 'Take a slow breath and notice your inner state.', helper: 'There is no right answer; this is a check-in, not a test.' },
      { title: 'Check for calm', prompt: 'Check whether any calm is available.', helper: 'Even a small amount counts.' },
      { title: 'Check for curiosity', prompt: 'Check whether curiosity is available toward your inner system.', helper: 'Curiosity may feel like openness, interest, or a willingness to listen.' },
      { title: 'Check for compassion', prompt: 'Check whether compassion is available for yourself or your parts.', helper: 'If compassion is not available, simply notice that with kindness.' },
      { title: 'Check for clarity or courage', prompt: 'Check whether clarity or courage is available.', helper: 'These qualities can show up quietly, as a small next step.' },
      { title: 'Notice what is most available', prompt: 'Notice which Self-energy quality feels most available right now.', helper: 'Let that quality support the next moment.' }
    ]
  },
  unblending_practice: {
    id: 'unblending_practice',
    title: 'Unblending Practice',
    shortTitle: 'Unblending',
    description: 'A non-coercive practice for noticing a blended part and inviting space.',
    tone: 'parts-respecting',
    estimatedMinutes: 5,
    steps: [
      { title: 'Notice the blended part', prompt: 'Notice the part that feels most blended with you.', helper: 'You are not trying to push it away; you are simply noticing.' },
      { title: 'Name that it is here', prompt: 'Gently say, “I notice this part is here.”', helper: 'Naming can help create a little more room around the experience.' },
      { title: 'Ask for a little space', prompt: 'Ask the part if it can give you a little space.', helper: 'The part gets to choose. Any answer is welcome.' },
      { title: 'Notice what changes', prompt: 'Notice what changes in your body or attention.', helper: 'Look for subtle shifts, no shift, or a clearer sense of the part.' },
      { title: 'Thank the part', prompt: 'Thank the part whether or not it moved back.', helper: 'Respect helps the inner system feel safer.' },
      { title: 'Return to the present moment', prompt: 'Return to the present moment and orient to the room.', helper: 'Feel the support underneath you and let your attention settle.' }
    ]
  },
  protector_appreciation: {
    id: 'protector_appreciation',
    title: 'Protector Appreciation',
    shortTitle: 'Protector',
    description: 'A respectful practice for acknowledging a protector part without asking it to change.',
    tone: 'protector-respecting',
    estimatedMinutes: 5,
    steps: [
      { title: 'Bring to mind a protector part', prompt: 'Bring to mind a protector part that has been working hard.', helper: 'Choose a part that feels okay to notice today.' },
      { title: 'Notice what it protects', prompt: 'Notice what it has been trying to prevent or protect.', helper: 'Protector parts often carry important concerns.' },
      { title: 'Acknowledge its effort', prompt: 'Acknowledge how hard this protector has worked.', helper: 'You do not need to agree with every strategy to appreciate its effort.' },
      { title: 'Ask what it fears', prompt: 'Ask what it fears would happen if it relaxed.', helper: 'Listen gently, without debating or persuading.' },
      { title: 'Offer appreciation', prompt: 'Offer appreciation without asking it to change.', helper: 'This is not forced unburdening; it is respectful contact.' },
      { title: 'Notice the response', prompt: 'Notice how the protector responds.', helper: 'Any response, including no response, is useful information.' }
    ]
  },
  feelings_needs_check: {
    id: 'feelings_needs_check',
    title: 'Feelings & Needs Check',
    shortTitle: 'Feelings & Needs',
    description: 'A life-integration practice for noticing feelings, parts, needs, and one supportive action.',
    tone: 'life-integration',
    estimatedMinutes: 5,
    steps: [
      { title: 'Name the strongest feeling', prompt: 'Name the strongest feeling present right now.', helper: 'Use simple language. One word is enough.' },
      { title: 'Notice the part carrying it', prompt: 'Notice which part may be carrying this feeling.', helper: 'Let the connection be gentle rather than exact.' },
      { title: 'Ask what it needs', prompt: 'Ask what this part needs right now.', helper: 'Needs can be practical, emotional, relational, or energetic.' },
      { title: 'Consider common needs', prompt: 'Notice whether the need is for safety, rest, connection, clarity, or space.', helper: 'You can also notice a different need if one comes forward.' },
      { title: 'Choose one supportive action', prompt: 'Choose one small supportive action.', helper: 'Small and doable is more important than perfect.' },
      { title: 'Thank the part', prompt: 'Thank the part for communicating.', helper: 'Let it know you heard something important.' }
    ]
  },
  repair_after_conflict: {
    id: 'repair_after_conflict',
    title: 'Repair After Conflict Reflection',
    shortTitle: 'Repair Reflection',
    description: 'A compassionate reflection for noticing activated parts and choosing a grounded repair or boundary.',
    tone: 'relational-repair',
    estimatedMinutes: 6,
    steps: [
      { title: 'Recall the conflict gently', prompt: 'Recall the conflict gently, without reliving it.', helper: 'Stay oriented to the present moment as you remember.' },
      { title: 'Notice activated parts', prompt: 'Notice which parts became activated.', helper: 'There may be protectors, hurt parts, or parts that wanted to act quickly.' },
      { title: 'Ask what each part protected', prompt: 'Ask what each part was trying to protect.', helper: 'This supports accountability without shaming your inner system.' },
      { title: 'Notice Self-energy now', prompt: 'Notice what Self-energy might bring now.', helper: 'Look for calm, clarity, compassion, courage, or steadiness.' },
      { title: 'Identify repair or boundary', prompt: 'Identify one possible repair or boundary.', helper: 'A grounded response can include apology, clarification, space, or a clear limit.' },
      { title: 'Choose one next step', prompt: 'Choose one next step that feels grounded.', helper: 'Keep it specific enough to support IFS in daily life.' }
    ]
  }
};

export const LIVE_ACTIVITY_OPTIONS = Object.values(LIVE_ACTIVITY_DEFINITIONS);
export const STEP_BASED_ACTIVITY_IDS = LIVE_ACTIVITY_OPTIONS.filter((activity) => activity.steps.length > 0).map((activity) => activity.id);

export function getLiveActivityDefinition(activityId) {
  return LIVE_ACTIVITY_DEFINITIONS[activityId] || null;
}
