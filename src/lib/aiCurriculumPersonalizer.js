// AI-Powered Curriculum Personalization Service
// Uses assessment results to dynamically tailor the curriculum to each child's wound profile

class AICurriculumPersonalizer {
  constructor() {
    this.woundProfiles = {
      abandonment: {
        name: "Abandonment (Lonely Child)",
        focus: ["building secure attachment", "self-soothing", "boundary setting", "trust building"],
        activities: ["grounding exercises", "attachment visualization", "safety protocols"],
        modules: ["inner-child-connection", "secure-attachment-building", "self-soothing-mastery"],
        healingGoals: [
          "Develop internal secure attachment",
          "Learn self-soothing techniques",
          "Build healthy boundaries",
          "Heal trust issues",
          "Reduce fear of abandonment"
        ]
      },
      shame: {
        name: "Shame (Unworthy Child)",
        focus: ["self-compassion", "inner critic work", "worthiness cultivation", "self-acceptance"],
        activities: ["compassion meditation", "inner critic dialogue", "worthiness affirmations"],
        modules: ["inner-child-connection", "self-compassion-mastery", "inner-critic-work"],
        healingGoals: [
          "Cultivate self-compassion",
          "Transform inner critic",
          "Build sense of worthiness",
          "Practice self-acceptance",
          "Release shame burdens"
        ]
      },
      neglect: {
        name: "Neglect (Lost Child)",
        focus: ["self-advocacy", "needs identification", "self-care practices", "visibility work"],
        activities: ["needs assessment", "self-care planning", "boundary learning", "expression exercises"],
        modules: ["inner-child-connection", "needs-identification", "self-advocacy-skills"],
        healingGoals: [
          "Identify and honor needs",
          "Develop self-advocacy skills",
          "Practice consistent self-care",
          "Find authentic expression",
          "Build sense of mattering"
        ]
      },
      betrayal: {
        name: "Betrayal (Terrified Child)",
        focus: ["safety regulation", "trust rebuilding", "vulnerability work", "fear management"],
        activities: ["safety protocols", "gradual trust exercises", "fear processing"],
        modules: ["inner-child-connection", "safety-regulation", "trust-rebuilding"],
        healingGoals: [
          "Establish internal safety",
          "Regulate fear responses",
          "Rebuild trust capacity",
          "Practice healthy vulnerability",
          "Heal trauma responses"
        ]
      },
      helplessness: {
        name: "Helplessness (Powerless Child)",
        focus: ["agency building", "empowerment work", "choice reclamation", "learned helplessness healing"],
        activities: ["empowerment meditation", "agency affirmations", "choice-building exercises"],
        modules: ["inner-child-connection", "agency-building", "empowerment-practice"],
        healingGoals: [
          "Reclaim sense of personal power",
          "Build confidence in ability to create change",
          "Heal learned helplessness patterns",
          "Develop healthy assertiveness",
          "Trust your capacity to handle challenges"
        ]
      }
    };
  }

