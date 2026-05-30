/**
 * Curriculum Personalization Engine
 * Generates customized curriculum based on child wound assessment results
 */

// Wound type constants
export const WOUND_TYPES = {
  ABANDONMENT: 'abandonment',
  SHAME: 'shame',
  NEGLECT: 'neglect',
  BETRAYAL: 'betrayal',
  HELPLESSNESS: 'helplessness'
};

// Priority levels based on assessment scores
export const PRIORITY_LEVELS = {
  LOW: 'low',           // 0-8 points
  MODERATE: 'moderate', // 9-16 points
  HIGH: 'high'          // 17-24 points
};

/**
 * Calculate priority level from score
 */
export const calculatePriorityLevel = (score) => {
  if (score >= 17) return PRIORITY_LEVELS.HIGH;
  if (score >= 9) return PRIORITY_LEVELS.MODERATE;
  return PRIORITY_LEVELS.LOW;
};

/**
 * Rank wounds by score
 */
export const rankWounds = (assessmentResults) => {
  const wounds = [
    { type: WOUND_TYPES.ABANDONMENT, score: assessmentResults.abandonment_score || 0 },
    { type: WOUND_TYPES.SHAME, score: assessmentResults.shame_score || 0 },
    { type: WOUND_TYPES.NEGLECT, score: assessmentResults.neglect_score || 0 },
    { type: WOUND_TYPES.BETRAYAL, score: assessmentResults.betrayal_score || 0 },
    { type: WOUND_TYPES.HELPLESSNESS, score: assessmentResults.helplessness_score || 0 }
  ];

  return wounds
    .sort((a, b) => b.score - a.score)
    .map(wound => ({
      ...wound,
      priority: calculatePriorityLevel(wound.score)
    }));
};

/**
 * Get wound-specific content customizations
 */
