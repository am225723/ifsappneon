// Cross-references the four core assessments (Wound Patterns, Parts System,
// Self-Energy, Attachment) so Assessment Insights can explain how a client's
// results actually relate to each other, instead of summarizing each in isolation.
import { aiCurriculumPersonalizer } from './aiCurriculumPersonalizer';

export const WOUND_LABELS = {
  abandonment: 'Abandonment',
  shame: 'Shame',
  neglect: 'Neglect',
  betrayal: 'Betrayal',
  helplessness: 'Helplessness'
};

export const PARTS_TYPE_LABELS = { manager: 'Manager', firefighter: 'Firefighter', exile: 'Exile' };

export const SELF_QUALITY_LABELS = {
  calmness: 'Calmness',
  curiosity: 'Curiosity',
  compassion: 'Compassion',
  confidence: 'Confidence',
  courage: 'Courage',
  clarity: 'Clarity',
  creativity: 'Creativity',
  connectedness: 'Connectedness'
};

export const ATTACHMENT_LABELS = {
  secure: 'Secure',
  anxious: 'Anxious-Preoccupied',
  avoidant: 'Dismissive-Avoidant',
  disorganized: 'Fearful-Avoidant'
};

export const ATTACHMENT_DESCRIPTIONS = {
  secure: 'Secure patterns often reflect comfort with closeness, repair, and asking for support.',
  anxious: 'Anxious patterns may show a part that seeks reassurance, closeness, or signs that the relationship is okay.',
  avoidant: 'Avoidant patterns may show protective parts that create distance, self-reliance, or emotional space to feel safe.',
  disorganized: 'Disorganized patterns may show parts with mixed needs: wanting closeness while also feeling unsure, guarded, or overwhelmed.'
};

// Grounded in the app's own wound -> protector language (see the protectorQuestions
// in Assessments.jsx) and the protective-part definitions used to identify specific
// parts from the Parts System Assessment. This is what lets insights name real,
// specific connections instead of generic boilerplate.
const WOUND_META = {
  abandonment: {
    protectors: [{ name: 'The People Pleaser', type: 'manager' }, { name: 'The Worrier', type: 'manager' }],
    protectorArchetype: 'people-pleasing or hypervigilant managers who work to keep others close',
    exile: { name: 'The Lonely Child', theme: 'loneliness and the longing to never be left again' },
    selfQuality: 'confidence',
    secondarySelfQuality: 'connectedness',
    attachment: 'anxious'
  },
  shame: {
    protectors: [{ name: 'The Inner Critic', type: 'manager' }, { name: 'The Perfectionist', type: 'manager' }, { name: 'The Self-Destructive Part', type: 'firefighter' }],
    protectorArchetype: 'an Inner Critic or Perfectionist that tries to hide perceived flaws before anyone else can find them',
    exile: { name: 'The Shamed Child', theme: 'a belief of being fundamentally flawed or not enough' },
    selfQuality: 'compassion',
    secondarySelfQuality: 'clarity',
    attachment: 'disorganized'
  },
  neglect: {
    protectors: [{ name: 'The Distractor', type: 'firefighter' }, { name: 'The Numbing Part', type: 'firefighter' }],
    protectorArchetype: 'withdrawal or numbing protectors that stopped expecting needs to be met',
    exile: { name: 'The Lonely Child', theme: 'feeling invisible and unseen' },
    selfQuality: 'curiosity',
    secondarySelfQuality: 'connectedness',
    attachment: 'avoidant'
  },
  betrayal: {
    protectors: [{ name: 'The Controller', type: 'manager' }, { name: 'The Impulse Part', type: 'firefighter' }],
    protectorArchetype: 'controlling or hypervigilant managers that scan for the next broken promise',
    exile: { name: 'The Grieving Child', theme: 'grief over trust that was broken' },
    selfQuality: 'calmness',
    secondarySelfQuality: 'courage',
    attachment: 'avoidant'
  },
  helplessness: {
    protectors: [{ name: 'The Planner', type: 'manager' }, { name: 'The Shutdown Part', type: 'firefighter' }],
    protectorArchetype: 'freeze, collapse, or over-planning protectors that try to prevent feeling powerless again',
    exile: { name: 'The Scared Child', theme: 'fear, smallness, and vulnerability' },
    selfQuality: 'courage',
    secondarySelfQuality: 'confidence',
    attachment: 'disorganized'
  }
};

function pickLabel(map, key, fallback = null) {
  if (!key) return fallback;
  return map[key] || key;
}

function woundIntensity(score = 0) {
  if (score >= 18) return 'High';
  if (score >= 12) return 'Moderate';
  if (score >= 6) return 'Mild';
  return 'Low';
}

