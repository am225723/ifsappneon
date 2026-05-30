const WOUND_CHILD_NAMES = {
  abandonment: 'Lonely Child',
  shame: 'Unworthy Child',
  neglect: 'Lost Child',
  betrayal: 'Terrified Child',
  helplessness: 'Powerless Child'
};

const WOUND_BURDEN_DESCRIPTIONS = {
  abandonment: 'the fear that you will always be left, that love is temporary, and that there is something about you that makes people leave',
  shame: 'the belief that you are fundamentally flawed, broken, or "not enough" — a biological record of a time when you lacked the resources to process overwhelming experiences',
  neglect: 'the quiet ache of being unseen, unheard, and unimportant — the deep belief that your needs do not matter and that asking for attention is selfish',
  betrayal: 'the wound of violated trust — the devastating discovery that the people who were supposed to protect you became the source of danger',
  helplessness: 'the learned belief that nothing you do makes a difference, that effort is futile, and that you have no power to change your circumstances'
};

const MANAGER_WOUND_STRATEGIES = {
  abandonment: {
    'The Perfectionist': 'believes that if you are perfect enough, no one will have a reason to leave',
    'The Controller': 'tries to manage every variable in relationships to prevent abandonment',
    'The Inner Critic': 'uses harshness to motivate you to be "better" so people will stay',
    'The People Pleaser': 'works tirelessly to make you indispensable to others, hoping they will need you too much to leave',
    'The Planner': 'constantly anticipates and prepares for potential rejection or loss',
    'The Worrier': 'stays hypervigilant about signs that someone might be pulling away'
  },
  shame: {
    'The Perfectionist': 'believes that if everything is flawless, you can preemptively avoid the sting of being "found out" as unworthy',
    'The Controller': 'manages every detail to prevent mistakes that might expose your perceived defectiveness',
    'The Inner Critic': 'uses harshness and self-judgment as a shield — criticizing you first so it won\'t hurt as much when others do',
    'The People Pleaser': 'works tirelessly to secure external validation, hoping that if others approve of you, the shame will finally quiet',
    'The Planner': 'meticulously prepares so you never appear incompetent or inadequate',
    'The Worrier': 'scans constantly for signs that others are judging or seeing through your mask'
  },
  neglect: {
    'The Perfectionist': 'tries to earn attention and visibility through exceptional performance',
    'The Controller': 'manages everything alone because expecting help feels pointless',
    'The Inner Critic': 'minimizes your needs by saying "you\'re fine" or "stop being so needy"',
    'The People Pleaser': 'takes care of everyone else\'s needs hoping someone will finally notice yours',
    'The Planner': 'organizes everything independently because relying on others leads to disappointment',
    'The Worrier': 'anxiously monitors whether you are being too much or asking for too little'
  },
  betrayal: {
    'The Perfectionist': 'maintains rigid standards so no one can find fault with you or use imperfection against you',
    'The Controller': 'needs to control every situation because trust feels impossible — if you are in charge, no one can betray you',
    'The Inner Critic': 'prosecutes everyone including yourself, looking for signs of deception before it can happen again',
    'The People Pleaser': 'stays agreeable to avoid conflict that might reveal someone\'s true, dangerous nature',
    'The Planner': 'always has an exit strategy and backup plan in case things go wrong',
    'The Worrier': 'maintains hypervigilance, scanning for signs of betrayal in every interaction'
  },
  helplessness: {
    'The Perfectionist': 'believes that perfect execution is the only path to having any impact at all',
    'The Controller': 'tries to control small things to compensate for the big things that feel uncontrollable',
    'The Inner Critic': 'says "don\'t bother trying" to protect you from the pain of another failed attempt',
    'The People Pleaser': 'defers to others because their choices seem more likely to succeed than yours',
    'The Planner': 'over-plans as a way to feel some sense of agency in a world that feels overwhelming',
    'The Worrier': 'catastrophizes about worst-case scenarios because past experience taught that bad outcomes are inevitable'
  }
};