export const getWoundCustomizations = (woundType) => {
  const customizations = {
    [WOUND_TYPES.ABANDONMENT]: {
      title: 'Abandonment Wound',
      subtitle: 'The "Lonely" Child',
      coreBurden: 'I am unlovable unless I earn it',
      protectorTypes: ['Caretaker managers', 'People pleasers', 'Clinging parts'],
      focusAreas: [
        'Self-worth independent of others',
        'Healthy attachment patterns',
        'Setting boundaries',
        'Self-soothing techniques',
        'Interdependence vs. codependence'
      ],
      keyThemes: ['connection', 'security', 'self-love', 'boundaries'],
      healingGoals: [
        'Develop secure internal attachment',
        'Build self-worth from within',
        'Create healthy relationship patterns',
        'Practice being alone without fear'
      ],
      innerChildMessage: 'You are lovable just as you are, without needing to earn it',
      color: 'from-blue-400 to-blue-600'
    },
    [WOUND_TYPES.SHAME]: {
      title: 'Shame Wound',
      subtitle: 'The "Unworthy" Child',
      coreBurden: 'I am broken/fundamentally flawed',
      protectorTypes: ['Perfectionist managers', 'Inner critic', 'Hiding parts'],
      focusAreas: [
        'Self-compassion practices',
        'Challenging inner critic',
        'Accepting imperfection',
        'Building self-acceptance',
        'Embracing authenticity'
      ],
      keyThemes: ['worthiness', 'compassion', 'acceptance', 'authenticity'],
      healingGoals: [
        'Develop self-compassion',
        'Silence the inner critic',
        'Accept imperfection as human',
        'Embrace authentic self'
      ],
      innerChildMessage: 'There is nothing fundamentally wrong with you. You are worthy of love',
      color: 'from-gray-400 to-gray-600'
    },
    [WOUND_TYPES.NEGLECT]: {
      title: 'Neglect/Invisibility Wound',
      subtitle: 'The "Lost" Child',
      coreBurden: 'I don\'t matter',
      protectorTypes: ['Dissociative firefighters', 'Passive managers', 'Withdrawing parts'],
      focusAreas: [
        'Identifying and expressing needs',
        'Self-advocacy skills',
        'Reconnecting with emotions',
        'Building self-importance',
        'Finding your voice'
      ],
      keyThemes: ['mattering', 'visibility', 'needs', 'voice'],
      healingGoals: [
        'Recognize your inherent value',
        'Express needs without guilt',
        'Reconnect with emotions',
        'Claim your space in the world'
      ],
      innerChildMessage: 'You matter. Your needs are important and valid',
      color: 'from-amber-400 to-amber-600'
    },
    [WOUND_TYPES.BETRAYAL]: {
      title: 'Betrayal/Fear Wound',
      subtitle: 'The "Terrified" Child',
      coreBurden: 'The world is unsafe',
      protectorTypes: ['Controller managers', 'Hypervigilant parts', 'Aggressive protectors'],
      focusAreas: [
        'Building trust gradually',
        'Safety regulation techniques',
        'Vulnerability practices',
        'Releasing control patterns',
        'Nervous system regulation'
      ],
      keyThemes: ['safety', 'trust', 'control', 'vulnerability'],
      healingGoals: [
        'Develop internal sense of safety',
        'Build capacity for trust',
        'Practice healthy vulnerability',
        'Release need for control'
      ],
      innerChildMessage: 'You are safe now. It\'s okay to trust in small steps',
      color: 'from-red-400 to-red-600'
    },
    [WOUND_TYPES.HELPLESSNESS]: {
      title: 'Helplessness Wound',
      subtitle: 'The "Powerless" Child',
      coreBurden: 'I have no control over what happens to me',
      protectorTypes: ['Over-achiever managers', 'Freeze-response parts', 'Controlling protectors'],
      focusAreas: [
        'Building personal agency',
        'Recognizing areas of influence',
        'Empowerment practices',
        'Releasing learned helplessness',
        'Developing self-efficacy'
      ],
      keyThemes: ['empowerment', 'agency', 'capability', 'resilience'],
      healingGoals: [
        'Reclaim sense of personal power',
        'Recognize choices and agency',
        'Build confidence in decision-making',
        'Transform freeze responses into action'
      ],
      innerChildMessage: 'You are capable and strong. You have the power to shape your life',
      color: 'from-purple-400 to-purple-600'
    }
  };

  return customizations[woundType] || customizations[WOUND_TYPES.ABANDONMENT];
};

/**
 * Customize module title based on wound
 */
export const customizeModuleTitle = (baseTitle, woundType) => {
  const woundCustomization = getWoundCustomizations(woundType);
  
  const titleMappings = {
    'Module 1': `Module 1: Introduction to IFS & Your ${woundCustomization.title}`,
    'Module 2': `Module 2: Meeting Your ${woundCustomization.subtitle} Parts`,
    'Module 3': `Module 3: Developing Self-Leadership for ${woundCustomization.title} Healing`,
    'Module 4': `Module 4: Healing Your ${woundCustomization.subtitle}`,
    'Module 5': `Module 5: Integration & ${woundCustomization.focusAreas[0]}`,
    'Module 6': `Module 6: Daily Practice for ${woundCustomization.keyThemes[0].charAt(0).toUpperCase() + woundCustomization.keyThemes[0].slice(1)}`
  };

  // Extract module number from base title
  const moduleMatch = baseTitle.match(/Module \d+/);
  if (moduleMatch) {
    return titleMappings[moduleMatch[0]] || baseTitle;
  }

  return baseTitle;
};

/**
 * Customize activity based on wound type
 */