  /**
   * Analyze assessment results and create personalized curriculum
   * @param {Array} assessmentResults - Assessment wound scores
   * @returns {Object} Personalized curriculum configuration
   */
  analyzeAndPersonalize(assessmentResults) {
    console.log('🧠 AI analyzing assessment results for personalization...');
    
    if (!assessmentResults || assessmentResults.length === 0) {
      console.log('❌ No assessment results provided');
      return this.getDefaultCurriculum();
    }

    const validResults = assessmentResults.filter(r => r && r.id && typeof r.score === 'number');
    if (validResults.length === 0) {
      console.log('❌ No valid assessment results after filtering');
      return this.getDefaultCurriculum();
    }

    const sortedResults = [...validResults].sort((a, b) => b.score - a.score);
    const primaryWound = sortedResults[0];
    const secondaryWound = sortedResults[1] || null;
    const tertiaryWound = sortedResults.slice(2);

    if (!this.woundProfiles[primaryWound.id]) {
      console.log(`❌ Unknown wound type: ${primaryWound.id}`);
      return this.getDefaultCurriculum();
    }

    const intensity = this.calculateWoundIntensity(primaryWound.score || 0);
    
    console.log(`📊 Primary wound: ${primaryWound.id} (${primaryWound.score}/25) - ${intensity} intensity`);
    console.log(`📊 Secondary wound: ${secondaryWound?.id} (${secondaryWound?.score}/25)`);
    console.log(`📊 Tertiary wounds: ${tertiaryWound.map(w => `${w.id}(${w.score})`).join(', ')}`);

    const woundRanking = sortedResults.map(w => ({ type: w.id, score: w.score || 0 }));
    const primaryProfile = this.woundProfiles[primaryWound.id];
    const focusAreas = primaryProfile ? [...primaryProfile.focus] : [];

    const personalizedCurriculum = {
      primaryWound: primaryWound.id,
      secondaryWound: secondaryWound?.id || null,
      tertiaryWounds: tertiaryWound.map(w => w.id),
      intensity,
      woundRanking,
      focusAreas,
      personalizedModules: this.generatePersonalizedModules(primaryWound, secondaryWound, tertiaryWound),
      healingPlan: this.createHealingPlan(primaryWound, secondaryWound, intensity),
      adaptations: this.generateAdaptations(primaryWound, secondaryWound, intensity),
      timeline: this.calculatePersonalizedTimeline(primaryWound, intensity),
      successMetrics: this.defineSuccessMetrics(primaryWound, secondaryWound)
    };

    console.log('✅ AI personalization complete');
    return personalizedCurriculum;
  }

  /**
   * Calculate wound intensity level
   * @param {number} score - Wound assessment score (0-24)
   * @returns {string} Intensity level
   */
  calculateWoundIntensity(score) {
    if (score >= 20) return 'severe';
    if (score >= 15) return 'high';
    if (score >= 10) return 'moderate';
    if (score >= 5) return 'mild';
    return 'minimal';
  }