const FIREFIGHTER_WOUND_STRATEGIES = {
  abandonment: {
    'The Numbing Part': 'pulls the plug on feeling so the ache of loneliness doesn\'t overwhelm you',
    'The Shutdown Part': 'shuts down connection entirely — "if I don\'t care, being left can\'t hurt me"',
    'The Distractor': 'keeps you frantically busy so you never have to sit with the emptiness of being alone',
    'The Impulse Part': 'reaches for quick comfort — anything to fill the void that abandonment left',
    'The Self-Destructive Part': 'turns the pain inward, confirming the belief that you deserved to be left'
  },
  shame: {
    'The Numbing Part': 'pulls the plug on your system to protect you from feeling the depth of the shame',
    'The Shutdown Part': 'shuts down completely when shame becomes unbearable — emotional collapse as escape',
    'The Distractor': 'provides a frantic exit strategy — using busyness or stimulation to draw attention away from the internal pain',
    'The Impulse Part': 'acts out impulsively to temporarily replace shame with intensity or excitement',
    'The Self-Destructive Part': 'turns the shame into self-punishment, confirming the Critic\'s harsh messages'
  },
  neglect: {
    'The Numbing Part': 'disconnects you from your needs so you don\'t have to feel the pain of them going unmet',
    'The Shutdown Part': 'goes invisible — the same strategy that kept you safe as a child when no one was paying attention',
    'The Distractor': 'fills the emptiness with activity so you never notice how hungry you are for real connection',
    'The Impulse Part': 'grabs at whatever is available in the moment because waiting for your needs to be met feels hopeless',
    'The Self-Destructive Part': 'neglects yourself the way you were neglected, repeating the only pattern you know'
  },
  betrayal: {
    'The Numbing Part': 'shuts down feeling so the rage and terror of betrayal can\'t surface',
    'The Shutdown Part': 'withdraws completely from connection — isolation feels safer than vulnerability',
    'The Distractor': 'keeps you occupied so you don\'t have to process the depth of the violation',
    'The Impulse Part': 'reacts with fight-or-flight intensity — aggression or escape when trust feels threatened',
    'The Self-Destructive Part': 'destroys good things before someone else can, maintaining the illusion of control'
  },
  helplessness: {
    'The Numbing Part': 'checks out because caring about outcomes that you can\'t control is too painful',
    'The Shutdown Part': 'collapses into passivity — the freeze response that says "there\'s no point in trying"',
    'The Distractor': 'avoids engaging with challenges by staying busy with things that don\'t require risk',
    'The Impulse Part': 'makes impulsive choices to feel a brief flash of agency in a world that feels uncontrollable',
    'The Self-Destructive Part': 'undermines your own efforts, confirming the belief that trying is useless'
  }
};

const EXILE_WOUND_CONNECTIONS = {
  abandonment: {
    'The Lonely Child': 'carries the ache of being left — the hollow feeling that no one is coming back',
    'The Scared Child': 'holds the terror of separation and the fear that being alone means being unsafe',
    'The Grieving Child': 'mourns the loss of connections that ended too soon or were never secure',
    'The Shamed Child': 'absorbed the message that you were left because something is wrong with you'
  },
  shame: {
    'The Shamed Child': 'carries the core belief "I am broken" — the weight that was never yours to hold',
    'The Scared Child': 'lives in fear of being exposed, seen, or found out as defective',
    'The Lonely Child': 'hides in isolation because showing your true self feels dangerous',
    'The Grieving Child': 'mourns the version of yourself you were never allowed to be'
  },
  neglect: {
    'The Lost Child': 'became invisible to survive — learned that being small and quiet was the safest strategy',
    'The Lonely Child': 'carries the ache of being physically present but emotionally unseen',
    'The Scared Child': 'fears that speaking up about needs will result in being dismissed or ridiculed',
    'The Grieving Child': 'mourns the childhood of attunement and responsiveness that was never provided'
  },
  betrayal: {
    'The Terrified Child': 'lives in a state of hypervigilance, scanning for the next violation of trust',
    'The Scared Child': 'cannot relax because safety was shattered by the very people who promised it',
    'The Shamed Child': 'absorbed the belief that the betrayal was somehow deserved or invited',
    'The Lonely Child': 'withdrew from connection because closeness became synonymous with danger'
  },
  helplessness: {
    'The Powerless Child': 'carries the frozen belief that nothing you do matters and effort is futile',
    'The Scared Child': 'fears taking action because past attempts were met with failure or punishment',
    'The Lonely Child': 'gave up asking for help because no one responded — learned to endure alone',
    'The Grieving Child': 'mourns the potential and the life that helplessness stole'
  }
};

