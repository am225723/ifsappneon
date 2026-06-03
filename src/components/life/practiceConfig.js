export const selfEnergyQualities = ['calm', 'curiosity', 'compassion', 'courage', 'clarity', 'creativity', 'confidence', 'connectedness'];

export const lifePracticeConfigs = {
  notice_part: {
    route: '/life-integration/notice-part',
    title: 'Notice a Part in the Moment',
    eyebrow: 'A 3–5 minute pause',
    description: 'Pause, notice which part is present, and choose one gentle next step.',
    icon: '🌿',
    steps: [
      'Pause and take one slow breath.',
      'Notice what is happening inside.',
      'Ask: “Which part of me is most present right now?”',
      'Notice where you sense this part in or around your body.',
      'Ask: “What does this part want me to know?”',
      'Thank the part for showing up.',
      'Choose one gentle next step.'
    ],
    fields: [
      { name: 'situation', label: 'What is happening around you?', placeholder: 'A few words about the moment, if helpful.' },
      { name: 'part_noticed', label: 'Which part feels most present?', placeholder: 'Example: the worried planner, a young scared part…' },
      { name: 'body_sensation', label: 'Where do you sense this part?', placeholder: 'Chest, throat, shoulders, around you…' },
      { name: 'emotion', label: 'Emotion', placeholder: 'Worried, tender, angry…' },
      { name: 'next_step', label: 'One gentle next step', placeholder: 'Pause before replying, drink water, step outside…' }
    ]
  },
  return_to_self: {
    route: '/life-integration/return-to-self',
    title: 'Return to Self-Energy',
    eyebrow: 'A 2–4 minute unblending practice',
    description: 'Name a blended part with kindness and invite a little space for Self-energy.',
    icon: '☀️',
    steps: [
      'Notice your current inner state.',
      'Name any blended part with kindness.',
      'Invite a little space between you and the part.',
      'Check for calm, curiosity, compassion, courage, clarity, creativity, confidence, or connectedness.',
      'Choose one Self-energy quality to practice for one minute.',
      'Notice what shifted.'
    ],
    fields: [
      { name: 'part_noticed', label: 'What blended part did you notice?', placeholder: 'Example: a rushing part, a judging part…' },
      { name: 'self_energy_response', label: 'Self-energy response to practice', type: 'select', options: selfEnergyQualities },
      { name: 'body_sensation', label: 'What shifted, even a little?', placeholder: 'Breath, posture, warmth, more room inside…' },
      { name: 'next_step', label: 'One kind next step', placeholder: 'Move slowly, listen, wait, ask for space…' }
    ]
  },
  trigger_reflection: {
    route: '/life-integration/trigger-reflection',
    title: 'Reflect on a Trigger',
    eyebrow: 'A 5–8 minute trailhead reflection',
    description: 'Explore what happened without reliving it, and notice what parts may need.',
    icon: '🪶',
    steps: [
      'Name the trigger gently, without reliving it.',
      'Notice which part reacted first.',
      'Ask what that part was trying to protect.',
      'Notice if another part has a different feeling.',
      'Ask what each part may need.',
      'Choose one grounded response for next time.'
    ],
    fields: [
      { name: 'situation', label: 'Name the trigger lightly', placeholder: 'Just enough detail to orient yourself.' },
      { name: 'part_noticed', label: 'Which part reacted first?', placeholder: 'A protector, exile, firefighter, manager…' },
      { name: 'emotion', label: 'Emotion', placeholder: 'Hurt, guarded, afraid…' },
      { name: 'need_or_message', label: 'Need or message this part may have', placeholder: 'Space, reassurance, clarity…' },
      { name: 'next_step', label: 'Grounded response for next time', placeholder: 'Take a breath, name a boundary, ask a clarifying question…' }
    ]
  },
  repair_after_conflict: {
    route: '/life-integration/repair-after-conflict',
    title: 'Repair After Conflict',
    eyebrow: 'A 5–8 minute repair practice',
    description: 'Understand activated parts and choose one repair, boundary, or honest communication.',
    icon: '🕊️',
    steps: [
      'Recall the conflict lightly, from a little distance.',
      'Notice which parts were activated.',
      'Ask what each part was protecting.',
      'Notice what Self-energy might bring now.',
      'Identify one repair, boundary, or honest communication.',
      'Choose a next step that feels grounded.'
    ],
    fields: [
      { name: 'situation', label: 'What conflict are you reflecting on?', placeholder: 'A light description is enough.' },
      { name: 'part_noticed', label: 'Which parts were activated?', placeholder: 'Example: a defending protector and a hurt younger part…' },
      { name: 'self_energy_response', label: 'What Self-energy might help now?', type: 'select', options: selfEnergyQualities },
      { name: 'need_or_message', label: 'Repair, need, or boundary', placeholder: 'Repair, apology, space, honesty…' },
      { name: 'next_step', label: 'Grounded next step', placeholder: 'Send a repair message, wait until calmer, name a boundary…' }
    ]
  },
  protector_check_in: {
    route: '/life-integration/protector-check-in',
    title: 'Protector Check-In',
    eyebrow: 'A 4–6 minute appreciation practice',
    description: 'Meet a protector with respect and ask what it needs from you today.',
    icon: '🛡️',
    steps: [
      'Bring to mind a protector part.',
      'Notice how it tries to help.',
      'Ask what it fears would happen if it relaxed.',
      'Appreciate its effort.',
      'Ask what it needs from you today.',
      'Offer one small act of respect or reassurance.'
    ],
    fields: [
      { name: 'part_noticed', label: 'Protector name or description', placeholder: 'The fixer, the guard, the planner…' },
      { name: 'situation', label: 'How does it try to help?', placeholder: 'Planning, scanning, pleasing, shutting down…' },
      { name: 'body_sensation', label: 'What fear or concern does it carry?', placeholder: 'What it worries would happen if it relaxed.' },
      { name: 'need_or_message', label: 'What does it need today?', placeholder: 'Respect, rest, reassurance…' },
      { name: 'next_step', label: 'One small act of respect', placeholder: 'Thank it, set a timer, make a plan, slow down…' }
    ]
  },
  needs_boundaries: {
    route: '/life-integration/needs-boundaries',
    title: 'Needs & Boundaries Reflection',
    eyebrow: 'A 4–6 minute clarity practice',
    description: 'Listen for the need beneath tension and choose a kind, clear next step.',
    icon: '🌙',
    steps: [
      'Notice a moment where something felt tense or unclear.',
      'Ask which part had a need.',
      'Name the need if possible.',
      'Ask whether a boundary, request, or rest is needed.',
      'Choose one kind and clear next step.',
      'Thank the part for communicating.'
    ],
    fields: [
      { name: 'situation', label: 'What moment felt tense or unclear?', placeholder: 'A light description is enough.' },
      { name: 'part_noticed', label: 'Which part had a need?', placeholder: 'A tired part, a younger part, a protector…' },
      { name: 'need_or_message', label: 'Need or message', placeholder: 'Rest, honesty, space, support…' },
      { name: 'body_sensation', label: 'Boundary, request, or rest?', placeholder: 'What might help this need be honored?' },
      { name: 'next_step', label: 'Kind and clear next step', placeholder: 'Ask for support, pause, say no, make room for rest…' }
    ]
  }
};

export const practiceCards = Object.entries(lifePracticeConfigs).map(([type, config]) => ({ type, ...config }));