  /**
   * Generate personalized module sequence based on wound profile
   * @param {Object} primaryWound - Primary wound data
   * @param {Object} secondaryWound - Secondary wound data
   * @param {Array} tertiaryWounds - Tertiary wound data
   * @returns {Array} Personalized module sequence
   */
  generatePersonalizedModules(primaryWound, secondaryWound, tertiaryWounds) {
    const primaryProfile = this.woundProfiles[primaryWound.id];
    const secondaryProfile = secondaryWound ? this.woundProfiles[secondaryWound.id] : null;
    
    const specificChangesMap = this.getSpecificChangesMap();

    const baseModules = [
      {
        id: 'foundation-welcome',
        title: 'Welcome to Your Healing Journey',
        description: 'Foundation introduction to the healing process',
        category: 'introduction',
        order: 1,
        isRequired: true,
        estimatedMinutes: 15,
        personalizedContent: {
          woundFocus: primaryProfile.name,
          message: `Your healing journey will focus on healing your ${primaryProfile.name}`,
          expectations: this.setExpectations(primaryWound, primaryProfile),
          specificChanges: `Standard: General welcome and overview. Personalized for ${primaryWound.id}: ${specificChangesMap[primaryWound.id]?.welcome || 'Tailored opening based on wound profile'}`
        }
      }
    ];

    const primaryModules = primaryProfile.modules.map((moduleId, index) => ({
      id: `${primaryWound.id}-${moduleId}`,
      title: this.generateModuleTitle(primaryWound.id, moduleId),
      description: this.generateModuleDescription(primaryWound.id, moduleId),
      category: 'inner_child_healing',
      order: index + 2,
      isRequired: true,
      estimatedMinutes: this.estimateModuleTime(primaryWound.id, moduleId),
      personalizedContent: {
        woundFocus: primaryProfile.name,
        healingGoals: primaryProfile.healingGoals,
        activities: primaryProfile.activities,
        adaptations: this.getActivityAdaptations(primaryWound.id),
        specificChanges: specificChangesMap[primaryWound.id]?.modules?.[index] || `Adapted for ${primaryProfile.name} with targeted healing exercises and wound-specific reflections`
      },
      innerChildFocus: true
    }));

    const integrationModules = [];
    if (secondaryProfile) {
      integrationModules.push({
        id: 'integration-secondary-wound',
        title: `Integrating ${secondaryProfile.name} Healing`,
        description: `Addressing both ${primaryProfile.name} and ${secondaryProfile.name} patterns`,
        category: 'integration',
        order: primaryModules.length + 2,
        isRequired: true,
        estimatedMinutes: 25,
        personalizedContent: {
          woundFocus: `${primaryProfile.name} + ${secondaryProfile.name}`,
          message: `Integration work for ${primaryProfile.name} and ${secondaryProfile.name}`,
          combinedFocus: [primaryProfile.focus, secondaryProfile.focus].flat(),
          healingGoals: [...primaryProfile.healingGoals.slice(0, 2), ...secondaryProfile.healingGoals.slice(0, 2)],
          activities: [...primaryProfile.activities, ...secondaryProfile.activities],
          specificChanges: `Standard: Single-wound focus. Personalized: Combines ${primaryWound.id} and ${secondaryWound.id} healing — addresses how ${primaryProfile.name} and ${secondaryProfile.name} patterns interact and reinforce each other`
        }
      });
    }

    const advancedModules = [];
    const intensity = this.calculateWoundIntensity(primaryWound.score);
    
    if (intensity === 'severe' || intensity === 'high') {
      advancedModules.push({
        id: 'intensive-healing-protocols',
        title: 'Intensive Healing Protocols',
        description: 'Deep healing work for high-intensity wounds',
        category: 'protocols',
        order: primaryModules.length + integrationModules.length + 2,
        isRequired: true,
        estimatedMinutes: 30,
        personalizedContent: {
          woundFocus: primaryProfile.name,
          intensityLevel: intensity,
          specializedTechniques: this.getIntensiveTechniques(primaryWound.id),
          healingGoals: [`Deep ${primaryWound.id} wound processing`, `${intensity === 'severe' ? 'Gentle stabilization' : 'Gradual deepening'} techniques`],
          specificChanges: `Standard: Not included at lower intensity levels. Added because ${primaryWound.id} score is ${intensity}: Includes specialized ${primaryProfile.name} protocols with extra safety measures, pacing adjustments, and professional support recommendations`
        }
      });
    }

    const consolidationModules = [
      {
        id: 'healing-consolidation',
        title: 'Consolidating Your Healing',
        description: 'Integrate your learning and plan for continued growth',
        category: 'integration',
        order: baseModules.length + primaryModules.length + integrationModules.length + advancedModules.length + 1,
        isRequired: true,
        estimatedMinutes: 20,
        personalizedContent: {
          woundFocus: primaryProfile.name,
          achievedGoals: primaryProfile.healingGoals,
          ongoingPractice: this.getOngoingPractices(primaryWound.id),
          healingGoals: [`Integrate ${primaryWound.id} healing insights`, 'Build sustainable self-care plan'],
          specificChanges: `Standard: Generic review and next steps. Personalized for ${primaryWound.id}: Consolidation focused on ${primaryProfile.focus.slice(0, 2).join(' and ')}, with ongoing practices tailored to ${primaryProfile.name} recovery`
        }
      }
    ];

    return [...baseModules, ...primaryModules, ...integrationModules, ...advancedModules, ...consolidationModules];
  }