function getSelfEnergyAnalysis(selfEnergy) {
  if (!selfEnergy?.scores) return null;

  const qualities = ['calmness', 'curiosity', 'compassion', 'confidence', 'courage', 'clarity', 'creativity', 'connectedness'];
  const displayNames = {
    calmness: 'Calmness', curiosity: 'Curiosity', compassion: 'Compassion',
    confidence: 'Confidence', courage: 'Courage', clarity: 'Clarity',
    creativity: 'Creativity', connectedness: 'Connectedness'
  };

  const strengths = [];
  const developing = [];
  const growingEdges = [];

  qualities.forEach(q => {
    const avg = selfEnergy.scores[q]?.average;
    if (avg == null) return;
    const entry = { name: displayNames[q], score: avg };
    if (avg >= 4.0) strengths.push(entry);
    else if (avg >= 3.0) developing.push(entry);
    else growingEdges.push(entry);
  });

  strengths.sort((a, b) => b.score - a.score);
  growingEdges.sort((a, b) => a.score - b.score);

  return { strengths, developing, growingEdges };
}

function getPartsForWound(activeParts, woundType) {
  const managers = activeParts.filter(p => p.type === 'manager');
  const firefighters = activeParts.filter(p => p.type === 'firefighter');
  const exiles = activeParts.filter(p => p.type === 'exile');
  const woundStrategies = MANAGER_WOUND_STRATEGIES[woundType] || {};
  const ffStrategies = FIREFIGHTER_WOUND_STRATEGIES[woundType] || {};
  const exileConnections = EXILE_WOUND_CONNECTIONS[woundType] || {};

  return {
    managers: managers.map(m => ({
      ...m,
      strategy: woundStrategies[m.name] || `works to protect your system from the pain of ${woundType}`
    })),
    firefighters: firefighters.map(f => ({
      ...f,
      strategy: ffStrategies[f.name] || `activates when the pain of ${woundType} breaks through your Managers' defenses`
    })),
    exiles: exiles.map(e => ({
      ...e,
      connection: exileConnections[e.name] || `carries the emotional weight of your ${woundType} experiences`
    }))
  };
}

