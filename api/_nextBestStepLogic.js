function newestDate(rows = [], fields = ['created_at', 'updated_at']) {
  return rows.map((row) => fields.map((field) => row?.[field]).find(Boolean)).filter(Boolean).sort().reverse()[0] || null;
}

function recentWithin(dateValue, days = 7) {
  if (!dateValue) return false;
  const time = new Date(dateValue).getTime();
  return Number.isFinite(time) && Date.now() - time <= days * 86400000;
}

function hasTextMatch(rows = [], patterns = []) {
  const text = JSON.stringify(rows || {}).toLowerCase();
  return patterns.some((pattern) => text.includes(pattern));
}

export function determineNextBestStep(data = {}) {
  const assigned = data.assigned_practice_status || [];
  const activeAssigned = assigned.find((item) => ['assigned', 'in_progress', 'started'].includes(String(item.status || '').toLowerCase()) && !item.completed_at);
  if (activeAssigned) {
    return {
      priority: 1,
      title: 'Continue Your Advisor-Guided Practice',
      action_route: '/assigned-practices',
      priority_loop: 'collaborative',
      estimated_time: '10–25 minutes',
      reason: 'An active Advisor-assigned IFS Practice is waiting, so collaborative follow-through comes before generic tools.',
      supporting_signals: [`Active assigned practice: ${activeAssigned.title || 'Advisor-guided practice'}`]
    };
  }

  const recentMoodDate = newestDate(data.recent_mood_or_trigger_entries || [], ['created_at', 'date']);
  if (recentWithin(recentMoodDate, 3) || hasTextMatch(data.recent_mood_or_trigger_entries, ['trigger', 'activated', 'stress'])) {
    return {
      priority: 3,
      title: 'Reflect on a Recent Trigger',
      action_route: '/life-integration/trigger-reflection',
      priority_loop: 'reactive',
      estimated_time: '8–15 minutes',
      reason: 'Recent mood or trigger activity may benefit from a gentle Life Integration reflection before moving on.',
      supporting_signals: ['Recent mood/trigger entry']
    };
  }

  const progress = data.curriculum_state || {};
  const percent = Number(progress.percent_complete ?? progress.percent ?? 0);
  if (percent > 0 && percent < 100) {
    const moduleRoute = progress.active_module ? `/curriculum/module/${progress.active_module}` : '/curriculum';
    return {
      priority: 2,
      title: 'Continue Your Current Curriculum Module',
      action_route: moduleRoute,
      priority_loop: 'momentum',
      estimated_time: '10–20 minutes',
      reason: 'Your main IFS Path is already in motion, and no higher-priority assigned practice is waiting.',
      supporting_signals: [`Curriculum progress: ${Math.round(percent)}%`]
    };
  }

  const assessmentComplete = (data.assessment_patterns || []).length || (data.interactive_assessments || []).length;
  const partsCount = (data.parts_summary || []).length;
  if (assessmentComplete && !partsCount) {
    return {
      priority: 4,
      title: 'Begin Your Inner System Map',
      action_route: '/parts-relationships',
      priority_loop: 'integration',
      estimated_time: '10–20 minutes',
      reason: 'Assessment themes are available, but the Inner System Map has not started yet.',
      supporting_signals: ['Assessment complete', 'Parts map appears empty']
    };
  }

  if (hasTextMatch(data.cleaned_module_responses || data.curriculum_reflections || [], ['protector', 'exile', 'confus', 'blend', 'polariz'])) {
    return {
      priority: 5,
      title: 'Try a Parts Dialogue Practice',
      action_route: '/parts-dialogue',
      priority_loop: 'relational',
      estimated_time: '10–18 minutes',
      reason: 'Recent module responses may suggest protector/exile dynamics worth clarifying with gentle parts dialogue.',
      supporting_signals: ['Protector/exile language appears in module responses']
    };
  }

  const reflectionCount = (data.curriculum_reflections || []).length + (data.cleaned_module_responses ? Object.keys(data.cleaned_module_responses).length : 0);
  const integrationCount = (data.life_integration_reflections || []).length;
  if (reflectionCount >= 4 && integrationCount === 0) {
    return {
      priority: 6,
      title: 'Bring Reflection into Daily Life',
      action_route: '/life-integration',
      priority_loop: 'integration',
      estimated_time: '5–12 minutes',
      reason: 'You have several reflections saved and may benefit from a small real-life integration practice.',
      supporting_signals: ['Multiple reflections', 'No recent Life Integration reflections']
    };
  }

  if (hasTextMatch(data, ['upcoming session', 'session_date'])) {
    return {
      priority: 8,
      title: 'Prepare for Your Advisor Session',
      action_route: '/pre-session-checkin',
      priority_loop: 'collaborative',
      estimated_time: '5–10 minutes',
      reason: 'A session-related signal is present, so a brief check-in can help organize what to bring.',
      supporting_signals: ['Session preparation signal']
    };
  }

  return {
    priority: 7,
    title: percent >= 100 ? 'Choose a Gentle Life Integration Practice' : 'Start Your IFS Curriculum',
    action_route: percent >= 100 ? '/life-integration/notice-part' : '/curriculum',
    priority_loop: percent >= 100 ? 'integration' : 'momentum',
    estimated_time: '10–20 minutes',
    reason: percent >= 100 ? 'Your curriculum appears complete, so daily-life practice is a gentle next step.' : 'When data is sparse, the main Curriculum / IFS Path is the safest place to begin.',
    supporting_signals: percent >= 100 ? ['Curriculum appears complete'] : ['Sparse app data']
  };
}

export function applyDeterministicNextBestStep(aiStep = {}, deterministic = {}) {
  if (!deterministic?.action_route) return aiStep;
  return {
    ...aiStep,
    title: aiStep?.title || deterministic.title,
    description: aiStep?.description || deterministic.reason,
    reason: aiStep?.reason || deterministic.reason,
    action_route: deterministic.action_route,
    priority_loop: deterministic.priority_loop || aiStep?.priority_loop,
    estimated_time: aiStep?.estimated_time || deterministic.estimated_time,
    supporting_signals: Array.from(new Set([...(deterministic.supporting_signals || []), ...((aiStep?.supporting_signals || []))])).slice(0, 6),
    deterministic_priority: deterministic.priority
  };
}