function rankedEntries(data) {
  return Array.isArray(data?.ranked) ? data.ranked.filter(Boolean) : null;
}

function joinWithAnd(items) {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list.join('');
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
}

export function getAttachmentPrimarySecondary(assessment) {
  const primary = assessment?.primary || assessment?.primaryPattern || assessment?.style || assessment?.ranked?.[0]?.[0] || null;
  const secondary = assessment?.secondary || assessment?.secondaryPattern || assessment?.ranked?.[1]?.[0] || null;
  return { primary, secondary };
}

/**
 * Builds the Assessment Insights cards. Unlike a per-assessment summary, every
 * section here tries to connect at least two assessments together, and calls out
 * whether a predicted connection is actually confirmed by the client's own data.
 */
export function buildAssessmentInsights({ wounds, parts, selfEnergy, attachment, identifiedParts = [] } = {}) {
  const completedCount = [wounds, parts, selfEnergy, attachment].filter(Boolean).length;
  const sections = [];

  const woundKey = wounds?.primary_wound || null;
  const woundLabel = pickLabel(WOUND_LABELS, woundKey);
  const secondaryWoundKey = wounds?.secondary_wound || null;
  const secondaryWoundLabel = pickLabel(WOUND_LABELS, secondaryWoundKey);
  const woundMeta = woundKey ? WOUND_META[woundKey] : null;
  const woundScore = woundKey ? (wounds?.scores?.[woundKey] ?? wounds?.[`${woundKey}_score`] ?? 0) : 0;

  const partsRanked = rankedEntries(parts);
  const partsPrimaryKey = parts?.primary || partsRanked?.[0]?.[0] || null;
  const managerCount = identifiedParts.filter((p) => p.type === 'manager').length;
  const firefighterCount = identifiedParts.filter((p) => p.type === 'firefighter').length;
  const exileCount = identifiedParts.filter((p) => p.type === 'exile').length;
  const topIdentifiedParts = [...identifiedParts].sort((a, b) => (b.intensity || 0) - (a.intensity || 0)).slice(0, 3);

  const selfRanked = rankedEntries(selfEnergy);
  const selfStrengthKey = selfRanked?.[0]?.[0] || null;
  const selfGrowthEdgeKey = selfRanked && selfRanked.length ? selfRanked[selfRanked.length - 1][0] : null;

  const { primary: attachmentPrimaryKey, secondary: attachmentSecondaryKey } = getAttachmentPrimarySecondary(attachment || {});

  const matchedProtectorNames = woundMeta
    ? identifiedParts.filter((p) => woundMeta.protectors.some((mp) => mp.name === p.name)).map((p) => p.name)
    : [];
  const selfEnergyMatch = !!(woundMeta && selfGrowthEdgeKey && [woundMeta.selfQuality, woundMeta.secondarySelfQuality].includes(selfGrowthEdgeKey));
  const attachmentMatch = !!(woundMeta && attachmentPrimaryKey && attachmentPrimaryKey === woundMeta.attachment);
  const selfReportedProtector = (woundKey && wounds?.protectorPatterns) ? wounds.protectorPatterns[woundKey] : null;

  sections.push({
    id: 'wound-summary',
    title: 'Wound pattern summary',
    body: woundLabel
      ? `Your Wound Patterns Assessment points to ${woundLabel} (${woundIntensity(woundScore)} intensity, ${woundScore}/25)${secondaryWoundLabel ? `, with ${secondaryWoundLabel} also present` : ''}. This is a compassionate clue for parts work, not a label or diagnosis.`
      : 'A Wound Patterns Assessment has not been completed yet, so this area can stay open and curious.'
  });

  sections.push({
    id: 'parts-summary',
    title: 'Parts system summary',
    body: parts
      ? `Your Parts System Assessment leans toward ${pickLabel(PARTS_TYPE_LABELS, partsPrimaryKey)} activity. ${identifiedParts.length ? `${identifiedParts.length} specific part${identifiedParts.length === 1 ? '' : 's'} stood out (${managerCount} manager, ${firefighterCount} firefighter, ${exileCount} exile).` : 'No single part crossed the activity threshold yet.'}`
      : 'Parts System Assessment data is not complete yet; the Inner System Map can help name protectors and younger parts over time.',
    bullets: topIdentifiedParts.length ? topIdentifiedParts.map((p) => `${p.name} (${String(p.intensityLabel || '').toLowerCase()}) — ${p.role}`) : undefined
  });

  sections.push({
    id: 'self-energy-summary',
    title: 'Self-energy strengths & growth edges',
    body: selfEnergy
      ? `${pickLabel(SELF_QUALITY_LABELS, selfStrengthKey)} currently looks like your most accessible Self quality, while ${pickLabel(SELF_QUALITY_LABELS, selfGrowthEdgeKey)} may need more time, permission, or support before it feels available.`
      : 'Self-energy strengths and growth edges can be tracked through the Self-Energy Assessment and daily reflections.'
  });

  sections.push({
    id: 'attachment-summary',
    title: 'Attachment pattern summary',
    body: attachmentPrimaryKey
      ? `Your Attachment Pattern Assessment leans ${pickLabel(ATTACHMENT_LABELS, attachmentPrimaryKey)}${attachmentSecondaryKey ? `, with ${pickLabel(ATTACHMENT_LABELS, attachmentSecondaryKey)} also present` : ''}. ${ATTACHMENT_DESCRIPTIONS[attachmentPrimaryKey] || ''}`
      : 'Attachment Pattern Assessment data is not complete yet; this section will deepen when it is available.'
  });

  if (woundMeta) {
    const bullets = [];
    bullets.push(matchedProtectorNames.length
      ? `Confirmed: ${woundLabel} commonly shows up with ${woundMeta.protectorArchetype}. Your Parts assessment already identified ${joinWithAnd(matchedProtectorNames)} as active.`
      : `Pattern to watch: ${woundLabel} commonly shows up with ${woundMeta.protectorArchetype}. Your Parts assessment hasn't confirmed this specific part yet — worth noticing in daily life.`);
    if (selfReportedProtector) {
      bullets.push(`Self-reported: when asked directly, you answered "${selfReportedProtector.answer}" to having a protector like this — ${selfReportedProtector.protectorType}.`);
    }
    bullets.push(`IFS theory suggests a part like ${woundMeta.exile.name} may be underneath, carrying ${woundMeta.exile.theme}.`);
    sections.push({
      id: 'wound-parts-connection',
      title: 'How your wound and protectors connect',
      body: `${woundLabel} and your protective parts likely reinforce each other: the more the wound gets touched, the harder these protectors work to keep it from being felt.`,
      bullets
    });
  } else {
    sections.push({
      id: 'wound-parts-connection',
      title: 'How your wound and protectors connect',
      body: 'Complete both the Wound Patterns and Parts System assessments to see how your protectors may relate to a specific wound.'
    });
  }

  if (woundMeta) {
    const bullets = [];
    bullets.push(selfEnergy
      ? (selfEnergyMatch
        ? `Confirmed: ${woundLabel} often makes ${pickLabel(SELF_QUALITY_LABELS, woundMeta.selfQuality)} harder to access, and that is currently your lowest-scoring Self quality.`
        : `Pattern to watch: ${woundLabel} often makes ${pickLabel(SELF_QUALITY_LABELS, woundMeta.selfQuality)} harder to access. Your current growth edge is ${pickLabel(SELF_QUALITY_LABELS, selfGrowthEdgeKey)} instead — a good detail to bring to your Advisor.`)
      : `Once you complete the Self-Energy Assessment, this can show whether ${pickLabel(SELF_QUALITY_LABELS, woundMeta.selfQuality)} feels harder to access when this wound is active.`);
    bullets.push(attachmentPrimaryKey
      ? (attachmentMatch
        ? `Confirmed: ${woundLabel} often pairs with ${pickLabel(ATTACHMENT_LABELS, woundMeta.attachment)} relationship patterns, which matches your Attachment assessment.`
        : `Different pattern: ${woundLabel} often pairs with ${pickLabel(ATTACHMENT_LABELS, woundMeta.attachment)} patterns, but your results show ${pickLabel(ATTACHMENT_LABELS, attachmentPrimaryKey)} as primary. That's not a contradiction — it may mean this wound shows up more in how you treat yourself than in your relationships.`)
      : `Once you complete the Attachment Pattern Assessment, this can show whether ${pickLabel(ATTACHMENT_LABELS, woundMeta.attachment)} patterns show up in your relationships too.`);
    sections.push({
      id: 'self-attachment-connection',
      title: 'How this may affect Self-energy and relationships',
      body: `${woundLabel} does not just live in one assessment — it can quietly shape which Self qualities feel available and how safe closeness feels.`,
      bullets
    });
  }

  if (completedCount >= 2) {
    const clauses = [];
    if (woundLabel) {
      clauses.push(`When your ${woundLabel} pattern gets activated`);
      clauses.push(matchedProtectorNames.length
        ? `parts like ${joinWithAnd(matchedProtectorNames)} tend to respond quickly`
        : `protectors such as ${woundMeta?.protectorArchetype || 'managers or firefighters'} tend to respond quickly`);
      clauses.push(woundMeta ? `to keep ${woundMeta.exile.name} from being felt` : 'to keep a younger, more vulnerable part from being felt');
    } else if (partsPrimaryKey) {
      clauses.push(`Your system currently shows more ${pickLabel(PARTS_TYPE_LABELS, partsPrimaryKey)} activity than anything else`);
    }
    const sentence1 = clauses.length ? `${clauses.join(', ')}.` : '';
    const sentence2 = selfGrowthEdgeKey
      ? `While this is happening, ${pickLabel(SELF_QUALITY_LABELS, selfGrowthEdgeKey)} is likely the first Self quality to feel out of reach, which can make the moment feel bigger than it is.`
      : '';
    const sentence3 = attachmentPrimaryKey
      ? `In relationships, this can show up as ${pickLabel(ATTACHMENT_LABELS, attachmentPrimaryKey).toLowerCase()} patterns — ${(ATTACHMENT_DESCRIPTIONS[attachmentPrimaryKey] || '').toLowerCase()}`
      : '';

    sections.push({
      id: 'system-loop',
      title: 'Your system in motion',
      span: 'full',
      body: [sentence1, sentence2, sentence3].filter(Boolean).join(' ') || 'As more assessments are completed, this section will describe how your wound, protectors, Self-energy, and relationship patterns move together as one system.',
      bullets: ['The useful question to hold: which part is trying to help right now, and what does it fear would happen if it softened?']
    });
  }

  const woundProfile = woundKey ? aiCurriculumPersonalizer?.woundProfiles?.[woundKey] : null;
  sections.push({
    id: 'curriculum-focus',
    title: 'Suggested curriculum focus',
    body: woundProfile
      ? `Curriculum modules focused on ${woundProfile.focus.slice(0, 3).join(', ')} are tailored to your ${woundProfile.name} pattern.`
      : (woundLabel || partsPrimaryKey ? 'Continue the curriculum module that helps you notice protectors, unblend, and listen for the younger part or unmet need underneath.' : 'Start or continue the Curriculum / IFS Path before adding too many side practices.'),
    bullets: woundProfile ? woundProfile.healingGoals.slice(0, 3) : undefined
  });

  const dominantType = (firefighterCount > managerCount && firefighterCount >= exileCount)
    ? 'firefighter'
    : (exileCount > managerCount && exileCount > firefighterCount ? 'exile' : 'manager');
  const lifeIntegrationSuggestion = {
    manager: 'Try "Return to Self-Energy" when you notice yourself over-planning or over-controlling, then ask what the manager is afraid would happen if it relaxed.',
    firefighter: 'Try "Reflect on a Trigger" soon after an impulsive or numbing moment, while the memory is fresh, to find the feeling the firefighter was reacting to.',
    exile: 'Try a brief Self-to-part check-in that offers comfort to the younger part before problem-solving anything.'
  };
  sections.push({
    id: 'life-integration',
    title: 'Suggested Life Integration practice',
    body: identifiedParts.length ? lifeIntegrationSuggestion[dominantType] : 'Use Return to Self-Energy after activation, or Reflect on a Trigger when a part reacts strongly in daily life.'
  });

  sections.push({
    id: 'inner-system-map',
    title: 'Suggested Inner System Map focus',
    body: topIdentifiedParts.length
      ? `Add ${joinWithAnd(topIdentifiedParts.map((p) => p.name))} to your map${woundMeta ? `, then connect ${topIdentifiedParts[0].name} to ${woundMeta.exile.name} to sketch out what it may be protecting` : ''}.`
      : (partsPrimaryKey ? `Add one part connected to ${pickLabel(PARTS_TYPE_LABELS, partsPrimaryKey)} activity and map what it protects, fears, and needs from Self-energy.` : 'Add one part you notice often, then map its role, burden, and relationship to other parts.')
  });

  const advisorPrompts = [];
  if (woundLabel) advisorPrompts.push(`Does the ${woundLabel} pattern feel accurate, or does something feel off about it?`);
  if (matchedProtectorNames.length) advisorPrompts.push(`What is ${matchedProtectorNames[0]} afraid would happen if it stepped back?`);
  if (woundMeta && attachmentPrimaryKey && !attachmentMatch) advisorPrompts.push(`Why might ${pickLabel(ATTACHMENT_LABELS, attachmentPrimaryKey)} show up instead of the ${pickLabel(ATTACHMENT_LABELS, woundMeta.attachment)} pattern that's common with this wound?`);
  sections.push({
    id: 'advisor-prep',
    title: 'What to bring to Advisor',
    body: 'Bring one pattern that feels accurate, one that feels wrong or incomplete, and one open question.',
    bullets: advisorPrompts.length ? advisorPrompts : undefined
  });

  return sections;
}