const MODULE_TEMPLATES = {
  'module-1-intro-ifs': {
    sectionTitle: 'Meeting Your Internal Family',
    introFrame: (childName, woundType, clientName) =>
      `${clientName ? `${clientName}, this` : 'This'} module is your introduction to the family that lives within you. In Internal Family Systems, every person has an inner family — a system of parts that work together to protect you. Your system organized itself around a core experience: the wound of ${woundType}. At the center of your system is your ${childName}, a young part that carries ${WOUND_BURDEN_DESCRIPTIONS[woundType]}. Everything else in your system — your protectors, your coping strategies, your automatic reactions — exists to keep this child safe.`,
    managerFraming: 'The Guardians of Your System (Your Managers)',
    managerIntro: 'Your system developed a sophisticated team of Managers — proactive protectors who work to prevent you from ever feeling the vulnerability your exiles carry:',
    firefighterFraming: 'The Emergency Response (Your Firefighters)',
    firefighterIntro: 'When your Managers fail and that raw, vulnerable feeling starts to leak through, your Firefighters rush in to douse the emotional flames:',
    exileFraming: 'The Vulnerable Ones (Your Exiles)',
    exileIntro: 'Beneath all the protection, these young parts carry the original pain:',
    selfEnergyFraming: 'Your Self-Energy Foundation',
    closingFrame: (childName) => `Understanding your internal family is the first step toward healing. You don't need to change these parts — they all developed for good reasons. The goal is to help your Self lead this system with compassion, so your ${childName} can finally begin to heal.`
  },
  'module-2-inner-child-wounds': {
    sectionTitle: 'Your System\'s Map: From Burden to Self-Leadership',
    introFrame: (childName, woundType, clientName) =>
      `${clientName ? `${clientName}, the` : 'The'} feeling of ${woundType === 'shame' ? 'being "not enough"' : woundType === 'abandonment' ? 'being left behind' : woundType === 'neglect' ? 'being invisible' : woundType === 'betrayal' ? 'never being safe' : 'being powerless'} is not a character flaw. It is a biological record of a time when you were small and lacked the resources to process overwhelming experiences. Your ${childName} isn't an identity; it is a young part of you that absorbed a burden of ${woundType} to make sense of a world that didn't provide what you needed.`,
    managerFraming: 'The Guardians of Your Worth (The Managers)',
    managerIntro: (childName) => `To protect that vulnerable ${childName}, your system developed a sophisticated team of Managers. They aren't "bad" habits; they are survival experts:`,
    firefighterFraming: 'The Emergency Response (The Firefighters)',
    firefighterIntro: 'When the Managers fail and that raw feeling starts to leak through, your Firefighters rush in to douse the emotional flames:',
    exileFraming: 'The Ones Who Carry the Weight',
    exileIntro: 'These are the young parts at the center of your system — the ones everyone else is working to protect:',
    selfEnergyFraming: 'Your Current Self-Energy (The 8 C\'s)',
    closingFrame: (childName) => `Healing isn't about getting rid of the parts that protect you — it's about showing them that the "Adult You" is now capable of leading. By leaning into your natural strengths, you can begin to witness these parts with Curiosity instead of judgment. This is how the burden of unworthiness begins to lift, revealing the person your ${childName} was always meant to become.`
  },
  'module-3-protectors-unlocked': {
    sectionTitle: 'Your Guardian System',
    introFrame: (childName, woundType, clientName) =>
      `${clientName ? `${clientName}, your` : 'Your'} protectors are not your enemies. Every Manager, every Firefighter in your system developed for one purpose: to keep your ${childName} safe from the unbearable pain of ${woundType}. In this module, you will meet each protector with Curiosity and Compassion, understanding their strategies, appreciating their service, and beginning to earn their trust so they can step back and let your Self lead.`,
    managerFraming: 'Your Proactive Protectors (Managers)',
    managerIntro: 'These parts work preventatively — they try to control your world so the wound is never triggered:',
    firefighterFraming: 'Your Reactive Protectors (Firefighters)',
    firefighterIntro: 'These parts only activate when the pain breaks through the Managers\' defenses — their methods are more intense and less controlled:',
    exileFraming: 'Who They\'re All Protecting',
    exileIntro: 'Understanding your exiles helps you see why your protectors work so hard:',
    selfEnergyFraming: 'Your Leadership Capacity',
    closingFrame: (childName) => `Your protectors have been working overtime. They took on adult responsibilities when you were still a child. Now, as you develop Self-leadership, you can begin to show them: "I am here now. I can handle this. You can rest." This is the beginning of unburdening your ${childName}.`
  },
  'module-4-self-leadership': {
    sectionTitle: 'Leading Your System with the 8 C\'s',
    introFrame: (childName, woundType, clientName) =>
      `${clientName ? `${clientName}, Self` : 'Self'}-leadership means becoming the compassionate, wise, and steady presence that your ${childName} has always needed. The 8 C's of Self — Calmness, Curiosity, Compassion, Confidence, Courage, Clarity, Creativity, and Connectedness — are not qualities you need to build from scratch. They are inherent to your true Self. They emerge naturally when your protective parts step back and trust that you can lead.`,
    managerFraming: 'How Your Managers Respond to Self-Leadership',
    managerIntro: 'As you cultivate the 8 C\'s, your Managers may initially resist — they\'ve been leading for a long time:',
    firefighterFraming: 'How Your Firefighters Can Begin to Rest',
    firefighterIntro: 'When your Self is leading, your Firefighters are needed less often:',
    exileFraming: 'What Your Exiles Need from Self',
    exileIntro: 'Your exiles are waiting for the experience of a Self that is strong enough to hold their pain:',
    selfEnergyFraming: 'Your 8 C\'s Profile',
    closingFrame: (childName) => `Self-leadership is not about perfection — it's about showing up, consistently, from a place of Compassion and Clarity. Every moment you lead from Self instead of from a protective part, your ${childName} receives the message: "Someone capable is in charge now. You are safe."`,
    selfEnergyEmphasis: true
  },
  'module-5-six-fs-protocol': {
    sectionTitle: 'The 6 F\'s Applied to Your System',
    introFrame: (childName, woundType, clientName) =>
      `${clientName ? `${clientName}, the` : 'The'} 6 F's protocol — Find, Focus, Flesh Out, Feel Toward, Befriend, and Fear — gives you a structured way to approach your parts with curiosity and compassion. For your ${childName}, this protocol is especially powerful because it provides a safe, step-by-step path into territory that your protectors have been guarding.`,
    managerFraming: 'Parts You May Encounter During the 6 F\'s',
    managerIntro: 'As you practice Finding and Focusing on parts, you may first encounter your Managers — they\'re the most accessible:',
    firefighterFraming: 'Deeper Work with Your Firefighters',
    firefighterIntro: 'Once your Managers trust the process, you may begin to access your Firefighters:',
    exileFraming: 'Approaching Your Exiles',
    exileIntro: 'The ultimate goal of the 6 F\'s is to reach and heal these vulnerable parts:',
    selfEnergyFraming: 'Self-Energy for the 6 F\'s',
    closingFrame: (childName) => `Each time you complete the 6 F's process with a part, you strengthen the trust between your Self and your system. Over time, your parts learn that your Self can handle what they carry, and your ${childName} begins to feel truly safe.`
  },
  'module-5-bonus-exercises': {
    sectionTitle: 'Advanced Practices for Your Parts',
    introFrame: (childName, woundType, clientName) =>
      `${clientName ? `${clientName}, these` : 'These'} advanced exercises are designed to deepen your relationship with your parts — especially your ${childName}. Each practice targets a different dimension of healing: letter writing gives voice to what was unspoken, safe place visualization creates internal sanctuary, reparenting dialogue provides the words your child needed to hear, and body-based practices anchor healing in your physical experience.`,
    managerFraming: 'Exercises for Your Managers',
    managerIntro: 'These exercises help your Managers begin to relax their vigilance:',
    firefighterFraming: 'Exercises for Your Firefighters',
    firefighterIntro: 'These practices offer your Firefighters alternatives to their intense coping:',
    exileFraming: 'Exercises for Your Exiles',
    exileIntro: 'The deepest work — approaching and comforting your vulnerable parts:',
    selfEnergyFraming: 'Your Strengths for This Work',
    closingFrame: (childName) => `These practices are most powerful when repeated regularly. Your ${childName} didn't develop its burden in a single moment, and healing happens through consistent, compassionate attention over time.`
  },
  'module-6-inner-child-healing': {
    sectionTitle: 'Unburdening Your Inner Child',
    introFrame: (childName, woundType, clientName) =>
      `${clientName ? `${clientName}, unburdening` : 'Unburdening'} is the heart of IFS healing. Your ${childName} has been carrying the weight of ${woundType} — beliefs, emotions, and body sensations that were absorbed during overwhelming childhood experiences. In this module, you will create the conditions for your ${childName} to release what was never its to carry.`,
    managerFraming: 'Preparing Your Protectors',
    managerIntro: 'Before unburdening can happen, your Managers need to know it\'s safe to step back:',
    firefighterFraming: 'Creating Safety for the Process',
    firefighterIntro: 'Your Firefighters may activate during unburdening as intense emotions surface:',
    exileFraming: 'The Parts Ready for Unburdening',
    exileIntro: 'These are the parts who carry the burdens you\'ll be helping to release:',
    selfEnergyFraming: 'Your Self-Energy for Unburdening',
    closingFrame: (childName) => `Unburdening is not a one-time event — it is a process that unfolds over time. Each ceremony, each moment of compassionate witnessing, lightens the load your ${childName} has been carrying. And as the burden lifts, qualities that were hidden beneath it — joy, spontaneity, trust — begin to emerge.`
  },
  'module-7-reparenting': {
    sectionTitle: 'Reparenting Your Inner Child',
    introFrame: (childName, woundType, clientName) =>
      `${clientName ? `${clientName}, reparenting` : 'Reparenting'} means becoming the parent your ${childName} always needed but never had. It is the active practice of providing — from your adult Self — the specific experiences that were missing in childhood. For your ${woundType} wound, reparenting addresses the core deficit: ${woundType === 'abandonment' ? 'reliable, consistent presence' : woundType === 'shame' ? 'unconditional positive regard' : woundType === 'neglect' ? 'attunement and responsive care' : woundType === 'betrayal' ? 'earned trust and predictability' : 'empowerment and agency'}.`,
    managerFraming: 'What Your Managers Need to Hear',
    managerIntro: 'Your Managers have been parenting your system in the only way they knew how. Reparenting means saying to them:',
    firefighterFraming: 'What Your Firefighters Need to Experience',
    firefighterIntro: 'Your Firefighters need to see that your Self can handle crisis without their extreme measures:',
    exileFraming: 'Reparenting Your Exiles',
    exileIntro: 'The core of reparenting — offering your vulnerable parts the specific care they needed:',
    selfEnergyFraming: 'Your Reparenting Strengths',
    closingFrame: (childName) => `Reparenting is a daily practice, not a single breakthrough. Every time you check in with your ${childName}, respond to a need, or offer a kind word, you are building new neural pathways of secure attachment from within.`
  },
  'module-8-somatic-healing': {
    sectionTitle: 'Your Body\'s Story',
    introFrame: (childName, woundType, clientName) =>
      `${clientName ? `${clientName}, your` : 'Your'} body has been holding the story of your ${woundType} wound long before you had words for it. Your ${childName}'s experiences are stored not just in memory, but in muscle tension, breathing patterns, posture, and nervous system activation. Somatic healing means listening to your body's wisdom and helping it release what it has been carrying.`,
    managerFraming: 'How Your Managers Show Up in Your Body',
    managerIntro: 'Each Manager creates distinct physical patterns:',
    firefighterFraming: 'Your Firefighters\' Somatic Signatures',
    firefighterIntro: 'Firefighters activate your nervous system in intense, physical ways:',
    exileFraming: 'Where Your Exiles Live in Your Body',
    exileIntro: 'Your exiles\' pain is stored in specific body regions:',
    selfEnergyFraming: 'Your Body\'s Resources',
    closingFrame: (childName) => `Your body has been faithfully holding your ${childName}'s story. As you develop somatic awareness, you give your body permission to release what it has been guarding — and in that release, both body and child find healing.`
  },
  'module-9-relationships': {
    sectionTitle: 'How Your System Shows Up in Relationships',
    introFrame: (childName, woundType, clientName) =>
      `${clientName ? `${clientName}, your` : 'Your'} ${childName} doesn't just affect how you feel inside — it shapes every relationship you have. The wound of ${woundType} creates specific patterns: ${woundType === 'abandonment' ? 'anxious attachment, fear of rejection, people-pleasing, and difficulty being alone' : woundType === 'shame' ? 'hiding your true self, performing worthiness, and withdrawing when vulnerability increases' : woundType === 'neglect' ? 'disappearing in relationships, not expressing needs, and over-functioning for others while under-functioning for yourself' : woundType === 'betrayal' ? 'hypervigilance, testing partners, walls around vulnerability, and difficulty with trust' : 'over-compliance, difficulty asserting boundaries, and letting others make decisions for you'}. Understanding these patterns is the first step toward choosing differently.`,
    managerFraming: 'How Your Managers Shape Your Relationships',
    managerIntro: 'Your Managers run the show in relationships, creating predictable patterns:',
    firefighterFraming: 'How Your Firefighters Respond to Relational Triggers',
    firefighterIntro: 'When relationships trigger your wound, your Firefighters step in:',
    exileFraming: 'What Your Exiles Need in Relationships',
    exileIntro: 'Underneath the protective patterns, your exiles carry core relational needs:',
    selfEnergyFraming: 'Your Relational Self-Energy',
    closingFrame: (childName) => `Self-led relationships don't require your ${childName} to be fully healed before you can connect authentically. They require awareness — noticing when a protector is running the show, and choosing to respond from Self instead.`
  },
  'module-10-inner-critic': {
    sectionTitle: 'Befriending Your Inner Critic',
    introFrame: (childName, woundType, clientName) =>
      `${clientName ? `${clientName}, your` : 'Your'} Inner Critic is not your enemy — it is one of the hardest-working parts in your system. It developed to protect your ${childName} from the pain of ${woundType} by ${woundType === 'shame' ? 'criticizing you before the world could, trying to make the shame hurt less' : woundType === 'abandonment' ? 'pushing you to be perfect so people would have no reason to leave' : woundType === 'neglect' ? 'telling you your needs don\'t matter, mirroring the message you received as a child' : woundType === 'betrayal' ? 'staying vigilant and prosecuting potential threats before they could harm you again' : 'keeping you small and inactive to avoid the pain of another failed attempt'}. Befriending the Critic means seeing its protective intention and showing it that your Self can lead.`,
    managerFraming: 'Your Critic\'s Allies',
    managerIntro: 'Your Inner Critic doesn\'t work alone — it has allies in your Manager system:',
    firefighterFraming: 'What Happens When the Critic Fails',
    firefighterIntro: 'When the Critic\'s harsh messages don\'t work, your Firefighters step in:',
    exileFraming: 'Who the Critic Is Protecting',
    exileIntro: 'The Critic\'s harshness is always in service of protecting these vulnerable parts:',
    selfEnergyFraming: 'Self-Energy vs. Critic Energy',
    closingFrame: (childName) => `Befriending your Inner Critic is one of the most transformative acts in IFS. When your Critic realizes that your Self is a more effective leader — one who can protect your ${childName} with Compassion instead of harshness — it can finally relax.`
  }
};