export const customizeActivity = (activity, woundType) => {
  const woundCustomization = getWoundCustomizations(woundType);
  
  // Clone the activity to avoid mutation
  const customizedActivity = { ...activity };

  // Customize based on activity type
  if (activity.type === 'reflection' || activity.type === 'journaling') {
    // Add wound-specific prompts
    customizedActivity.prompt = `${activity.prompt}\n\nFocus on your ${woundCustomization.subtitle} and the burden: "${woundCustomization.coreBurden}"`;
    
    // Add wound-specific questions
    const woundSpecificQuestions = generateWoundSpecificQuestions(woundType);
    customizedActivity.questions = [
      ...activity.questions,
      ...woundSpecificQuestions
    ];
  }

  if (activity.type === 'parts_work') {
    // Customize for specific protector types
    customizedActivity.description = `${activity.description}\n\nPay special attention to your ${woundCustomization.protectorTypes.join(', ')}.`;
  }

  if (activity.type === 'meditation' || activity.type === 'exercise') {
    // Add wound-specific visualization
    customizedActivity.guidedSteps = customizeGuidedSteps(
      activity.guidedSteps || [],
      woundType
    );
  }

  return customizedActivity;
};

/**
 * Generate wound-specific reflection questions
 */
const generateWoundSpecificQuestions = (woundType) => {
  const questions = {
    [WOUND_TYPES.ABANDONMENT]: [
      'When do you most fear being abandoned or left alone?',
      'How do you try to prevent people from leaving you?',
      'What would it feel like to know you are lovable without earning it?'
    ],
    [WOUND_TYPES.SHAME]: [
      'What does your inner critic tell you about yourself?',
      'When do you feel most "broken" or flawed?',
      'What would change if you fully accepted yourself as you are?'
    ],
    [WOUND_TYPES.NEGLECT]: [
      'When do you feel most invisible or like you don\'t matter?',
      'What needs of yours have gone unmet?',
      'What would it feel like to know that you matter, just as you are?'
    ],
    [WOUND_TYPES.BETRAYAL]: [
      'What makes you feel most unsafe or unable to trust?',
      'How do you try to maintain control to feel safe?',
      'What would it take for you to feel safe enough to be vulnerable?'
    ]
  };

  return questions[woundType] || [];
};

/**
 * Customize guided meditation/exercise steps
 */
const customizeGuidedSteps = (baseSteps, woundType) => {
  const woundCustomization = getWoundCustomizations(woundType);
  
  const customSteps = [...baseSteps];
  
  // Add wound-specific visualization step
  customSteps.push({
    step: customSteps.length + 1,
    instruction: `Visualize your ${woundCustomization.subtitle} - the part of you carrying the burden "${woundCustomization.coreBurden}"`,
    duration: '2 minutes'
  });

  // Add wound-specific reassurance step
  customSteps.push({
    step: customSteps.length + 1,
    instruction: `From your Self, offer this message to your inner child: "${woundCustomization.innerChildMessage}"`,
    duration: '2 minutes'
  });

  return customSteps;
};

/**
 * Generate complete personalized curriculum
 */
export const generatePersonalizedCurriculum = (assessmentResults, baseModules) => {
  // Rank wounds by priority
  const rankedWounds = rankWounds(assessmentResults);
  const primaryWound = rankedWounds[0];
  const secondaryWound = rankedWounds[1];

  console.log('Generating personalized curriculum:', {
    primaryWound,
    secondaryWound,
    rankedWounds
  });

  // Get wound customizations
  const primaryCustomization = getWoundCustomizations(primaryWound.type);
  const secondaryCustomization = getWoundCustomizations(secondaryWound.type);

  // Customize each module
  const personalizedModules = baseModules.map((module, index) => {
    // Determine which wound to focus on for this module
    // Primary wound gets 60% focus, secondary gets 30%, others get 10%
    const focusWound = index % 3 === 0 ? secondaryWound.type : primaryWound.type;
    
    return {
      ...module,
      id: `personalized-${module.id}`,
      title: customizeModuleTitle(module.title, primaryWound.type),
      description: `${module.description}\n\nThis module is customized for your ${primaryCustomization.title}, focusing on ${primaryCustomization.focusAreas[index % primaryCustomization.focusAreas.length]}.`,
      primaryWoundFocus: primaryWound.type,
      secondaryWoundFocus: secondaryWound.type,
      customization: primaryCustomization,
      steps: module.steps.map(step => {
        if (step.type === 'activity') {
          return {
            ...step,
            data: customizeActivity(step.data, focusWound)
          };
        }
        return step;
      })
    };
  });

  return {
    modules: personalizedModules,
    woundProfile: {
      primary: {
        type: primaryWound.type,
        score: primaryWound.score,
        priority: primaryWound.priority,
        customization: primaryCustomization
      },
      secondary: {
        type: secondaryWound.type,
        score: secondaryWound.score,
        priority: secondaryWound.priority,
        customization: secondaryCustomization
      },
      all: rankedWounds
    },
    focusAreas: primaryCustomization.focusAreas,
    healingGoals: primaryCustomization.healingGoals,
    generatedAt: new Date().toISOString()
  };
};