  /**
   * Create comprehensive healing plan
   * @param {Object} primaryWound - Primary wound
   * @param {Object} secondaryWound - Secondary wound
   * @param {string} intensity - Intensity level
   * @returns {Object} Healing plan configuration
   */
  createHealingPlan(primaryWound, secondaryWound, intensity) {
    const primaryProfile = this.woundProfiles[primaryWound.id];
    
    return {
      phase1: {
        name: "Safety and Connection",
        duration: intensity === 'severe' ? '3-4 weeks' : '2-3 weeks',
        focus: ["establish safety", "connect with inner child", "build trust"],
        activities: ["safety protocols", "inner child introduction", "trust building"],
        goals: ["Feel safe in the process", "Meet your inner child", "Establish connection"]
      },
      phase2: {
        name: "Wound-Specific Healing",
        duration: intensity === 'severe' ? '6-8 weeks' : '4-6 weeks',
        focus: primaryProfile.focus,
        activities: primaryProfile.activities,
        goals: primaryProfile.healingGoals
      },
      phase3: {
        name: "Integration and Strengthening",
        duration: '3-4 weeks',
        focus: secondaryWound ? [`integrating ${primaryProfile.name}`, `addressing ${secondaryWound?.name}`] : ["integrating healing", "building strength"],
        activities: ["integration exercises", "strength building", "future planning"],
        goals: ["Integrate learning", "Build resilience", "Plan for continued growth"]
      }
    };
  }

  /**
   * Generate adaptations for the user's specific needs
   * @param {Object} primaryWound - Primary wound
   * @param {Object} secondaryWound - Secondary wound
   * @param {string} intensity - Intensity level
   * @returns {Object} Adaptations configuration
   */
  generateAdaptations(primaryWound, secondaryWound, intensity) {
    const adaptations = {
      pacing: this.calculatePacing(intensity),
      supportLevel: this.calculateSupportLevel(intensity),
      exerciseTypes: this.getRecommendedExerciseTypes(primaryWound.id),
      warnings: this.getSpecificWarnings(primaryWound.id),
      accommodations: this.getAccommodations(primaryWound.id, intensity)
    };

    if (secondaryWound) {
      adaptations.secondaryConsiderations = this.getSecondaryConsiderations(secondaryWound.id);
    }

    return adaptations;
  }

  /**
   * Calculate personalized timeline
   * @param {Object} primaryWound - Primary wound
   * @param {string} intensity - Intensity level
   * @returns {Object} Timeline configuration
   */
  calculatePersonalizedTimeline(primaryWound, intensity) {
    const baseWeeks = {
      severe: 12,
      high: 10,
      moderate: 8,
      mild: 6,
      minimal: 4
    };

    const totalWeeks = baseWeeks[intensity] || 8;
    
    return {
      totalWeeks,
      recommendedSessionFrequency: intensity === 'severe' ? '3x per week' : '2x per week',
      sessionDuration: intensity === 'severe' ? '45-60 minutes' : '30-45 minutes',
      integrationPeriod: Math.ceil(totalWeeks * 0.25), // 25% of time for integration
      milestones: this.generateMilestones(primaryWound, totalWeeks)
    };
  }

  /**
   * Define success metrics for tracking progress
   * @param {Object} primaryWound - Primary wound
   * @param {Object} secondaryWound - Secondary wound
   * @returns {Array} Success metrics
   */
  defineSuccessMetrics(primaryWound, secondaryWound) {
    const primaryProfile = this.woundProfiles[primaryWound.id];
    const baseMetrics = [
      {
        category: "Inner Child Connection",
        metrics: [
          "Ability to connect with inner child without fear",
          "Increased sense of compassion for inner child",
          "Improved communication with inner child"
        ]
      },
      {
        category: "Emotional Regulation",
        metrics: [
          "Reduced intensity of emotional triggers",
          "Improved ability to self-soothe",
          "Greater emotional stability"
        ]
      }
    ];

    const woundSpecificMetrics = [
      {
        category: `${primaryProfile.name} Healing`,
        metrics: primaryProfile.healingGoals.map(goal => `Demonstrated progress in: ${goal}`)
      }
    ];

    return [...baseMetrics, ...woundSpecificMetrics];
  }