function generateSelfEnergyNarrative(selfEnergyAnalysis, woundType, selfEnergyEmphasis) {
  if (!selfEnergyAnalysis) return null;
  const { strengths, developing, growingEdges } = selfEnergyAnalysis;

  const sections = [];

  if (strengths.length > 0) {
    const strengthsList = strengths.map(s => `${s.name} (${s.score.toFixed(1)})`).join(' and ');
    sections.push({
      type: 'strengths',
      label: 'Your Anchor',
      text: `You have high ${strengthsList}. This is your foundation. Even when your protectors are active, there is a core of you that can remain steady and access these qualities.`
    });
  }

  if (developing.length > 0 && selfEnergyEmphasis) {
    const devList = developing.map(d => `${d.name} (${d.score.toFixed(1)})`).join(', ');
    sections.push({
      type: 'developing',
      label: 'Developing',
      text: `Your ${devList} ${developing.length === 1 ? 'is' : 'are'} in a developing range — present but not yet fully accessible, especially under stress.`
    });
  }

  if (growingEdges.length > 0) {
    const edgesList = growingEdges.map(g => `${g.name} (${g.score.toFixed(1)})`).join(' and ');
    const woundConnection = {
      abandonment: 'As you heal the abandonment wound, these qualities naturally expand — Connectedness especially, as the fear of being left loosens its grip.',
      shame: 'These are the bridges to your exiles. Right now, they feel difficult because your Critic is so loud. As shame healing progresses, these C\'s open up.',
      neglect: 'These growing edges reflect the neglect pattern — it\'s hard to be curious about your own needs or compassionate with yourself when no one modeled that for you.',
      betrayal: 'These growing edges make sense for betrayal — it\'s hard to feel connected or compassionate when your system is wired for vigilance.',
      helplessness: 'These growing edges connect directly to your helplessness wound — confidence and courage are exactly what helplessness suppresses.'
    };
    sections.push({
      type: 'growingEdges',
      label: 'Your Growing Edges',
      text: `Your growing edges are ${edgesList}. ${woundConnection[woundType] || 'As you heal, these qualities will naturally strengthen.'}`
    });
  }

  return sections;
}

