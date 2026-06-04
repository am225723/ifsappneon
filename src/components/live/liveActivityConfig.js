export const LIVE_ACTIVITY_TYPES = {
  GUIDED_BREATHING: 'guided_breathing',
  GROUNDING_54321: 'grounding_54321',
  UNBLENDING: 'unblending',
  SELF_ENERGY_CHECK: 'self_energy_check',
  PROTECTOR_APPRECIATION: 'protector_appreciation',
  BODY_SCAN: 'body_scan',
  WINDOW_OF_TOLERANCE: 'window_of_tolerance',
  FEELINGS_WHEEL: 'feelings_wheel',
  PARTS_CHECK_IN: 'parts_check_in',
  SHARED_PARTS_MAP: 'shared_parts_map'
};

export const LIVE_ACTIVITY_DEFINITIONS = {
  [LIVE_ACTIVITY_TYPES.GUIDED_BREATHING]: {
    id: LIVE_ACTIVITY_TYPES.GUIDED_BREATHING,
    title: 'Guided Breathing',
    shortTitle: 'Breathing',
    sourcePractice: 'Breath Anchor',
    advisorDescription: 'Start a simple paced breathing practice to help the client settle attention before or between parts work.',
    clientDescription: 'Follow the breathing circle gently and let your system arrive in the present moment.',
    defaultDurationSeconds: 180,
    tone: 'grounding',
    iconName: 'Wind',
    steps: []
  },
  [LIVE_ACTIVITY_TYPES.GROUNDING_54321]: {
    id: LIVE_ACTIVITY_TYPES.GROUNDING_54321,
    title: '5-4-3-2-1 Grounding',
    shortTitle: 'Grounding',
    sourcePractice: 'Grounding practice',
    advisorDescription: 'Guide the client through a sensory orienting practice, one sense at a time.',
    clientDescription: 'Gently notice what is around you, one sense at a time.',
    defaultDurationSeconds: 240,
    tone: 'present-moment',
    iconName: 'Leaf',
    steps: [
      { title: 'Notice 5 things you can see', prompt: 'Notice 5 things you can see.', helper: 'Let your eyes move slowly around the room. You can name them silently.' },
      { title: 'Notice 4 things you can feel', prompt: 'Notice 4 things you can feel.', helper: 'This might be your feet on the floor, clothing, temperature, or the chair supporting you.' },
      { title: 'Notice 3 things you can hear', prompt: 'Notice 3 things you can hear.', helper: 'Let sounds come to you without needing to search hard.' },
      { title: 'Notice 2 things you can smell', prompt: 'Notice 2 things you can smell.', helper: 'If scent is not available, simply notice the air around you.' },
      { title: 'Notice 1 thing you can taste or appreciate', prompt: 'Notice 1 thing you can taste or appreciate.', helper: 'Let this last step be simple, kind, and present-moment focused.' }
    ]
  },
  [LIVE_ACTIVITY_TYPES.UNBLENDING]: {
    id: LIVE_ACTIVITY_TYPES.UNBLENDING,
    title: 'Unblending Practice',
    shortTitle: 'Unblending',
    sourcePractice: 'Return to Self-Energy',
    advisorDescription: 'Help the client notice a close-by part and invite a little space without pushing the part away.',
    clientDescription: 'Notice if a part is close by, and see if there is a little space around it.',
    defaultDurationSeconds: 300,
    tone: 'parts-respecting',
    iconName: 'Sparkles',
    steps: [
      { title: 'Notice the part that is most present', prompt: 'Notice the part that is most present.', helper: 'You are not trying to change it. Just notice how it shows up.' },
      { title: 'Name it with kindness', prompt: 'Gently say: “I notice a part of me is feeling this.”', helper: 'Naming the part may create a little more room around the experience.' },
      { title: 'Check for space', prompt: 'Check whether there is any space between you and the part.', helper: 'Even a tiny bit of space counts. If there is no space, simply notice that.' },
      { title: 'Invite curiosity', prompt: 'Invite curiosity toward the part.', helper: 'You might ask what it wants you to understand right now.' },
      { title: 'Notice what changes', prompt: 'Notice what changes, even slightly.', helper: 'A shift, no shift, or more awareness are all welcome.' }
    ]
  },
  [LIVE_ACTIVITY_TYPES.SELF_ENERGY_CHECK]: {
    id: LIVE_ACTIVITY_TYPES.SELF_ENERGY_CHECK,
    title: 'Self-Energy Check',
    shortTitle: 'Self-Energy',
    sourcePractice: 'Return to Self-Energy',
    advisorDescription: 'Guide a brief scan for Self-energy qualities that may already be available.',
    clientDescription: 'Gently check for the qualities of Self-energy that may be here now.',
    defaultDurationSeconds: 300,
    tone: 'Self-energy',
    iconName: 'Sun',
    steps: [
      { title: 'Curiosity', prompt: 'Notice whether any curiosity is available toward your inner system.', helper: 'Curiosity may feel like openness, interest, or willingness to listen.' },
      { title: 'Compassion', prompt: 'Notice whether any compassion is available for yourself or your parts.', helper: 'If compassion is not available, simply notice that with kindness.' },
      { title: 'Calm', prompt: 'Notice whether any calm is available.', helper: 'Even a small breath of calm counts.' },
      { title: 'Clarity', prompt: 'Notice whether any clarity is available.', helper: 'Clarity can be quiet, like seeing one next step.' },
      { title: 'Courage', prompt: 'Notice whether any courage is available.', helper: 'Courage may be the willingness to stay present gently.' },
      { title: 'Connectedness', prompt: 'Notice whether any connectedness is available.', helper: 'This might be connection to Self, a part, your body, or support around you.' },
      { title: 'Creativity', prompt: 'Notice whether any creativity is available.', helper: 'Creativity can show up as a new image, option, or way of relating.' },
      { title: 'Confidence', prompt: 'Notice whether any confidence is available.', helper: 'Let the most available quality support the next moment.' }
    ]
  },
  [LIVE_ACTIVITY_TYPES.PROTECTOR_APPRECIATION]: {
    id: LIVE_ACTIVITY_TYPES.PROTECTOR_APPRECIATION,
    title: 'Protector Appreciation',
    shortTitle: 'Protector',
    sourcePractice: 'Protector Check-In',
    advisorDescription: 'Guide the client through a gentle protector appreciation practice.',
    clientDescription: 'Notice and appreciate a protector part without asking it to change too quickly.',
    defaultDurationSeconds: 300,
    tone: 'protector-respecting',
    iconName: 'ShieldCheck',
    steps: [
      { title: 'Notice a protector part', prompt: 'Notice a protector part.', helper: 'Choose one that feels okay to acknowledge today.' },
      { title: 'Thank it for trying to help', prompt: 'Thank it for trying to help.', helper: 'You do not need to agree with every strategy to appreciate its effort.' },
      { title: 'Ask about its worry', prompt: 'Ask what it is worried would happen if it stepped back.', helper: 'Listen gently, without debating or persuading.' },
      { title: 'Offer appreciation without forcing change', prompt: 'Offer appreciation without forcing change.', helper: 'Let the part know you are not trying to get rid of it.' },
      { title: 'Notice what it needs', prompt: 'Notice what the part needs from you.', helper: 'A need may be respect, rest, reassurance, information, or more time.' }
    ]
  },
  [LIVE_ACTIVITY_TYPES.BODY_SCAN]: {
    id: LIVE_ACTIVITY_TYPES.BODY_SCAN,
    title: 'Body Scan',
    shortTitle: 'Body Scan',
    sourcePractice: 'Mini Body Scan',
    advisorDescription: 'Invite the client to notice body sensations with curiosity and gentleness.',
    clientDescription: 'Notice body sensations with curiosity and gentleness.',
    defaultDurationSeconds: 300,
    tone: 'somatic-awareness',
    iconName: 'Activity',
    steps: [
      { title: 'Arrive with the body', prompt: 'Bring awareness to the top of your head.', helper: 'Let attention be soft rather than searching.' },
      { title: 'Face, jaw, and neck', prompt: 'Scan through your face, jaw, and neck.', helper: 'Notice tension, softness, warmth, coolness, or numbness.' },
      { title: 'Shoulders, arms, and hands', prompt: 'Notice your shoulders, arms, and hands.', helper: 'Let them be exactly as they are.' },
      { title: 'Chest, heart, and belly', prompt: 'Scan through your chest, heart, and belly.', helper: 'If emotions are here, notice them as something parts may be carrying.' },
      { title: 'Hips, legs, and feet', prompt: 'Continue through hips, legs, and feet.', helper: 'Feel any contact with the chair, floor, or ground.' },
      { title: 'Whole body held', prompt: 'Feel your whole body held by the support beneath you.', helper: 'Thank your body and parts for communicating in their own way.' }
    ]
  },
  [LIVE_ACTIVITY_TYPES.WINDOW_OF_TOLERANCE]: {
    id: LIVE_ACTIVITY_TYPES.WINDOW_OF_TOLERANCE,
    title: 'Window of Tolerance Check',
    shortTitle: 'Window Check',
    sourcePractice: 'Window of Tolerance Mapping',
    advisorDescription: 'Support a non-diagnostic check of whether the system feels settled, activated, or shut down.',
    clientDescription: 'Notice whether your system feels settled, activated, or shut down.',
    defaultDurationSeconds: 300,
    tone: 'gentle-orienting',
    iconName: 'Target',
    steps: [
      { title: 'Notice your system now', prompt: 'Notice what your system feels like right now.', helper: 'This is not a test or diagnosis; it is a gentle orientation.' },
      { title: 'Settled or present', prompt: 'Notice whether any part of you feels settled or present.', helper: 'Look for any amount of steadiness, clarity, or ability to be here.' },
      { title: 'Activated', prompt: 'Notice whether any part of you feels activated.', helper: 'Activation might feel like urgency, heat, restlessness, anxiety, or anger.' },
      { title: 'Shut down or far away', prompt: 'Notice whether any part of you feels shut down or far away.', helper: 'This might feel numb, foggy, collapsed, or disconnected.' },
      { title: 'Ask what would help', prompt: 'Ask your system what would help it stay with you gently.', helper: 'It may want breath, space, grounding, movement, or reassurance.' },
      { title: 'Choose one anchor', prompt: 'Choose one small anchor for the next moment.', helper: 'A small anchor can be feeling your feet, looking around, or taking one slow breath.' }
    ]
  },
  [LIVE_ACTIVITY_TYPES.FEELINGS_WHEEL]: {
    id: LIVE_ACTIVITY_TYPES.FEELINGS_WHEEL,
    title: 'Name What’s Here',
    shortTitle: 'Emotion Naming',
    sourcePractice: 'Needs & Boundaries Reflection',
    advisorDescription: 'Guide simple emotion naming so parts can be noticed without requiring a written reflection.',
    clientDescription: 'Gently name emotions that parts may be carrying.',
    defaultDurationSeconds: 300,
    tone: 'emotion-naming',
    iconName: 'CircleDot',
    steps: [
      { title: 'Notice the strongest feeling', prompt: 'Notice the strongest feeling present right now.', helper: 'One simple word is enough.' },
      { title: 'Notice who may carry it', prompt: 'Notice which part may be carrying this feeling.', helper: 'Let the connection be gentle rather than exact.' },
      { title: 'Name a nearby feeling', prompt: 'Name another nearby feeling, if one is present.', helper: 'Feelings can be mixed. You do not have to sort them perfectly.' },
      { title: 'Ask what the feeling protects or signals', prompt: 'Ask what this feeling may be protecting, signaling, or needing.', helper: 'Listen lightly, without turning it into a worksheet.' },
      { title: 'Offer acknowledgment', prompt: 'Offer acknowledgment to the part carrying the feeling.', helper: 'You might silently say, “I hear that this matters.”' },
      { title: 'Return to Self-energy', prompt: 'Notice whether any Self-energy is available toward what is here.', helper: 'Curiosity, compassion, calm, or clarity may be enough.' }
    ]
  },
  [LIVE_ACTIVITY_TYPES.PARTS_CHECK_IN]: {
    id: LIVE_ACTIVITY_TYPES.PARTS_CHECK_IN,
    title: 'Parts Check-In',
    shortTitle: 'Parts Check-In',
    sourcePractice: 'Notice a Part in the Moment',
    advisorDescription: 'Guide a short check-in with which parts are present and what they may want known.',
    clientDescription: 'Notice which parts are present and what they may want you to know.',
    defaultDurationSeconds: 300,
    tone: 'IFS-first',
    iconName: 'UsersRound',
    steps: [
      { title: 'Pause and take one slow breath', prompt: 'Pause and take one slow breath.', helper: 'Let this be a gentle arrival.' },
      { title: 'Notice what is happening inside', prompt: 'Notice what is happening inside.', helper: 'You do not have to change anything.' },
      { title: 'Ask which part is most present', prompt: 'Ask: “Which part of me is most present right now?”', helper: 'The answer may come as a thought, sensation, image, emotion, or simple knowing.' },
      { title: 'Notice where you sense this part', prompt: 'Notice where you sense this part in or around your body.', helper: 'Stay curious and respectful, without forcing contact.' },
      { title: 'Ask what it wants you to know', prompt: 'Ask: “What does this part want me to know?”', helper: 'It is okay if the part says a lot, a little, or nothing yet.' },
      { title: 'Thank the part for showing up', prompt: 'Thank the part for showing up.', helper: 'Appreciation can be quiet and simple.' },
      { title: 'Choose one gentle next step', prompt: 'Choose one gentle next step.', helper: 'You can keep it private and simply carry it with you.' }
    ]
  },
  [LIVE_ACTIVITY_TYPES.SHARED_PARTS_MAP]: {
    id: LIVE_ACTIVITY_TYPES.SHARED_PARTS_MAP,
    title: 'Shared Parts Map',
    shortTitle: 'Parts Map',
    sourcePractice: 'My Inner System / Parts Work',
    advisorDescription: 'Map parts together during a live Advisor-guided session while keeping the client in control of what is saved.',
    clientDescription: 'Explore which parts are present and choose what, if anything, you want to save to your inner system.',
    defaultDurationSeconds: 300,
    tone: 'collaborative-inner-system-mapping',
    iconName: 'Map',
    steps: []
  }
};

export const LIVE_ACTIVITY_OPTIONS = Object.values(LIVE_ACTIVITY_DEFINITIONS);
export const LIVE_ACTIVITY_IDS = LIVE_ACTIVITY_OPTIONS.map((activity) => activity.id);
export const STEP_BASED_ACTIVITY_IDS = LIVE_ACTIVITY_OPTIONS.filter((activity) => activity.steps.length > 0).map((activity) => activity.id);

export function getLiveActivityDefinition(activityId) {
  return LIVE_ACTIVITY_DEFINITIONS[activityId] || null;
}