  // Helper methods for generating personalized content
  generateModuleTitle(woundId, moduleId) {
    const titles = {
      abandonment: {
        'inner-child-connection': 'Connecting with Your Lonely Child',
        'secure-attachment-building': 'Building Internal Secure Attachment',
        'self-soothing-mastery': 'Mastering Self-Soothing Techniques'
      },
      shame: {
        'inner-child-connection': 'Meeting Your Unworthy Child',
        'self-compassion-mastery': 'Cultivating Deep Self-Compassion',
        'inner-critic-work': 'Transforming Your Inner Critic'
      },
      neglect: {
        'inner-child-connection': 'Finding Your Lost Child',
        'needs-identification': 'Learning to Identify Your Needs',
        'self-advocacy-skills': 'Developing Self-Advocacy'
      },
      betrayal: {
        'inner-child-connection': 'Connecting with Your Terrified Child',
        'safety-regulation': 'Establishing Internal Safety',
        'trust-rebuilding': 'Rebuilding Trust Capacity'
      },
      helplessness: {
        'inner-child-connection': 'Meeting Your Powerless Child',
        'agency-building': 'Reclaiming Your Personal Power',
        'empowerment-practice': 'Building Confidence in Your Choices'
      }
    };
    return titles[woundId]?.[moduleId] || 'Personalized Healing Module';
  }

  generateModuleDescription(woundId, moduleId) {
    const descriptions = {
      abandonment: {
        'inner-child-connection': 'Meet the part of you that fears abandonment and learn to provide the security it needs.',
        'secure-attachment-building': 'Build a secure internal attachment system that makes you feel safe and connected.',
        'self-soothing-mastery': 'Develop powerful self-soothing techniques to calm abandonment fears.'
      },
      shame: {
        'inner-child-connection': 'Gently meet the part of you that carries shame and offer it unconditional love.',
        'self-compassion-mastery': 'Learn to treat yourself with the compassion and kindness you deserve.',
        'inner-critic-work': 'Transform your harsh inner critic into a supportive inner ally.'
      },
      neglect: {
        'inner-child-connection': 'Find and reconnect with the part of you that felt invisible and neglected.',
        'needs-identification': 'Learn to identify, honor, and meet your own emotional needs.',
        'self-advocacy-skills': 'Develop the confidence to advocate for yourself in healthy ways.'
      },
      betrayal: {
        'inner-child-connection': 'Create safety for the part of you that has been hurt by betrayal.',
        'safety-regulation': 'Learn techniques to regulate fear and create internal safety.',
        'trust-rebuilding': 'Gradually rebuild your capacity to trust yourself and others.'
      },
      helplessness: {
        'inner-child-connection': 'Gently meet the part of you that feels powerless and offer it agency and strength.',
        'agency-building': 'Reclaim your sense of personal power and ability to create meaningful change.',
        'empowerment-practice': 'Build confidence that your choices matter and you can shape your own life.'
      }
    };
    return descriptions[woundId]?.[moduleId] || 'Personalized healing module for your specific wound pattern.';
  }

  estimateModuleTime(woundId, moduleId) {
    const baseTimes = {
      'inner-child-connection': 30,
      'secure-attachment-building': 25,
      'self-soothing-mastery': 35,
      'self-compassion-mastery': 30,
      'inner-critic-work': 40,
      'needs-identification': 25,
      'self-advocacy-skills': 35,
      'safety-regulation': 30,
      'trust-rebuilding': 35,
      'self-worth-building': 30,
      'authentic-expression': 35
    };
    return baseTimes[moduleId] || 30;
  }

  setExpectations(primaryWound, profile) {
    return {
      primaryFocus: profile.name,
      healingApproach: `Gentle, compassionate work focused on ${profile.focus.join(', ')}`,
      timeline: "Your healing will unfold at its own pace - we honor your timing",
      support: "You'll learn to be your own loving parent and healer"
    };
  }

