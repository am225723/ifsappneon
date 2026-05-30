const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

class PerplexityService {
  constructor() {
    this.apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY || null;
  }

  isAvailable() {
    return !!this.apiKey;
  }

  async generatePersonalizedGuidance(woundProfile) {
    if (!this.isAvailable()) {
      console.log('Perplexity API not configured, using local personalization');
      return this.getLocalPersonalization(woundProfile);
    }

    const { primaryWound, secondaryWound, intensity, scores } = woundProfile;

    const systemPrompt = `You are an expert Internal Family Systems (IFS) therapist specializing in inner child healing. 
You help clients understand their wound patterns with compassion and provide actionable guidance. 
Keep responses concise, warm, and supportive. Focus on IFS concepts like parts, Self-energy, and unburdening.
Do not diagnose or provide medical advice. Frame everything as self-discovery and personal growth.`;

    const userPrompt = `Based on this assessment, provide personalized healing guidance:

Primary Wound: ${primaryWound.name} (${primaryWound.score}/24 - ${intensity} intensity)
Secondary Wound: ${secondaryWound?.name || 'None identified'} (${secondaryWound?.score || 0}/24)

Please provide:
1. A compassionate 2-3 sentence summary of what these patterns mean for the person
2. 3 specific healing priorities for their journey
3. One grounding affirmation they can use daily
4. A brief description of what their personalized curriculum will focus on

Keep the response warm, encouraging, and focused on hope and healing potential.`;

    try {
      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (aiResponse) {
        return this.parseAIResponse(aiResponse, woundProfile);
      }

      return this.getLocalPersonalization(woundProfile);
    } catch (error) {
      console.error('Perplexity API error:', error);
      return this.getLocalPersonalization(woundProfile);
    }
  }

  parseAIResponse(aiResponse, woundProfile) {
    const lines = aiResponse.split('\n').filter(line => line.trim());
    
    let summary = '';
    let priorities = [];
    let affirmation = '';
    let curriculumFocus = '';
    
    let currentSection = '';
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('summary') || lowerLine.includes('pattern')) {
        currentSection = 'summary';
        continue;
      } else if (lowerLine.includes('priorities') || lowerLine.includes('healing priorities')) {
        currentSection = 'priorities';
        continue;
      } else if (lowerLine.includes('affirmation')) {
        currentSection = 'affirmation';
        continue;
      } else if (lowerLine.includes('curriculum') || lowerLine.includes('focus')) {
        currentSection = 'curriculum';
        continue;
      }
      
      const cleanLine = line.replace(/^[\d\.\-\*\)\s]+/, '').trim();
      
      switch (currentSection) {
        case 'summary':
          summary += (summary ? ' ' : '') + cleanLine;
          break;
        case 'priorities':
          if (cleanLine && cleanLine.length > 5) {
            priorities.push(cleanLine);
          }
          break;
        case 'affirmation':
          if (cleanLine && cleanLine.length > 5) {
            affirmation = cleanLine.replace(/^["']|["']$/g, '');
          }
          break;
        case 'curriculum':
          curriculumFocus += (curriculumFocus ? ' ' : '') + cleanLine;
          break;
        default:
          if (!summary && cleanLine.length > 20) {
            summary += cleanLine + ' ';
          }
      }
    }
    
    if (!summary || !priorities.length || !affirmation) {
      const localFallback = this.getLocalPersonalization(woundProfile);
      return {
        ...localFallback,
        source: 'ai_enhanced',
        summary: summary || localFallback.summary,
        priorities: priorities.length ? priorities : localFallback.priorities,
        affirmation: affirmation || localFallback.affirmation,
        curriculumFocus: curriculumFocus || localFallback.curriculumFocus,
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      source: 'ai',
      summary,
      priorities: priorities.slice(0, 5),
      affirmation,
      curriculumFocus,
      intensity: woundProfile.intensity,
      woundProfile,
      timestamp: new Date().toISOString()
    };
  }

  getLocalPersonalization(woundProfile) {
    const { primaryWound, secondaryWound, intensity } = woundProfile;

    const woundMessages = {
      abandonment: {
        summary: "Your assessment reveals that a part of you carries the deep pain of abandonment - the fear of being left or forgotten. This 'Lonely Child' part learned early that love might disappear, and has been working hard to protect you ever since.",
        priorities: [
          "Build a secure internal attachment with your Self",
          "Develop self-soothing techniques for moments of fear",
          "Learn to recognize and honor your need for connection"
        ],
        affirmation: "I am worthy of love that stays. My presence matters.",
        curriculumFocus: "Your curriculum emphasizes building secure attachment, self-soothing practices, and developing trust in yourself and healthy relationships."
      },
      shame: {
        summary: "Your assessment shows that a part of you carries the burden of shame - the belief that something is fundamentally wrong with you. This 'Unworthy Child' part has been trying to protect you from the pain of not feeling good enough.",
        priorities: [
          "Cultivate deep self-compassion practices",
          "Transform your inner critic into an ally",
          "Build an unshakeable sense of worthiness"
        ],
        affirmation: "I am inherently worthy, exactly as I am.",
        curriculumFocus: "Your curriculum focuses on self-compassion development, inner critic transformation, and reclaiming your sense of inherent worthiness."
      },
      neglect: {
        summary: "Your assessment reveals that a part of you carries the wound of neglect - the experience of being overlooked or having your needs dismissed. This 'Lost Child' part learned to minimize needs and stay invisible.",
        priorities: [
          "Learn to identify and honor your authentic needs",
          "Develop self-advocacy skills",
          "Create consistent self-care practices"
        ],
        affirmation: "My needs are valid. I deserve to be seen and heard.",
        curriculumFocus: "Your curriculum emphasizes needs identification, self-advocacy, and building practices that honor your right to take up space."
      },
      betrayal: {
        summary: "Your assessment shows that a part of you carries the wound of betrayal - experiences where trust was broken by those who should have protected you. This 'Terrified Child' part has been vigilant ever since.",
        priorities: [
          "Establish internal safety and regulation",
          "Learn to manage fear responses with compassion",
          "Gradually rebuild capacity for healthy trust"
        ],
        affirmation: "I can create safety within myself. My boundaries protect me.",
        curriculumFocus: "Your curriculum focuses on nervous system regulation, building internal safety, and developing discernment around trust."
      }
    };

    const primary = woundMessages[primaryWound.id] || woundMessages.abandonment;
    const secondary = secondaryWound ? woundMessages[secondaryWound.id] : null;

    let combinedSummary = primary.summary;
    if (secondary && secondaryWound.score > 10) {
      combinedSummary += ` Additionally, you may also experience patterns related to ${secondaryWound.name}, which will be addressed in your curriculum.`;
    }

    return {
      source: 'local',
      summary: combinedSummary,
      priorities: primary.priorities,
      affirmation: primary.affirmation,
      curriculumFocus: primary.curriculumFocus,
      intensity,
      woundProfile,
      timestamp: new Date().toISOString()
    };
  }
}

export const perplexityService = new PerplexityService();
export default perplexityService;