function generateClosingMessages(parts, childName, woundType) {
  const messages = [];

  if (parts.managers.length > 0) {
    messages.push({
      to: 'your Managers',
      text: 'You have worked so hard to keep this system afloat. You don\'t have to work this hard anymore. The adult Self is learning to lead.'
    });
  }

  if (parts.firefighters.length > 0) {
    messages.push({
      to: 'your Firefighters',
      text: 'Thank you for trying to save this system from overwhelming pain. There is a safer way to find peace, and your Self is learning it now.'
    });
  }

  const exileChild = childName || WOUND_CHILD_NAMES[woundType] || 'your inner child';
  messages.push({
    to: `your ${exileChild}`,
    text: 'You were never the problem. You just carried a weight that was never yours to hold. We are coming for you, and we will not stop until you are free.'
  });

  return messages;
}

export function generatePersonalizedLesson(moduleId, woundContext, woundPersonalization) {
  if (!woundContext?.primary || !woundContext?.activeParts || woundContext.activeParts.length === 0) {
    return null;
  }

  const woundType = woundContext.primary;
  const childName = woundPersonalization?.childName || WOUND_CHILD_NAMES[woundType] || 'Inner Child';
  const template = MODULE_TEMPLATES[moduleId];
  if (!template) return null;

  const parts = getPartsForWound(woundContext.activeParts, woundType);
  const selfEnergyAnalysis = getSelfEnergyAnalysis(woundContext.selfEnergy);
  const selfEnergySections = generateSelfEnergyNarrative(selfEnergyAnalysis, woundType, template.selfEnergyEmphasis);
  const closingMessages = generateClosingMessages(parts, childName, woundType);

  const managerIntroText = typeof template.managerIntro === 'function'
    ? template.managerIntro(childName)
    : template.managerIntro;

  return {
    sectionTitle: template.sectionTitle,
    intro: template.introFrame(childName, woundType, woundContext.clientName),
    managerSection: parts.managers.length > 0 ? {
      title: template.managerFraming,
      intro: managerIntroText,
      parts: parts.managers
    } : null,
    firefighterSection: parts.firefighters.length > 0 ? {
      title: template.firefighterFraming,
      intro: template.firefighterIntro,
      parts: parts.firefighters
    } : null,
    exileSection: parts.exiles.length > 0 ? {
      title: template.exileFraming,
      intro: template.exileIntro,
      parts: parts.exiles
    } : null,
    selfEnergySection: selfEnergySections ? {
      title: template.selfEnergyFraming,
      sections: selfEnergySections
    } : null,
    closingMessages,
    closingNarrative: template.closingFrame(childName),
    woundType,
    childName
  };
}