  getActivityAdaptations(woundId) {
    const adaptations = {
      abandonment: ["Gentle attachment exercises", "Safety building", "Gradual independence work"],
      shame: ["Compassion-focused practices", "Inner critic transformation", "Worthiness building"],
      neglect: ["Needs identification", "Self-care practices", "Visibility exercises"],
      betrayal: ["Safety protocols", "Trust building", "Fear regulation"],
      helplessness: ["Agency-building exercises", "Empowerment affirmations", "Choice reclamation practice"]
    };
    return adaptations[woundId] || ["Standard healing exercises"];
  }

  calculatePacing(intensity) {
    return {
      severe: "Very gentle pacing with frequent breaks",
      high: "Gentle pacing with regular check-ins",
      moderate: "Moderate pacing with some integration time",
      mild: "Standard pacing with optional breaks",
      minimal: "Comfortable pace with flexibility"
    };
  }

  calculateSupportLevel(intensity) {
    return {
      severe: "High support recommended - consider therapist guidance",
      high: "Moderate to high support recommended",
      moderate: "Moderate support - regular check-ins advised",
      mild: "Light support - self-paced with check-ins",
      minimal: "Self-directed with minimal support needed"
    };
  }

  getRecommendedExerciseTypes(woundId) {
    const types = {
      abandonment: ["grounding", "attachment", "safety", "boundary"],
      shame: ["compassion", "inner critic", "worthiness", "self-acceptance"],
      neglect: ["needs identification", "self-care", "expression", "advocacy"],
      betrayal: ["safety", "trust", "fear regulation", "vulnerability"],
      helplessness: ["agency", "empowerment", "choice reclamation", "assertiveness"]
    };
    return types[woundId] || ["general healing"];
  }

  getSpecificWarnings(woundId) {
    const warnings = {
      abandonment: "May trigger fears of being alone - ensure support is available",
      shame: "May bring up difficult emotions - practice extra self-compassion",
      neglect: "May feel overwhelming at first - start small and build gradually",
      betrayal: "May activate fear responses - maintain safety protocols",
      helplessness: "May trigger feelings of powerlessness - remind yourself you have choices and agency now"
    };
    return warnings[woundId] || "Proceed with self-awareness and compassion";
  }

  getAccommodations(woundId, intensity) {
    const baseAccommodations = {
      severe: "Extra time for each module, frequent breaks, optional therapist support",
      high: "Additional time, regular check-ins, integration exercises",
      moderate: "Standard pacing with optional additional time",
      mild: "Standard pace with flexibility to slow down if needed",
      minimal: "Self-paced with minimal modifications"
    };
    return baseAccommodations[intensity];
  }

  getIntensiveTechniques(woundId) {
    const techniques = {
      abandonment: ["Advanced attachment work", "Deep safety protocols", "Complex trauma integration"],
      shame: ["Deep shame release", "Inner critic transformation", "Core worthiness work"],
      neglect: ["Advanced needs work", "Deep self-advocacy", "Expression therapy"],
      betrayal: ["Advanced trauma release", "Deep trust building", "Complex fear regulation"],
      helplessness: ["Deep agency work", "Core empowerment reclamation", "Personal power integration"]
    };
    return techniques[woundId] || ["Advanced healing techniques"];
  }

  getOngoingPractices(woundId) {
    const practices = {
      abandonment: "Daily attachment check-ins, weekly self-soothing practice",
      shame: "Daily compassion practice, weekly inner critic dialogue",
      neglect: "Daily needs check, weekly self-care routine",
      betrayal: "Daily safety check, weekly trust practice",
      helplessness: "Daily empowerment affirmations, weekly agency-building practice"
    };
    return practices[woundId] || "Daily healing practice";
  }

  generateMilestones(primaryWound, totalWeeks) {
    return [
      { week: Math.ceil(totalWeeks * 0.25), milestone: "Established safety and connection" },
      { week: Math.ceil(totalWeeks * 0.5), milestone: "Significant wound healing progress" },
      { week: Math.ceil(totalWeeks * 0.75), milestone: "Integration and strengthening" },
      { week: totalWeeks, milestone: "Healing consolidation and future planning" }
    ];
  }