/**
 * Get recommended next module based on progress
 */
export const getRecommendedNextModule = (completedModules, personalizedCurriculum) => {
  const allModules = personalizedCurriculum.modules;
  
  // Find first incomplete module
  const nextModule = allModules.find(module => 
    !completedModules.includes(module.id)
  );

  return nextModule || null;
};

/**
 * Calculate overall healing progress
 */
export const calculateHealingProgress = (completedModules, completedActivities, woundProfile) => {
  const totalModules = 6; // Standard curriculum has 6 modules
  const moduleProgress = (completedModules.length / totalModules) * 100;
  
  // Weight progress by wound priority
  const primaryWoundWeight = 0.6;
  const secondaryWoundWeight = 0.3;
  const otherWoundWeight = 0.1;

  // Calculate weighted progress
  const weightedProgress = 
    (moduleProgress * primaryWoundWeight) +
    (completedActivities.length * 2 * secondaryWoundWeight) +
    (completedModules.length * 5 * otherWoundWeight);

  return {
    overall: Math.min(Math.round(weightedProgress), 100),
    modules: Math.round(moduleProgress),
    activities: completedActivities.length,
    primaryWoundFocus: woundProfile.primary.type,
    estimatedWeeksRemaining: Math.max(0, Math.ceil((100 - weightedProgress) / 12.5)) // ~8 weeks total
  };
};

/**
 * Generate personalized recommendations
 */
export const generateRecommendations = (woundProfile, progress) => {
  const primaryCustomization = woundProfile.primary.customization;
  
  const recommendations = [];

  // Based on progress level
  if (progress.overall < 25) {
    recommendations.push({
      type: 'focus',
      title: 'Build Awareness',
      description: `Focus on understanding your ${primaryCustomization.subtitle} and identifying your ${primaryCustomization.protectorTypes[0]}.`,
      priority: 'high'
    });
  } else if (progress.overall < 50) {
    recommendations.push({
      type: 'practice',
      title: 'Deepen Connection',
      description: `Practice dialoguing with your parts and building Self-leadership around ${primaryCustomization.focusAreas[0]}.`,
      priority: 'high'
    });
  } else if (progress.overall < 75) {
    recommendations.push({
      type: 'healing',
      title: 'Unburden Your Exile',
      description: `Begin the unburdening process for your ${primaryCustomization.subtitle}, releasing the burden "${primaryCustomization.coreBurden}".`,
      priority: 'high'
    });
  } else {
    recommendations.push({
      type: 'integration',
      title: 'Integrate & Maintain',
      description: `Focus on integrating your healing into daily life and maintaining your progress with ${primaryCustomization.keyThemes[0]} practices.`,
      priority: 'high'
    });
  }

  // Add wound-specific recommendations
  primaryCustomization.healingGoals.forEach((goal, index) => {
    if (index < 2) { // Top 2 goals
      recommendations.push({
        type: 'goal',
        title: goal,
        description: `Work towards: ${goal}`,
        priority: index === 0 ? 'high' : 'medium'
      });
    }
  });

  return recommendations;
};

export default {
  WOUND_TYPES,
  PRIORITY_LEVELS,
  rankWounds,
  getWoundCustomizations,
  customizeModuleTitle,
  customizeActivity,
  generatePersonalizedCurriculum,
  getRecommendedNextModule,
  calculateHealingProgress,
  generateRecommendations
};
