const WOUND_CHILD_NAMES = {
  abandonment: 'Lonely Child',
  shame: 'Unworthy Child',
  neglect: 'Lost Child',
  betrayal: 'Terrified Child',
  helplessness: 'Powerless Child'
};

const WOUND_CORE_FEARS = {
  abandonment: 'being left, rejected, or forgotten',
  shame: 'being exposed as flawed or "not enough"',
  neglect: 'being unseen, unheard, or unimportant',
  betrayal: 'trusting someone who will violate that trust again',
  helplessness: 'trying and failing, confirming that nothing you do matters'
};

const WOUND_CORE_NEEDS = {
  abandonment: 'consistent presence, reassurance that you will not be left, and the felt experience of secure belonging',
  shame: 'unconditional positive regard, the message "you are enough exactly as you are," and safe visibility',
  neglect: 'attunement, responsiveness to your needs, and the experience of being truly seen and valued',
  betrayal: 'earned trust, predictability, transparency, and the experience of safety in vulnerability',
  helplessness: 'empowerment, agency, the experience that your actions matter and your voice counts'
};

const MANAGER_ACTIVITY_GUIDANCE = {
  abandonment: {
    'The Perfectionist': { activity: 'Notice when this part pushes for perfection to prevent rejection. Ask: "What would happen if I were imperfect and still loved?"', bodyLocation: 'jaw tension, tight shoulders from constant striving' },
    'The Controller': { activity: 'When this part tries to manage a relationship, pause. Ask: "What am I afraid of losing right now?"', bodyLocation: 'gripping hands, tight chest, held breath' },
    'The Inner Critic': { activity: 'When harsh self-talk starts, ask: "Are you trying to make me better so people won\'t leave?"', bodyLocation: 'tension in the throat, constricted breathing' },
    'The People Pleaser': { activity: 'Notice when you say yes while your body says no. Ask this part: "What are you afraid will happen if I say no?"', bodyLocation: 'frozen smile muscles, stomach knots from suppressing true feelings' },
    'The Planner': { activity: 'When you\'re over-preparing for every scenario, ask: "Is this planning or is this anxiety about abandonment?"', bodyLocation: 'racing mind, tension headache, restless legs' },
    'The Worrier': { activity: 'When scanning for signs someone is pulling away, pause and ask: "Is this happening right now, or is this an old fear?"', bodyLocation: 'pit in stomach, hypervigilant scanning, shallow breathing' }
  },
  shame: {
    'The Perfectionist': { activity: 'When nothing feels good enough, ask: "Whose voice is this? What would compassion say instead?"', bodyLocation: 'tension across forehead, rigid posture, clenched jaw' },
    'The Controller': { activity: 'When trying to control how others see you, ask: "What part of me am I trying to hide right now?"', bodyLocation: 'tight chest, held breath, tension in hands' },
    'The Inner Critic': { activity: 'Write down the Critic\'s harshest messages. Then ask: "Who first said these words to me? How old was I?"', bodyLocation: 'weight on chest, heaviness in shoulders, pit in stomach' },
    'The People Pleaser': { activity: 'Notice when you perform for approval. Ask: "What if I stopped performing — would I still be worthy?"', bodyLocation: 'smiling while tense, exhaustion in limbs, hollowness in chest' },
    'The Planner': { activity: 'When meticulously preparing to avoid looking incompetent, ask: "What if I made a mistake and it was okay?"', bodyLocation: 'racing thoughts, tight neck, tension behind eyes' },
    'The Worrier': { activity: 'When scanning for judgment from others, ask: "Am I seeing their reaction, or am I projecting my shame?"', bodyLocation: 'flushed skin, desire to hide, stomach dropping' }
  },
  neglect: {
    'The Perfectionist': { activity: 'Notice when you perform to earn attention. Ask: "What if I deserved care without earning it?"', bodyLocation: 'exhaustion, depleted energy, tension from over-functioning' },
    'The Controller': { activity: 'When doing everything alone, ask: "What if I asked for help and someone actually showed up?"', bodyLocation: 'heavy shoulders, fatigue, disconnection from body needs' },
    'The Inner Critic': { activity: 'When this part says "you\'re fine, stop being needy," ask: "Who taught me that my needs don\'t matter?"', bodyLocation: 'numbness in chest, empty feeling in stomach, disconnected limbs' },
    'The People Pleaser': { activity: 'When taking care of everyone else, ask: "When was the last time I took care of myself like this?"', bodyLocation: 'aching body from over-giving, depleted energy, tension from suppressing needs' },
    'The Planner': { activity: 'Notice when you organize everything independently. Ask: "What would interdependence feel like?"', bodyLocation: 'rigid posture, tension from self-reliance, tired eyes' },
    'The Worrier': { activity: 'When anxious about being too much, ask: "What if my full self was exactly right?"', bodyLocation: 'shrinking posture, small voice, tension in throat from swallowing words' }
  },
  betrayal: {
    'The Perfectionist': { activity: 'Notice when you maintain rigid standards as armor. Ask: "What vulnerability am I protecting right now?"', bodyLocation: 'armored chest, rigid spine, clenched jaw' },
    'The Controller': { activity: 'When needing to control a situation, ask: "What would it feel like to trust this moment?"', bodyLocation: 'tight grip, locked joints, braced core muscles' },
    'The Inner Critic': { activity: 'When prosecuting others for potential deception, ask: "Is this person dangerous, or does my wound say everyone is?"', bodyLocation: 'sharp eyes, tense neck from hypervigilance, guarded posture' },
    'The People Pleaser': { activity: 'When staying agreeable to avoid conflict, ask: "Am I being kind, or am I hiding to stay safe?"', bodyLocation: 'mask-like expression, tension from suppressing true reactions' },
    'The Planner': { activity: 'When building exit strategies, ask: "What if I didn\'t need an escape plan this time?"', bodyLocation: 'restless energy, one foot out the door, scanning for exits' },
    'The Worrier': { activity: 'When scanning for betrayal signals, ask: "Am I reading this situation, or am I reading my wound?"', bodyLocation: 'hypervigilant eyes, tight stomach, startle response' }
  },
  helplessness: {
    'The Perfectionist': { activity: 'When perfection feels like the only path to impact, ask: "What if good enough also mattered?"', bodyLocation: 'frozen perfectionism, paralysis before starting, tension from fear of failure' },
    'The Controller': { activity: 'Notice when controlling small things to feel agency. Ask: "Where in my life do I actually have real power?"', bodyLocation: 'tight hands, rigid posture, tension from micromanaging' },
    'The Inner Critic': { activity: 'When this part says "don\'t bother," ask: "Are you protecting me from failure, or keeping me stuck?"', bodyLocation: 'collapsed posture, heavy limbs, low energy in chest' },
    'The People Pleaser': { activity: 'When deferring to others, ask: "What would I choose if I believed my choice mattered?"', bodyLocation: 'passive body language, limp hands, weight of compliance' },
    'The Planner': { activity: 'When over-planning to feel in control, ask: "What if I trusted myself to handle what comes?"', bodyLocation: 'busy mind, tight forehead, restless without a plan' },
    'The Worrier': { activity: 'When catastrophizing, ask: "Is this prediction based on now, or based on when I was small and powerless?"', bodyLocation: 'frozen body, racing mind, sensation of paralysis' }
  }
};