  getSecondaryConsiderations(secondaryWoundId) {
    return {
      woundType: this.woundProfiles[secondaryWoundId].name,
      additionalFocus: this.woundProfiles[secondaryWoundId].focus,
      integrationNeeds: [`Address ${secondaryWoundId} patterns`, `Integrate with primary wound healing`]
    };
  }

  getSpecificChangesMap() {
    return {
      abandonment: {
        welcome: 'Opens with attachment-focused check-in, validates fear of being left, establishes safe base grounding exercise',
        modules: [
          'Standard: General parts introduction. Personalized for abandonment: Opens with attachment-focused check-in, prioritizes people-pleaser and caretaker protectors, added safe base grounding before each exploration',
          'Standard: Basic self-soothing techniques. Personalized for abandonment: Focuses on secure attachment visualization, "finding the child who was left" inner work, internalized safe parent exercises',
          'Standard: General boundary work. Personalized for abandonment: Healthy attachment boundaries, distinguishing closeness from enmeshment, building trust without losing self'
        ]
      },
      shame: {
        welcome: 'Opens with compassion-centered greeting, normalizes shame responses, includes worthiness affirmation before beginning',
        modules: [
          'Standard: General parts introduction. Personalized for shame: Prioritizes inner critic and perfectionist protectors, includes self-compassion pauses, reframes "flaws" as protective adaptations',
          'Standard: Basic self-compassion practices. Personalized for shame: Deep inner critic dialogue work, "the unworthy child" unburdening, mirrors worthiness through compassionate witnessing',
          'Standard: General inner work exercises. Personalized for shame: Core worthiness building, releasing toxic shame burdens, self-acceptance practices with gentle exposure to vulnerability'
        ]
      },
      neglect: {
        welcome: 'Opens with needs-awareness check-in, validates the experience of being unseen, includes "I matter" grounding exercise',
        modules: [
          'Standard: General parts introduction. Personalized for neglect: Focuses on invisible/lost child parts, self-advocacy protectors, includes needs identification exercises before each module',
          'Standard: Basic self-care practices. Personalized for neglect: Deep needs identification work, "seeing the unseen child" visualization, building consistent self-nurturing routines',
          'Standard: General expression exercises. Personalized for neglect: Finding your voice exercises, visibility work, learning to ask for what you need without guilt'
        ]
      },
      betrayal: {
        welcome: 'Opens with safety-first check-in, validates hypervigilance as protective, establishes trust at your own pace framework',
        modules: [
          'Standard: General parts introduction. Personalized for betrayal: Prioritizes hypervigilant and controller protectors, includes safety protocols before vulnerability work, extra grounding between exercises',
          'Standard: Basic safety techniques. Personalized for betrayal: Advanced safety regulation, "the terrified child" gentle approach, rebuilding internal trust system step by step',
          'Standard: General trust exercises. Personalized for betrayal: Gradual vulnerability practice, fear processing with containment, rebuilding trust capacity with clear safety exits'
        ]
      },
      helplessness: {
        welcome: 'Opens with small-choice empowerment exercise, validates freeze/collapse responses, establishes "you have agency here" framework',
        modules: [
          'Standard: General parts introduction. Personalized for helplessness: Focuses on freeze/collapse and people-pleaser protectors, includes choice-point exercises, reframes passivity as a learned survival strategy',
          'Standard: Basic empowerment practices. Personalized for helplessness: "The powerless child" reclamation work, building sense of agency through small wins, transforming "why bother" beliefs',
          'Standard: General assertiveness exercises. Personalized for helplessness: Progressive agency-building, from micro-choices to confident action, celebrating each moment of personal power'
        ]
      }
    };
  }

  getDefaultCurriculum() {
    return {
      primaryWound: null,
      personalizedModules: [],
      healingPlan: {},
      adaptations: {},
      timeline: { totalWeeks: 8 },
      successMetrics: []
    };
  }
}

export const aiCurriculumPersonalizer = new AICurriculumPersonalizer();
export default aiCurriculumPersonalizer;