const ACTIVITY_TEMPLATES = {
  'activity-meet-inner-family': {
    titleFrame: (clientName, childName) => `${clientName ? `${clientName}, Meet` : 'Meet'} Your Internal Family`,
    promptFrame: (clientName, childName, woundType, managers, firefighters, exiles) => {
      const managerNames = managers.map(m => m.name).join(', ');
      const ffNames = firefighters.map(f => f.name).join(', ');
      const exileNames = exiles.map(e => e.name).join(', ');
      return `${clientName ? `${clientName}, you` : 'You'} already know your internal family better than you think. Your assessment revealed a system organized around your ${woundType} wound. Your Managers — ${managerNames || 'your proactive protectors'} — work to prevent pain. Your Firefighters — ${ffNames || 'your emergency responders'} — step in when the pain breaks through. And at the center, your Exiles — ${exileNames || 'your vulnerable parts'} — carry the original wound. In this activity, you will connect with each of these parts directly, using a recent experience as your doorway in.`;
    },
    questionsFrame: (managers, firefighters, exiles, childName, woundType) => {
      const topManager = managers[0];
      const topFF = firefighters[0];
      const topExile = exiles[0];
      return [
        'Think of a recent moment when you felt conflicted or reactive. Describe what happened — who was involved, what was at stake, and what you felt in your body.',
        topManager ? `In that moment, did you notice ${topManager.name} activating? What was this part doing or saying? What was it trying to protect you from?` : 'Which protective part activated first? What strategy did it use?',
        topFF ? `Did ${topFF.name} step in at any point — perhaps with an urge to numb, shut down, or escape? What triggered it?` : 'Did any emergency coping part activate? What did it feel like?',
        topExile ? `Underneath the protection, can you sense your ${topExile.name}? What feeling or memory was being guarded? How old does this part feel?` : `Can you sense your ${childName} underneath the protection? What is it feeling?`,
        `Now, from your calm, wise Self: what does your ${childName} actually need in this moment? Not what your protectors think it needs — what does the child itself long for?`,
        'What appreciation can you offer each part that showed up? They were all trying to help, even if their methods weren\'t ideal.',
        `If you could lead this situation from Self instead of from your protectors, what would you do differently? What would your ${childName} experience?`
      ];
    }
  },
  'activity-cultivate-self': {
    titleFrame: (clientName) => `${clientName ? `${clientName}'s` : 'Your'} Self-Energy Practice`,
    promptFrame: (clientName, childName, woundType, managers, firefighters, exiles, selfEnergy) => {
      const strengths = selfEnergy?.strengths || [];
      const edges = selfEnergy?.growingEdges || [];
      const strengthNames = strengths.map(s => s.name).join(' and ');
      const edgeNames = edges.map(e => e.name).join(' and ');
      return `${clientName ? `${clientName}, your` : 'Your'} Self-Energy assessment shows that ${strengthNames ? `${strengthNames} ${strengths.length === 1 ? 'is' : 'are'} your strongest ${strengths.length === 1 ? 'quality' : 'qualities'}` : 'you have qualities waiting to be accessed more fully'}${edgeNames ? `, while ${edgeNames} ${edges.length === 1 ? 'is' : 'are'} still developing` : ''}. In this meditation, you will use your natural strengths as an anchor while gently expanding the qualities that your ${childName} needs most. Your protectors may resist — ${managers[0]?.name || 'your Managers'} may say "this is pointless" or ${firefighters[0]?.name || 'your Firefighters'} may try to distract you. Notice them with Compassion, and return to Self.`;
    },
    guidedStepsFrame: (managers, firefighters, exiles, childName, woundType, selfEnergy) => {
      const strengths = selfEnergy?.strengths || [];
      const edges = selfEnergy?.growingEdges || [];
      const topStrength = strengths[0];
      const topEdge = edges[0];
      return [
        'Find a comfortable position and close your eyes. Take three deep breaths — each exhale releasing the busyness of the day, each inhale drawing in stillness. [Pause 10 seconds]',
        `Notice your body. Where do you feel most settled? This is where your Self lives — beneath the protective layers of ${managers.map(m => m.name).join(', ') || 'your Managers'} and the emergency responses of ${firefighters.map(f => f.name).join(', ') || 'your Firefighters'}.`,
        topStrength ? `Connect with your ${topStrength.name} (your score: ${topStrength.score.toFixed(1)}). This quality is already strong in you. Let it expand like a warm light in your chest. [Pause 15 seconds]` : 'Connect with whichever C quality feels most natural to you right now. Let it expand like a warm light. [Pause 15 seconds]',
        topEdge ? `Now gently invite ${topEdge.name} (your score: ${topEdge.score.toFixed(1)}). Don't force it — just make space for it. What would it feel like to have more ${topEdge.name.toLowerCase()} available to you? [Pause 15 seconds]` : 'Now gently invite the C quality that feels most challenging. Don\'t force it — just create space. [Pause 15 seconds]',
        `From this place of Self, turn toward your ${childName}. You don't need to fix anything. Just let this young part know: "I am here. I see you. You are not alone." [Pause 20 seconds]`,
        managers[0] ? `Notice if ${managers[0].name} wants to interrupt or take over. Thank it: "I appreciate your protection. I can handle this moment. You can rest." [Pause 10 seconds]` : 'Notice if any Manager part wants to interrupt. Thank it and ask it to step back. [Pause 10 seconds]',
        `Stay with your ${childName} for a few more breaths. What does this part need to hear from you today? Offer those words silently. [Pause 20 seconds]`,
        'When you are ready, take a deep breath and gently return to the room, bringing the warmth of Self-energy with you.'
      ];
    }
  },
  'activity-comprehensive-wound-assessment': {
    titleFrame: (clientName) => `${clientName ? `${clientName}'s` : 'Your'} Wound Exploration`,
    promptFrame: (clientName, childName, woundType, managers, firefighters, exiles) => {
      return `${clientName ? `${clientName}, your` : 'Your'} assessment identified ${woundType} as your primary wound — the wound carried by your ${childName}. This activity will help you explore how this wound shows up in your daily life, your relationships, your body, and your internal system. Your protectors — ${managers.map(m => m.name).join(', ') || 'your Managers'} — developed specifically to guard against the pain of ${WOUND_CORE_FEARS[woundType]}. Understanding these patterns is not about judgment; it is about compassionate awareness.`;
    },
    questionsFrame: (managers, firefighters, exiles, childName, woundType) => [
      `Your primary wound is ${woundType}. When did you first become aware of this pattern? Can you trace it back to a specific time, age, or experience?`,
      managers[0] ? `Your ${managers[0].name} emerged to protect you from ${WOUND_CORE_FEARS[woundType]}. How does this part show up in your daily life? When is it most active?` : `How do your protective parts guard you from ${WOUND_CORE_FEARS[woundType]}?`,
      `What beliefs does your ${childName} carry? Complete this sentence from your ${childName}'s perspective: "I believe that I am..." and "I believe that the world is..."`,
      `How does the ${woundType} wound show up in your body? Where do you feel it physically when it's activated?`,
      `What does your ${childName} need most? ${WOUND_CORE_NEEDS[woundType]}. Which of these feels most urgent right now?`,
      firefighters[0] ? `When the wound gets triggered and your ${firefighters[0].name} steps in, what happens? How does this part try to manage the pain?` : 'When the wound gets triggered and your emergency parts step in, what happens?',
      `If your ${childName} could speak directly to you right now, what would it say? What has it been waiting to tell you?`
    ]
  },
  'activity-wound-healing-plan': {
    titleFrame: (clientName, childName) => `Healing Plan for Your ${childName}`,
    promptFrame: (clientName, childName, woundType, managers, firefighters, exiles) => {
      return `${clientName ? `${clientName}, now` : 'Now'} that you understand your ${woundType} wound and the system that protects it — your Managers (${managers.map(m => m.name).join(', ') || 'proactive protectors'}), Firefighters (${firefighters.map(f => f.name).join(', ') || 'emergency responders'}), and your ${childName} — it's time to create a personalized healing roadmap. This plan will address what your ${childName} specifically needs: ${WOUND_CORE_NEEDS[woundType]}.`;
    },
    guidedStepsFrame: (managers, firefighters, exiles, childName, woundType) => [
      `Start by reviewing your wound pattern. Your ${childName} carries the fear of ${WOUND_CORE_FEARS[woundType]}. Acknowledge this without judgment.`,
      managers[0] ? `Identify how ${managers[0].name} currently tries to prevent this fear from being triggered. What is this strategy costing you?` : 'Identify your primary Manager strategy and what it costs you.',
      `Define your ${childName}'s core need: ${WOUND_CORE_NEEDS[woundType]}. Choose one specific aspect to focus on first.`,
      `For each Manager, envision a new role: instead of preventing pain, they can support healing. What would ${managers[0]?.name || 'your strongest Manager'} look like as an ally rather than a guard?`,
      firefighters[0] ? `Create a safety plan for when ${firefighters[0].name} activates. What Self-led alternatives can you offer this part?` : 'Create a safety plan for when emergency parts activate.',
      `Write a commitment letter to your ${childName}: what specific healing experiences will you provide this week?`,
      'Choose one daily practice that directly addresses your wound: a check-in with your inner child, a self-compassion break, or a boundary-setting exercise.'
    ]
  },
  'activity-meet-your-managers': {
    titleFrame: (clientName) => `${clientName ? `${clientName}, Meet` : 'Meet'} Your Managers`,
    promptFrame: (clientName, childName, woundType, managers) => {
      if (managers.length === 0) return null;
      const managerNames = managers.map(m => m.name).join(', ');
      return `${clientName ? `${clientName}, your` : 'Your'} assessment identified ${managers.length} active Manager${managers.length > 1 ? 's' : ''}: ${managerNames}. These parts have been on duty since childhood, working to protect your ${childName} from ${WOUND_CORE_FEARS[woundType]}. Today, you will meet each one directly — not to change them, not to fight them, but to understand them. They have been carrying an enormous burden, and they deserve your curiosity and appreciation.`;
    },
    questionsFrame: (managers, firefighters, exiles, childName, woundType) => {
      const questions = [];
      managers.forEach((m, i) => {
        const guidance = MANAGER_ACTIVITY_GUIDANCE[woundType]?.[m.name];
        if (i < 3) {
          questions.push(
            `MEET ${m.name.toUpperCase()} (intensity: ${m.score}/5): ${guidance?.activity || `Ask this part: "What are you trying to protect me from? What would happen if you stopped?"'`} What does this part say?`
          );
        }
      });
      questions.push(
        `Which of your Managers has been working the hardest? What specific appreciation can you offer it for its years of service protecting your ${childName}?`,
        `Ask your busiest Manager: "What are you most afraid would happen if you stepped back?" Listen to its answer without trying to fix or argue.`,
        `If your Managers didn't have to protect your ${childName} from ${woundType} anymore, what would they enjoy doing instead? What positive roles could they take on?`,
        `What would help your Managers begin to trust your Self to lead? What demonstration of competence do they need from you?`
      );
      return questions;
    }
  },
  'activity-firefighter-connection': {
    titleFrame: (clientName) => `${clientName ? `${clientName}, Connect` : 'Connect'} With Your Firefighters`,
    promptFrame: (clientName, childName, woundType, managers, firefighters) => {
      if (firefighters.length === 0) return null;
      const ffNames = firefighters.map(f => f.name).join(', ');
      return `${clientName ? `${clientName}, your` : 'Your'} Firefighters — ${ffNames} — are the emergency responders in your system. They activate when your Managers can't keep the ${woundType} pain contained and your ${childName}'s distress breaks through. Their methods may feel extreme, but their intention is pure: they are trying to stop unbearable pain. This activity asks you to approach them with the compassion they rarely receive.`;
    },
    questionsFrame: (managers, firefighters, exiles, childName, woundType) => {
      const questions = [];
      firefighters.forEach((f, i) => {
        if (i < 3) {
          questions.push(
            `MEET ${f.name.toUpperCase()} (intensity: ${f.score}/5): When does this part activate? What triggers it? What is it trying to protect your ${childName} from feeling?`
          );
        }
      });
      questions.push(
        'How have you typically related to these parts — with judgment, shame, or attempts to eliminate them? How might Compassion change that relationship?',
        `What do your Firefighters need to hear from you? Try saying: "I see how hard you've been working. Thank you for trying to protect my ${childName}. I'm learning a better way."`,
        'What Self-led alternatives could you offer your Firefighters? Not to replace them, but to give them options beyond emergency measures.',
        `What would change in your life if your Firefighters could rest — if your ${childName} felt safe enough that emergencies were rare?`
      );
      return questions;
    }
  },
  'activity-self-leadership-mastery': {
    titleFrame: (clientName) => `${clientName ? `${clientName}'s` : 'Your'} Self-Leadership Practice`,
    promptFrame: (clientName, childName, woundType, managers, firefighters, exiles, selfEnergy) => {
      const strengths = selfEnergy?.strengths || [];
      const edges = selfEnergy?.growingEdges || [];
      return `${clientName ? `${clientName}, Self` : 'Self'}-leadership means becoming the calm, wise presence your ${childName} has always needed. Your 8 C's profile shows ${strengths.length > 0 ? `strengths in ${strengths.map(s => `${s.name} (${s.score.toFixed(1)})`).join(', ')}` : 'qualities waiting to be developed'}${edges.length > 0 ? ` and growing edges in ${edges.map(e => `${e.name} (${e.score.toFixed(1)})`).join(', ')}` : ''}. In this practice, you will use your strengths as an anchor while working directly with your parts — asking ${managers[0]?.name || 'your Managers'} to step back, showing ${firefighters[0]?.name || 'your Firefighters'} that you can handle intensity, and offering your ${childName} the leadership it has been waiting for.`;
    },
    guidedStepsFrame: (managers, firefighters, exiles, childName, woundType, selfEnergy) => {
      const strengths = selfEnergy?.strengths || [];
      const topStrength = strengths[0];
      return [
        'Find a comfortable position. Close your eyes and take several slow breaths, letting each exhale carry away tension. [Pause 10 seconds]',
        `Bring to mind a recent moment when your ${woundType} wound was activated — a situation where your protectors stepped in. Don't relive it; just observe it from a slight distance.`,
        managers[0] ? `Notice ${managers[0].name} in that scene. What was this part doing? How was it trying to protect you? Appreciate its effort, then gently ask: "Can I try leading this time?"` : 'Notice which Manager was most active. Appreciate it, then ask: "Can I try leading this time?"',
        topStrength ? `Access your strongest C quality — ${topStrength.name} (${topStrength.score.toFixed(1)}). Let it fill your awareness. From this quality, look at the situation with fresh eyes.` : 'Access whichever C quality feels strongest right now. Let it fill your awareness.',
        `From Self, turn toward your ${childName}. What does this young part need right now? Not what your protectors think it needs — what does the child itself long for?`,
        firefighters[0] ? `If ${firefighters[0].name} tries to activate, acknowledge it: "I see you. I know this feels intense. But I can hold this." Stay with the feeling.` : 'If any Firefighter tries to activate, acknowledge it. Stay present with the feeling.',
        `Offer your ${childName} what it needs — with words, with an image, with a felt sense of safety. Take as long as you need. [Pause 30 seconds]`,
        'Notice what shifts. How does your body feel? How does your system respond when Self leads instead of a protector?',
        'Make a commitment: one specific way you will practice Self-leadership this week.',
        'Return to the room slowly, bringing Self-energy with you.'
      ];
    }
  },
  'activity-six-fs-mastery-practice': {
    titleFrame: (clientName, childName) => `6 F's Protocol — ${childName} Practice`,
    promptFrame: (clientName, childName, woundType, managers, firefighters, exiles) => {
      return `${clientName ? `${clientName}, you` : 'You'} will now practice the complete 6 F's protocol with your ${childName}. Each F — Find, Focus, Flesh Out, Feel Toward, Befriend, and Fear — is adapted for your ${woundType} wound. Your Managers (${managers.map(m => m.name).join(', ') || 'proactive protectors'}) may try to prevent you from going deep. Your Firefighters (${firefighters.map(f => f.name).join(', ') || 'emergency responders'}) may activate if the feelings intensify. Notice them with compassion, but keep returning to Self.`;
    }
  },
  'activity-unburdening-preparation': {
    titleFrame: (clientName, childName) => `Preparing to Unburden Your ${childName}`,
    promptFrame: (clientName, childName, woundType, managers, firefighters, exiles) => {
      return `${clientName ? `${clientName}, unburdening` : 'Unburdening'} requires preparation — your system needs to know it is safe before your ${childName} can release what it has been carrying. This activity will help you check readiness: Are your Managers (${managers.map(m => m.name).join(', ') || 'protectors'}) willing to step back? Can your Firefighters trust you to handle what surfaces? Is there enough Self-energy to hold your ${childName}'s pain with compassion?`;
    }
  },
  'activity-guided-parts-dialogue': {
    titleFrame: (clientName, childName) => `Dialogue with Your ${childName}`,
    promptFrame: (clientName, childName, woundType, managers, firefighters, exiles) => {
      return `${clientName ? `${clientName}, this` : 'This'} guided dialogue will help you have a direct conversation with your ${childName}. You will approach through your protectors first — checking in with ${managers[0]?.name || 'your Managers'} and ${firefighters[0]?.name || 'your Firefighters'} — before making contact with the vulnerable part that carries your ${woundType} wound. This is deep work. Go slowly and trust the process.`;
    }
  },
  'activity-unburdening-ceremony': {
    titleFrame: (clientName, childName) => `Unburdening Ceremony for Your ${childName}`,
    promptFrame: (clientName, childName, woundType, managers, firefighters, exiles) => {
      return `${clientName ? `${clientName}, this` : 'This'} ceremony is the culmination of your healing work with your ${childName}. Your ${childName} has been carrying the burden of ${WOUND_CORE_FEARS[woundType]} — beliefs, emotions, and body sensations that were never its to hold. In this ceremony, you will witness what your ${childName} carries, validate its experience, and invite it to release the burden in whatever way feels right — to light, to water, to wind, to earth. Your Managers and Firefighters have agreed to step back. Your Self is leading.`;
    }
  },
  'activity-letter-to-inner-child': {
    titleFrame: (clientName, childName) => `Letter to Your ${childName}`,
    promptFrame: (clientName, childName, woundType) => {
      return `${clientName ? `${clientName}, write` : 'Write'} a letter from your adult Self to your ${childName}. This is not a letter from your Managers (who would say "toughen up") or your Firefighters (who would say "don't feel"). This is from the wisest, most compassionate part of you — the part that knows your ${childName} was never the problem. Tell your ${childName} what it needs to hear about ${WOUND_CORE_FEARS[woundType]}.`;
    },
    questionsFrame: (managers, firefighters, exiles, childName, woundType) => [
      `Begin your letter: "Dear ${childName}..." What is the first thing you want this part to know?`,
      `Acknowledge what happened: "I know that you experienced..." Describe the ${woundType} experiences from your ${childName}'s perspective.`,
      `Correct the false beliefs: "I need you to know that it was not your fault. The truth is..." What does your ${childName} need to hear?`,
      `Make a promise: "From now on, I will..." What specific commitment can you make to this young part?`,
      `Close the letter with love. What final words does your ${childName} need? Read the complete letter aloud if you feel safe to do so.`
    ]
  },
  'activity-inner-child-visualization': {
    titleFrame: (clientName, childName) => `Safe Place for Your ${childName}`,
    promptFrame: (clientName, childName, woundType) => {
      return `${clientName ? `${clientName}, in` : 'In'} this visualization, you will create an internal safe place specifically designed for your ${childName} — a place where the fear of ${WOUND_CORE_FEARS[woundType]} cannot reach. This is a place your Self builds and maintains, where your ${childName} can rest, play, and begin to feel what safety actually feels like.`;
    }
  },
  'activity-reparenting-dialogue': {
    titleFrame: (clientName, childName) => `Reparenting Your ${childName}`,
    promptFrame: (clientName, childName, woundType) => {
      return `${clientName ? `${clientName}, in` : 'In'} this dialogue, you will practice being the parent your ${childName} needed. For your ${woundType} wound, this means providing ${WOUND_CORE_NEEDS[woundType]}. You will speak to your ${childName} as the wise, compassionate adult who knows exactly what this young part needs to hear.`;
    }
  },
  'activity-body-connection': {
    titleFrame: (clientName, childName) => `Your Body's Connection to Your ${childName}`,
    promptFrame: (clientName, childName, woundType, managers, firefighters) => {
      return `${clientName ? `${clientName}, your` : 'Your'} ${woundType} wound lives in your body as much as in your mind. Your Managers create tension patterns (${managers[0]?.name || 'protectors'} may show up as jaw clenching, shoulder tightness, or held breath). Your Firefighters create activation patterns. And your ${childName}'s original pain is stored in specific body regions. This body-based practice will help you locate, listen to, and begin to release what your body has been holding.`;
    }
  },
  'activity-daily-inner-child-checkin': {
    titleFrame: (clientName, childName) => `Daily Check-In with Your ${childName}`,
    promptFrame: (clientName, childName, woundType) => {
      return `${clientName ? `${clientName}, this` : 'This'} daily practice takes just 5 minutes but creates a consistent connection with your ${childName}. Consistency is especially important for healing the ${woundType} wound — your ${childName} needs to experience that you will show up reliably, not just when it's convenient. This practice builds the internal secure attachment that may have been missing.`;
    }
  },
  'activity-trigger-response-plan': {
    titleFrame: (clientName, childName) => `Trigger Response Plan for Your ${childName}`,
    promptFrame: (clientName, childName, woundType, managers, firefighters) => {
      return `${clientName ? `${clientName}, when` : 'When'} your ${woundType} wound gets triggered, your system has a predictable sequence: ${managers[0]?.name || 'Managers'} activate first, trying to prevent the pain. If they fail, ${firefighters[0]?.name || 'Firefighters'} rush in with emergency measures. This plan creates a Self-led alternative — a roadmap for what to do when the wound is activated, so you have options beyond your protectors' automatic strategies.`;
    },
    questionsFrame: (managers, firefighters, exiles, childName, woundType) => [
      `List your top 3 ${woundType} triggers — the situations, words, or experiences that most reliably activate your wound.`,
      managers[0] ? `For each trigger, identify which Manager activates first. How do you know ${managers[0].name} has taken over? What does it feel like in your body?` : 'For each trigger, which protector activates first? What does it feel like?',
      `What does your ${childName} actually need when triggered? Not what your protectors offer — what would genuine comfort look like?`,
      firefighters[0] ? `If ${firefighters[0].name} activates, what is your Self-led alternative? Write a specific script: "When I notice [Firefighter behavior], I will instead..."` : 'What Self-led alternatives can you use when emergency parts activate?',
      'Create a grounding toolkit: 3 sensory anchors, 2 Self-energy phrases, and 1 safe person you can contact when triggered.',
      `Write a brief message from Self to your ${childName} that you can read when triggered: "Right now, you are safe because..."`,
    ]
  },
  'activity-reparenting-practice': {
    titleFrame: (clientName, childName) => `Reparenting Session for Your ${childName}`,
    promptFrame: (clientName, childName, woundType, managers, firefighters, exiles) => {
      return `${clientName ? `${clientName}, in` : 'In'} this reparenting practice, you will provide your ${childName} with the specific corrective experience it needs most: ${WOUND_CORE_NEEDS[woundType]}. You will step into the role of the ideal parent — not the parent you had, but the parent your ${childName} always deserved. Your Managers may feel uncomfortable ("this is silly") and your Firefighters may want to check out. Ask them both to trust you for the next 20 minutes.`;
    },
    questionsFrame: (managers, firefighters, exiles, childName, woundType) => [
      `How did you find your ${childName} today? Where was it? What was it doing? What emotional state was it in?`,
      `What specific reparenting did you provide? How did you offer ${WOUND_CORE_NEEDS[woundType]}?`,
      `How did your ${childName} respond? Was there resistance, relief, tears, skepticism, or something else?`,
      managers[0] ? `Did ${managers[0].name} try to interfere during the practice? How did you handle it?` : 'Did any protector try to interfere? How did you respond from Self?',
      `What felt most healing in this practice? What does your ${childName} want more of?`,
      `What commitment can you make to regular reparenting? Your ${childName} needs consistency more than perfection.`
    ]
  },
  'activity-somatic-practice': {
    titleFrame: (clientName, childName) => `Somatic Healing for Your ${childName}`,
    promptFrame: (clientName, childName, woundType, managers, firefighters) => {
      const managerBody = managers[0] ? (MANAGER_ACTIVITY_GUIDANCE[woundType]?.[managers[0].name]?.bodyLocation || 'tension in your upper body') : 'chronic tension patterns';
      return `${clientName ? `${clientName}, your` : 'Your'} ${woundType} wound lives in your body. Your ${managers[0]?.name || 'Managers'} create ${managerBody}. Your ${childName}'s pain is stored in deeper body regions — often the chest, belly, or throat. This practice uses your body as the primary pathway to connecting with and healing your wounded parts. Listen to your body; it has been trying to tell you what your ${childName} needs.`;
    },
    questionsFrame: (managers, firefighters, exiles, childName, woundType) => {
      const topManager = managers[0];
      const bodyHint = topManager ? (MANAGER_ACTIVITY_GUIDANCE[woundType]?.[topManager.name]?.bodyLocation || 'your body') : 'your body';
      return [
        `During the body scan, where did your ${woundType} wound show up physically? Describe the sensations — temperature, texture, movement, weight.`,
        topManager ? `Could you feel ${topManager.name} in your body? Did you notice ${bodyHint}? What happened when you brought awareness there?` : 'Where did you feel your protectors in your body?',
        `Where does your ${childName} live in your body? What does it feel like physically — small, heavy, cold, tight?`,
        'What happened when you brought compassionate attention to the area holding your wound? Did anything shift, release, or change?',
        `What is your body asking for? Rest, movement, warmth, touch, sound? How can you honor your ${childName}'s physical needs?`,
        'What somatic practice will you continue daily? Even 2 minutes of body awareness can build the bridge between your Self and your wounded parts.'
      ];
    }
  },
  'activity-relationship-patterns': {
    titleFrame: (clientName, childName) => `How Your ${childName} Shows Up in Relationships`,
    promptFrame: (clientName, childName, woundType, managers, firefighters) => {
      return `${clientName ? `${clientName}, your` : 'Your'} ${woundType} wound doesn't just affect your inner world — it shapes every relationship you have. Your Managers (${managers.map(m => m.name).join(', ') || 'protectors'}) create predictable relational patterns, and your Firefighters (${firefighters.map(f => f.name).join(', ') || 'emergency parts'}) activate when relationships trigger your ${childName}. This activity helps you map these patterns so you can begin choosing Self-led responses instead of automatic protective reactions.`;
    },
    questionsFrame: (managers, firefighters, exiles, childName, woundType) => [
      `In close relationships, how does your ${woundType} wound create repeating patterns? What happens over and over, regardless of who the other person is?`,
      managers[0] ? `How does ${managers[0].name} show up in your relationships? What relational strategy does it use?` : 'How do your Managers shape your relationship behavior?',
      firefighters[0] ? `When a relationship triggers your ${childName}, how does ${firefighters[0].name} respond? What does this look like to the other person?` : 'When a relationship triggers your wound, how do your emergency parts respond?',
      `What does your ${childName} actually want in relationships? Beneath the protective strategies, what is it longing for?`,
      'Describe what a Self-led version of your closest relationship would look like. How would you show up differently?',
      `What is one relational pattern you are ready to change? What Self-led alternative will you practice this week?`
    ]
  },
  'activity-critic-transformation': {
    titleFrame: (clientName) => `${clientName ? `${clientName}, Befriend` : 'Befriend'} Your Inner Critic`,
    promptFrame: (clientName, childName, woundType, managers) => {
      const critic = managers.find(m => m.name === 'The Inner Critic');
      const criticScore = critic ? ` (intensity: ${critic.score}/5)` : '';
      return `${clientName ? `${clientName}, your` : 'Your'} Inner Critic${criticScore} is one of the hardest-working parts in your system. It developed to protect your ${childName} from the pain of ${WOUND_CORE_FEARS[woundType]}. Its strategy — harsh self-judgment — made sense when you were small: if you could criticize yourself first, the world's judgment would hurt less. But now, the Critic's methods are creating more pain than they prevent. This practice is not about silencing the Critic — it's about understanding its fear and offering it a new role.`;
    },
    questionsFrame: (managers, firefighters, exiles, childName, woundType) => {
      const critic = managers.find(m => m.name === 'The Inner Critic');
      return [
        `Describe your Inner Critic${critic ? ` (${critic.name})` : ''}. What does it sound like? Whose voice does it use? What are its most common messages?`,
        `Ask your Critic: "What are you afraid would happen to my ${childName} if you stopped criticizing?" Listen without arguing.`,
        `When did this Critic first start its work? How old were you? What was happening in your life that made harsh self-judgment feel necessary?`,
        'Write down the Critic\'s three harshest messages. Then write the Self-led truth that contradicts each one.',
        `What new role could your Inner Critic take on? Instead of harsh judgment, could it become your discernment, your standards, your healthy motivation? What would that sound like?`,
        `Say to your Critic: "I know you've been trying to protect my ${childName}. Thank you. I can lead now. Would you be willing to try a new approach?" What does it say?`
      ];
    }
  },
  'activity-protector-negotiation': {
    titleFrame: (clientName, childName) => `Negotiating with Your ${childName}'s Protectors`,
    promptFrame: (clientName, childName, woundType, managers, firefighters) => {
      return `${clientName ? `${clientName}, before` : 'Before'} you can access your ${childName} for deeper healing, your protectors need to agree to step aside. This negotiation is a critical step — your Managers (${managers.map(m => m.name).join(', ') || 'protectors'}) and Firefighters (${firefighters.map(f => f.name).join(', ') || 'emergency parts'}) need to trust that your Self can handle what they've been guarding. This activity guides you through that conversation.`;
    }
  },
  'activity-trailhead-exploration': {
    titleFrame: (clientName, childName) => `Trailhead Exploration — Paths to Your ${childName}`,
    promptFrame: (clientName, childName, woundType, managers) => {
      return `${clientName ? `${clientName}, a` : 'A'} trailhead is a current-day trigger that leads you back to a part carrying old pain. For your ${woundType} wound, common trailheads include moments of ${WOUND_CORE_FEARS[woundType]}. When ${managers[0]?.name || 'your Managers'} activate, that's a trailhead — a doorway into understanding what your ${childName} is carrying. This activity teaches you to follow the trail with curiosity rather than fear.`;
    }
  },
  'activity-integration-daily-practice': {
    titleFrame: (clientName, childName) => `Daily Integration Practice for Your ${childName}`,
    promptFrame: (clientName, childName, woundType) => {
      return `${clientName ? `${clientName}, integration` : 'Integration'} happens through daily practice, not single breakthroughs. This activity establishes a sustainable daily routine for maintaining connection with your ${childName} and practicing Self-leadership. Your ${childName} needs consistency — the reliable presence that may have been missing during your ${woundType} experiences.`;
    }
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
  const growingEdges = [];
  qualities.forEach(q => {
    const avg = selfEnergy.scores[q]?.average;
    if (avg == null) return;
    const entry = { name: displayNames[q], score: avg };
    if (avg >= 4.0) strengths.push(entry);
    else if (avg < 3.0) growingEdges.push(entry);
  });
  strengths.sort((a, b) => b.score - a.score);
  growingEdges.sort((a, b) => a.score - b.score);
  return { strengths, growingEdges };
}

export function generatePersonalizedActivity(activityId, woundContext, woundPersonalization) {
  if (!woundContext?.primary) {
    return null;
  }

  const template = ACTIVITY_TEMPLATES[activityId];
  if (!template) return null;

  const woundType = woundContext.primary;
  const childName = woundPersonalization?.childName || WOUND_CHILD_NAMES[woundType] || 'Inner Child';
  const clientName = woundContext.clientName;

  const activeParts = woundContext.activeParts || [];
  const managers = activeParts.filter(p => p.type === 'manager');
  const firefighters = activeParts.filter(p => p.type === 'firefighter');
  const exiles = activeParts.filter(p => p.type === 'exile');

  const selfEnergyAnalysis = getSelfEnergyAnalysis(woundContext.selfEnergy);

  const result = {};

  if (template.titleFrame) {
    result.title = template.titleFrame(clientName, childName, woundType);
  }

  if (template.promptFrame) {
    result.prompt = template.promptFrame(clientName, childName, woundType, managers, firefighters, exiles, selfEnergyAnalysis);
  }

  if (template.guidedStepsFrame) {
    result.guidedSteps = template.guidedStepsFrame(managers, firefighters, exiles, childName, woundType, selfEnergyAnalysis);
  }

  if (template.questionsFrame) {
    result.questions = template.questionsFrame(managers, firefighters, exiles, childName, woundType);
  }

  result.woundType = woundType;
  result.childName = childName;

  return result;
}
