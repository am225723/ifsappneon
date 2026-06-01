import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, User, TrendingUp, Calendar, FileText, MessageSquare, 
  Clock, CheckCircle, AlertTriangle, Activity, Heart, Shield,
  ChevronRight, Search, Filter, Plus, Eye, BarChart3, Sparkles,
  BookOpen, ChevronDown, ChevronUp, MessageCircle, Flag, Lightbulb,
  Play, Target, X, Copy, Download, ArrowLeft, RefreshCw,
  Award, Flame, Star, Zap, Trophy, Crown, Gem, Edit2, Save,
  Key, ToggleLeft, ToggleRight, UserX, UserCheck, Loader2,
  List, Smile, PenTool, ClipboardCheck, Home as HomeIcon, Lock, Unlock, Mail
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { aiCurriculumPersonalizer } from '../lib/aiCurriculumPersonalizer';
import { WOUND_LESSON_PLANS, WOUND_DISPLAY } from '../lib/woundLessonPlans';
import { curriculumModules } from '../data/curriculumData';
import { getAvailableTemplates, getRenderedEmail } from '../lib/emailTemplates';
import { sendEmail } from '../lib/onesignalEmail';
import { assignClientToTherapist, loadAssignedClients } from '../lib/therapistAssignments';
import { loadUpcomingSessionPrepForTherapist } from '../lib/sessionAgendas';
import TherapistHomeworkBuilder from '../components/TherapistHomeworkBuilder';
import SessionPrepBrief from '../components/SessionPrepBrief';
import TreatmentPlanBuilder from '../components/TreatmentPlanBuilder';
import RiskAlertWidget from '../components/RiskAlertWidget';

const woundColorMap = {
  abandonment: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  shame: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  neglect: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  betrayal: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  helplessness: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' }
};

const riskColors = {
  low: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Low Risk' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Medium Risk' },
  high: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'High Risk' }
};

const sessionPrepByWound = {
  abandonment: [
    'Follow up on abandonment wound work from last session',
    'Check in on daily Self-energy practice adherence',
    'Explore people-pleaser protector\'s relationship with the exile',
    'Introduce unburdening concept if client seems ready',
    'Assess progress on recognizing abandonment triggers'
  ],
  shame: [
    'Approach shame work very gently — high activation risk',
    'Check in on inner critic patterns and frequency',
    'Explore the shame part\'s origins with compassion',
    'Focus on building Self-compassion practices',
    'Assess readiness for deeper exile work'
  ],
  betrayal: [
    'Address trust-building in the therapeutic relationship',
    'Validate anger as a protector response',
    'Explore the firefighter pattern of cutting people off',
    'Consider slower pacing for trust work',
    'Check for any external stressors contributing to hypervigilance'
  ],
  neglect: [
    'Use somatic approaches to help client connect with body',
    'Go slowly with parts identification — numbness is protective',
    'Validate the neglect experience without pushing',
    'Consider grounding exercises before parts work',
    'Build rapport before deeper wound exploration'
  ],
  helplessness: [
    'Validate agency — helplessness wounds create deep "I can\'t change anything" beliefs',
    'Watch for freeze/collapse protectors that shut down under stress',
    'Explore learned helplessness patterns from childhood gently',
    'Address the exile that believes they are powerless and trapped',
    'Build sense of personal agency and empowerment through small choices'
  ]
};

const TOTAL_MODULES = 12;

const MODULE_SEQUENCE = [
  { id: 'module-1-intro-ifs', order: 1, title: 'Foundations of IFS & Your Inner Child', category: 'introduction' },
  { id: 'module-2-inner-child-wounds', order: 2, title: 'Deep Dive into Inner Child Wounds', category: 'wounds' },
  { id: 'module-3-protectors-unlocked', order: 3, title: 'The Protective System', category: 'protectors' },
  { id: 'module-4-self-leadership', order: 4, title: 'Self-Leadership & the 8 Cs', category: 'self-energy' },
  { id: 'module-5-six-fs-protocol', order: 5, title: 'The 6 Fs Protocol', category: 'protocol' },
  { id: 'module-6-inner-child-healing', order: 6, title: 'Inner Child Healing & Unburdening', category: 'healing' },
  { id: 'module-7-reparenting', order: 7, title: 'Reparenting Your Inner Child', category: 'reparenting' },
  { id: 'module-8-somatic-healing', order: 8, title: 'Somatic Healing & Body-Based Parts Work', category: 'somatic' },
  { id: 'module-9-relationships', order: 9, title: 'Relationships & Attachment Repair', category: 'relationships' },
  { id: 'module-10-inner-critic', order: 10, title: 'Transforming the Inner Critic', category: 'inner-critic' }
];

const MEDITATION_RECOMMENDATIONS = {
  abandonment: { title: 'Inner Child Connection Meditation', desc: 'Guided meditation to connect with and reassure the Lonely Child part', duration: '15 min', path: '/guided-meditation' },
  shame: { title: 'Self-Compassion Meditation', desc: 'Loving-kindness practice directed toward the Unworthy Child', duration: '15 min', path: '/guided-meditation' },
  neglect: { title: 'Body Awareness & Grounding Meditation', desc: 'Somatic meditation to reconnect with the body and feel present', duration: '12 min', path: '/guided-meditation' },
  betrayal: { title: 'Safe Space Visualization', desc: 'Build an internal sanctuary where trust can slowly be rebuilt', duration: '15 min', path: '/guided-meditation' },
  helplessness: { title: 'Empowerment & Agency Meditation', desc: 'Guided practice to cultivate inner strength and sense of choice', duration: '12 min', path: '/guided-meditation' }
};

const HOMEWORK_BY_WOUND = {
  abandonment: [
    { title: 'Self-Connection Journal', desc: 'Write a letter to your Lonely Child each evening, reassuring them of your presence' },
    { title: 'Attachment Tracking', desc: 'Notice moments of seeking reassurance from others and practice self-soothing first' },
    { title: 'Daily Self-Presence Check', desc: 'Three times daily, pause and say internally: "I am here with you. I am not going anywhere."' }
  ],
  shame: [
    { title: 'Inner Critic Log', desc: 'Track critical self-talk and practice reframing with compassionate responses' },
    { title: 'Worthiness Affirmation Practice', desc: 'Morning and evening, offer your Unworthy Child specific affirmations of inherent worth' },
    { title: 'Shame Trigger Map', desc: 'Identify situations that activate shame and notice the protector that responds' }
  ],
  neglect: [
    { title: 'Body Check-In Practice', desc: 'Three times daily, scan your body and name what you feel — reconnecting with physical sensations' },
    { title: 'Self-Care Commitments', desc: 'Choose one act of self-care daily and notice if parts resist receiving care' },
    { title: 'Needs Awareness Journal', desc: 'Each evening, write down three needs you had today and whether they were met' }
  ],
  betrayal: [
    { title: 'Trust Inventory', desc: 'Reflect on small moments of trust throughout the day — both given and received' },
    { title: 'Protector Appreciation', desc: 'Thank your hypervigilant parts for their protection and notice when they relax' },
    { title: 'Boundary Practice', desc: 'Set one small boundary this week and observe your parts\' reactions' }
  ],
  helplessness: [
    { title: 'Agency Journal', desc: 'Each evening, list three choices you made today — reinforcing your sense of power' },
    { title: 'Small Wins Tracker', desc: 'Notice and celebrate moments where you influenced an outcome, no matter how small' },
    { title: 'Empowered Self Dialogue', desc: 'Practice speaking to the helpless part from Self, reminding them of your adult capabilities' }
  ]
};

function generateSmartRecommendations(client, insights, gamData) {
  const recommendations = [];
  const now = new Date();

  const completedModuleIds = new Set();
  (insights.moduleProgress || []).forEach(p => {
    if (p.completed) completedModuleIds.add(p.module_id);
  });

  const nextModule = MODULE_SEQUENCE.find(m => !completedModuleIds.has(m.id));
  if (nextModule) {
    const isInProgress = (insights.moduleProgress || []).some(p => p.module_id === nextModule.id && !p.completed);
    recommendations.push({
      type: 'module',
      priority: 'high',
      icon: 'BookOpen',
      title: isInProgress ? `Continue: ${nextModule.title}` : `Start Next: ${nextModule.title}`,
      desc: isInProgress
        ? `${client?.name} started Module ${nextModule.order} but hasn't completed it yet. Encourage them to continue.`
        : `${client?.name} has completed ${completedModuleIds.size} modules. Module ${nextModule.order} is the next step in their healing journey.`,
      action: `Module ${nextModule.order}`
    });
  } else if (completedModuleIds.size >= MODULE_SEQUENCE.length) {
    recommendations.push({
      type: 'module',
      priority: 'low',
      icon: 'Trophy',
      title: 'All Core Modules Complete!',
      desc: `${client?.name} has completed all core modules. Consider assigning wound-specific bonus modules from the Lesson Plans tab.`,
      action: 'Assign bonus content'
    });
  }

  const wound = client?.primaryWound || 'abandonment';
  const homeworkOptions = HOMEWORK_BY_WOUND[wound] || HOMEWORK_BY_WOUND.abandonment;
  const randomHomework = homeworkOptions[Math.floor(Date.now() / 86400000) % homeworkOptions.length];
  recommendations.push({
    type: 'homework',
    priority: 'medium',
    icon: 'FileText',
    title: `Homework: ${randomHomework.title}`,
    desc: randomHomework.desc,
    action: `Assign for ${wound} wound`
  });

  const meditation = MEDITATION_RECOMMENDATIONS[wound] || MEDITATION_RECOMMENDATIONS.abandonment;
  recommendations.push({
    type: 'meditation',
    priority: 'medium',
    icon: 'Heart',
    title: `Recommend: ${meditation.title}`,
    desc: `${meditation.desc} (${meditation.duration})`,
    action: meditation.path ? 'Suggest to client' : null
  });

  const assessmentDate = insights.assessment?.created_at || insights.assessment?.assessment_date;
  if (!assessmentDate) {
    recommendations.push({
      type: 'reassessment',
      priority: 'high',
      icon: 'AlertTriangle',
      title: 'No Assessment on Record',
      desc: `${client?.name} hasn't completed a wound assessment. This is needed to personalize their curriculum and track healing progress.`,
      action: 'Generate curriculum'
    });
  } else {
    const daysSinceAssessment = Math.floor((now - new Date(assessmentDate)) / (1000 * 60 * 60 * 24));
    if (daysSinceAssessment > 30) {
      recommendations.push({
        type: 'reassessment',
        priority: daysSinceAssessment > 60 ? 'high' : 'medium',
        icon: 'RefreshCw',
        title: 'Reassessment Recommended',
        desc: `Last assessment was ${daysSinceAssessment} days ago. A reassessment can measure healing progress and adjust the curriculum.`,
        action: 'Send assessment reminder'
      });
    }
  }

  const avgMood = insights.avgMood ? parseFloat(insights.avgMood) : null;
  const avgSelfEnergy = insights.avgSelfEnergy ? parseFloat(insights.avgSelfEnergy) : null;

  if (avgMood !== null && avgMood < 3) {
    recommendations.push({
      type: 'mood',
      priority: 'high',
      icon: 'AlertTriangle',
      title: 'Low Mood Trend Detected',
      desc: `${client?.name}'s average mood is ${avgMood}/5 over recent entries. Consider checking in about emotional state and adjusting approach.`,
      action: 'Send check-in message'
    });
  }

  if (avgSelfEnergy !== null && avgSelfEnergy < 4) {
    recommendations.push({
      type: 'self-energy',
      priority: 'medium',
      icon: 'Zap',
      title: 'Low Self-Energy Scores',
      desc: `Average Self-Energy is ${avgSelfEnergy}/10. Focus on Self-energy cultivation exercises and grounding practices before deeper parts work.`,
      action: 'Recommend Self-energy module'
    });
  }

  const partsData = insights.partsAssessment;
  if (partsData) {
    const answers = partsData.answers || {};
    const highScores = Object.entries(answers).filter(([, v]) => v >= 4);
    if (highScores.length > 5) {
      recommendations.push({
        type: 'parts',
        priority: 'medium',
        icon: 'Shield',
        title: 'Active Protective System',
        desc: `${client?.name} has ${highScores.length} highly active parts. Focus on building relationships with the most active protectors before attempting exile work.`,
        action: 'Protector mapping'
      });
    }
  } else if (completedModuleIds.size >= 2) {
    recommendations.push({
      type: 'parts',
      priority: 'medium',
      icon: 'Shield',
      title: 'Parts Assessment Needed',
      desc: `${client?.name} has completed ${completedModuleIds.size} modules but hasn't done a parts assessment. This would help identify active protectors and exiles.`,
      action: 'Assign parts assessment'
    });
  }

  const lastActive = client?.lastActive;
  if (lastActive) {
    const daysSinceActive = Math.floor((now - new Date(lastActive)) / (1000 * 60 * 60 * 24));
    if (daysSinceActive > 7) {
      recommendations.push({
        type: 'engagement',
        priority: daysSinceActive > 14 ? 'high' : 'medium',
        icon: 'Clock',
        title: `${daysSinceActive} Days Since Last Activity`,
        desc: `${client?.name} hasn't engaged in ${daysSinceActive} days. A gentle check-in message or easy homework assignment can help re-engage.`,
        action: 'Send reminder'
      });
    }
  }

  const streak = gamData?.streak_current || 0;
  if (streak >= 7) {
    recommendations.push({
      type: 'celebration',
      priority: 'low',
      icon: 'Flame',
      title: `Celebrate ${streak}-Day Streak!`,
      desc: `${client?.name} is on a ${streak}-day streak. Acknowledge this commitment in your next session — it reinforces positive engagement.`,
      action: 'Acknowledge in session'
    });
  }

  const journalCount = (insights.journalEntries || []).length;
  if (journalCount === 0 && completedModuleIds.size >= 1) {
    recommendations.push({
      type: 'journal',
      priority: 'medium',
      icon: 'FileText',
      title: 'Encourage Journaling',
      desc: `${client?.name} hasn't written any journal entries yet. Journaling between sessions deepens the healing process significantly.`,
      action: 'Assign journal prompt'
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1));

  return recommendations;
}

function calculateRiskLevel(lastActive) {
  if (!lastActive) return 'high';
  const diffMs = Date.now() - new Date(lastActive).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 14) return 'high';
  if (diffDays > 7) return 'medium';
  return 'low';
}

function computeRiskScore(client, recentMoods, recentJournals, checkinDates) {
  let score = 0;
  const reasons = [];

  const daysSinceActive = client.lastActive
    ? Math.floor((Date.now() - new Date(client.lastActive).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceActive > 21) {
    score += 40;
    reasons.push(`Inactive for ${daysSinceActive} days`);
  } else if (daysSinceActive > 14) {
    score += 30;
    reasons.push(`Inactive for ${daysSinceActive} days`);
  } else if (daysSinceActive > 7) {
    score += 15;
    reasons.push(`${daysSinceActive} days since last activity`);
  }

  const moods = (recentMoods || []).slice(0, 7);
  if (moods.length >= 3) {
    const avgMood = moods.reduce((s, m) => s + (m.mood || 0), 0) / moods.length;
    if (avgMood <= 1.5) {
      score += 25;
      reasons.push(`Very low mood trend (avg ${avgMood.toFixed(1)}/5)`);
    } else if (avgMood <= 2.5) {
      score += 15;
      reasons.push(`Low mood trend (avg ${avgMood.toFixed(1)}/5)`);
    }
    const moodDeclining = moods.length >= 4 && moods[0].mood < moods[moods.length - 1].mood - 1;
    if (moodDeclining) {
      score += 10;
      reasons.push('Declining mood trend');
    }
  }

  const concerningKeywords = [
    'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die', 'better off dead',
    'self-harm', 'self harm', 'cutting', 'hurt myself',
    'hopeless', 'no reason to live', "can't go on", 'give up',
    'abuse', 'abused', 'unsafe', 'scared for my life',
    'relapse', 'using again', 'drinking again',
    'nobody cares', 'all alone', 'disappear',
    'panic attack', 'dissociating'
  ];
  const journals = (recentJournals || []).slice(0, 10);
  let hasConcerning = false;
  journals.forEach(j => {
    const content = (j.content || '').toLowerCase();
    const matched = concerningKeywords.filter(kw => content.includes(kw));
    if (matched.length > 0 && !hasConcerning) {
      hasConcerning = true;
      score += 30;
      reasons.push(`Concerning journal language detected`);
    }
  });

  const last14Days = 14;
  const recentCheckins = (checkinDates || []).filter(d => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
    return diff <= last14Days;
  });
  if (recentCheckins.length === 0 && daysSinceActive <= 14) {
    score += 10;
    reasons.push('No check-ins in last 14 days');
  } else if (recentCheckins.length < 3 && daysSinceActive <= 14) {
    score += 5;
    reasons.push('Few check-ins recently');
  }

  if (client.progress === 0 && daysSinceActive > 3) {
    score += 10;
    reasons.push('No module progress');
  }

  const level = score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
  return { score: Math.min(score, 100), level, reasons };
}

function generateAlertsFromClients(clients, recentAssessments, recentJournals) {
  const alerts = [];
  const now = new Date();

  clients.forEach(client => {
    if (!client.lastActive) return;
    const diffDays = Math.floor((now - new Date(client.lastActive)) / (1000 * 60 * 60 * 24));
    if (diffDays > 7) {
      alerts.push({
        id: `inactive-${client.id}`,
        type: 'warning',
        icon: AlertTriangle,
        message: `${client.name} hasn't logged in for ${diffDays} days`,
        client: client.name,
        time: `${diffDays} days inactive`,
        clientId: client.id,
        action: 'view_progress'
      });
    }
  });

  recentAssessments.forEach(a => {
    const client = clients.find(c => c.id === a.client_id);
    if (client) {
      const daysAgo = Math.floor((now - new Date(a.created_at || a.assessment_date)) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `assessment-${a.id}`,
        type: 'success',
        icon: CheckCircle,
        message: `${client.name} completed a new assessment`,
        client: client.name,
        time: daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`,
        clientId: client.id,
        action: 'view_assessment'
      });
    }
  });

  const concerningKeywords = [
    'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die', 'better off dead',
    'self-harm', 'self harm', 'cutting', 'hurt myself', 'harming myself',
    'hopeless', 'no reason to live', 'can\'t go on', 'give up on life',
    'overdose', 'pills', 'jump off', 'hang myself',
    'abuse', 'abused', 'being hit', 'hitting me', 'hurting me',
    'dangerous', 'unsafe', 'scared for my life', 'threatening',
    'relapse', 'using again', 'drinking again', 'started using',
    'panic attack', 'can\'t breathe', 'dissociating', 'blacking out',
    'nobody cares', 'all alone', 'no one would notice', 'disappear'
  ];

  recentJournals.forEach(j => {
    const client = clients.find(c => c.id === j.client_id);
    if (client) {
      const daysAgo = Math.floor((now - new Date(j.created_at)) / (1000 * 60 * 60 * 24));
      const content = (j.content || '').toLowerCase();
      const matched = concerningKeywords.filter(kw => content.includes(kw));

      if (matched.length > 0) {
        alerts.push({
          id: `concern-${j.id}`,
          type: 'danger',
          icon: AlertTriangle,
          message: `${client.name}'s journal contains concerning language: "${matched.slice(0, 2).join('", "')}"`,
          client: client.name,
          time: daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`,
          clientId: client.id,
          action: 'view_journal'
        });
      }

      alerts.push({
        id: `journal-${j.id}`,
        type: 'info',
        icon: FileText,
        message: `${client.name} wrote a new journal entry`,
        client: client.name,
        time: daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`,
        clientId: client.id,
        action: 'view_journal'
      });
    }
  });

  return alerts;
}

const TherapistDashboard = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWound, setFilterWound] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingClient, setEditingClient] = useState(null);
  const [editClientForm, setEditClientForm] = useState({ name: '', email: '', phone: '' });
  const [editClientSaving, setEditClientSaving] = useState(false);
  const [showPinClient, setShowPinClient] = useState(null);
  const [activeTab, setActiveTab] = useState('clients');
  const [expandedModules, setExpandedModules] = useState({});
  const [expandedResponseModules, setExpandedResponseModules] = useState({});
  const [selectedInsightClient, setSelectedInsightClient] = useState('');
  const [therapistFeedback, setTherapistFeedback] = useState({});
  const [sessionNotes, setSessionNotes] = useState([]);
  const [selectedNoteTemplate, setSelectedNoteTemplate] = useState('none');
  const [noteForm, setNoteForm] = useState({
    clientId: '',
    date: new Date().toISOString().split('T')[0],
    sessionType: 'Individual',
    notes: '',
    goals: ''
  });
  const [noteParts, setNoteParts] = useState([]);
  const [taggedParts, setTaggedParts] = useState([]);
  const [showPartTagDropdown, setShowPartTagDropdown] = useState(false);

  const [clients, setClients] = useState([]);
  const [sessionPrepRows, setSessionPrepRows] = useState([]);
  const [selectedPrepClientId, setSelectedPrepClientId] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientInsights, setClientInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [clientGamification, setClientGamification] = useState({});

  const [activeAction, setActiveAction] = useState(null);
  const [newClientForm, setNewClientForm] = useState({ name: '', email: '', phone: '', pin: '', role: 'client' });
  const [newClientResult, setNewClientResult] = useState(null);
  const [newClientLoading, setNewClientLoading] = useState(false);
  const [reminderForm, setReminderForm] = useState({ clientId: '', type: 'session', message: '' });
  const [reminderSaved, setReminderSaved] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [riskScoreData, setRiskScoreData] = useState({});
  const [expandedJournals, setExpandedJournals] = useState({});
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [selectedLessonClient, setSelectedLessonClient] = useState('');
  const [clientCurriculum, setClientCurriculum] = useState(null);
  const [editingModule, setEditingModule] = useState(null);
  const [editModuleForm, setEditModuleForm] = useState({ title: '', description: '', estimatedMinutes: 30 });
  const [genPrimaryWound, setGenPrimaryWound] = useState('abandonment');
  const [genSecondaryWound, setGenSecondaryWound] = useState('shame');
  const [generatingCurriculum, setGeneratingCurriculum] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [showAddModule, setShowAddModule] = useState(false);
  const [addModuleWound, setAddModuleWound] = useState('abandonment');
  const [addingModuleId, setAddingModuleId] = useState(null);
  const [addModuleResult, setAddModuleResult] = useState(null);

  const [accessControlClient, setAccessControlClient] = useState(null);
  const [accessControlForm, setAccessControlForm] = useState(null);
  const [accessControlSaving, setAccessControlSaving] = useState(false);
  const [accessControlFullAccess, setAccessControlFullAccess] = useState(true);
  const [deletingClient, setDeletingClient] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [emailClient, setEmailClient] = useState(null);
  const [emailTemplateId, setEmailTemplateId] = useState('welcome');
  const [emailPreviewHtml, setEmailPreviewHtml] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const WOUND_TYPES = ['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'];
  const therapist = clientAuth.getCurrentClient();

  const SESSION_NOTE_TEMPLATES = {
    'none': { label: 'Blank Note', sections: [] },
    'initial_intake': {
      label: 'Initial Intake',
      sessionType: 'Individual',
      sections: [
        { heading: 'Presenting Concern', placeholder: 'Describe the client\'s primary reason for seeking therapy...' },
        { heading: 'Background & History', placeholder: 'Relevant personal, family, and mental health history...' },
        { heading: 'Parts Identified', placeholder: 'Any parts that emerged during intake (managers, firefighters, exiles)...' },
        { heading: 'Initial Impressions', placeholder: 'Clinical observations, rapport quality, readiness for IFS work...' },
        { heading: 'Treatment Goals', placeholder: 'Agreed-upon goals for therapy...' },
        { heading: 'Homework Assigned', placeholder: 'Any initial tasks or exercises given to the client...' },
        { heading: 'Next Session Focus', placeholder: 'Planned focus areas for the next session...' }
      ]
    },
    'parts_work': {
      label: 'Parts Work Session',
      sessionType: 'Individual',
      sections: [
        { heading: 'Presenting Concern', placeholder: 'What the client brought to session today...' },
        { heading: 'Parts Identified', placeholder: 'Parts that were active or explored (name, type, role)...' },
        { heading: 'Parts Interactions', placeholder: 'How parts related to each other and to Self during session...' },
        { heading: 'Interventions Used', placeholder: 'Techniques applied (direct access, in-sight, unblending, etc.)...' },
        { heading: 'Client Self-Energy Level', placeholder: 'Client\'s capacity for Self-leadership during session (low/medium/high)...' },
        { heading: 'Homework Assigned', placeholder: 'Between-session practices or exercises...' },
        { heading: 'Next Session Focus', placeholder: 'Planned focus for continued parts work...' }
      ]
    },
    'unburdening': {
      label: 'Unburdening Session',
      sessionType: 'Individual',
      sections: [
        { heading: 'Presenting Concern', placeholder: 'Context leading to unburdening work...' },
        { heading: 'Target Part / Exile', placeholder: 'Which exile was accessed and what burden was held...' },
        { heading: 'Protectors Consulted', placeholder: 'Managers/firefighters that needed permission before exile access...' },
        { heading: 'Witnessing Process', placeholder: 'What the exile shared and how Self witnessed the experience...' },
        { heading: 'Unburdening Details', placeholder: 'Method of release (water, fire, wind, earth, light) and what was released...' },
        { heading: 'Invitation & New Qualities', placeholder: 'What the part chose to take on after unburdening...' },
        { heading: 'Post-Unburdening Check', placeholder: 'How protectors responded, system recalibration observations...' },
        { heading: 'Homework Assigned', placeholder: 'Follow-up practices to support integration...' },
        { heading: 'Next Session Focus', placeholder: 'Planned follow-up and integration work...' }
      ]
    },
    'crisis_intervention': {
      label: 'Crisis Intervention',
      sessionType: 'Emergency',
      sections: [
        { heading: 'Presenting Crisis', placeholder: 'Nature and severity of the crisis situation...' },
        { heading: 'Safety Assessment', placeholder: 'Risk level, suicidal/homicidal ideation, self-harm assessment...' },
        { heading: 'Parts Activated', placeholder: 'Which parts are driving the crisis response (firefighters, overwhelmed exiles)...' },
        { heading: 'Interventions Used', placeholder: 'De-escalation techniques, grounding exercises, safety planning...' },
        { heading: 'Safety Plan', placeholder: 'Agreed-upon safety steps, emergency contacts, coping strategies...' },
        { heading: 'Referrals Made', placeholder: 'Any external referrals (psychiatry, crisis line, emergency services)...' },
        { heading: 'Follow-Up Plan', placeholder: 'When and how to follow up, next appointment timing...' },
        { heading: 'Next Session Focus', placeholder: 'Stabilization priorities for next contact...' }
      ]
    },
    'regular_checkin': {
      label: 'Regular Check-In',
      sessionType: 'Individual',
      sections: [
        { heading: 'Presenting Concern', placeholder: 'What the client shared about their week...' },
        { heading: 'Parts Identified', placeholder: 'Parts that were active since last session...' },
        { heading: 'Progress Review', placeholder: 'Progress on previous homework and treatment goals...' },
        { heading: 'Interventions Used', placeholder: 'Techniques or approaches used during session...' },
        { heading: 'Homework Assigned', placeholder: 'Tasks or exercises for the coming week...' },
        { heading: 'Next Session Focus', placeholder: 'Planned topics for the next session...' }
      ]
    }
  };

  const handleGenerateCurriculum = async (clientId) => {
    if (!clientId || generatingCurriculum) return;
    setGeneratingCurriculum(true);
    setGenResult(null);
    try {
      const scores = WOUND_TYPES.map(w => ({
        id: w,
        score: w === genPrimaryWound ? 20 : w === genSecondaryWound ? 12 : 2
      }));
      const curriculum = aiCurriculumPersonalizer.analyzeAndPersonalize(scores);
      if (!curriculum || !curriculum.personalizedModules?.length) {
        setGenResult({ error: 'Could not generate curriculum. Please try different wound types.' });
        return;
      }
      await supabaseHelpers.savePersonalizedCurriculum(clientId, curriculum);

      // Always insert a fresh assessment record so the client's curriculum page
      // picks up the latest wound type (most recent assessment_date wins).
      const scoreForWound = (w) => genPrimaryWound === w ? 20 : genSecondaryWound === w ? 12 : 2;
      const { error: assessErr } = await supabase.from('ifs_assessment_results').insert({
        client_id: clientId,
        primary_wound: genPrimaryWound,
        secondary_wound: genSecondaryWound,
        abandonment_score: scoreForWound('abandonment'),
        shame_score: scoreForWound('shame'),
        neglect_score: scoreForWound('neglect'),
        betrayal_score: scoreForWound('betrayal'),
        helplessness_score: scoreForWound('helplessness'),
        tertiary_wounds: WOUND_TYPES.filter(w => w !== genPrimaryWound && w !== genSecondaryWound),
        assessment_date: new Date().toISOString(),
        assessment_version: '1.0'
      });
      if (assessErr) console.warn('Assessment record write failed (non-critical):', assessErr.message);
      await loadClientCurriculum(clientId);
      await loadDashboardData();
      setGenResult({ success: `Personalized curriculum generated for ${clients.find(c => c.id === clientId)?.name || 'client'} (${genPrimaryWound} primary).` });
    } catch (e) {
      console.error('Error generating curriculum:', e);
      setGenResult({ error: 'Failed to generate curriculum: ' + e.message });
    }
    setGeneratingCurriculum(false);
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const therapist = clientAuth.getCurrentClient();
      const clientList = await loadAssignedClients(therapist?.id);

      if (!therapist?.id) {
        setClients([]);
        setSessionPrepRows([]);
        setAlerts([]);
        setLoading(false);
        return;
      }

      if (clientList.length === 0) {
        setClients([]);
        setSessionPrepRows([]);
        setAlerts([]);
        setLoading(false);
        return;
      }

      const clientIds = clientList.map(c => c.id);
      loadUpcomingSessionPrepForTherapist(therapist.id).then(({ data }) => setSessionPrepRows(data || [])).catch((error) => console.error('Failed to load session prep rows:', error));

      const [
        { data: assessments },
        { data: progressRows },
        { data: journalRows },
        { data: activityRows },
        { data: gamificationRows },
        { data: interactiveWoundData },
        { data: moodEntries },
        { data: checkinData }
      ] = await Promise.all([
        supabase
          .from('ifs_assessment_results')
          .select('id, client_id, primary_wound, secondary_wound, abandonment_score, shame_score, neglect_score, betrayal_score, helplessness_score, created_at')
          .in('client_id', clientIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('ifs_client_progress')
          .select('id, client_id, module_id, completed, updated_at')
          .in('client_id', clientIds),
        supabase
          .from('ifs_journal_entries')
          .select('id, client_id, content, created_at')
          .in('client_id', clientIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('ifs_therapy_activity_progress')
          .select('id, client_id, activity_id, completed')
          .in('client_id', clientIds),
        supabase
          .from('ifs_gamification')
          .select('client_id, xp, level, badges, streak_current, streak_longest, last_login_date')
          .in('client_id', clientIds),
        supabase
          .from('ifs_interactive_data')
          .select('client_id, data, updated_at')
          .in('client_id', clientIds)
          .eq('module_id', 'assessment_wounds'),
        supabase
          .from('ifs_mood_entries')
          .select('client_id, mood, energy, date')
          .in('client_id', clientIds)
          .order('date', { ascending: false })
          .limit(500),
        supabase
          .from('ifs_interactive_data')
          .select('client_id, module_id, updated_at')
          .in('client_id', clientIds)
          .like('module_id', 'daily_checkin_%')
          .order('updated_at', { ascending: false })
          .limit(500)
      ]);

      const interactiveWoundsByClient = {};
      (interactiveWoundData || []).forEach(d => {
        interactiveWoundsByClient[d.client_id] = d.data;
      });

      const assessmentsByClient = {};
      (assessments || []).forEach(a => {
        if (!assessmentsByClient[a.client_id]) assessmentsByClient[a.client_id] = [];
        assessmentsByClient[a.client_id].push(a);
      });

      const progressByClient = {};
      (progressRows || []).forEach(p => {
        if (!progressByClient[p.client_id]) progressByClient[p.client_id] = [];
        progressByClient[p.client_id].push(p);
      });

      const journalsByClient = {};
      (journalRows || []).forEach(j => {
        if (!journalsByClient[j.client_id]) journalsByClient[j.client_id] = [];
        journalsByClient[j.client_id].push(j);
      });

      const activitiesByClient = {};
      (activityRows || []).forEach(a => {
        if (!activitiesByClient[a.client_id]) activitiesByClient[a.client_id] = [];
        activitiesByClient[a.client_id].push(a);
      });

      const gamificationByClient = {};
      (gamificationRows || []).forEach(g => {
        gamificationByClient[g.client_id] = g;
      });
      setClientGamification(gamificationByClient);

      const moodsByClient = {};
      (moodEntries || []).forEach(m => {
        if (!moodsByClient[m.client_id]) moodsByClient[m.client_id] = [];
        moodsByClient[m.client_id].push(m);
      });

      const checkinsByClient = {};
      (checkinData || []).forEach(c => {
        if (!checkinsByClient[c.client_id]) checkinsByClient[c.client_id] = [];
        checkinsByClient[c.client_id].push(c.updated_at);
      });

      const enrichedClients = clientList.map(c => {
        const clientAssessments = assessmentsByClient[c.id] || [];
        const latestAssessment = clientAssessments[0];
        const clientProgress = progressByClient[c.id] || [];
        const clientJournals = journalsByClient[c.id] || [];

        const completedModules = new Set();
        clientProgress.forEach(p => {
          if (p.completed) completedModules.add(p.module_id);
        });

        const modulesCompleted = completedModules.size;
        const progress = TOTAL_MODULES > 0 ? Math.round((modulesCompleted / TOTAL_MODULES) * 100) : 0;

        const interactiveWound = interactiveWoundsByClient[c.id];
        let primaryWound = latestAssessment?.primary_wound || null;
        let secondaryWound = latestAssessment?.secondary_wound || null;
        if (!primaryWound && interactiveWound) {
          primaryWound = interactiveWound.primary || null;
          secondaryWound = interactiveWound.secondary || null;
        }

        const gamData = gamificationByClient[c.id];

        const incompleteModules = clientProgress
          .filter(p => !p.completed)
          .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
        const currentModuleId = incompleteModules.length > 0 ? incompleteModules[0].module_id : null;

        const recentMoods = (moodsByClient[c.id] || []).slice(0, 5);

        return {
          id: c.id,
          name: c.name,
          email: c.email || '',
          phone: c.phone || '',
          pin: c.pin || '',
          status: c.status || 'active',
          primaryWound: primaryWound || 'unknown',
          secondaryWound: secondaryWound || null,
          progress,
          lastActive: c.last_active,
          riskLevel: calculateRiskLevel(c.last_active),
          modulesCompleted,
          assessmentsTaken: clientAssessments.length,
          journalEntries: clientJournals.length,
          joinDate: c.created_at,
          therapyActivities: (activitiesByClient[c.id] || []).filter(a => a.completed).length,
          totalActivities: (activitiesByClient[c.id] || []).length,
          xp: gamData?.xp || 0,
          level: gamData?.level || 1,
          streak: gamData?.streak_current || 0,
          streakLongest: gamData?.streak_longest || 0,
          badges: gamData?.badges || {},
          currentModuleId,
          recentMoods,
          accessRestrictions: c.access_restrictions || null
        };
      });

      setClients(enrichedClients);

      const riskScores = {};
      enrichedClients.forEach(client => {
        const clientMoods = moodsByClient[client.id] || [];
        const clientJournalContent = (journalsByClient[client.id] || []).slice(0, 10);
        const clientCheckins = checkinsByClient[client.id] || [];
        riskScores[client.id] = computeRiskScore(client, clientMoods, clientJournalContent, clientCheckins);
      });
      setRiskScoreData(riskScores);

      const recentAssessments = (assessments || [])
        .filter(a => {
          const d = new Date(a.created_at || a.assessment_date);
          return (Date.now() - d.getTime()) < 14 * 24 * 60 * 60 * 1000;
        })
        .slice(0, 10);

      const recentJournals = (journalRows || [])
        .filter(j => {
          const d = new Date(j.created_at);
          return (Date.now() - d.getTime()) < 14 * 24 * 60 * 60 * 1000;
        })
        .slice(0, 10);

      const generatedAlerts = generateAlertsFromClients(enrichedClients, recentAssessments, recentJournals);
      setAlerts(generatedAlerts);

    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      await loadDashboardData();
      const client = clientAuth.getCurrentClient();
      const therapistId = client?.id;
      if (!therapistId) return;
      try {
        const [notesData, feedbackData] = await Promise.all([
          supabaseHelpers.getTherapistNotes(therapistId),
          supabaseHelpers.getTherapistFeedback(therapistId)
        ]);
        if (notesData && notesData.length > 0) {
          const formattedNotes = notesData.map(n => {
            const noteClient = clients.length > 0
              ? clients.find(c => c.id === n.client_id)
              : null;
            return {
              id: n.id,
              clientId: n.client_id,
              clientName: noteClient?.name || n.client_id?.substring(0, 8) || 'Unknown',
              date: n.session_date || n.created_at,
              sessionType: n.note_type || 'Individual',
              notes: n.content,
              goals: '',
              createdAt: n.created_at
            };
          });
          setSessionNotes(formattedNotes);
        }
        if (feedbackData && feedbackData.length > 0) {
          const feedbackObj = {};
          feedbackData.forEach(fb => {
            if (fb.client_id) feedbackObj[fb.client_id] = fb.feedback;
          });
          setTherapistFeedback(feedbackObj);
        }
      } catch (e) {
        console.error('Failed to load advisor data:', e);
      }
    };
    loadInitialData();
  }, []);

  const loadClientInsights = useCallback(async (clientId) => {
    if (!clientId) {
      setClientInsights(null);
      return;
    }
    setInsightsLoading(true);
    try {
      const [
        { data: moduleAnswers },
        { data: activityProgress },
        assessmentData,
        personalizedCurriculum,
        { data: interactiveData },
        { data: journalEntries },
        { data: progressData },
        { data: checkinRaw },
        { data: moodRaw },
        { data: homeworkRaw },
        { data: allInteractiveRaw }
      ] = await Promise.all([
        supabase
          .from('ifs_module_answers')
          .select('*')
          .eq('client_id', clientId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('ifs_therapy_activity_progress')
          .select('*')
          .eq('client_id', clientId),
        supabaseHelpers.getAssessment(clientId),
        supabaseHelpers.getPersonalizedCurriculum(clientId),
        supabase
          .from('ifs_interactive_data')
          .select('*')
          .eq('client_id', clientId)
          .in('module_id', ['assessment_wounds', 'assessment_parts', 'assessment_self-energy', 'assessment_attachment']),
        supabase
          .from('ifs_journal_entries')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('ifs_client_progress')
          .select('*')
          .eq('client_id', clientId),
        supabase
          .from('ifs_interactive_data')
          .select('data, module_id, updated_at')
          .eq('client_id', clientId)
          .like('module_id', 'daily_checkin_%')
          .order('updated_at', { ascending: false })
          .limit(14),
        supabase
          .from('ifs_mood_entries')
          .select('mood, energy, date, emotions')
          .eq('client_id', clientId)
          .order('date', { ascending: false })
          .limit(14),
        supabase
          .from('ifs_therapy_homework')
          .select('id, title, description, completed, due_date, created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('ifs_interactive_data')
          .select('module_id, updated_at')
          .eq('client_id', clientId)
          .order('updated_at', { ascending: false })
          .limit(100)
      ]);

      const recentAnswers = [];
      const moduleResponses = {};

      (moduleAnswers || []).forEach(ma => {
        const answers = ma.answers || {};
        const modId = ma.module_id || 'unknown';
        if (!moduleResponses[modId]) moduleResponses[modId] = [];
        moduleResponses[modId].push({ step_id: ma.step_id, answers });
        Object.entries(answers).forEach(([question, answer]) => {
          if (typeof answer === 'string' && answer.trim().length > 0) {
            recentAnswers.push({ question, answer, module: modId, stepId: ma.step_id });
          }
        });
      });

      (progressData || []).forEach(p => {
        const responses = p.responses || {};
        if (Object.keys(responses).length === 0) return;
        const modId = p.module_id;
        if (!moduleResponses[modId]) moduleResponses[modId] = [];
        const alreadyHas = moduleResponses[modId].some(existing => {
          const existingKeys = Object.keys(existing.answers || {});
          const newKeys = Object.keys(responses);
          return existingKeys.length > 0 && newKeys.every(k => existingKeys.includes(k));
        });
        if (!alreadyHas) {
          moduleResponses[modId].push({ step_id: 'progress', answers: responses });
          Object.entries(responses).forEach(([question, answer]) => {
            if (typeof answer === 'string' && answer.trim().length > 0) {
              const exists = recentAnswers.some(ra => ra.module === modId && ra.question === question);
              if (!exists) {
                recentAnswers.push({ question, answer, module: modId, stepId: 'progress' });
              }
            }
          });
        }
      });

      const woundsEntry = (interactiveData || []).find(d => d.module_id === 'assessment_wounds');
      const partsEntry = (interactiveData || []).find(d => d.module_id === 'assessment_parts');
      const selfEnergyEntry = (interactiveData || []).find(d => d.module_id === 'assessment_self-energy');
      const attachmentEntry = (interactiveData || []).find(d => d.module_id === 'assessment_attachment');

      let finalAssessment = assessmentData || null;
      if (!finalAssessment && woundsEntry?.data) {
        const wd = woundsEntry.data;
        finalAssessment = {
          primary_wound: wd.primary,
          secondary_wound: wd.secondary,
          abandonment_score: wd.scores?.abandonment?.total || 0,
          shame_score: wd.scores?.shame?.total || 0,
          neglect_score: wd.scores?.neglect?.total || 0,
          betrayal_score: wd.scores?.betrayal?.total || 0,
          helplessness_score: wd.scores?.helplessness?.total || 0,
          assessment_date: wd.completedAt || woundsEntry.updated_at,
          created_at: woundsEntry.updated_at
        };
      }

      let customAssessmentResults = [];
      try {
        const { data: customData } = await supabase
          .from('ifs_interactive_data')
          .select('*')
          .eq('client_id', clientId)
          .like('module_id', 'custom_assessment_response_%');
        if (customData && customData.length > 0) {
          customAssessmentResults = customData.map(d => ({ ...d.data, moduleId: d.module_id, updatedAt: d.updated_at }));
        }
      } catch (e) { console.error('Error loading custom assessments:', e); }

      const client = clients.find(c => c.id === clientId);
      const wound = finalAssessment?.primary_wound || client?.primaryWound || 'abandonment';
      const sessionPrep = sessionPrepByWound[wound] || sessionPrepByWound.abandonment;

      const recentCheckins = (checkinRaw || []).map(r => ({
        ...r.data,
        date: r.module_id.replace('daily_checkin_', ''),
        updatedAt: r.updated_at
      }));

      const avgSelfEnergy = recentCheckins.length
        ? (recentCheckins.map(c => c.selfEnergy || 0).reduce((s, v) => s + v, 0) / recentCheckins.length).toFixed(1)
        : null;
      const avgMood = (moodRaw || []).length
        ? ((moodRaw || []).map(e => e.mood || 0).reduce((s, v) => s + v, 0) / (moodRaw || []).length).toFixed(1)
        : null;

      const timelineEvents = [];

      (progressData || []).forEach(p => {
        if (p.completed) {
          const modName = getModuleName(p.module_id) || p.module_id?.replace(/_/g, ' ');
          timelineEvents.push({
            id: `progress-${p.id}`,
            type: 'module',
            title: 'Completed Module',
            description: modName,
            timestamp: p.completed_at || p.updated_at,
            colorKey: 'blue',
          });
        }
      });

      (journalEntries || []).forEach(j => {
        timelineEvents.push({
          id: `journal-${j.id}`,
          type: 'journal',
          title: j.title || 'Journal Entry',
          description: j.content ? (j.content.length > 120 ? j.content.substring(0, 120) + '...' : j.content) : '',
          timestamp: j.created_at,
          meta: j.mood ? `Mood: ${j.mood}` : null,
          colorKey: 'amber',
        });
      });

      (allInteractiveRaw || []).forEach(d => {
        if (d.module_id?.startsWith('assessment_')) {
          const assessType = d.module_id.replace('assessment_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          timelineEvents.push({
            id: `assessment-${d.module_id}-${d.updated_at}`,
            type: 'assessment',
            title: 'Completed Assessment',
            description: assessType,
            timestamp: d.updated_at,
            colorKey: 'amber',
          });
        } else if (d.module_id?.startsWith('daily_checkin_')) {
          const checkinDate = d.module_id.replace('daily_checkin_', '');
          timelineEvents.push({
            id: `checkin-${d.module_id}`,
            type: 'checkin',
            title: 'Daily Check-In',
            description: checkinDate,
            timestamp: d.updated_at,
            colorKey: 'emerald',
          });
        }
      });

      (moodRaw || []).forEach(m => {
        const moodLabels = ['', 'Struggling', 'Low', 'Okay', 'Good', 'Great'];
        timelineEvents.push({
          id: `mood-${m.date}`,
          type: 'mood',
          title: 'Mood Log',
          description: `${moodLabels[m.mood] || 'Unknown'} (${m.mood}/5)${m.energy ? `, Energy: ${m.energy}/5` : ''}`,
          timestamp: m.date,
          meta: m.emotions?.length > 0 ? m.emotions.join(', ') : null,
          colorKey: m.mood >= 4 ? 'emerald' : m.mood >= 3 ? 'yellow' : 'red',
          moodValue: m.mood,
        });
      });

      (homeworkRaw || []).forEach(hw => {
        timelineEvents.push({
          id: `homework-${hw.id}`,
          type: 'homework',
          title: hw.completed ? 'Homework Completed' : 'Homework Assigned',
          description: hw.title || 'Untitled',
          timestamp: hw.created_at,
          colorKey: hw.completed ? 'emerald' : 'orange',
          hwCompleted: hw.completed,
        });
      });

      (moduleAnswers || []).forEach(ma => {
        const hasContent = Object.values(ma.answers || {}).some(v => typeof v === 'string' && v.trim().length > 0);
        if (hasContent) {
          const modName = getModuleName(ma.module_id) || ma.module_id?.replace(/_/g, ' ');
          timelineEvents.push({
            id: `answer-${ma.id || ma.module_id + '-' + ma.step_id}`,
            type: 'module',
            title: 'Module Response',
            description: `${modName} — Step ${ma.step_id}`,
            timestamp: ma.updated_at,
            colorKey: 'blue',
            isResponse: true,
          });
        }
      });

      timelineEvents.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

      setClientInsights({
        recentAnswers: recentAnswers.slice(0, 10),
        moduleResponses,
        activityProgress: activityProgress || [],
        sessionPrep,
        assessment: finalAssessment,
        personalization: personalizedCurriculum || null,
        partsAssessment: partsEntry?.data || null,
        selfEnergyAssessment: selfEnergyEntry?.data || null,
        attachmentAssessment: attachmentEntry?.data || null,
        customAssessments: customAssessmentResults,
        journalEntries: journalEntries || [],
        moduleProgress: progressData || [],
        recentCheckins,
        recentMoods: moodRaw || [],
        avgSelfEnergy,
        avgMood,
        timeline: timelineEvents
      });
    } catch (e) {
      console.error('Error loading client insights:', e);
      setClientInsights(null);
    }
    setInsightsLoading(false);
  }, [clients]);

  useEffect(() => {
    if (selectedInsightClient) {
      loadClientInsights(selectedInsightClient);
      setTimelineFilter('all');
    }
  }, [selectedInsightClient, loadClientInsights]);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesWound = filterWound === 'all' || client.primaryWound === filterWound;
    const matchesRisk = filterRisk === 'all' || client.riskLevel === filterRisk;
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesWound && matchesRisk && matchesStatus;
  });

  const stats = {
    totalClients: clients.length,
    activeSessions: clients.filter(c => c.riskLevel === 'low').length,
    assessmentsCompleted: clients.reduce((sum, c) => sum + c.assessmentsTaken, 0),
    avgProgress: clients.length > 0 ? Math.round(clients.reduce((sum, c) => sum + c.progress, 0) / clients.length) : 0
  };

  useEffect(() => {
    if (!noteForm.clientId) { setNoteParts([]); return; }
    supabase.from('ifs_parts').select('id, part_name, part_type').eq('client_id', noteForm.clientId).order('created_at', { ascending: false })
      .then(({ data }) => setNoteParts(data || []));
  }, [noteForm.clientId]);

  const handleNoteTextChange = (value) => {
    setNoteForm(f => ({ ...f, notes: value }));
    setShowPartTagDropdown(/(^|\s)@$/.test(value));
  };

  const addTaggedPart = (part) => {
    setTaggedParts(prev => prev.some(item => item.id === part.id) ? prev : [...prev, { id: part.id, name: part.part_name }]);
    setNoteForm(f => ({ ...f, notes: `${f.notes.replace(/@$/, '')}@${part.part_name} ` }));
    setShowPartTagDropdown(false);
  };

  const handleSaveNote = async () => {
    if (!noteForm.clientId || !noteForm.notes) return;
    const therapist = clientAuth.getCurrentClient();
    const therapistId = therapist?.id;
    const client = clients.find(c => c.id === noteForm.clientId);
    const newNote = {
      id: Date.now().toString(),
      clientId: noteForm.clientId,
      clientName: client?.name || 'Unknown',
      date: noteForm.date,
      sessionType: noteForm.sessionType,
      notes: noteForm.notes,
      goals: noteForm.goals,
      createdAt: new Date().toISOString()
    };
    if (therapistId) {
      try {
        const saved = await supabaseHelpers.saveTherapistNotes(therapistId, noteForm.clientId, {
          content: noteForm.notes,
          sessionDate: noteForm.date,
          noteType: noteForm.sessionType,
          tagged_parts: taggedParts
        });
        if (saved) newNote.id = saved.id;
      } catch (err) {
        console.error('Error saving advisor note:', err);
      }
    }
    setSessionNotes(prev => [newNote, ...prev]);
    setSelectedNoteTemplate('none');
    setNoteForm({
      clientId: '',
      date: new Date().toISOString().split('T')[0],
      sessionType: 'Individual',
      notes: '',
      goals: ''
    });
    setTaggedParts([]);
  };

  const handleTemplateSelect = (templateKey) => {
    setSelectedNoteTemplate(templateKey);
    const template = SESSION_NOTE_TEMPLATES[templateKey];
    if (!template || template.sections.length === 0) {
      setNoteForm(f => ({ ...f, sessionType: 'Individual', notes: '', goals: '' }));
      return;
    }
    const structuredNotes = template.sections
      .filter(s => s.heading !== 'Next Session Focus')
      .map(s => `## ${s.heading}\n${s.placeholder}`)
      .join('\n\n');
    const nextFocus = template.sections.find(s => s.heading === 'Next Session Focus');
    const goals = nextFocus ? nextFocus.placeholder : '';
    setNoteForm(f => ({
      ...f,
      sessionType: template.sessionType || f.sessionType,
      notes: structuredNotes,
      goals: goals
    }));
  };

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const loadClientCurriculum = async (clientId) => {
    if (!clientId) { setClientCurriculum(null); return; }
    const { data } = await supabase
      .from('ifs_personalized_curriculum')
      .select('*')
      .eq('client_id', clientId)
      .order('module_order');
    setClientCurriculum(data || []);
  };

  const [moduleSaveError, setModuleSaveError] = useState('');
  const handleSaveModuleEdit = async () => {
    if (!editingModule) return;
    setModuleSaveError('');
    const { error } = await supabase
      .from('ifs_personalized_curriculum')
      .update({
        module_title: editModuleForm.title,
        module_description: editModuleForm.description,
        estimated_minutes: editModuleForm.estimatedMinutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingModule.id);
    if (error) {
      console.error('Error saving module:', error);
      setModuleSaveError('Failed to save changes. Please try again.');
    } else {
      loadClientCurriculum(selectedLessonClient);
      setEditingModule(null);
    }
  };

  const handleAddWoundModule = async (template) => {
    if (!selectedLessonClient || addingModuleId) return;
    setAddingModuleId(template.id);
    setAddModuleResult(null);
    try {
      const nextOrder = (clientCurriculum || []).length + 1;
      const moduleId = `wound-${template.id}-${Date.now()}`;
      const truncate = (val, max) => (val && val.length > max ? val.substring(0, max) : val);
      const { error } = await supabase
        .from('ifs_personalized_curriculum')
        .insert({
          client_id: selectedLessonClient,
          module_id: moduleId,
          module_order: nextOrder,
          module_title: template.title,
          module_description: template.description,
          customized_content: {
            goals: template.goals,
            topics: template.topics,
            activities: template.activities,
            watchFor: template.watchFor,
            homework: template.homework || '',
            woundFocus: addModuleWound
          },
          primary_wound_focus: truncate(addModuleWound, 50),
          estimated_minutes: template.estimatedMinutes || 60,
          difficulty_level: template.difficulty || 'beginner',
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      setAddModuleResult({ success: `"${template.title}" added as Module ${nextOrder}` });
      await loadClientCurriculum(selectedLessonClient);
    } catch (err) {
      console.error('Error adding module:', err);
      setAddModuleResult({ error: 'Failed to add module: ' + err.message });
    }
    setAddingModuleId(null);
  };

  const handleRemoveModule = async (mod) => {
    if (!selectedLessonClient) return;
    const confirmed = window.confirm(`Remove "${mod.module_title}" from this client's curriculum?`);
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from('ifs_personalized_curriculum')
        .delete()
        .eq('id', mod.id);
      if (error) throw error;
      const remaining = (clientCurriculum || []).filter(m => m.id !== mod.id);
      for (let i = 0; i < remaining.length; i++) {
        await supabase
          .from('ifs_personalized_curriculum')
          .update({ module_order: i + 1, updated_at: new Date().toISOString() })
          .eq('id', remaining[i].id);
      }
      await loadClientCurriculum(selectedLessonClient);
    } catch (err) {
      console.error('Error removing module:', err);
    }
  };

  const handleFeedbackChange = async (clientId, value) => {
    const updated = { ...therapistFeedback, [clientId]: value };
    setTherapistFeedback(updated);
    const therapist = clientAuth.getCurrentClient();
    if (therapist?.id) {
      try {
        await supabaseHelpers.saveTherapistFeedback(therapist.id, clientId, {
          feedback: value
        });
      } catch (err) {
        console.error('Error saving advisor feedback:', err);
      }
    }
  };

  const generateUniquePIN = async () => {
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      const pin = String(Math.floor(100000 + Math.random() * 900000));
      const { data } = await supabase
        .from('ifs_clients')
        .select('id')
        .eq('pin', pin)
        .limit(1);
      if (!data || data.length === 0) return pin;
    }
    return null;
  };

  const handleCreateClient = async () => {
    if (!newClientForm.name.trim()) return;
    setNewClientLoading(true);
    try {
      let pin;
      if (newClientForm.pin.trim()) {
        const customPin = newClientForm.pin.trim();
        if (!/^\d{6}$/.test(customPin)) {
          setNewClientResult({ error: 'PIN must be exactly 6 digits.' });
          setNewClientLoading(false);
          return;
        }
        const { data: existing } = await supabase
          .from('ifs_clients')
          .select('id')
          .eq('pin', customPin)
          .limit(1);
        if (existing && existing.length > 0) {
          setNewClientResult({ error: 'That PIN is already in use. Please choose a different one.' });
          setNewClientLoading(false);
          return;
        }
        pin = customPin;
      } else {
        pin = await generateUniquePIN();
        if (!pin) {
          setNewClientResult({ error: 'Could not generate a unique PIN. Please try again.' });
          setNewClientLoading(false);
          return;
        }
      }
      const { data, error } = await supabase
        .from('ifs_clients')
        .insert({
          name: newClientForm.name.trim(),
          email: newClientForm.email.trim() || null,
          phone: newClientForm.phone.trim() || null,
          pin,
          user_role: newClientForm.role || 'client',
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) {
        setNewClientResult({ error: error.message });
      } else {
        const therapist = clientAuth.getCurrentClient();
        if (therapist?.id && data.user_role === 'client') {
          const { error: assignmentError } = await assignClientToTherapist(therapist.id, data.id, 'active', { therapistName: therapist.name, clientName: data.name });
          if (assignmentError) console.error('Error assigning new client to therapist:', assignmentError);
        }
        setNewClientResult({ success: true, name: data.name, pin, role: data.user_role });
        await loadDashboardData();
      }
    } catch (e) {
      setNewClientResult({ error: e.message });
    }
    setNewClientLoading(false);
  };

  const handleToggleClientStatus = async (client) => {
    const newStatus = client.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('ifs_clients')
        .update({ status: newStatus })
        .eq('id', client.id);
      if (error) throw error;
      await loadDashboardData();
    } catch (error) {
      console.error('Error toggling client status:', error);
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingClient || deleteConfirmText !== 'DELETE') return;
    setDeleteLoading(true);
    try {
      const clientId = deletingClient.id;
      const relatedTables = [
        'ifs_assessment_results',
        'ifs_client_progress',
        'ifs_journal_entries',
        'ifs_gamification',
        'ifs_mood_entries',
        'ifs_therapist_notes',
        'ifs_personalized_curriculum',
        'ifs_interactive_data',
        'ifs_module_answers',
        'ifs_messages',
        'ifs_therapy_homework',
        'ifs_parts',
        'ifs_exercise_progress',
        'ifs_milestones',
        'ifs_therapy_sessions',
        'ifs_parts_dialogue',
        'ifs_therapy_activity_progress',
        'ifs_client_preferences',
        'ifs_therapist_feedback',
        'ifs_therapist_clients',
        'ifs_assigned_homework',
        'ifs_session_agendas',
        'ifs_generated_reports',
        'ifs_treatment_plans'
      ];
      for (const table of relatedTables) {
        const { error } = await supabase.from(table).delete().eq('client_id', clientId);
        if (error) console.warn(`Error deleting from ${table}:`, error.message);
      }
      const { error: clientError } = await supabase.from('ifs_clients').delete().eq('id', clientId);
      if (clientError) throw clientError;
      setDeletingClient(null);
      setDeleteConfirmText('');
      await loadDashboardData();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client: ' + error.message);
    }
    setDeleteLoading(false);
  };

  const handleEditClientSave = async () => {
    if (!editingClient || !editClientForm.name.trim()) return;
    setEditClientSaving(true);
    try {
      const { error } = await supabase
        .from('ifs_clients')
        .update({
          name: editClientForm.name.trim(),
          email: editClientForm.email.trim() || null,
          phone: editClientForm.phone.trim() || null
        })
        .eq('id', editingClient.id);
      if (error) throw error;
      setEditingClient(null);
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating client:', error);
    }
    setEditClientSaving(false);
  };

  const DEFAULT_ACCESS_FORM = {
    modules: MODULE_SEQUENCE.map(m => m.id),
    assessments: ['wounds', 'parts', 'attachment', 'self-energy'],
    features: {
      exercises: true,
      meditations: true,
      letters: true,
      partsCards: true,
      partsStudio: true,
      journal: true,
      resourceLibrary: true,
      weeklyReflection: true,
      healingTracker: true,
      milestones: true,
      dailyCheckin: true,
      partsDialogue: true,
      unburdening: true,
      moodAnalytics: true
    }
  };

  const FEATURE_LABELS = {
    exercises: 'Exercises',
    meditations: 'Guided Meditations',
    letters: 'Letter Writing',
    partsCards: 'Parts Cards',
    partsStudio: 'Parts Studio',
    journal: 'Journal',
    resourceLibrary: 'Resource Library',
    weeklyReflection: 'Weekly Reflection',
    healingTracker: 'Healing Tracker',
    milestones: 'Milestones',
    dailyCheckin: 'Daily Check-In',
    partsDialogue: 'Parts Dialogue',
    unburdening: 'Unburdening Protocol',
    moodAnalytics: 'Mood Analytics'
  };

  const ASSESSMENT_LABELS = {
    wounds: 'Wound Assessment',
    parts: 'Parts Assessment',
    attachment: 'Attachment Assessment',
    'self-energy': 'Self-Energy Assessment'
  };

  const openAccessControls = (client) => {
    const existing = client.accessRestrictions;
    if (existing) {
      setAccessControlFullAccess(false);
      setAccessControlForm({
        modules: existing.modules || [],
        assessments: existing.assessments || [],
        features: { ...DEFAULT_ACCESS_FORM.features, ...(existing.features || {}) }
      });
    } else {
      setAccessControlFullAccess(true);
      setAccessControlForm({ ...DEFAULT_ACCESS_FORM });
    }
    setAccessControlClient(client);
  };

  const handleAccessControlSave = async () => {
    if (!accessControlClient) return;
    setAccessControlSaving(true);
    try {
      const value = accessControlFullAccess ? null : accessControlForm;
      const { error } = await supabase
        .from('ifs_clients')
        .update({ access_restrictions: value })
        .eq('id', accessControlClient.id);
      if (error) throw error;
      setAccessControlClient(null);
      setAccessControlForm(null);
      await loadDashboardData();
    } catch (error) {
      console.error('Error saving access controls:', error);
    }
    setAccessControlSaving(false);
  };

  const openEmailModal = async (client) => {
    if (!client.email) {
      setEmailError('This client does not have an email address. Edit the client to add one.');
      setEmailClient(client);
      return;
    }
    setEmailClient(client);
    setEmailTemplateId('welcome');
    setEmailSent(false);
    setEmailError('');
    setEmailSending(false);
    setEmailLoading(true);
    try {
      const appLink = 'https://ifs.aleix.help';
      const nameParts = (client.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const { subject, html } = await getRenderedEmail('welcome', {
        first_name: firstName,
        last_name: lastName,
        pin: client.pin,
        app_link: appLink,
      });
      setEmailSubject(subject);
      setEmailPreviewHtml(html);
    } catch (err) {
      setEmailError('Failed to load email template: ' + err.message);
    }
    setEmailLoading(false);
  };

  const handleEmailTemplateChange = async (templateId) => {
    setEmailTemplateId(templateId);
    setEmailError('');
    setEmailSent(false);
    setEmailLoading(true);
    try {
      const appLink = 'https://ifs.aleix.help';
      const nameParts = (emailClient?.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const { subject, html } = await getRenderedEmail(templateId, {
        first_name: firstName,
        last_name: lastName,
        pin: emailClient?.pin || '',
        app_link: appLink,
      });
      setEmailSubject(subject);
      setEmailPreviewHtml(html);
    } catch {
      setEmailError('Template not found. Please upload the HTML file to /email-templates/');
      setEmailPreviewHtml('');
      setEmailSubject('');
    }
    setEmailLoading(false);
  };

  const handleSendEmail = async () => {
    if (!emailClient?.email || !emailPreviewHtml || !emailSubject) return;
    setEmailSending(true);
    setEmailError('');
    try {
      await sendEmail({
        toEmail: emailClient.email,
        subject: emailSubject,
        htmlBody: emailPreviewHtml,
      });
      setEmailSent(true);
    } catch (err) {
      setEmailError('Failed to send: ' + err.message);
    }
    setEmailSending(false);
  };

  const toggleAccessModule = (moduleId) => {
    setAccessControlForm(prev => {
      const modules = prev.modules.includes(moduleId)
        ? prev.modules.filter(m => m !== moduleId)
        : [...prev.modules, moduleId];
      return { ...prev, modules };
    });
  };

  const toggleAccessAssessment = (assessmentId) => {
    setAccessControlForm(prev => {
      const assessments = prev.assessments.includes(assessmentId)
        ? prev.assessments.filter(a => a !== assessmentId)
        : [...prev.assessments, assessmentId];
      return { ...prev, assessments };
    });
  };

  const toggleAccessFeature = (featureKey) => {
    setAccessControlForm(prev => ({
      ...prev,
      features: { ...prev.features, [featureKey]: !prev.features[featureKey] }
    }));
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'PIN', 'Status', 'Primary Wound', 'Progress %', 'Modules Completed', 'Last Active', 'Created'];
    const rows = filteredClients.map(c => [
      c.name,
      c.email,
      c.pin,
      c.status,
      c.primaryWound,
      c.progress,
      c.modulesCompleted,
      c.lastActive ? new Date(c.lastActive).toLocaleDateString() : 'Never',
      c.joinDate ? new Date(c.joinDate).toLocaleDateString() : ''
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const reminderTemplates = {
    session: 'Hi {name}, this is a friendly reminder about your upcoming IFS therapy session. Please review your journal entries and any homework from last session before we meet.',
    activity: 'Hi {name}, you have some pending activities in your IFS healing program. Taking a few minutes to complete them will help reinforce what you\'ve learned.',
    checkin: 'Hi {name}, just checking in on you. How are you doing with your IFS practice? Remember, even a brief moment of Self-energy connection counts.',
    assessment: 'Hi {name}, it\'s been a while since your last assessment. Retaking the IFS Wound Assessment can help us track your healing progress together.'
  };

  const handleSendReminder = async () => {
    if (!reminderForm.clientId || !reminderForm.message.trim()) return;
    const therapist = clientAuth.getCurrentClient();
    try {
      await supabase.from('ifs_therapist_notes').insert({
        therapist_id: therapist?.id,
        client_id: reminderForm.clientId,
        content: `[REMINDER - ${reminderForm.type.toUpperCase()}] ${reminderForm.message}`,
        note_type: 'reminder',
        session_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      });
      setReminderSaved(true);
      setTimeout(() => setReminderSaved(false), 3000);
    } catch (e) {
      console.error('Error saving reminder:', e);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  };

  const handleExportReports = async () => {
    setExportLoading(true);
    try {
      const clientIds = clients.map(c => c.id);
      const [
        { data: assessments },
        { data: journalRows },
        { data: moodRows },
        { data: activityRows }
      ] = await Promise.all([
        supabase.from('ifs_assessment_results').select('*').in('client_id', clientIds),
        supabase.from('ifs_journal_entries').select('id, client_id, created_at, mood, content, title').in('client_id', clientIds),
        supabase.from('ifs_mood_entries').select('client_id, mood, energy, date').in('client_id', clientIds),
        supabase.from('ifs_therapy_activity_progress').select('client_id, activity_id, completed').in('client_id', clientIds)
      ]);

      let csv = 'Client Name,Primary Wound,Secondary Wound,Modules Completed,Progress %,Journal Entries,Avg Mood,Activities Completed,Risk Level,Join Date,Last Active\n';
      clients.forEach(c => {
        const clientAssess = (assessments || []).filter(a => a.client_id === c.id);
        const latestA = clientAssess.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        const journals = (journalRows || []).filter(j => j.client_id === c.id);
        const moods = (moodRows || []).filter(m => m.client_id === c.id);
        const avgMood = moods.length > 0 ? (moods.reduce((s, m) => s + (m.mood || 0), 0) / moods.length).toFixed(1) : 'N/A';
        const activities = (activityRows || []).filter(a => a.client_id === c.id);
        const completedActs = activities.filter(a => a.completed).length;
        const exportPrimary = latestA?.primary_wound || c.primaryWound || 'N/A';
        const exportSecondary = latestA?.secondary_wound || c.secondaryWound || 'N/A';
        csv += `"${c.name}",${exportPrimary},${exportSecondary},${c.modulesCompleted},${c.progress}%,${journals.length},${avgMood},${completedActs}/${activities.length},${c.riskLevel},${formatDate(c.joinDate)},${formatDate(c.lastActive)}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ifs_client_reports_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    }
    setExportLoading(false);
  };

  const handleGenerateReport = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || !clientInsights) return;

    const assessment = clientInsights.assessment;
    const normalizeScore = (s) => {
      if (s === null || s === undefined) return 0;
      const num = Number(s);
      if (isNaN(num)) return 0;
      return num <= 5 ? Math.round(num * 5) : Math.round(num);
    };

    const woundScores = assessment ? [
      { type: 'Abandonment', score: normalizeScore(assessment.abandonment_score), color: '#3B82F6' },
      { type: 'Shame', score: normalizeScore(assessment.shame_score), color: '#A855F7' },
      { type: 'Neglect', score: normalizeScore(assessment.neglect_score), color: '#F59E0B' },
      { type: 'Betrayal', score: normalizeScore(assessment.betrayal_score), color: '#EF4444' },
      { type: 'Helplessness', score: normalizeScore(assessment.helplessness_score || 0), color: '#F43F5E' }
    ] : [];
    const maxWoundScore = 25;

    const completedModules = (clientInsights.moduleProgress || []).filter(p => p.completed);

    const moodData = clientInsights.recentMoods || [];
    const checkinData = clientInsights.recentCheckins || [];

    const partsData = clientInsights.partsAssessment;
    const partsDefinitions = {
      manager: [
        { name: 'The Inner Critic', trigger: [3], threshold: 4 },
        { name: 'The Planner', trigger: [1], threshold: 4 },
        { name: 'The Perfectionist', trigger: [7], threshold: 4 },
        { name: 'The People Pleaser', trigger: [9], threshold: 4 },
        { name: 'The Controller', trigger: [5], threshold: 4 },
        { name: 'The Worrier', trigger: [14], threshold: 4 }
      ],
      firefighter: [
        { name: 'The Distractor', trigger: [2], threshold: 4 },
        { name: 'The Numbing Part', trigger: [6], threshold: 4 },
        { name: 'The Impulse Part', trigger: [4], threshold: 4 },
        { name: 'The Shutdown Part', trigger: [8], threshold: 4 },
        { name: 'The Self-Destructive Part', trigger: [10], threshold: 3 }
      ],
      exile: [
        { name: 'The Scared Child', trigger: [11], threshold: 4 },
        { name: 'The Lonely Child', trigger: [12], threshold: 4 },
        { name: 'The Grieving Child', trigger: [13], threshold: 4 },
        { name: 'The Shamed Child', trigger: [15], threshold: 4 }
      ]
    };

    let identifiedParts = [];
    if (partsData) {
      const rawAnswers = partsData.answers || {};
      Object.entries(partsDefinitions).forEach(([type, partsList]) => {
        partsList.forEach(partDef => {
          const triggerScores = partDef.trigger.map(qId => rawAnswers[qId] || rawAnswers[String(qId)] || 0);
          const maxScore = Math.max(...triggerScores);
          if (maxScore >= partDef.threshold) {
            identifiedParts.push({ ...partDef, type, intensity: maxScore });
          }
        });
      });
      identifiedParts.sort((a, b) => b.intensity - a.intensity);
    }

    const journals = clientInsights.journalEntries || [];
    const clientGam = clientGamification[clientId];
    const clientNotes = sessionNotes.filter(n => n.clientId === clientId);

    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const woundBarsHtml = woundScores.map(w => {
      const pct = Math.round((w.score / maxWoundScore) * 100);
      const priority = w.score >= 17 ? 'High Priority' : w.score >= 9 ? 'Moderate' : 'Low';
      return `<div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-weight:600;font-size:14px;">${w.type}</span>
          <span style="font-weight:700;font-size:14px;">${w.score}/${maxWoundScore} <span style="font-weight:400;font-size:12px;color:#666;">(${priority})</span></span>
        </div>
        <div style="background:#e5e7eb;border-radius:8px;height:20px;overflow:hidden;">
          <div style="background:${w.color};height:100%;width:${pct}%;border-radius:8px;transition:width 0.3s;"></div>
        </div>
      </div>`;
    }).join('');

    const moduleProgressHtml = (() => {
      const pct = TOTAL_MODULES > 0 ? Math.round((client.modulesCompleted / TOTAL_MODULES) * 100) : 0;
      const completedList = completedModules.map(m => {
        const modName = getModuleName(m.module_id) || m.module_id;
        return `<li style="padding:4px 0;border-bottom:1px solid #f3f4f6;">${modName} <span style="color:#16a34a;font-size:12px;">&#10003; Complete</span></li>`;
      }).join('');
      return `<div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-weight:600;">Overall Progress</span>
          <span style="font-weight:700;">${client.modulesCompleted}/${TOTAL_MODULES} modules (${pct}%)</span>
        </div>
        <div style="background:#e5e7eb;border-radius:8px;height:24px;overflow:hidden;margin-bottom:12px;">
          <div style="background:linear-gradient(to right,#f59e0b,#10b981);height:100%;width:${pct}%;border-radius:8px;"></div>
        </div>
        ${completedList ? `<ul style="list-style:none;padding:0;margin:0;">${completedList}</ul>` : '<p style="color:#9ca3af;">No modules completed yet.</p>'}
      </div>`;
    })();

    const moodChartHtml = (() => {
      if (moodData.length === 0) return '<p style="color:#9ca3af;">No mood data available.</p>';
      const reversed = [...moodData].reverse();
      const points = reversed.map((m, i) => {
        const x = 40 + (i * (520 / Math.max(reversed.length - 1, 1)));
        const moodY = 160 - ((m.mood || 0) / 5) * 140;
        const energyY = 160 - ((m.energy || 0) / 5) * 140;
        return { x, moodY, energyY, date: m.date };
      });
      const moodLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.moodY}`).join(' ');
      const energyLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.energyY}`).join(' ');
      const moodDots = points.map(p => `<circle cx="${p.x}" cy="${p.moodY}" r="4" fill="#3B82F6"/>`).join('');
      const energyDots = points.map(p => `<circle cx="${p.x}" cy="${p.energyY}" r="4" fill="#10B981"/>`).join('');
      const labels = points.filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 5) === 0)
        .map(p => `<text x="${p.x}" y="185" text-anchor="middle" font-size="10" fill="#9ca3af">${new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>`)
        .join('');
      return `<svg viewBox="0 0 600 200" style="width:100%;max-height:200px;">
        <line x1="40" y1="20" x2="40" y2="170" stroke="#e5e7eb" stroke-width="1"/>
        <line x1="40" y1="170" x2="560" y2="170" stroke="#e5e7eb" stroke-width="1"/>
        <text x="10" y="25" font-size="10" fill="#9ca3af">5</text>
        <text x="10" y="95" font-size="10" fill="#9ca3af">2.5</text>
        <text x="10" y="173" font-size="10" fill="#9ca3af">0</text>
        <path d="${moodLine}" fill="none" stroke="#3B82F6" stroke-width="2.5"/>
        <path d="${energyLine}" fill="none" stroke="#10B981" stroke-width="2.5"/>
        ${moodDots}${energyDots}${labels}
      </svg>
      <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;">
        <span style="font-size:12px;"><span style="display:inline-block;width:12px;height:12px;background:#3B82F6;border-radius:50%;margin-right:4px;vertical-align:middle;"></span>Mood</span>
        <span style="font-size:12px;"><span style="display:inline-block;width:12px;height:12px;background:#10B981;border-radius:50%;margin-right:4px;vertical-align:middle;"></span>Energy</span>
      </div>`;
    })();

    const selfEnergyHtml = (() => {
      if (!clientInsights.avgSelfEnergy && checkinData.length === 0) return '<p style="color:#9ca3af;">No Self-Energy data available.</p>';
      const avg = clientInsights.avgSelfEnergy || 'N/A';
      const entries = checkinData.slice(0, 7).map(c => {
        const se = c.selfEnergy || 0;
        const pct = (se / 10) * 100;
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="width:80px;font-size:12px;color:#666;">${c.date || ''}</span>
          <div style="flex:1;background:#e5e7eb;border-radius:6px;height:14px;overflow:hidden;">
            <div style="background:linear-gradient(to right,#a855f7,#8b5cf6);height:100%;width:${pct}%;border-radius:6px;"></div>
          </div>
          <span style="font-size:12px;font-weight:600;width:30px;text-align:right;">${se}/10</span>
        </div>`;
      }).join('');
      return `<div style="margin-bottom:12px;padding:12px;background:#faf5ff;border-radius:8px;text-align:center;">
        <span style="font-size:28px;font-weight:800;color:#7c3aed;">${avg}</span>
        <span style="font-size:14px;color:#666;">/10 avg</span>
      </div>${entries}`;
    })();

    const partsHtml = (() => {
      if (identifiedParts.length === 0) return '<p style="color:#9ca3af;">No parts assessment data available.</p>';
      const typeColors = { manager: '#3B82F6', firefighter: '#F59E0B', exile: '#EC4899' };
      const typeLabels = { manager: 'Manager', firefighter: 'Firefighter', exile: 'Exile' };
      return identifiedParts.map(p => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${typeColors[p.type]};flex-shrink:0;"></span>
        <span style="font-weight:600;flex:1;">${p.name}</span>
        <span style="font-size:12px;padding:2px 8px;border-radius:12px;background:${typeColors[p.type]}20;color:${typeColors[p.type]};font-weight:500;">${typeLabels[p.type]}</span>
        <span style="font-size:12px;font-weight:600;">${p.intensity}/5</span>
      </div>`).join('');
    })();

    const journalHtml = (() => {
      if (journals.length === 0) return '<p style="color:#9ca3af;">No journal entries found.</p>';
      return journals.slice(0, 5).map(j => `<div style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-weight:600;font-size:14px;">${j.title || 'Untitled'}</span>
          <span style="font-size:12px;color:#9ca3af;">${new Date(j.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
        <p style="font-size:13px;color:#4b5563;margin:0;line-height:1.5;">${(j.content || '').substring(0, 200)}${(j.content || '').length > 200 ? '...' : ''}</p>
        ${j.mood ? `<span style="font-size:11px;color:#6b7280;">Mood: ${j.mood}/5</span>` : ''}
      </div>`).join('');
    })();

    const gamHtml = (() => {
      if (!clientGam) return '<p style="color:#9ca3af;">No gamification data available.</p>';
      const badges = clientGam.badges || {};
      const earnedBadges = Object.entries(badges).filter(([, b]) => b && (b.unlocked || b.earned));
      return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
        <div style="text-align:center;padding:12px;background:#fffbeb;border-radius:8px;">
          <div style="font-size:24px;font-weight:800;color:#d97706;">${clientGam.xp || 0}</div>
          <div style="font-size:11px;color:#92400e;">Total XP</div>
        </div>
        <div style="text-align:center;padding:12px;background:#f5f3ff;border-radius:8px;">
          <div style="font-size:24px;font-weight:800;color:#7c3aed;">Lv.${clientGam.level || 1}</div>
          <div style="font-size:11px;color:#5b21b6;">Level</div>
        </div>
        <div style="text-align:center;padding:12px;background:#fff7ed;border-radius:8px;">
          <div style="font-size:24px;font-weight:800;color:#ea580c;">${clientGam.streak_current || 0}d</div>
          <div style="font-size:11px;color:#9a3412;">Streak</div>
        </div>
        <div style="text-align:center;padding:12px;background:#ecfdf5;border-radius:8px;">
          <div style="font-size:24px;font-weight:800;color:#059669;">${earnedBadges.length}</div>
          <div style="font-size:11px;color:#065f46;">Badges</div>
        </div>
      </div>
      ${earnedBadges.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:6px;">${earnedBadges.map(([key]) => `<span style="padding:3px 10px;background:#fef3c7;border-radius:12px;font-size:11px;font-weight:500;color:#92400e;">${key.replace(/_/g, ' ')}</span>`).join('')}</div>` : ''}`;
    })();

    const notesHtml = (() => {
      if (clientNotes.length === 0) return '<p style="color:#9ca3af;">No session notes recorded.</p>';
      return clientNotes.slice(0, 10).map(n => `<div style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-weight:600;font-size:14px;">${n.sessionType || 'Session'}</span>
          <span style="font-size:12px;color:#9ca3af;">${new Date(n.date || n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <p style="font-size:13px;color:#4b5563;margin:0;line-height:1.5;">${(n.notes || '').substring(0, 300)}${(n.notes || '').length > 300 ? '...' : ''}</p>
      </div>`).join('');
    })();

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Progress Report - ${client.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; background: #fff; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    .container { max-width: 800px; margin: 0 auto; padding: 32px; }
    .header { text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #f59e0b; }
    .header h1 { font-size: 28px; font-weight: 800; color: #1f2937; margin-bottom: 4px; }
    .header p { font-size: 14px; color: #6b7280; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #fde68a; display: flex; align-items: center; gap: 8px; }
    .overview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .overview-item { padding: 14px; border-radius: 10px; text-align: center; }
    .overview-item .value { font-size: 22px; font-weight: 800; }
    .overview-item .label { font-size: 11px; font-weight: 500; margin-top: 2px; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #f59e0b; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .print-btn:hover { background: #d97706; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
  <div class="container">
    <div class="header">
      <h1>IFS Healing Progress Report</h1>
      <p>${client.name} &mdash; Generated ${reportDate}</p>
    </div>

    <div class="section">
      <div class="section-title">Client Overview</div>
      <div class="overview-grid">
        <div class="overview-item" style="background:#eff6ff;">
          <div class="value" style="color:#2563eb;">${assessment?.primary_wound || client.primaryWound || 'N/A'}</div>
          <div class="label" style="color:#1d4ed8;">Primary Wound</div>
        </div>
        <div class="overview-item" style="background:#f5f3ff;">
          <div class="value" style="color:#7c3aed;">${assessment?.secondary_wound || client.secondaryWound || 'N/A'}</div>
          <div class="label" style="color:#5b21b6;">Secondary Wound</div>
        </div>
        <div class="overview-item" style="background:#ecfdf5;">
          <div class="value" style="color:#059669;">${client.progress}%</div>
          <div class="label" style="color:#065f46;">Overall Progress</div>
        </div>
      </div>
      <div class="overview-grid">
        <div class="overview-item" style="background:#fffbeb;">
          <div class="value" style="color:#d97706;">${client.modulesCompleted}</div>
          <div class="label" style="color:#92400e;">Modules Completed</div>
        </div>
        <div class="overview-item" style="background:#fef2f2;">
          <div class="value" style="color:#dc2626;">${client.journalEntries}</div>
          <div class="label" style="color:#991b1b;">Journal Entries</div>
        </div>
        <div class="overview-item" style="background:#f0fdf4;">
          <div class="value" style="color:#16a34a;">${client.assessmentsTaken}</div>
          <div class="label" style="color:#166534;">Assessments Taken</div>
        </div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:#4b5563;">
        <span><strong>Joined:</strong> ${client.joinDate ? new Date(client.joinDate).toLocaleDateString() : 'N/A'}</span>
        <span><strong>Last Active:</strong> ${client.lastActive ? new Date(client.lastActive).toLocaleDateString() : 'Never'}</span>
        <span><strong>Status:</strong> ${client.status}</span>
        <span><strong>Risk Level:</strong> ${client.riskLevel}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Wound Assessment Scores</div>
      ${woundScores.length > 0 ? woundBarsHtml : '<p style="color:#9ca3af;">No assessment data available.</p>'}
    </div>

    <div class="section">
      <div class="section-title">Module Completion Progress</div>
      ${moduleProgressHtml}
    </div>

    <div class="section page-break">
      <div class="section-title">Mood &amp; Energy Trends</div>
      ${moodChartHtml}
      ${clientInsights.avgMood ? `<p style="margin-top:8px;font-size:13px;color:#4b5563;"><strong>Average Mood:</strong> ${clientInsights.avgMood}/5</p>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Self-Energy Scores</div>
      ${selfEnergyHtml}
    </div>

    <div class="section">
      <div class="section-title">Parts Assessment Summary</div>
      ${partsHtml}
    </div>

    <div class="section page-break">
      <div class="section-title">Recent Journal Themes</div>
      ${journalHtml}
    </div>

    <div class="section">
      <div class="section-title">Gamification Stats</div>
      ${gamHtml}
    </div>

    <div class="section">
      <div class="section-title">Session Notes History</div>
      ${notesHtml}
    </div>

    <div style="margin-top:40px;padding-top:20px;border-top:2px solid #e5e7eb;text-align:center;">
      <p style="font-size:12px;color:#9ca3af;">IFS Healing Journey &mdash; Confidential Progress Report &mdash; ${reportDate}</p>
    </div>
  </div>
</body>
</html>`;

    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(html);
      reportWindow.document.close();
    }
  };

  const getGroupAnalytics = () => {
    if (clients.length === 0) return null;
    const woundCounts = { abandonment: 0, shame: 0, neglect: 0, betrayal: 0, helplessness: 0, unknown: 0 };
    const riskCounts = { low: 0, medium: 0, high: 0 };
    let totalProgress = 0;
    let totalModules = 0;
    let totalJournals = 0;
    let totalAssessments = 0;
    let totalActivities = 0;
    let completedActivities = 0;

    clients.forEach(c => {
      woundCounts[c.primaryWound] = (woundCounts[c.primaryWound] || 0) + 1;
      riskCounts[c.riskLevel] = (riskCounts[c.riskLevel] || 0) + 1;
      totalProgress += c.progress;
      totalModules += c.modulesCompleted;
      totalJournals += c.journalEntries;
      totalAssessments += c.assessmentsTaken;
      totalActivities += c.totalActivities || 0;
      completedActivities += c.therapyActivities || 0;
    });

    const avgProgress = Math.round(totalProgress / clients.length);
    const avgModules = (totalModules / clients.length).toFixed(1);
    const activeRate = Math.round((riskCounts.low / clients.length) * 100);
    const activityCompletionRate = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

    return {
      woundCounts, riskCounts, avgProgress, avgModules,
      totalJournals, totalAssessments, activeRate,
      totalActivities, completedActivities, activityCompletionRate
    };
  };

  const lessonPlans = [
    {
      id: 'm1',
      title: 'Module 1: Foundations of IFS & Your Inner Child',
      goals: 'Help client understand IFS model, identify their parts, experience Self energy',
      topics: [
        'What does your inner world feel like?',
        'When do you notice different parts of yourself?',
        'What does your inner critic sound like?'
      ],
      activities: ['Parts mapping exercise', 'Self-energy check-in', 'Identifying 3 main protector parts'],
      watchFor: ['Client resistance to multiplicity concept', 'Strong critic parts', 'Difficulty accessing Self'],
      duration: '60 min suggested',
      homework: 'Daily Self-energy check-in, notice 3 parts during the week'
    },
    {
      id: 'm2',
      title: 'Module 2: Deep Dive into Inner Child Wounds',
      goals: 'Identify primary wounds, understand wound-behavior connections, begin building compassion for wounded parts',
      topics: [
        'What childhood experiences still affect you?',
        'When do you feel youngest/most vulnerable?',
        'What beliefs about yourself formed in childhood?'
      ],
      activities: ['Wound identification exercise', 'Timeline of key childhood moments', 'Connecting current triggers to old wounds'],
      watchFor: ['Flooding/overwhelm', 'Dissociation', 'Strong protector activation', 'Grief responses'],
      duration: '90 min (allow extra time for emotional processing)',
      homework: 'Journal about one wound pattern noticed during the week'
    },
    {
      id: 'm3',
      title: 'Module 3: The Protective System',
      goals: 'Map the protective system, appreciate protector roles, understand manager vs firefighter dynamics',
      topics: [
        'What do your protectors do to keep you safe?',
        'What would happen if they stopped?',
        'How do they feel about therapy?'
      ],
      activities: ['Protector appreciation exercise', 'Role-play conversation with a protector', 'Mapping protector-exile relationships'],
      watchFor: ['Client identifying with protectors', 'Shame about firefighter behaviors', 'Resistance to exploring what protectors guard'],
      duration: '60 min',
      homework: 'Thank a protector part daily, notice firefighter activation'
    },
    {
      id: 'm4',
      title: 'Module 4: Healing Protocols & Integration',
      goals: 'Practice unburdening protocol, integrate healed parts, celebrate transformation',
      topics: [
        'What would your inner child need to hear?',
        'What burden is this part ready to release?',
        'Where would it like to put this burden?'
      ],
      activities: ['Guided unburdening ceremony', 'Reparenting visualization', 'Integration meditation'],
      watchFor: ['Parts that aren\'t ready', 'Incomplete unburdening', 'Need for multiple sessions', 'New protectors arising'],
      duration: '90 min',
      homework: 'Daily reparenting check-in with inner child'
    },
    {
      id: 'm5',
      title: 'Module 5: Advanced Healing & Daily Practices',
      goals: 'Establish sustainable daily practice, address remaining wounds, build long-term resilience',
      topics: [
        'How has your relationship with your parts changed?',
        'What practices feel most helpful?',
        'What still needs attention?'
      ],
      activities: ['Create personalized daily IFS practice plan', 'Address secondary wounds', 'Practice Self-led living'],
      watchFor: ['Premature termination desire', 'New wounds surfacing', 'Maintaining gains', 'Relapse patterns'],
      duration: '60 min',
      homework: 'Full daily practice routine for 2 weeks'
    }
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isDark = theme.isDark;
  const cardBg = isDark ? 'bg-slate-800/90' : 'bg-white/80 backdrop-blur-sm';
  const cardBorder = isDark ? 'border-slate-700/50' : 'border-gray-200/60';
  const textPrimary = isDark ? 'text-slate-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-gray-400';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-900';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50';

  const glowStyles = {
    blue: isDark ? 'shadow-[0_0_15px_rgba(120,113,108,0.15)] border-brand-stone-500/30' : 'shadow-[0_0_20px_rgba(120,113,108,0.1)] border-brand-stone-200',
    emerald: isDark ? 'shadow-[0_0_15px_rgba(5,150,105,0.15)] border-brand-emerald-600/30' : 'shadow-[0_0_20px_rgba(5,150,105,0.1)] border-brand-emerald-100',
    amber: isDark ? 'shadow-[0_0_15px_rgba(217,119,6,0.15)] border-brand-gold-600/30' : 'shadow-[0_0_20px_rgba(217,119,6,0.1)] border-brand-gold-100',
    rose: isDark ? 'shadow-[0_0_15px_rgba(244,63,94,0.15)] border-rose-500/30' : 'shadow-[0_0_20px_rgba(244,63,94,0.1)] border-rose-200',
  };

  const getWoundGlow = (wound) => {
    const map = { abandonment: 'blue', shame: 'amber', neglect: 'amber', betrayal: 'rose', helplessness: 'rose' };
    return glowStyles[map[wound] || 'amber'];
  };

  const getBadgeCount = (badges) => {
    if (!badges || typeof badges !== 'object') return 0;
    return Object.values(badges).filter(b => b && (b.unlocked || b.earned)).length;
  };

  const getModuleName = (moduleId) => {
    if (!moduleId) return null;
    const mod = curriculumModules.find(m => m.id === moduleId);
    if (mod) return mod.title;
    const cleanId = moduleId.replace(/-/g, ' ').replace(/module \d+/i, '').trim();
    return cleanId.charAt(0).toUpperCase() + cleanId.slice(1) || moduleId;
  };

  const stripStepPrefix = (key) => {
    return key.replace(/^s\d+-/, '');
  };

  const extractStepIndex = (key) => {
    const m = key.match(/^s(\d+)-/);
    return m ? parseInt(m[1]) : null;
  };

  const mapResponseKey = (key, moduleData, woundType) => {
    const bare = stripStepPrefix(key);
    const stepIdx = extractStepIndex(key);
    const stepLabel = stepIdx !== null ? ` (Step ${stepIdx + 1})` : '';

    const secondaryWoundMatch = bare.match(/^secondary-wound-reflection-(\d+)$/);
    if (secondaryWoundMatch) {
      const idx = parseInt(secondaryWoundMatch[1]);
      return `Secondary Wound Reflection ${idx + 1}${stepLabel}`;
    }
    const woundMatch = bare.match(/^wound-reflection-(\d+)$/);
    if (woundMatch) {
      const idx = parseInt(woundMatch[1]);
      const wp = moduleData?.woundPersonalization?.[woundType];
      return wp?.reflectionPrompts?.[idx] || `Wound Reflection ${idx + 1}${stepLabel}`;
    }
    const reflectionMatch = bare.match(/^reflection-(\d+)$/);
    if (reflectionMatch) {
      const idx = parseInt(reflectionMatch[1]);
      const targetStep = stepIdx !== null ? moduleData?.steps?.[stepIdx] : moduleData?.steps?.find(s => s.type === 'learn');
      return targetStep?.data?.reflectionPrompts?.[idx] || `Reflection ${idx + 1}${stepLabel}`;
    }
    const questionMatch = bare.match(/^question-(\d+)$/);
    if (questionMatch) {
      const idx = parseInt(questionMatch[1]);
      const targetStep = stepIdx !== null ? moduleData?.steps?.[stepIdx] : moduleData?.steps?.find(s => s.type === 'activity');
      return targetStep?.data?.questions?.[idx] || `Activity Question ${idx + 1}${stepLabel}`;
    }
    return key;
  };

  const getResponseBadge = (key) => {
    const bare = stripStepPrefix(key);
    if (bare.startsWith('secondary-wound-reflection-')) return { label: 'Secondary Wound', color: 'bg-amber-100 text-amber-700' };
    if (bare.startsWith('wound-reflection-')) return { label: 'Wound', color: 'bg-amber-100 text-amber-700' };
    if (bare.startsWith('reflection-')) return { label: 'Reflection', color: 'bg-blue-100 text-blue-700' };
    if (bare.startsWith('question-')) return { label: 'Activity', color: 'bg-emerald-100 text-emerald-700' };
    return { label: 'Response', color: 'bg-gray-100 text-gray-700' };
  };

  const getMoodColor = (mood) => {
    if (mood >= 4) return 'bg-emerald-400';
    if (mood >= 3) return 'bg-yellow-400';
    if (mood >= 2) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className={`${textSecondary}`}>Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`text-3xl sm:text-4xl font-extrabold ${textPrimary} tracking-tight`}>Advisor Dashboard</h1>
            <p className={`mt-1.5 text-sm ${textSecondary}`}>Monitor client progress, review responses, and manage sessions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboardData}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${cardBorder} ${cardBg} ${textSecondary} text-sm font-medium hover:border-amber-300 transition-all`}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <span className={`text-xs ${textMuted}`}>{formatDate(new Date().toISOString())}</span>
          </div>
        </div>
      </div>

      <RiskAlertWidget
        therapistId={therapist?.id}
        clients={clients}
        onSelectClient={(clientId) => { setSelectedInsightClient(clientId); setActiveTab('insights'); }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Clients', value: stats.totalClients, icon: Users, color: 'from-brand-stone-500 to-brand-stone-600', glow: 'blue' },
          { label: 'Active Clients', value: stats.activeSessions, icon: Activity, color: 'from-brand-emerald-600 to-brand-emerald-700', glow: 'emerald' },
          { label: 'Assessments Done', value: stats.assessmentsCompleted, icon: Target, color: 'from-brand-gold-600 to-brand-emerald-700', glow: 'amber' },
          { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: TrendingUp, color: 'from-brand-gold-600 to-brand-emerald-700', glow: 'amber' }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${cardBg} rounded-2xl border ${glowStyles[stat.glow]} p-5 transition-all duration-300 hover:scale-[1.02]`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>{stat.label}</p>
                  <p className={`text-2xl sm:text-3xl font-extrabold ${textPrimary} tracking-tight`}>{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'clients', label: 'Clients', icon: Users },
          { id: 'notes', label: 'Session Notes', icon: FileText },
          { id: 'session-prep', label: 'Session Prep', icon: ClipboardCheck },
          { id: 'progress', label: 'Progress', icon: BarChart3 },
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
          { id: 'actions', label: 'Quick Actions', icon: Sparkles },
          { id: 'lessons', label: 'Lesson Plans', icon: BookOpen },
          { id: 'insights', label: 'Client Insights', icon: Eye },
          { id: 'co-therapy', label: 'Co-Therapy', icon: Heart },
          { id: 'roadmap', label: 'Future Features', icon: Gem }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white shadow-md'
                  : `${cardBg} ${textSecondary} border ${cardBorder} ${hoverBg}`
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'session-prep' && sessionPrepRows.filter(a => a.status === 'submitted').length > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                  {sessionPrepRows.filter(a => a.status === 'submitted').length}
                </span>
              )}
              {tab.id === 'alerts' && alerts.filter(a => a.type === 'warning' || a.type === 'danger').length > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {alerts.filter(a => a.type === 'warning' || a.type === 'danger').length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'session-prep' && (
        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
          <div className={`${cardBg} rounded-2xl border ${cardBorder} p-5`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}><ClipboardCheck className="w-5 h-5 text-blue-500" /> Session Prep</h2>
                <p className={`text-sm ${textSecondary}`}>Assigned clients with recent submitted pre-session agendas.</p>
              </div>
              <button onClick={() => loadUpcomingSessionPrepForTherapist(therapist?.id).then(({ data }) => setSessionPrepRows(data || []))} className={`px-3 py-2 rounded-lg border ${cardBorder} text-sm ${textSecondary}`}>
                Refresh
              </button>
            </div>
            {sessionPrepRows.length === 0 ? (
              <div className={`rounded-xl border ${cardBorder} p-6 text-sm ${textSecondary}`}>No submitted pre-session agendas from assigned clients yet.</div>
            ) : (
              <div className="space-y-3">
                {Object.values(sessionPrepRows.reduce((acc, agenda) => {
                  const existing = acc[agenda.client_id];
                  if (!existing || new Date(agenda.created_at || 0) > new Date(existing.created_at || 0)) acc[agenda.client_id] = agenda;
                  return acc;
                }, {})).map((agenda) => {
                  const client = clients.find(c => c.id === agenda.client_id);
                  const unreviewed = sessionPrepRows.filter(row => row.client_id === agenda.client_id && row.status === 'submitted').length;
                  return (
                    <button key={agenda.client_id} onClick={() => setSelectedPrepClientId(agenda.client_id)} className={`w-full text-left rounded-xl border ${selectedPrepClientId === agenda.client_id ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : cardBorder + ' ' + hoverBg} p-4 transition-colors`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`font-semibold ${textPrimary}`}>{client?.name || agenda.client_name || 'Assigned client'}</p>
                          <p className={`text-xs ${textMuted}`}>Most recent agenda: {agenda.created_at ? new Date(agenda.created_at).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${unreviewed ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{unreviewed} unreviewed</span>
                      </div>
                      <p className={`mt-2 text-sm ${textSecondary} line-clamp-2`}>{agenda.topics}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <SessionPrepBrief clientId={selectedPrepClientId} therapistId={therapist?.id} clients={clients} />
        </div>
      )}

      {activeTab === 'clients' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
              <input
                type="text"
                placeholder="Search clients by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none`}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={filterWound}
                onChange={(e) => setFilterWound(e.target.value)}
                className={`px-3 py-2.5 rounded-lg border ${inputBg} text-sm focus:ring-2 focus:ring-amber-500 outline-none`}
              >
                <option value="all">All Wounds</option>
                <option value="abandonment">Abandonment</option>
                <option value="shame">Shame</option>
                <option value="neglect">Neglect</option>
                <option value="betrayal">Betrayal</option>
                <option value="helplessness">Helplessness</option>
              </select>
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className={`px-3 py-2.5 rounded-lg border ${inputBg} text-sm focus:ring-2 focus:ring-amber-500 outline-none`}
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`px-3 py-2.5 rounded-lg border ${inputBg} text-sm focus:ring-2 focus:ring-amber-500 outline-none`}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={handleExportCSV}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${cardBorder} ${hoverBg} text-sm font-medium ${textSecondary} transition-colors`}
                title="Export clients to CSV"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredClients.map(client => {
              const wound = woundColorMap[client.primaryWound] || woundColorMap.abandonment;
              const secondaryWoundColors = client.secondaryWound ? (woundColorMap[client.secondaryWound] || null) : null;
              const risk = riskColors[client.riskLevel];
              const earnedBadges = getBadgeCount(client.badges);
              const currentModuleName = getModuleName(client.currentModuleId);
              const moduleProgressPct = TOTAL_MODULES > 0 ? Math.round((client.modulesCompleted / TOTAL_MODULES) * 100) : 0;
              return (
                <div key={client.id} className={`${cardBg} rounded-2xl border ${getWoundGlow(client.primaryWound)} p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl flex flex-col`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center text-white font-extrabold text-lg shadow-lg">
                        {client.name.charAt(0)}
                      </div>
                      {client.level > 1 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-brand-gold-500 to-brand-gold-700 flex items-center justify-center text-white text-[9px] font-bold border-2 border-white shadow">
                          {client.level}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold text-base ${textPrimary} tracking-tight truncate`}>{client.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${risk.bg} ${risk.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`}></span>
                          {risk.label}
                        </span>
                        {client.status === 'inactive' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${textMuted} flex items-center gap-1 mt-0.5`}>
                        <Clock className="w-3 h-3" />
                        {getRelativeTime(client.lastActive)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${wound.bg} ${wound.text}`}>
                      <Heart className="w-3 h-3" />
                      {client.primaryWound}
                    </span>
                    {client.secondaryWound && secondaryWoundColors && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${secondaryWoundColors.bg} ${secondaryWoundColors.text}`}>
                        <Shield className="w-3 h-3" />
                        {client.secondaryWound}
                      </span>
                    )}
                  </div>

                  {currentModuleName && (
                    <div className={`mb-3 p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <BookOpen className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        <span className={`text-[11px] font-medium ${textSecondary} truncate`}>{currentModuleName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              moduleProgressPct >= 70 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : moduleProgressPct >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-blue-400 to-blue-500'
                            }`}
                            style={{ width: `${moduleProgressPct}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold ${textPrimary}`}>{client.modulesCompleted}/{TOTAL_MODULES}</span>
                      </div>
                    </div>
                  )}
                  {!currentModuleName && (
                    <div className={`mb-3 p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              client.progress >= 70 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : client.progress >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-blue-400 to-blue-500'
                            }`}
                            style={{ width: `${client.progress}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold ${textPrimary}`}>{client.progress}%</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <div className="flex items-center gap-1" title={`${client.xp.toLocaleString()} XP`}>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span className={`text-[11px] font-semibold ${textPrimary}`}>{client.xp >= 1000 ? `${(client.xp / 1000).toFixed(1)}k` : client.xp}</span>
                    </div>
                    <div className="flex items-center gap-1" title={`Level ${client.level}`}>
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span className={`text-[11px] font-semibold ${textPrimary}`}>Lv.{client.level}</span>
                    </div>
                    {client.streak > 0 && (
                      <div className="flex items-center gap-1" title={`${client.streak} day streak`}>
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        <span className={`text-[11px] font-semibold ${textPrimary}`}>{client.streak}d</span>
                      </div>
                    )}
                    {earnedBadges > 0 && (
                      <div className="flex items-center gap-1" title={`${earnedBadges} badges earned`}>
                        <Award className="w-3.5 h-3.5 text-emerald-500" />
                        <span className={`text-[11px] font-semibold ${textPrimary}`}>{earnedBadges}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-500" />
                      <span className={`text-[11px] ${textSecondary}`}>
                        {client.therapyActivities}/{client.totalActivities} activities
                      </span>
                    </div>
                    {client.recentMoods && client.recentMoods.length > 0 && (
                      <div className="flex items-center gap-1" title="Recent mood trend">
                        <span className={`text-[10px] ${textMuted} mr-0.5`}>Mood</span>
                        {client.recentMoods.slice().reverse().map((m, i) => (
                          <div
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full ${getMoodColor(m.mood)} transition-all`}
                            title={`${m.date}: mood ${m.mood}/5${m.energy ? `, energy ${m.energy}/5` : ''}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 mt-auto pt-2 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setSelectedInsightClient(client.id); setActiveTab('insights'); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium ${hoverBg} ${textSecondary} transition-all hover:text-amber-500`}
                        title="View Insights"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Insights
                      </button>
                      <button
                        onClick={() => { setActiveTab('notes'); setNoteForm(f => ({ ...f, clientId: client.id })); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium ${hoverBg} ${textSecondary} transition-all hover:text-blue-500`}
                        title="Session Note"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Note
                      </button>
                      <button
                        onClick={() => navigate('/therapist/messages')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium ${hoverBg} ${textSecondary} transition-all hover:text-emerald-500`}
                        title="Message"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Message
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingClient(client); setEditClientForm({ name: client.name, email: client.email, phone: client.phone || '' }); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium ${hoverBg} ${textSecondary} transition-all hover:text-amber-500`}
                        title="Edit Client"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => setShowPinClient(showPinClient === client.id ? null : client.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium ${hoverBg} ${textSecondary} transition-all hover:text-amber-600`}
                        title="Show PIN"
                      >
                        <Key className="w-3.5 h-3.5" />
                        {showPinClient === client.id ? client.pin : 'PIN'}
                      </button>
                      <button
                        onClick={() => handleToggleClientStatus(client)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium ${hoverBg} transition-all ${
                          client.status === 'active' ? 'text-orange-500 hover:text-orange-600' : 'text-green-500 hover:text-green-600'
                        }`}
                        title={client.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {client.status === 'active' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {client.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => { setDeletingClient(client); setDeleteConfirmText(''); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium ${hoverBg} transition-all text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`}
                        title="Delete Client"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openAccessControls(client)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium ${hoverBg} transition-all ${
                          client.accessRestrictions ? 'text-red-500 hover:text-red-600' : `${textSecondary} hover:text-stone-500`
                        }`}
                        title="Access Controls"
                      >
                        {client.accessRestrictions ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        {client.accessRestrictions ? 'Restricted' : 'Full Access'}
                      </button>
                      <button
                        onClick={() => openEmailModal(client)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium ${hoverBg} transition-all ${
                          client.email ? `${textSecondary} hover:text-blue-500` : `${textMuted} cursor-not-allowed`
                        }`}
                        title={client.email ? 'Send Email' : 'No email address'}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </button>
                    </div>
                    {showPinClient === client.id && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`font-mono text-sm font-bold ${textPrimary} tracking-widest`}>{client.pin}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(client.pin); }}
                          className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredClients.length === 0 && (
              <div className={`${cardBg} rounded-xl border ${cardBorder} p-12 text-center`}>
                <Users className={`w-12 h-12 mx-auto mb-3 ${textMuted}`} />
                <p className={`font-medium ${textSecondary}`}>No clients match your filters</p>
                <p className={`text-sm mt-1 ${textMuted}`}>Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
            <h2 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
              <FileText className="w-5 h-5 text-amber-500" />
              New Session Note
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Client</label>
                <select
                  value={noteForm.clientId}
                  onChange={(e) => { setNoteForm(f => ({ ...f, clientId: e.target.value })); setTaggedParts([]); }}
                  className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`}
                >
                  <option value="">Select a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Session Template</label>
                <select
                  value={selectedNoteTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`}
                >
                  {Object.entries(SESSION_NOTE_TEMPLATES).map(([key, tmpl]) => (
                    <option key={key} value={key}>{tmpl.label}</option>
                  ))}
                </select>
                {selectedNoteTemplate !== 'none' && (
                  <p className={`text-xs mt-1 ${textMuted}`}>
                    Template applied — edit the structured sections below
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Date</label>
                  <input
                    type="date"
                    value={noteForm.date}
                    onChange={(e) => setNoteForm(f => ({ ...f, date: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Session Type</label>
                  <select
                    value={noteForm.sessionType}
                    onChange={(e) => setNoteForm(f => ({ ...f, sessionType: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`}
                  >
                    <option value="Individual">Individual</option>
                    <option value="Group">Group</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Session Notes</label>
                <textarea
                  value={noteForm.notes}
                  onChange={(e) => handleNoteTextChange(e.target.value)}
                  rows={selectedNoteTemplate !== 'none' ? 12 : 4}
                  placeholder="Document session observations, client responses, techniques used..."
                  className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none resize-y font-mono text-sm`}
                />
                {showPartTagDropdown && noteParts.length > 0 && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-white shadow-sm overflow-hidden">
                    {noteParts.slice(0, 6).map(part => (
                      <button key={part.id} type="button" onClick={() => addTaggedPart(part)} className="block w-full px-3 py-2 text-left text-sm hover:bg-amber-50">
                        @{part.part_name} <span className="text-xs text-gray-400">{part.part_type}</span>
                      </button>
                    ))}
                  </div>
                )}
                {taggedParts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {taggedParts.map(part => <span key={part.id} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">@{part.name}</span>)}
                  </div>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Goals for Next Session</label>
                <textarea
                  value={noteForm.goals}
                  onChange={(e) => setNoteForm(f => ({ ...f, goals: e.target.value }))}
                  rows={3}
                  placeholder="Outline focus areas and objectives for the next meeting..."
                  className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none resize-none`}
                />
              </div>
              <button
                onClick={handleSaveNote}
                disabled={!noteForm.clientId || !noteForm.notes}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Save Session Note
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <SessionPrepBrief clientId={noteForm.clientId} therapistId={clientAuth.getCurrentClient()?.id} />
              <TherapistHomeworkBuilder clientId={noteForm.clientId} />
              <TreatmentPlanBuilder clientId={noteForm.clientId} />
            </div>
          </div>

          <div>
            <h2 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
              <Clock className="w-5 h-5 text-amber-500" />
              Previous Notes
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {sessionNotes.length === 0 ? (
                <div className={`${cardBg} rounded-xl border ${cardBorder} p-8 text-center`}>
                  <MessageSquare className={`w-10 h-10 mx-auto mb-3 ${textMuted}`} />
                  <p className={`${textSecondary}`}>No session notes yet</p>
                  <p className={`text-sm mt-1 ${textMuted}`}>Notes you save will appear here</p>
                </div>
              ) : (
                sessionNotes.map(note => (
                  <div key={note.id} className={`${cardBg} rounded-xl border ${cardBorder} p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${textPrimary}`}>{note.clientName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{note.sessionType}</span>
                        <span className={`text-xs ${textMuted}`}>{formatDate(note.date)}</span>
                      </div>
                    </div>
                    <p className={`text-sm ${textSecondary} mb-2`}>{note.notes}</p>
                    {note.goals && (
                      <div className={`text-sm ${textMuted} border-t ${isDark ? 'border-slate-700' : 'border-gray-100'} pt-2 mt-2`}>
                        <span className="font-medium">Next Goals:</span> {note.goals}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <div className={`${cardBg} rounded-2xl border ${glowStyles.blue} p-6`}>
          <h2 className={`text-lg font-bold ${textPrimary} mb-6 flex items-center gap-2 tracking-tight`}>
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Client Progress Overview
          </h2>

          <div className="space-y-8">
            {clients.map(client => {
              return (
                <div key={client.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-emerald-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className={`font-medium ${textPrimary}`}>{client.name}</h3>
                      <p className={`text-xs ${textMuted}`}>Joined {formatDate(client.joinDate)}</p>
                    </div>
                    <span className={`ml-auto text-sm font-semibold ${textPrimary}`}>{client.progress}%</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 ml-11">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${textSecondary}`}>Modules</span>
                        <span className={`text-xs font-medium ${textPrimary}`}>{client.modulesCompleted}/{TOTAL_MODULES}</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all" style={{ width: `${(client.modulesCompleted / TOTAL_MODULES) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${textSecondary}`}>Assessments</span>
                        <span className={`text-xs font-medium ${textPrimary}`}>{client.assessmentsTaken}</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-gold-500 to-brand-gold-700 rounded-full transition-all" style={{ width: `${Math.min((client.assessmentsTaken / 5) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${textSecondary}`}>Journals</span>
                        <span className={`text-xs font-medium ${textPrimary}`}>{client.journalEntries}</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all" style={{ width: `${Math.min((client.journalEntries / 30) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${textSecondary}`}>Activities</span>
                        <span className={`text-xs font-medium ${textPrimary}`}>{client.therapyActivities}/{client.totalActivities || 0}</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-gold-500 to-brand-gold-700 rounded-full transition-all" style={{ width: `${client.totalActivities > 0 ? (client.therapyActivities / client.totalActivities) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${textSecondary} flex items-center gap-1`}><Zap className="w-3 h-3 text-amber-500" />XP</span>
                        <span className={`text-xs font-medium ${textPrimary}`}>{client.xp.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${textMuted} flex items-center gap-0.5`}><Crown className="w-3 h-3 text-amber-500" />Lv.{client.level}</span>
                        {client.streak > 0 && <span className={`text-xs ${textMuted} flex items-center gap-0.5`}><Flame className="w-3 h-3 text-orange-500" />{client.streak}d</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {clients.length === 0 && (
              <div className="text-center py-8">
                <Users className={`w-10 h-10 mx-auto mb-3 ${textMuted}`} />
                <p className={`${textSecondary}`}>No client data available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {(() => {
            const atRiskClients = clients
              .map(c => ({ ...c, risk: riskScoreData[c.id] || { score: 0, level: 'low', reasons: [] } }))
              .filter(c => c.risk.score > 0)
              .sort((a, b) => b.risk.score - a.risk.score);

            const highCount = atRiskClients.filter(c => c.risk.level === 'high').length;
            const mediumCount = atRiskClients.filter(c => c.risk.level === 'medium').length;

            return (
              <div className={`${cardBg} rounded-2xl border ${glowStyles.rose} p-6`}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-lg font-bold ${textPrimary}`}>Risk Dashboard</h2>
                      <p className={`text-sm ${textSecondary}`}>Clients ranked by intervention priority</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {highCount > 0 && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        {highCount} High Risk
                      </span>
                    )}
                    {mediumCount > 0 && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                        {mediumCount} Medium
                      </span>
                    )}
                  </div>
                </div>

                {atRiskClients.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className={`w-10 h-10 mx-auto mb-3 text-emerald-400`} />
                    <p className={`font-medium ${textPrimary}`}>All clients are on track</p>
                    <p className={`text-sm mt-1 ${textMuted}`}>No at-risk clients detected based on current data signals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {atRiskClients.map(client => {
                      const riskStyle = client.risk.level === 'high'
                        ? { bg: isDark ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', barColor: 'bg-red-500', icon: 'text-red-500' }
                        : client.risk.level === 'medium'
                        ? { bg: isDark ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300', barColor: 'bg-yellow-500', icon: 'text-yellow-500' }
                        : { bg: isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', barColor: 'bg-blue-500', icon: 'text-blue-500' };

                      return (
                        <div key={client.id} className={`p-4 rounded-xl border ${riskStyle.bg} transition-all hover:shadow-md`}>
                          <div className="flex items-start gap-3">
                            <div className="relative flex-shrink-0">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow">
                                {client.name.charAt(0)}
                              </div>
                              {client.risk.level === 'high' && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                                  <AlertTriangle className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`font-bold text-sm ${textPrimary}`}>{client.name}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${riskStyle.badge}`}>
                                  {client.risk.level} risk
                                </span>
                                <span className={`text-xs font-semibold ${riskStyle.icon}`}>Score: {client.risk.score}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                                  <div className={`h-full rounded-full transition-all duration-500 ${riskStyle.barColor}`} style={{ width: `${client.risk.score}%` }} />
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {client.risk.reasons.map((reason, idx) => (
                                  <span key={idx} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium ${isDark ? 'bg-slate-700/60 text-slate-300' : 'bg-white text-gray-600'} border ${cardBorder}`}>
                                    <AlertTriangle className={`w-2.5 h-2.5 ${riskStyle.icon}`} />
                                    {reason}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => {
                                    setSelectedInsightClient(client.id);
                                    setActiveTab('insights');
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${cardBorder} ${hoverBg} ${textSecondary} transition-colors`}
                                >
                                  <Eye className="w-3 h-3" />
                                  View Insights
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveTab('actions');
                                    setActiveAction('send-reminder');
                                    setReminderForm({ clientId: client.id, type: 'checkin', message: `Hi ${client.name}, just checking in to see how you're doing. Your healing journey matters, and I'm here to support you. 💛` });
                                    setReminderSaved(false);
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-brand-emerald-600 to-brand-emerald-700 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm`}
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  Message
                                </button>
                                <button
                                  onClick={() => {
                                    navigate('/advisor-homework');
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${cardBorder} ${hoverBg} ${textSecondary} transition-colors`}
                                >
                                  <Target className="w-3 h-3" />
                                  Assign Homework
                                </button>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 hidden sm:block">
                              <p className={`text-xs ${textMuted}`}>Last active</p>
                              <p className={`text-sm font-medium ${textPrimary}`}>{getRelativeTime(client.lastActive)}</p>
                              {client.primaryWound !== 'unknown' && (
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${(woundColorMap[client.primaryWound] || woundColorMap.abandonment).bg} ${(woundColorMap[client.primaryWound] || woundColorMap.abandonment).text}`}>
                                  {client.primaryWound}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
            <h2 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Alerts & Notifications
            </h2>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className={`w-10 h-10 mx-auto mb-3 ${textMuted}`} />
                  <p className={`${textSecondary}`}>No alerts at this time</p>
                  <p className={`text-sm mt-1 ${textMuted}`}>All clients are active and on track</p>
                </div>
              ) : (
                alerts.map(alert => {
                  const Icon = alert.icon;
                  const alertStyles = {
                    danger: { bg: isDark ? 'bg-red-900/50 border-red-700 ring-1 ring-red-500/30' : 'bg-red-100 border-red-300 ring-1 ring-red-200', icon: 'text-red-600 animate-pulse' },
                    warning: { bg: isDark ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200', icon: 'text-red-500' },
                    success: { bg: isDark ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200', icon: 'text-green-500' },
                    info: { bg: isDark ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200', icon: 'text-blue-500' }
                  };
                  const style = alertStyles[alert.type];
                  return (
                    <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-lg border ${style.bg}`}>
                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.icon}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${textPrimary}`}>{alert.message}</p>
                        <p className={`text-xs mt-1 ${textMuted}`}>{alert.time}</p>
                      </div>
                      <button 
                        onClick={() => {
                          if (alert.clientId) {
                            setSelectedInsightClient(alert.clientId);
                            setActiveTab('insights');
                          }
                        }}
                        className={`text-xs px-3 py-1 rounded-lg ${hoverBg} ${textSecondary} border ${cardBorder} flex-shrink-0`}
                      >
                        View
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div>
          {!activeAction && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'create-client', label: 'Create New Client PIN', icon: Plus, color: 'from-brand-stone-500 to-brand-stone-600', desc: 'Generate a secure access PIN for a new client' },
                { id: 'send-reminder', label: 'Send Reminder', icon: MessageSquare, color: 'from-brand-emerald-600 to-brand-emerald-700', desc: 'Send session or activity reminders to clients' },
                { id: 'link:/caseload', label: 'Caseload Manager', icon: Users, color: 'from-emerald-500 to-teal-600', desc: 'Assign, discharge, and reactivate clients' },
                { id: 'link:/advisor-messages', label: 'Client Messages', icon: MessageCircle, color: 'from-brand-stone-500 to-brand-stone-600', desc: 'Send and receive secure messages with clients' },
                { id: 'link:/advisor-homework', label: 'Homework Manager', icon: Target, color: 'from-brand-gold-600 to-brand-emerald-700', desc: 'Create, assign, and track client homework' },
                { id: 'link:/advisor-reports', label: 'Progress Reports', icon: Download, color: 'from-emerald-500 to-teal-600', desc: 'Generate and export client progress reports' },
                { id: 'link:/assessment-builder', label: 'Assessment Builder', icon: FileText, color: 'from-brand-gold-600 to-brand-emerald-700', desc: 'Create custom assessments for clients' },
                { id: 'link:/mood-analytics', label: 'Mood & Parts Analytics', icon: TrendingUp, color: 'from-brand-stone-500 to-brand-gold-600', desc: 'View mood trends, parts patterns, and self-energy over time' },
                { id: 'export-reports', label: 'Export All Reports', icon: Download, color: 'from-brand-gold-600 to-brand-emerald-700', desc: 'Download comprehensive progress reports' },
                { id: 'group-analytics', label: 'View Group Analytics', icon: BarChart3, color: 'from-brand-gold-600 to-brand-emerald-700', desc: 'Analyze trends across all clients' }
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      if (action.id.startsWith('link:')) {
                        navigate(action.id.replace('link:', ''));
                        return;
                      }
                      setActiveAction(action.id);
                      if (action.id === 'create-client') {
                        setNewClientForm({ name: '', email: '', phone: '', pin: '', role: 'client' });
                        setNewClientResult(null);
                      }
                      if (action.id === 'send-reminder') {
                        setReminderForm({ clientId: '', type: 'session', message: '' });
                        setReminderSaved(false);
                      }
                    }}
                    className={`${cardBg} rounded-xl border ${cardBorder} p-5 text-left transition-all hover:shadow-lg group`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`font-semibold ${textPrimary} mb-1`}>{action.label}</h3>
                    <p className={`text-sm ${textMuted}`}>{action.desc}</p>
                  </button>
                );
              })}
            </div>
          )}

          {activeAction && (
            <div>
              <button
                onClick={() => { setActiveAction(null); setNewClientResult(null); setReminderSaved(false); }}
                className={`flex items-center gap-2 mb-4 text-sm ${textSecondary} hover:${textPrimary} transition-colors`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Quick Actions
              </button>

              {activeAction === 'create-client' && (
                <div className={`${cardBg} rounded-xl border ${cardBorder} p-6 max-w-lg`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-stone-500 to-brand-stone-600 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-lg font-semibold ${textPrimary}`}>Create New User</h2>
                      <p className={`text-sm ${textSecondary}`}>Set a PIN and role, or leave PIN blank to auto-generate</p>
                    </div>
                  </div>

                  {newClientResult?.success ? (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-center">
                        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-emerald-800 mb-1">{newClientResult.role === 'therapist' ? 'Advisor' : 'Client'} Created</h3>
                        <p className="text-sm text-emerald-600 mb-2">{newClientResult.name} is ready to log in</p>
                        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 ${newClientResult.role === 'therapist' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          Role: {newClientResult.role === 'therapist' ? 'Advisor' : 'Client'}
                        </span>
                        <div className="bg-white rounded-lg p-4 border border-emerald-200 inline-block">
                          <p className="text-xs text-gray-500 mb-1">Access PIN</p>
                          <p className="text-3xl font-mono font-bold text-gray-900 tracking-widest">{newClientResult.pin}</p>
                        </div>
                        <div className="mt-4">
                          <button
                            onClick={() => { copyToClipboard(newClientResult.pin); }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            Copy PIN
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => { setNewClientResult(null); setNewClientForm({ name: '', email: '', phone: '', pin: '', role: 'client' }); }}
                        className="w-full py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Create Another Client
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium ${textSecondary} mb-1.5`}>Client Name *</label>
                        <input
                          type="text"
                          value={newClientForm.name}
                          onChange={e => setNewClientForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter client's full name"
                          className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-blue-500 outline-none`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${textSecondary} mb-1.5`}>PIN Number *</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={newClientForm.pin}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setNewClientForm(prev => ({ ...prev, pin: val }));
                          }}
                          placeholder="Enter 6-digit PIN"
                          className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg tracking-widest`}
                        />
                        <p className={`text-xs ${textMuted} mt-1`}>Choose a 6-digit PIN for this client to use when logging in. Leave blank to auto-generate one.</p>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${textSecondary} mb-1.5`}>User Role *</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: 'client', label: 'Client', desc: 'Access to curriculum, assessments, and exercises', icon: '👤' },
                            { value: 'therapist', label: 'Advisor', desc: 'Full admin dashboard and client management', icon: '🛡️' }
                          ].map(role => (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => setNewClientForm(prev => ({ ...prev, role: role.value }))}
                              className={`p-3 rounded-lg border-2 text-left transition-all ${
                                newClientForm.role === role.value
                                  ? role.value === 'therapist'
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-400'
                                    : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                  : `${cardBorder} hover:border-gray-400`
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{role.icon}</span>
                                <span className={`text-sm font-semibold ${newClientForm.role === role.value ? (role.value === 'therapist' ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300') : textPrimary}`}>
                                  {role.label}
                                </span>
                              </div>
                              <p className={`text-xs ${textMuted}`}>{role.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${textSecondary} mb-1.5`}>Email (optional)</label>
                        <input
                          type="email"
                          value={newClientForm.email}
                          onChange={e => setNewClientForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="client@email.com"
                          className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-blue-500 outline-none`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${textSecondary} mb-1.5`}>Phone (optional)</label>
                        <input
                          type="tel"
                          value={newClientForm.phone}
                          onChange={e => setNewClientForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(555) 123-4567"
                          className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-blue-500 outline-none`}
                        />
                      </div>
                      {newClientResult?.error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                          {newClientResult.error}
                        </div>
                      )}
                      <button
                        onClick={handleCreateClient}
                        disabled={newClientLoading || !newClientForm.name.trim()}
                        className="w-full py-2.5 bg-gradient-to-r from-brand-stone-500 to-brand-stone-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {newClientLoading ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Creating Client...</>
                        ) : (
                          <><Plus className="w-4 h-4" /> Create Client</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeAction === 'send-reminder' && (
                <div className={`${cardBg} rounded-xl border ${cardBorder} p-6 max-w-lg`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-emerald-600 to-brand-emerald-700 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-lg font-semibold ${textPrimary}`}>Send Reminder</h2>
                      <p className={`text-sm ${textSecondary}`}>Compose a reminder and copy it to send via your preferred method</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${textSecondary} mb-1.5`}>Select Client</label>
                      <select
                        value={reminderForm.clientId}
                        onChange={e => {
                          setReminderForm(prev => ({ ...prev, clientId: e.target.value }));
                          setReminderSaved(false);
                        }}
                        className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-emerald-500 outline-none`}
                      >
                        <option value="">Choose a client...</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${textSecondary} mb-1.5`}>Reminder Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'session', label: 'Session' },
                          { id: 'activity', label: 'Activity' },
                          { id: 'checkin', label: 'Check-in' },
                          { id: 'assessment', label: 'Assessment' }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => {
                              const client = clients.find(c => c.id === reminderForm.clientId);
                              const msg = reminderTemplates[t.id].replace('{name}', client?.name || '[Client]');
                              setReminderForm(prev => ({ ...prev, type: t.id, message: msg }));
                            }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                              reminderForm.type === t.id
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                                : `${cardBg} ${cardBorder} ${textSecondary} hover:border-emerald-300`
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${textSecondary} mb-1.5`}>Message</label>
                      <textarea
                        value={reminderForm.message}
                        onChange={e => setReminderForm(prev => ({ ...prev, message: e.target.value }))}
                        rows={4}
                        placeholder="Type your reminder message..."
                        className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-emerald-500 outline-none resize-none`}
                      />
                    </div>
                    {reminderSaved && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 text-sm text-emerald-700">
                        <CheckCircle className="w-4 h-4" />
                        Reminder saved and ready to send
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          copyToClipboard(reminderForm.message);
                          handleSendReminder();
                        }}
                        disabled={!reminderForm.clientId || !reminderForm.message.trim()}
                        className="flex-1 py-2.5 bg-gradient-to-r from-brand-emerald-600 to-brand-emerald-700 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy & Save Reminder
                      </button>
                    </div>
                    <p className={`text-xs ${textMuted}`}>
                      The message will be copied to your clipboard so you can paste it in your preferred messaging app. A log of the reminder is saved in your session notes.
                    </p>
                  </div>
                </div>
              )}

              {activeAction === 'export-reports' && (
                <div className={`${cardBg} rounded-xl border ${cardBorder} p-6 max-w-lg`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-gold-600 to-brand-emerald-700 flex items-center justify-center">
                      <Download className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-lg font-semibold ${textPrimary}`}>Export All Reports</h2>
                      <p className={`text-sm ${textSecondary}`}>Download a comprehensive CSV report of all client data</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className={`rounded-lg border ${cardBorder} p-4`}>
                      <h3 className={`text-sm font-medium ${textPrimary} mb-3`}>Report includes:</h3>
                      <ul className={`text-sm ${textSecondary} space-y-2`}>
                        {['Client names and wound profiles', 'Module completion progress', 'Journal entry counts', 'Average mood scores', 'Activity completion rates', 'Risk levels and engagement status', 'Join dates and last activity'].map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={`rounded-lg border ${cardBorder} p-4 bg-amber-50/50`}>
                      <p className={`text-sm ${textSecondary}`}>
                        <span className="font-medium">{clients.length} clients</span> will be included in this report
                      </p>
                    </div>
                    <button
                      onClick={handleExportReports}
                      disabled={exportLoading || clients.length === 0}
                      className="w-full py-2.5 bg-gradient-to-r from-brand-gold-600 to-brand-emerald-700 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {exportLoading ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Generating Report...</>
                      ) : (
                        <><Download className="w-4 h-4" /> Download CSV Report</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeAction === 'group-analytics' && (() => {
                const analytics = getGroupAnalytics();
                if (!analytics) {
                  return (
                    <div className={`${cardBg} rounded-xl border ${cardBorder} p-6 text-center`}>
                      <p className={textSecondary}>No client data available for analytics.</p>
                    </div>
                  );
                }
                const maxWound = Math.max(...Object.values(analytics.woundCounts));
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-gold-600 to-brand-emerald-700 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className={`text-lg font-semibold ${textPrimary}`}>Group Analytics</h2>
                        <p className={`text-sm ${textSecondary}`}>Trends across all {clients.length} clients</p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Avg Progress', value: `${analytics.avgProgress}%`, sub: `${analytics.avgModules} modules avg`, color: 'from-brand-stone-500 to-brand-stone-600' },
                        { label: 'Active Rate', value: `${analytics.activeRate}%`, sub: `${analytics.riskCounts.low} of ${clients.length} active`, color: 'from-brand-emerald-600 to-brand-emerald-700' },
                        { label: 'Total Journals', value: analytics.totalJournals, sub: `${(analytics.totalJournals / clients.length).toFixed(1)} per client`, color: 'from-brand-gold-600 to-brand-emerald-700' },
                        { label: 'Activity Rate', value: `${analytics.activityCompletionRate}%`, sub: `${analytics.completedActivities}/${analytics.totalActivities} done`, color: 'from-brand-gold-600 to-brand-emerald-700' }
                      ].map(stat => (
                        <div key={stat.label} className={`${cardBg} rounded-xl border ${cardBorder} p-4`}>
                          <p className={`text-xs ${textMuted} mb-1`}>{stat.label}</p>
                          <p className={`text-2xl font-bold ${textPrimary}`}>{stat.value}</p>
                          <p className={`text-xs ${textSecondary} mt-1`}>{stat.sub}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
                        <h3 className={`text-sm font-semibold ${textPrimary} mb-4`}>Wound Distribution</h3>
                        <div className="space-y-3">
                          {Object.entries(analytics.woundCounts).filter(([k]) => k !== 'unknown').map(([wound, count]) => {
                            const pct = maxWound > 0 ? Math.round((count / clients.length) * 100) : 0;
                            return (
                              <div key={wound}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-sm capitalize ${textSecondary}`}>{wound}</span>
                                  <span className={`text-sm font-medium ${textPrimary}`}>{count} ({pct}%)</span>
                                </div>
                                <div className={`h-2.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                                  <div
                                    className={`h-full rounded-full`}
                                    style={{ width: `${pct}%`, backgroundColor: wound === 'abandonment' ? '#3b82f6' : wound === 'shame' ? '#8b5cf6' : wound === 'neglect' ? '#f59e0b' : wound === 'helplessness' ? '#f43f5e' : '#ef4444' }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          {analytics.woundCounts.unknown > 0 && (
                            <p className={`text-xs ${textMuted} mt-2`}>{analytics.woundCounts.unknown} client(s) have not completed an assessment yet</p>
                          )}
                        </div>
                      </div>

                      <div className={`${cardBg} rounded-xl border ${cardBorder} p-5`}>
                        <h3 className={`text-sm font-semibold ${textPrimary} mb-4`}>Engagement Status</h3>
                        <div className="space-y-3">
                          {[
                            { key: 'low', label: 'Active (< 7 days)', color: '#10b981' },
                            { key: 'medium', label: 'At Risk (7-14 days)', color: '#f59e0b' },
                            { key: 'high', label: 'Inactive (> 14 days)', color: '#ef4444' }
                          ].map(status => {
                            const count = analytics.riskCounts[status.key];
                            const pct = Math.round((count / clients.length) * 100);
                            return (
                              <div key={status.key}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-sm ${textSecondary}`}>{status.label}</span>
                                  <span className={`text-sm font-medium ${textPrimary}`}>{count} ({pct}%)</span>
                                </div>
                                <div className={`h-2.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${pct}%`, backgroundColor: status.color }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-5 pt-4 border-t border-gray-200">
                          <h4 className={`text-xs font-medium ${textMuted} uppercase tracking-wider mb-3`}>Summary</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className={`text-xs ${textMuted}`}>Assessments</p>
                              <p className={`text-lg font-semibold ${textPrimary}`}>{analytics.totalAssessments}</p>
                            </div>
                            <div>
                              <p className={`text-xs ${textMuted}`}>Avg Modules</p>
                              <p className={`text-lg font-semibold ${textPrimary}`}>{analytics.avgModules}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {activeTab === 'lessons' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-gold-600 to-brand-emerald-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${textPrimary}`}>IFS Session Lesson Plans</h2>
              <p className={`text-sm ${textSecondary}`}>Detailed guides for each module session</p>
            </div>
          </div>

          <div className="mb-6">
            <label className={`block text-sm font-medium ${textSecondary} mb-2`}>View Client's Personalized Curriculum</label>
            <select
              value={selectedLessonClient}
              onChange={(e) => {
                setSelectedLessonClient(e.target.value);
                if (e.target.value) loadClientCurriculum(e.target.value);
                else setClientCurriculum(null);
              }}
              className={`w-full sm:w-80 px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`}
            >
              <option value="">Standard Lesson Plans</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {selectedLessonClient && clientCurriculum ? (
            <div className="space-y-4">
              {clientCurriculum.length === 0 ? (
                <div className={`${cardBg} rounded-xl border ${cardBorder} p-6`}>
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold-600 to-brand-emerald-700 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className={`font-semibold ${textPrimary}`}>No personalized curriculum yet</p>
                      <p className={`text-sm ${textMuted} mt-0.5`}>
                        This client hasn't completed the wound assessment. You can generate a personalized curriculum for them now by selecting their wound profile below.
                      </p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={`block text-sm font-semibold mb-1.5 ${textSecondary}`}>Primary Wound</label>
                      <select
                        value={genPrimaryWound}
                        onChange={e => { setGenPrimaryWound(e.target.value); setGenResult(null); if (e.target.value === genSecondaryWound) setGenSecondaryWound(WOUND_TYPES.find(w => w !== e.target.value)); }}
                        className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none text-sm`}
                      >
                        {WOUND_TYPES.map(w => <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
                      </select>
                      <p className={`text-xs mt-1 ${textMuted}`}>60% of curriculum focus</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold mb-1.5 ${textSecondary}`}>Secondary Wound</label>
                      <select
                        value={genSecondaryWound}
                        onChange={e => { setGenSecondaryWound(e.target.value); setGenResult(null); }}
                        className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none text-sm`}
                      >
                        {WOUND_TYPES.filter(w => w !== genPrimaryWound).map(w => <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
                      </select>
                      <p className={`text-xs mt-1 ${textMuted}`}>30% of curriculum focus</p>
                    </div>
                  </div>
                  {genResult?.error && (
                    <div className="mb-3 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{genResult.error}</div>
                  )}
                  {genResult?.success && (
                    <div className="mb-3 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">✓ {genResult.success}</div>
                  )}
                  <button
                    onClick={() => handleGenerateCurriculum(selectedLessonClient)}
                    disabled={generatingCurriculum}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-gold-600 to-brand-emerald-700 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-60"
                  >
                    {generatingCurriculum
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                      : <><Sparkles className="w-4 h-4" /> Generate Personalized Curriculum</>
                    }
                  </button>
                  <p className={`text-xs mt-3 ${textMuted}`}>
                    This will create a full 6-module personalized curriculum and save an advisor-assigned wound profile for this client. The client can still complete the formal assessment later to refine it.
                  </p>
                </div>
              ) : (
                <>
                <div className={`${cardBg} rounded-xl border ${cardBorder} p-4 mb-1`}>
                  <details className="group">
                    <summary className={`cursor-pointer text-sm font-semibold flex items-center gap-2 ${textSecondary} list-none`}>
                      <RefreshCw className="w-4 h-4 text-amber-500" />
                      Regenerate Curriculum with Different Wound Profile
                      <ChevronDown className="w-3.5 h-3.5 ml-auto group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-3 grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${textMuted}`}>Primary Wound</label>
                        <select value={genPrimaryWound} onChange={e => { setGenPrimaryWound(e.target.value); setGenResult(null); if (e.target.value === genSecondaryWound) setGenSecondaryWound(WOUND_TYPES.find(w => w !== e.target.value)); }} className={`w-full px-2.5 py-2 rounded-lg border ${inputBg} outline-none text-sm`}>
                          {WOUND_TYPES.map(w => <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${textMuted}`}>Secondary Wound</label>
                        <select value={genSecondaryWound} onChange={e => { setGenSecondaryWound(e.target.value); setGenResult(null); }} className={`w-full px-2.5 py-2 rounded-lg border ${inputBg} outline-none text-sm`}>
                          {WOUND_TYPES.filter(w => w !== genPrimaryWound).map(w => <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                    {genResult?.error && <p className="mt-2 text-xs text-red-600">{genResult.error}</p>}
                    {genResult?.success && <p className="mt-2 text-xs text-emerald-600">✓ {genResult.success}</p>}
                    <button onClick={() => handleGenerateCurriculum(selectedLessonClient)} disabled={generatingCurriculum} className="mt-3 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-gold-600 to-brand-emerald-700 text-white rounded-lg text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-60">
                      {generatingCurriculum ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Regenerating...</> : <><RefreshCw className="w-3.5 h-3.5" /> Regenerate</>}
                    </button>
                    <p className={`text-xs mt-1.5 ${textMuted}`}>This will replace the existing curriculum with a new personalized version.</p>
                  </details>
                </div>
                {clientCurriculum.map((mod, index) => {
                  const customContent = mod.customized_content || {};
                  const woundColors = woundColorMap[mod.primary_wound_focus] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                  const difficultyColors = {
                    beginner: 'bg-green-100 text-green-700',
                    intermediate: 'bg-yellow-100 text-yellow-700',
                    advanced: 'bg-red-100 text-red-700'
                  };

                  return (
                    <div key={mod.id} className={`${cardBg} rounded-xl border ${cardBorder} overflow-hidden transition-all`}>
                      {editingModule?.id === mod.id ? (
                        <div className="p-5 space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-semibold ${textPrimary}`}>Edit Module {mod.module_order || index + 1}</h3>
                            <button
                              onClick={() => setEditingModule(null)}
                              className={`p-1.5 rounded-lg ${hoverBg} ${textMuted}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div>
                            <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Title</label>
                            <input
                              type="text"
                              value={editModuleForm.title}
                              onChange={(e) => setEditModuleForm(prev => ({ ...prev, title: e.target.value }))}
                              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`}
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Description</label>
                            <textarea
                              value={editModuleForm.description}
                              onChange={(e) => setEditModuleForm(prev => ({ ...prev, description: e.target.value }))}
                              rows={3}
                              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none resize-none`}
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium ${textSecondary} mb-1`}>Estimated Minutes</label>
                            <input
                              type="number"
                              value={editModuleForm.estimatedMinutes}
                              onChange={(e) => setEditModuleForm(prev => ({ ...prev, estimatedMinutes: parseInt(e.target.value) || 0 }))}
                              className={`w-32 px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`}
                            />
                          </div>
                          {moduleSaveError && (
                            <p className="text-xs text-red-500 font-medium">{moduleSaveError}</p>
                          )}
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={handleSaveModuleEdit}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                              <Save className="w-4 h-4" />
                              Save Changes
                            </button>
                            <button
                              onClick={() => { setEditingModule(null); setModuleSaveError(''); }}
                              className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} transition-colors`}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-gold-600 to-brand-emerald-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {mod.module_order || index + 1}
                              </div>
                              <div className="flex-1">
                                <h3 className={`font-semibold ${textPrimary}`}>{mod.module_title}</h3>
                                <p className={`text-sm ${textSecondary} mt-1 leading-relaxed`}>{mod.module_description}</p>

                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                  {mod.primary_wound_focus && (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${woundColors.bg} ${woundColors.text}`}>
                                      {mod.primary_wound_focus}
                                    </span>
                                  )}
                                  {mod.difficulty_level && (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${difficultyColors[mod.difficulty_level] || 'bg-gray-100 text-gray-700'}`}>
                                      {mod.difficulty_level}
                                    </span>
                                  )}
                                  <span className={`inline-flex items-center gap-1 text-xs ${textMuted}`}>
                                    <Clock className="w-3 h-3" />
                                    {mod.estimated_minutes || 30} min
                                  </span>
                                </div>

                                {(customContent.specificChanges || customContent.woundFocus) && (
                                  <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-amber-50'} border ${isDark ? 'border-slate-600' : 'border-amber-100'}`}>
                                    <p className={`text-xs font-medium ${textMuted} uppercase tracking-wider mb-1`}>Personalization</p>
                                    <p className={`text-sm ${textSecondary}`}>
                                      {customContent.specificChanges || customContent.woundFocus}
                                    </p>
                                  </div>
                                )}

                                {customContent.goals && (
                                  <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'} border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                                    <p className={`text-xs font-medium ${textMuted} uppercase tracking-wider mb-1`}>Session Goals</p>
                                    <p className={`text-sm ${textSecondary}`}>{customContent.goals}</p>
                                    {customContent.topics?.length > 0 && (
                                      <div className="mt-2">
                                        <p className={`text-xs font-medium ${textMuted} uppercase tracking-wider mb-1`}>Discussion Topics</p>
                                        <ul className="space-y-0.5">
                                          {customContent.topics.map((t, i) => (
                                            <li key={i} className={`text-sm ${textSecondary} italic`}>&ldquo;{t}&rdquo;</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {customContent.activities?.length > 0 && (
                                      <div className="mt-2">
                                        <p className={`text-xs font-medium ${textMuted} uppercase tracking-wider mb-1`}>Activities</p>
                                        <ul className="space-y-0.5">
                                          {customContent.activities.map((a, i) => (
                                            <li key={i} className={`text-sm ${textSecondary} flex items-center gap-1.5`}>
                                              <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />{a}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {customContent.watchFor?.length > 0 && (
                                      <div className="mt-2">
                                        <p className={`text-xs font-medium ${textMuted} uppercase tracking-wider mb-1`}>Watch For</p>
                                        <ul className="space-y-0.5">
                                          {customContent.watchFor.map((w, i) => (
                                            <li key={i} className={`text-sm ${textSecondary} flex items-center gap-1.5`}>
                                              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />{w}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setEditingModule(mod);
                                  setEditModuleForm({
                                    title: mod.module_title || '',
                                    description: mod.module_description || '',
                                    estimatedMinutes: mod.estimated_minutes || 30
                                  });
                                }}
                                className={`p-2 rounded-lg ${hoverBg} ${textMuted} hover:text-amber-500 transition-colors`}
                                title="Edit module"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveModule(mod)}
                                className={`p-2 rounded-lg ${hoverBg} ${textMuted} hover:text-red-500 transition-colors`}
                                title="Remove module"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className={`${cardBg} rounded-xl border-2 border-dashed ${isDark ? 'border-slate-600' : 'border-gray-300'} overflow-hidden transition-all`}>
                  {!showAddModule ? (
                    <button
                      onClick={() => { setShowAddModule(true); setAddModuleResult(null); }}
                      className={`w-full p-5 flex items-center justify-center gap-3 ${hoverBg} transition-colors`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-emerald-600 to-brand-emerald-700 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className={`font-semibold ${textPrimary}`}>Add Wound-Specific Lesson Plan</p>
                        <p className={`text-sm ${textMuted}`}>Browse and add targeted healing modules by child wound type</p>
                      </div>
                    </button>
                  ) : (
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`font-semibold ${textPrimary} flex items-center gap-2`}>
                          <Heart className="w-4 h-4 text-rose-500" />
                          Add Wound-Specific Lesson Plan
                        </h3>
                        <button onClick={() => { setShowAddModule(false); setAddModuleResult(null); }} className={`p-1.5 rounded-lg ${hoverBg} ${textMuted}`}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {WOUND_TYPES.map(w => {
                          const wd = WOUND_DISPLAY[w];
                          const isActive = addModuleWound === w;
                          return (
                            <button
                              key={w}
                              onClick={() => { setAddModuleWound(w); setAddModuleResult(null); }}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                isActive
                                  ? `bg-gradient-to-r ${wd.gradient} text-white shadow-lg`
                                  : `${isDark ? wd.darkBg + ' ' + wd.darkBorder + ' ' + wd.darkText : wd.bg + ' ' + wd.border + ' ' + wd.text} border`
                              }`}
                            >
                              {wd.label} ({wd.childName})
                            </button>
                          );
                        })}
                      </div>

                      {addModuleResult?.success && (
                        <div className="mb-3 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" /> {addModuleResult.success}
                        </div>
                      )}
                      {addModuleResult?.error && (
                        <div className="mb-3 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{addModuleResult.error}</div>
                      )}

                      <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                        {(WOUND_LESSON_PLANS[addModuleWound] || []).map(template => {
                          const wd = WOUND_DISPLAY[addModuleWound];
                          const diffColors = { beginner: 'bg-green-100 text-green-700', intermediate: 'bg-yellow-100 text-yellow-700', advanced: 'bg-red-100 text-red-700' };
                          const alreadyAdded = (clientCurriculum || []).some(m => m.module_title === template.title);
                          return (
                            <div key={template.id} className={`rounded-lg border ${isDark ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-white'} p-4`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <h4 className={`font-medium ${textPrimary} text-sm`}>{template.title}</h4>
                                  <p className={`text-xs ${textSecondary} mt-1 leading-relaxed`}>{template.description}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? wd.darkBg + ' ' + wd.darkText : wd.bg + ' ' + wd.text}`}>
                                      {wd.childName}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${diffColors[template.difficulty] || diffColors.beginner}`}>
                                      {template.difficulty}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 text-xs ${textMuted}`}>
                                      <Clock className="w-3 h-3" /> {template.estimatedMinutes} min
                                    </span>
                                  </div>
                                  <details className="mt-2 group">
                                    <summary className={`text-xs font-medium ${textMuted} cursor-pointer select-none`}>
                                      View details
                                    </summary>
                                    <div className={`mt-2 text-xs ${textSecondary} space-y-2`}>
                                      <div><span className={`font-medium ${textMuted}`}>Goals:</span> {template.goals}</div>
                                      <div>
                                        <span className={`font-medium ${textMuted}`}>Topics:</span>
                                        <ul className="ml-3 mt-0.5 space-y-0.5">{template.topics.map((t, i) => <li key={i} className="italic">&ldquo;{t}&rdquo;</li>)}</ul>
                                      </div>
                                      <div>
                                        <span className={`font-medium ${textMuted}`}>Activities:</span>
                                        <ul className="ml-3 mt-0.5 space-y-0.5">{template.activities.map((a, i) => <li key={i}>{a}</li>)}</ul>
                                      </div>
                                      <div>
                                        <span className={`font-medium ${textMuted}`}>Watch For:</span>
                                        <ul className="ml-3 mt-0.5 space-y-0.5">{template.watchFor.map((w, i) => <li key={i}>{w}</li>)}</ul>
                                      </div>
                                    </div>
                                  </details>
                                </div>
                                <button
                                  onClick={() => handleAddWoundModule(template)}
                                  disabled={addingModuleId === template.id || alreadyAdded}
                                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                                    alreadyAdded
                                      ? `${isDark ? 'bg-slate-600 text-slate-400' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                                      : 'bg-gradient-to-r from-brand-emerald-600 to-brand-emerald-700 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-md'
                                  } disabled:opacity-60`}
                                >
                                  {addingModuleId === template.id ? (
                                    <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding...</>
                                  ) : alreadyAdded ? (
                                    <><CheckCircle className="w-3.5 h-3.5" /> Added</>
                                  ) : (
                                    <><Plus className="w-3.5 h-3.5" /> Add</>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {lessonPlans.map((module, index) => (
                <div key={module.id} className={`${cardBg} rounded-xl border ${cardBorder} overflow-hidden transition-all`}>
                  <button
                    onClick={() => toggleModule(module.id)}
                    className={`w-full flex items-center justify-between p-5 text-left ${hoverBg} transition-colors`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-gold-600 to-brand-emerald-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className={`font-semibold ${textPrimary}`}>{module.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs ${textMuted} flex items-center gap-1`}>
                            <Clock className="w-3 h-3" />
                            {module.duration}
                          </span>
                        </div>
                      </div>
                    </div>
                    {expandedModules[module.id] ? (
                      <ChevronUp className={`w-5 h-5 ${textMuted} flex-shrink-0`} />
                    ) : (
                      <ChevronDown className={`w-5 h-5 ${textMuted} flex-shrink-0`} />
                    )}
                  </button>

                  {expandedModules[module.id] && (
                    <div className={`px-5 pb-5 border-t ${cardBorder}`}>
                      <div className="grid md:grid-cols-2 gap-5 mt-5">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            <h4 className={`font-medium ${textPrimary} text-sm`}>Session Goals</h4>
                          </div>
                          <p className={`text-sm ${textSecondary} leading-relaxed`}>{module.goals}</p>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <MessageCircle className="w-4 h-4 text-stone-500" />
                            <h4 className={`font-medium ${textPrimary} text-sm`}>Discussion Topics</h4>
                          </div>
                          <ul className="space-y-2">
                            {module.topics.map((topic, i) => (
                              <li key={i} className={`text-sm ${textSecondary} flex items-start gap-2`}>
                                <span className="text-amber-400 mt-0.5 flex-shrink-0">&ldquo;</span>
                                <span className="italic">{topic}</span>
                                <span className="text-amber-400 mt-0.5 flex-shrink-0">&rdquo;</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            <h4 className={`font-medium ${textPrimary} text-sm`}>Activities to Do Together</h4>
                          </div>
                          <ul className="space-y-1.5">
                            {module.activities.map((activity, i) => (
                              <li key={i} className={`text-sm ${textSecondary} flex items-center gap-2`}>
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                {activity}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <h4 className={`font-medium ${textPrimary} text-sm`}>What to Watch For</h4>
                          </div>
                          <ul className="space-y-1.5">
                            {module.watchFor.map((item, i) => (
                              <li key={i} className={`text-sm ${textSecondary} flex items-center gap-2`}>
                                <Flag className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className={`mt-5 p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-amber-50'} border ${isDark ? 'border-slate-600' : 'border-amber-100'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-amber-500" />
                          <h4 className={`font-medium ${textPrimary} text-sm`}>Homework Assignment</h4>
                        </div>
                        <p className={`text-sm ${textSecondary}`}>{module.homework}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'insights' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-gold-600 to-brand-emerald-700 flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${textPrimary}`}>Client Insights</h2>
              <p className={`text-sm ${textSecondary}`}>Review client responses and prepare for sessions</p>
            </div>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-3">
            <div>
              <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Select a Client</label>
              <select
                value={selectedInsightClient}
                onChange={(e) => setSelectedInsightClient(e.target.value)}
                className={`w-full sm:w-80 px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`}
              >
                <option value="">Choose a client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {selectedInsightClient && !insightsLoading && clientInsights && (
              <button
                onClick={() => handleGenerateReport(selectedInsightClient)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-gold-600 to-brand-emerald-700 text-white rounded-lg text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </button>
            )}
          </div>

          {!selectedInsightClient && (
            <div className={`${cardBg} rounded-xl border ${cardBorder} p-12 text-center`}>
              <Eye className={`w-12 h-12 mx-auto mb-3 ${textMuted}`} />
              <p className={`font-medium ${textSecondary}`}>Select a client to view insights</p>
              <p className={`text-sm mt-1 ${textMuted}`}>Choose from the dropdown above to see their responses and session prep</p>
            </div>
          )}

          {selectedInsightClient && insightsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {selectedInsightClient && !insightsLoading && clientInsights && (() => {
            const client = clients.find(c => c.id === selectedInsightClient);
            const assessment = clientInsights.assessment;
            const personalization = clientInsights.personalization;
            const normalizeScore = (s) => {
              if (s === null || s === undefined) return 0;
              const num = Number(s);
              if (isNaN(num)) return 0;
              return num <= 5 ? Math.round(num * 5) : Math.round(num);
            };
            const woundScores = assessment ? [
              { type: 'Abandonment', score: normalizeScore(assessment.abandonment_score), color: 'blue' },
              { type: 'Shame', score: normalizeScore(assessment.shame_score), color: 'amber' },
              { type: 'Neglect', score: normalizeScore(assessment.neglect_score), color: 'amber' },
              { type: 'Betrayal', score: normalizeScore(assessment.betrayal_score), color: 'red' },
              { type: 'Helplessness', score: normalizeScore(assessment.helplessness_score || 0), color: 'rose' }
            ].sort((a, b) => b.score - a.score) : [];
            const maxScore = 25;
            const clientGam = clientGamification[selectedInsightClient];

            return (
              <div className="space-y-6">
                {!assessment && !personalization && (
                  <div className={`${cardBg} rounded-2xl border ${isDark ? 'border-amber-700/40' : 'border-amber-200'} ${isDark ? 'bg-amber-900/10' : 'bg-amber-50'} p-6`}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold-600 to-brand-emerald-700 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold mb-1 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                          No wound assessment data for {client?.name}
                        </p>
                        <p className={`text-sm mb-3 ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                          This client hasn't completed the IFS wound assessment, so their curriculum cannot be personalized and most insights panels will be empty.
                          You can generate a personalized curriculum for them right now from the <strong>Lesson Plans</strong> tab.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => { setActiveTab('lessons'); setSelectedLessonClient(selectedInsightClient); loadClientCurriculum(selectedInsightClient); }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-gold-600 to-brand-emerald-700 text-white rounded-lg text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all"
                          >
                            <BookOpen className="w-4 h-4" /> Go to Lesson Plans → Generate Curriculum
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {(assessment || personalization) && (
                  <div className={`${cardBg} rounded-2xl border ${glowStyles.amber} p-5`}>
                    <h3 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2 tracking-tight`}>
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      Curriculum Personalization for {client?.name}
                    </h3>

                    {assessment && (
                      <div className="mb-6">
                        <h4 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                          <Target className="w-4 h-4 text-stone-500" />
                          Wound Assessment Scores
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                          {woundScores.map(w => (
                            <div key={w.type} className={`p-3 rounded-lg border ${cardBorder} ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-medium ${textSecondary}`}>{w.type}</span>
                                <span className={`text-sm font-bold ${textPrimary}`}>{w.score}/{maxScore}</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    w.color === 'blue' ? 'bg-blue-500' :
                                    w.color === 'amber' ? 'bg-amber-500' :
                                    w.color === 'amber' ? 'bg-amber-500' :
                                    w.color === 'rose' ? 'bg-rose-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${(w.score / maxScore) * 100}%` }}
                                />
                              </div>
                              <p className={`text-xs mt-1 ${textMuted}`}>
                                {w.score >= 17 ? 'High priority' : w.score >= 9 ? 'Moderate' : 'Low'}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-stone-900/20 border-stone-800' : 'bg-stone-50 border-stone-100'} border`}>
                          <p className={`text-sm ${textSecondary}`}>
                            <span className="font-medium">Primary wound:</span>{' '}
                            <span className={`font-semibold ${textPrimary}`}>{assessment.primary_wound || woundScores[0]?.type || 'Not assessed'}</span>
                            {assessment.secondary_wound && (
                              <> | <span className="font-medium">Secondary:</span>{' '}
                              <span className={textPrimary}>{assessment.secondary_wound}</span></>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {clientInsights.partsAssessment && (
                      <div className="mb-6">
                        <h4 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                          <Shield className="w-4 h-4 text-amber-500" />
                          Protective Parts Assessment
                        </h4>
                        {(() => {
                          const partsData = clientInsights.partsAssessment;
                          const partsDefinitions = {
                            manager: [
                              { name: 'The Inner Critic', trigger: [3], threshold: 4, role: 'Drives perfectionism through self-criticism', need: 'Needs to know you are already worthy without being perfect' },
                              { name: 'The Planner', trigger: [1], threshold: 4, role: 'Prevents surprises through hyper-organization', need: 'Needs to trust that you can handle uncertainty safely' },
                              { name: 'The Perfectionist', trigger: [7], threshold: 4, role: 'Prevents exposure of perceived flaws', need: 'Needs to learn that imperfection does not mean rejection' },
                              { name: 'The People Pleaser', trigger: [9], threshold: 4, role: 'Keeps relationships safe through compliance', need: 'Needs to know your true self is lovable without performing' },
                              { name: 'The Controller', trigger: [5], threshold: 4, role: 'Manages situations to prevent vulnerability', need: 'Needs to feel safe enough to release control and trust the process' },
                              { name: 'The Worrier', trigger: [14], threshold: 4, role: 'Anticipates danger through hypervigilance', need: 'Needs reassurance that you are safe in the present moment' }
                            ],
                            firefighter: [
                              { name: 'The Distractor', trigger: [2], threshold: 4, role: 'Prevents feeling overwhelming pain', need: 'Needs permission to feel emotions safely without being overwhelmed' },
                              { name: 'The Numbing Part', trigger: [6], threshold: 4, role: 'Creates emotional distance from pain', need: 'Needs to know that feeling pain will not destroy you' },
                              { name: 'The Impulse Part', trigger: [4], threshold: 4, role: 'Releases emotional pressure through action', need: 'Needs healthier outlets and the ability to pause before acting' },
                              { name: 'The Shutdown Part', trigger: [8], threshold: 4, role: 'Protects from emotional overwhelm through withdrawal', need: 'Needs a sense of safety to slowly reconnect with feelings' },
                              { name: 'The Self-Destructive Part', trigger: [10], threshold: 3, role: 'Redirects unbearable emotional pain', need: 'Needs compassion, not punishment — pain turned inward needs to be witnessed' }
                            ],
                            exile: [
                              { name: 'The Scared Child', trigger: [11], threshold: 4, role: 'Holds the original feelings of being small and helpless', need: 'Needs safety, comfort, and reassurance from Self' },
                              { name: 'The Lonely Child', trigger: [12], threshold: 4, role: 'Holds unmet needs for belonging and attachment', need: 'Needs to feel seen, held, and never alone again' },
                              { name: 'The Grieving Child', trigger: [13], threshold: 4, role: 'Holds unprocessed loss and sorrow', need: 'Needs to be witnessed, validated, and allowed to mourn' },
                              { name: 'The Shamed Child', trigger: [15], threshold: 4, role: 'Holds beliefs of being fundamentally flawed or broken', need: 'Needs to be told "you are enough" and "nothing is wrong with you"' }
                            ]
                          };
                          const rawAnswers = partsData.answers || {};
                          const identifiedParts = [];
                          Object.entries(partsDefinitions).forEach(([type, partsList]) => {
                            partsList.forEach(partDef => {
                              const triggerScores = partDef.trigger.map(qId => rawAnswers[qId] || rawAnswers[String(qId)] || 0);
                              const maxScore = Math.max(...triggerScores);
                              if (maxScore >= partDef.threshold) {
                                identifiedParts.push({ ...partDef, type, intensity: maxScore, intensityLabel: maxScore >= 5 ? 'Very Active' : 'Active' });
                              }
                            });
                          });
                          identifiedParts.sort((a, b) => b.intensity - a.intensity);

                          const typeCounts = { manager: 0, firefighter: 0, exile: 0 };
                          identifiedParts.forEach(p => { typeCounts[p.type] = (typeCounts[p.type] || 0) + 1; });
                          const typeLabels = { manager: 'Managers', firefighter: 'Firefighters', exile: 'Exiles' };
                          const typeColors = { manager: { bg: isDark ? 'bg-blue-900/30' : 'bg-blue-50', text: isDark ? 'text-blue-300' : 'text-blue-700', border: isDark ? 'border-blue-800' : 'border-blue-200', bar: 'bg-blue-500' }, firefighter: { bg: isDark ? 'bg-amber-900/30' : 'bg-amber-50', text: isDark ? 'text-amber-300' : 'text-amber-700', border: isDark ? 'border-amber-800' : 'border-amber-200', bar: 'bg-amber-500' }, exile: { bg: isDark ? 'bg-emerald-900/30' : 'bg-emerald-50', text: isDark ? 'text-emerald-300' : 'text-emerald-700', border: isDark ? 'border-emerald-800' : 'border-emerald-200', bar: 'bg-emerald-500' } };

                          return (
                            <div>
                              <div className="grid grid-cols-3 gap-3 mb-4">
                                {Object.entries(typeCounts).map(([type, count]) => (
                                  <div key={type} className={`p-3 rounded-lg border ${typeColors[type].border} ${typeColors[type].bg} text-center`}>
                                    <p className={`text-2xl font-extrabold ${typeColors[type].text}`}>{count}</p>
                                    <p className={`text-xs font-medium ${typeColors[type].text}`}>{typeLabels[type]}</p>
                                  </div>
                                ))}
                              </div>

                              {identifiedParts.length > 0 ? (
                                <div className="space-y-3">
                                  {identifiedParts.map((part, idx) => (
                                    <div key={idx} className={`p-4 rounded-lg border ${typeColors[part.type].border} ${typeColors[part.type].bg}`}>
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-sm font-bold ${textPrimary}`}>{part.name}</span>
                                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${typeColors[part.type].text} ${isDark ? 'bg-slate-700/50' : 'bg-white/70'}`}>{part.type}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${part.intensity >= 5 ? (isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700') : (isDark ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-700')}`}>
                                          {part.intensityLabel} ({part.intensity}/5)
                                        </span>
                                      </div>
                                      <div className="space-y-1.5">
                                        <p className={`text-xs ${textSecondary}`}>
                                          <span className="font-semibold">Role:</span> {part.role}
                                        </p>
                                        <p className={`text-xs ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                          <span className="font-semibold">What it needs to step back:</span> {part.need}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className={`p-4 rounded-lg border ${cardBorder} ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'} text-center`}>
                                  <Shield className={`w-8 h-8 mx-auto mb-2 ${textMuted}`} />
                                  <p className={`text-sm ${textSecondary}`}>No strongly active protective parts identified</p>
                                  <p className={`text-xs ${textMuted} mt-1`}>All parts scored below threshold — this may indicate balanced inner system or low assessment engagement</p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {clientInsights.selfEnergyAssessment && (
                      <div className="mb-6">
                        <h4 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                          <Heart className="w-4 h-4 text-emerald-500" />
                          Self-Energy Assessment — The 8 C's
                        </h4>
                        {(() => {
                          const seData = clientInsights.selfEnergyAssessment;
                          const scores = seData.scores || seData.qualities || {};
                          const cDescriptions = {
                            calmness: 'Ability to remain centered and peaceful even under stress',
                            curiosity: 'Genuine interest in understanding inner experiences without judgment',
                            compassion: 'Warmth and kindness toward yourself and your parts in pain',
                            confidence: 'Trust in your ability to handle whatever arises',
                            courage: 'Willingness to face fears and take steps toward healing',
                            clarity: 'Seeing situations clearly without parts clouding perception',
                            creativity: 'Capacity to think flexibly and find new solutions',
                            connectedness: 'Feeling of connection to others and something larger'
                          };
                          const cColors = {
                            calmness: { ring: 'text-cyan-500', bg: isDark ? 'bg-cyan-900/20' : 'bg-cyan-50', border: isDark ? 'border-cyan-800' : 'border-cyan-200' },
                            curiosity: { ring: 'text-amber-500', bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50', border: isDark ? 'border-amber-800' : 'border-amber-200' },
                            compassion: { ring: 'text-emerald-500', bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50', border: isDark ? 'border-emerald-800' : 'border-emerald-200' },
                            confidence: { ring: 'text-amber-500', bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50', border: isDark ? 'border-amber-800' : 'border-amber-200' },
                            courage: { ring: 'text-red-500', bg: isDark ? 'bg-red-900/20' : 'bg-red-50', border: isDark ? 'border-red-800' : 'border-red-200' },
                            clarity: { ring: 'text-blue-500', bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50', border: isDark ? 'border-blue-800' : 'border-blue-200' },
                            creativity: { ring: 'text-emerald-500', bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50', border: isDark ? 'border-emerald-800' : 'border-emerald-200' },
                            connectedness: { ring: 'text-stone-500', bg: isDark ? 'bg-stone-900/20' : 'bg-stone-50', border: isDark ? 'border-stone-800' : 'border-stone-200' }
                          };
                          const cQualities = Object.entries(scores).map(([key, val]) => {
                            const avg = typeof val === 'number' ? val : (val?.average || val?.score || 0);
                            const pct = Math.round((avg / 5) * 100);
                            return { key, label: key.charAt(0).toUpperCase() + key.slice(1), avg, pct, desc: cDescriptions[key] || '', colors: cColors[key] || cColors.calmness };
                          }).sort((a, b) => b.pct - a.pct);

                          const overallAvg = cQualities.length > 0 ? Math.round(cQualities.reduce((s, q) => s + q.pct, 0) / cQualities.length) : 0;

                          return (
                            <div>
                              <div className={`p-4 rounded-lg border ${isDark ? 'border-emerald-800 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'} mb-4 text-center`}>
                                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'} mb-1`}>Overall Self-Energy</p>
                                <p className={`text-4xl font-extrabold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{overallAvg}%</p>
                                <p className={`text-xs ${textMuted} mt-1`}>
                                  {overallAvg >= 80 ? 'Strong Self-energy connection — excellent foundation for parts work' :
                                   overallAvg >= 60 ? 'Moderate Self-energy — good base with room for growth' :
                                   overallAvg >= 40 ? 'Developing Self-energy — protectors may still be blending frequently' :
                                   'Low Self-energy access — focus on building Self-connection before deep parts work'}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {cQualities.map(q => (
                                  <div key={q.key} className={`p-3 rounded-lg border ${q.colors.border} ${q.colors.bg}`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`text-xs font-bold ${q.colors.ring}`}>{q.label}</span>
                                      <span className={`text-lg font-extrabold ${textPrimary}`}>{q.pct}%</span>
                                    </div>
                                    <div className="h-2.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden mb-2">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          q.pct >= 80 ? 'bg-emerald-500' :
                                          q.pct >= 60 ? 'bg-teal-500' :
                                          q.pct >= 40 ? 'bg-amber-500' :
                                          'bg-red-400'
                                        }`}
                                        style={{ width: `${q.pct}%` }}
                                      />
                                    </div>
                                    <p className={`text-[10px] leading-tight ${textMuted}`}>{q.desc}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {clientInsights.attachmentAssessment && (
                      <div className="mb-6">
                        <h4 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                          <Users className="w-4 h-4 text-stone-500" />
                          Attachment Style Assessment
                        </h4>
                        {(() => {
                          const attData = clientInsights.attachmentAssessment;
                          const style = attData.primaryStyle || attData.style || 'Unknown';
                          const secondaryStyle = attData.secondaryStyle || null;
                          const styleColors = {
                            secure: { bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50', border: isDark ? 'border-emerald-800' : 'border-emerald-200', text: isDark ? 'text-emerald-300' : 'text-emerald-700' },
                            anxious: { bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50', border: isDark ? 'border-amber-800' : 'border-amber-200', text: isDark ? 'text-amber-300' : 'text-amber-700' },
                            avoidant: { bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50', border: isDark ? 'border-blue-800' : 'border-blue-200', text: isDark ? 'text-blue-300' : 'text-blue-700' },
                            disorganized: { bg: isDark ? 'bg-red-900/20' : 'bg-red-50', border: isDark ? 'border-red-800' : 'border-red-200', text: isDark ? 'text-red-300' : 'text-red-700' }
                          };
                          const sc = styleColors[style.toLowerCase()] || styleColors.secure;
                          const scores = attData.scores || {};
                          return (
                            <div>
                              <div className={`p-4 rounded-lg border ${sc.border} ${sc.bg} mb-3`}>
                                <p className={`text-xs font-semibold uppercase tracking-wider ${sc.text} mb-1`}>Primary Attachment Style</p>
                                <p className={`text-2xl font-extrabold ${sc.text} capitalize`}>{style}</p>
                                {secondaryStyle && (
                                  <p className={`text-xs ${textMuted} mt-1`}>Secondary: <span className="capitalize font-medium">{secondaryStyle}</span></p>
                                )}
                              </div>
                              {Object.keys(scores).length > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                  {Object.entries(scores).map(([key, val]) => {
                                    const sVal = typeof val === 'number' ? val : (val?.total || val?.score || 0);
                                    const pct = Math.min(100, Math.round((sVal / 25) * 100));
                                    const ksc = styleColors[key.toLowerCase()] || styleColors.secure;
                                    return (
                                      <div key={key} className={`p-3 rounded-lg border ${ksc.border} ${ksc.bg}`}>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className={`text-xs font-bold capitalize ${ksc.text}`}>{key}</span>
                                          <span className={`text-sm font-bold ${textPrimary}`}>{sVal}</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                          <div className={`h-full rounded-full ${key.toLowerCase() === style.toLowerCase() ? 'bg-stone-500' : 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {clientInsights.customAssessments && clientInsights.customAssessments.length > 0 && (
                      <div className="mb-6">
                        <h4 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                          <FileText className="w-4 h-4 text-amber-500" />
                          Custom Assessment Results
                        </h4>
                        <div className="space-y-4">
                          {clientInsights.customAssessments.map((ca, caIdx) => (
                            <div key={ca.moduleId || caIdx} className={`p-4 rounded-lg border ${cardBorder} ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                              <div className="flex items-center justify-between mb-3">
                                <span className={`font-medium text-sm ${textPrimary}`}>{ca.assessmentTitle || 'Custom Assessment'}</span>
                                {(ca.completedAt || ca.updatedAt) && (
                                  <span className={`text-xs ${textMuted}`}>{new Date(ca.completedAt || ca.updatedAt).toLocaleDateString()}</span>
                                )}
                              </div>
                              {ca.ranked && ca.ranked.length > 0 && (
                                <div className="space-y-2">
                                  {ca.ranked.map(([category, data]) => {
                                    const percentage = data.percentage || ((data.average / (data.maxScale || 5)) * 100);
                                    return (
                                      <div key={category}>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className={`text-xs font-medium capitalize ${textSecondary}`}>{category}</span>
                                          <div className="flex items-center gap-2">
                                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                              data.label === 'High' ? (isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700') :
                                              data.label === 'Moderate' ? (isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                                              (isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                                            }`}>{data.label || 'N/A'}</span>
                                            <span className={`text-xs font-semibold ${textSecondary}`}>{data.average?.toFixed(1)}/{data.maxScale || 5}</span>
                                          </div>
                                        </div>
                                        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                          <div className={`h-full rounded-full transition-all duration-500 ${
                                            percentage >= 66 ? 'bg-red-500' : percentage >= 33 ? 'bg-amber-500' : 'bg-emerald-500'
                                          }`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {personalization && (
                      <div>
                        <h4 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                          <BookOpen className="w-4 h-4 text-emerald-500" />
                          Module Personalizations
                        </h4>
                        {personalization.personalizedModules && personalization.personalizedModules.length > 0 ? (
                          <div className="space-y-3">
                            {personalization.personalizedModules.map((mod, idx) => (
                              <div key={mod.id || idx} className={`p-4 rounded-lg border ${cardBorder} ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold-600 to-brand-emerald-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className={`font-medium ${textPrimary} text-sm`}>{mod.title || `Module ${idx + 1}`}</h5>
                                    {mod.personalizedContent?.woundFocus && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                          mod.personalizedContent.woundFocus.toLowerCase().includes('abandon') ? 'bg-blue-100 text-blue-700' :
                                          mod.personalizedContent.woundFocus.toLowerCase().includes('shame') ? 'bg-amber-100 text-amber-700' :
                                          mod.personalizedContent.woundFocus.toLowerCase().includes('neglect') ? 'bg-amber-100 text-amber-700' :
                                          mod.personalizedContent.woundFocus.toLowerCase().includes('helpless') ? 'bg-rose-100 text-rose-700' :
                                          'bg-red-100 text-red-700'
                                        }`}>
                                          <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Focus: {mod.personalizedContent.woundFocus}</span>
                                        </span>
                                      </div>
                                    )}
                                    {mod.personalizedContent?.specificChanges && (
                                      <div className={`mt-2 p-2 rounded-lg ${isDark ? 'bg-amber-900/20 border-amber-800/30' : 'bg-amber-50 border-amber-100'} border`}>
                                        <p className={`text-xs font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'} mb-1`}>What Changed:</p>
                                        <p className={`text-xs ${isDark ? 'text-amber-200' : 'text-amber-600'} leading-relaxed`}>{mod.personalizedContent.specificChanges}</p>
                                      </div>
                                    )}
                                    {mod.personalizedContent?.healingGoals && mod.personalizedContent.healingGoals.length > 0 && (
                                      <div className="mt-2">
                                        <p className={`text-xs font-medium ${textSecondary} mb-1`}>Healing Goals:</p>
                                        <ul className="space-y-1">
                                          {mod.personalizedContent.healingGoals.map((goal, gi) => (
                                            <li key={gi} className={`text-xs ${textMuted} flex items-start gap-1.5`}>
                                              <Target className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                              {goal}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {mod.personalizedContent?.activities && mod.personalizedContent.activities.length > 0 && (
                                      <div className="mt-2">
                                        <p className={`text-xs font-medium ${textSecondary} mb-1`}>Tailored Activities:</p>
                                        <ul className="space-y-1">
                                          {mod.personalizedContent.activities.map((act, ai) => (
                                            <li key={ai} className={`text-xs ${textMuted} flex items-start gap-1.5`}>
                                              <Activity className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                              {act}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {mod.description && (
                                      <p className={`text-xs ${textMuted} mt-2 leading-relaxed`}>{mod.description}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : personalization.primaryWound ? (
                          <div className={`p-4 rounded-xl border ${isDark ? 'border-amber-800/40 bg-amber-900/15' : 'border-amber-200 bg-amber-50/50'}`}>
                            <div className="flex items-start gap-3">
                              <Gem className={`w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5`} />
                              <div className="flex-1">
                                <p className={`text-sm font-semibold ${textPrimary}`}>
                                  Curriculum adapted for <span className="text-amber-600 dark:text-amber-400 capitalize">{personalization.primaryWound}</span> wound pattern
                                </p>
                                {personalization.woundRanking && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {personalization.woundRanking.map((wr, i) => (
                                      <span key={i} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                                        i === 0 ? 'bg-amber-100 text-amber-700' :
                                        i === 1 ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>
                                        #{i + 1} {wr.type} ({wr.score})
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {personalization.focusAreas && (
                                  <div className="mt-3">
                                    <p className={`text-xs font-semibold ${textSecondary} mb-1.5`}>Focus Areas:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {personalization.focusAreas.map((area, i) => (
                                        <span key={i} className={`text-xs px-2.5 py-1 rounded-lg ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-white border border-gray-200 text-gray-700'}`}>
                                          {area}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {assessment?.primary_wound && (() => {
                      const wound = assessment.primary_wound;
                      const woundChanges = {
                        abandonment: [
                          { mod: 'Module 1: IFS Foundations', standard: 'General parts introduction with broad examples of protectors and exiles', changed: 'Opens with attachment-focused check-in. Parts identification prioritizes people-pleaser and caretaker protectors. Added "safe base" grounding exercise before parts work.' },
                          { mod: 'Module 2: Inner Child Discovery', standard: 'Neutral wound exploration across all wound types equally', changed: 'Guided visualization starts with "finding the child who was left" imagery. Reflection prompts explore fears of being forgotten, moments of feeling alone, and beliefs like "people always leave." Added journaling on earliest abandonment memory.' },
                          { mod: 'Module 3: Protective Parts Mapping', standard: 'Generic protector identification using standard categories', changed: 'Protector map highlights clinging/anxious attachment managers and numbing firefighters. Added specific prompts: "Which part monitors whether people will stay?" and "Which part pushes people away before they can leave?"' },
                          { mod: 'Module 4: Healing & Unburdening', standard: 'Standard unburdening protocol with general reparenting', changed: 'Unburdening focuses on releasing "I will be abandoned" burden. Reparenting visualization emphasizes consistent presence: "I will never leave you." Added secure attachment meditation with internal safe figure who stays.' },
                          { mod: 'Module 5: Integration & Daily Practice', standard: 'General maintenance exercises and trigger management', changed: 'Daily practice includes attachment check-in ritual and self-soothing sequence for abandonment triggers. Maintenance plan focuses on building internal secure base. Added "emergency protocol" for when abandonment panic activates.' }
                        ],
                        shame: [
                          { mod: 'Module 1: IFS Foundations', standard: 'General parts introduction with broad examples of protectors and exiles', changed: 'Opens with self-compassion warm-up before any parts work. Parts identification focuses on Inner Critic and Perfectionist managers. Added explicit permission: "There is nothing wrong with you" framing throughout.' },
                          { mod: 'Module 2: Inner Child Discovery', standard: 'Neutral wound exploration across all wound types equally', changed: 'Guided visualization gently approaches "the child who believes they are broken." Reflection prompts explore core defectiveness beliefs, moments of being told "something is wrong with you," and hiding behaviors. Includes compassion letter to younger self.' },
                          { mod: 'Module 3: Protective Parts Mapping', standard: 'Generic protector identification using standard categories', changed: 'Protector map centers on Perfectionist managers, people-pleasers hiding flaws, and shame-avoidance firefighters. Added prompts: "Which part tries to be perfect so no one sees your flaws?" and "Which part attacks you before others can?"' },
                          { mod: 'Module 4: Healing & Unburdening', standard: 'Standard unburdening protocol with general reparenting', changed: 'Unburdening releases "I am fundamentally broken" burden. Reparenting visualization emphasizes unconditional acceptance: "You are enough exactly as you are." Added worthiness meditation and inner critic transformation dialogue.' },
                          { mod: 'Module 5: Integration & Daily Practice', standard: 'General maintenance exercises and trigger management', changed: 'Daily practice includes self-compassion check-in and inner critic dialogue. Maintenance plan builds "worthiness evidence" log. Added "shame resilience" protocol for when shame spirals activate.' }
                        ],
                        neglect: [
                          { mod: 'Module 1: IFS Foundations', standard: 'General parts introduction with broad examples of protectors and exiles', changed: 'Opens with needs identification exercise — "What do I need right now?" Parts identification focuses on withdrawal/numbing protectors and the "invisible child" exile. Added validation: "Your needs matter" framing.' },
                          { mod: 'Module 2: Inner Child Discovery', standard: 'Neutral wound exploration across all wound types equally', changed: 'Guided visualization seeks "the child who became invisible." Reflection prompts explore emotional unavailability, learning to not need anything, and disconnection from own desires. Includes needs inventory exercise.' },
                          { mod: 'Module 3: Protective Parts Mapping', standard: 'Generic protector identification using standard categories', changed: 'Protector map highlights self-reliance managers, dissociation firefighters, and emotional numbness parts. Added prompts: "Which part learned to stop asking?" and "Which part makes you invisible so you won\'t be a burden?"' },
                          { mod: 'Module 4: Healing & Unburdening', standard: 'Standard unburdening protocol with general reparenting', changed: 'Unburdening releases "My needs don\'t matter" burden. Reparenting visualization emphasizes attentive care: "I see you. I hear you. You matter." Added nurturing self-care ritual and needs-honoring practice.' },
                          { mod: 'Module 5: Integration & Daily Practice', standard: 'General maintenance exercises and trigger management', changed: 'Daily practice includes needs check-in and self-advocacy micro-exercise. Maintenance plan builds consistent self-care routine. Added "visibility practice" — asking for one thing you need each day.' }
                        ],
                        betrayal: [
                          { mod: 'Module 1: IFS Foundations', standard: 'General parts introduction with broad examples of protectors and exiles', changed: 'Opens with safety assessment and grounding. Parts identification focuses on hypervigilant controllers and suspicious managers. Added explicit safety protocols before any vulnerability work.' },
                          { mod: 'Module 2: Inner Child Discovery', standard: 'Neutral wound exploration across all wound types equally', changed: 'Guided visualization approaches "the child whose trust was shattered" with extra safety layers. Reflection prompts explore broken promises, violated boundaries, and "the other shoe dropping" beliefs. Includes trust inventory.' },
                          { mod: 'Module 3: Protective Parts Mapping', standard: 'Generic protector identification using standard categories', changed: 'Protector map centers on controller/hypervigilant managers and aggressive boundary-enforcement firefighters. Added prompts: "Which part scans for danger constantly?" and "Which part never lets your guard down?"' },
                          { mod: 'Module 4: Healing & Unburdening', standard: 'Standard unburdening protocol with general reparenting', changed: 'Unburdening releases "I can never trust anyone" burden. Reparenting visualization emphasizes reliable protection: "I will keep you safe. I will not betray you." Added gradual trust-rebuilding exercises with internal parts first.' },
                          { mod: 'Module 5: Integration & Daily Practice', standard: 'General maintenance exercises and trigger management', changed: 'Daily practice includes safety check-in and fear regulation exercise. Maintenance plan focuses on discernment skills — learning to assess trustworthiness. Added "trust thermometer" tracking for gradual re-engagement.' }
                        ],
                        helplessness: [
                          { mod: 'Module 1: IFS Foundations', standard: 'General parts introduction with broad examples of protectors and exiles', changed: 'Opens with small-choice empowerment exercise — "Choose one thing right now." Parts identification focuses on freeze/collapse protectors and the "trapped child" exile. Added framing: "You have more power than you know."' },
                          { mod: 'Module 2: Inner Child Discovery', standard: 'Neutral wound exploration across all wound types equally', changed: 'Guided visualization approaches "the child who learned nothing would change." Reflection prompts explore moments of powerlessness, giving up, and beliefs like "why bother trying." Includes agency inventory — times you did create change.' },
                          { mod: 'Module 3: Protective Parts Mapping', standard: 'Generic protector identification using standard categories', changed: 'Protector map centers on freeze/shutdown managers and collapse/give-up firefighters. Added prompts: "Which part stops you from even trying?" and "Which part believes the outcome is already decided?"' },
                          { mod: 'Module 4: Healing & Unburdening', standard: 'Standard unburdening protocol with general reparenting', changed: 'Unburdening releases "Nothing I do matters" burden. Reparenting visualization emphasizes empowerment: "You have choices now. Your voice matters." Added incremental agency exercises — celebrating small wins and successful decisions.' },
                          { mod: 'Module 5: Integration & Daily Practice', standard: 'General maintenance exercises and trigger management', changed: 'Daily practice includes "one empowered choice" exercise and agency affirmation. Maintenance plan builds confidence through progressively bigger decisions. Added "power log" — tracking moments you successfully influenced an outcome.' }
                        ]
                      };
                      const changes = woundChanges[wound] || woundChanges.abandonment;
                      return (
                        <div className={`${cardBg} rounded-2xl border ${glowStyles.emerald} p-5 mt-4`}>
                          <h4 className={`text-sm font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
                            <BookOpen className="w-4 h-4 text-amber-500" />
                            Specific Curriculum Changes Applied
                          </h4>
                          <div className="space-y-4">
                            {changes.map((item, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-gold-600 to-brand-emerald-700 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
                                  {i + 1}
                                </div>
                                <div className="flex-1">
                                  <p className={`text-xs font-bold ${textPrimary}`}>{item.mod}</p>
                                  <div className={`mt-1.5 p-2.5 rounded-lg ${isDark ? 'bg-slate-600/40' : 'bg-gray-50'} border ${cardBorder}`}>
                                    <p className={`text-[10px] uppercase tracking-wider font-semibold ${textMuted} mb-1`}>Standard Version</p>
                                    <p className={`text-xs ${textMuted} leading-relaxed`}>{item.standard}</p>
                                  </div>
                                  <div className={`mt-1.5 p-2.5 rounded-lg ${isDark ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-emerald-50/70 border-emerald-100'} border`}>
                                    <p className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'} mb-1`}>Personalized for {wound}</p>
                                    <p className={`text-xs ${isDark ? 'text-emerald-200' : 'text-emerald-700'} leading-relaxed`}>{item.changed}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {!assessment && !personalization && (
                      <div className="text-center py-6">
                        <Sparkles className={`w-8 h-8 mx-auto mb-2 ${textMuted}`} />
                        <p className={`text-sm ${textSecondary}`}>{client?.name} hasn't completed the wound assessment yet</p>
                        <p className={`text-xs ${textMuted} mt-1`}>Modules will be personalized after they complete the assessment</p>
                      </div>
                    )}
                  </div>
                )}

                {clientGam && (
                  <div className={`${cardBg} rounded-2xl border ${glowStyles.amber} p-5`}>
                    <h3 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2 tracking-tight`}>
                      <Trophy className="w-5 h-5 text-amber-500" />
                      Gamification Progress
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      {[
                        { label: 'Total XP', value: (clientGam.xp || 0).toLocaleString(), icon: Zap, color: 'text-amber-500' },
                        { label: 'Level', value: clientGam.level || 1, icon: Crown, color: 'text-amber-500' },
                        { label: 'Current Streak', value: `${clientGam.streak_current || 0}d`, icon: Flame, color: 'text-orange-500' },
                        { label: 'Best Streak', value: `${clientGam.streak_longest || 0}d`, icon: Star, color: 'text-yellow-500' }
                      ].map(stat => {
                        const SIcon = stat.icon;
                        return (
                          <div key={stat.label} className={`p-3 rounded-xl border ${cardBorder} ${isDark ? 'bg-slate-700/30' : 'bg-gradient-to-br from-amber-50/50 to-white'}`}>
                            <SIcon className={`w-5 h-5 ${stat.color} mb-1`} />
                            <p className={`text-lg font-extrabold ${textPrimary}`}>{stat.value}</p>
                            <p className={`text-xs ${textMuted}`}>{stat.label}</p>
                          </div>
                        );
                      })}
                    </div>
                    {clientGam.badges && typeof clientGam.badges === 'object' && Object.keys(clientGam.badges).length > 0 && (
                      <div>
                        <p className={`text-sm font-semibold ${textSecondary} mb-2 flex items-center gap-1.5`}>
                          <Award className="w-4 h-4 text-emerald-500" />
                          Badges
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(clientGam.badges).map(([key, badge]) => (
                            <div
                              key={key}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border ${
                                (badge?.unlocked || badge?.earned)
                                  ? (isDark ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                                  : (isDark ? 'bg-slate-700/50 border-slate-600 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-400')
                              }`}
                            >
                              {(badge?.unlocked || badge?.earned) ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {badge?.name || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              {badge?.progress !== undefined && !(badge?.unlocked || badge?.earned) && (
                                <span className="opacity-70">({badge.progress}/{badge.target || '?'})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(clientInsights.recentCheckins?.length > 0 || clientInsights.avgMood || clientInsights.avgSelfEnergy) && (
                  <div className={`${cardBg} rounded-2xl border ${glowStyles.amber} p-5`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-bold ${textPrimary} flex items-center gap-2 tracking-tight`}>
                        <Activity className="w-5 h-5 text-amber-500" />
                        Daily Check-Ins & Mood
                      </h3>
                      <button
                        onClick={() => navigate(`/mood-analytics`)}
                        className="text-xs text-amber-500 hover:text-amber-600 font-medium underline"
                      >
                        Full Analytics →
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {clientInsights.avgSelfEnergy && (
                        <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-slate-700/50' : 'bg-amber-50'}`}>
                          <p className={`text-xl font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{clientInsights.avgSelfEnergy}<span className="text-sm font-normal">/10</span></p>
                          <p className={`text-xs mt-0.5 ${textMuted}`}>Avg Self-Energy</p>
                        </div>
                      )}
                      {clientInsights.avgMood && (
                        <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-slate-700/50' : 'bg-rose-50'}`}>
                          <p className={`text-xl font-bold ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{clientInsights.avgMood}<span className="text-sm font-normal">/5</span></p>
                          <p className={`text-xs mt-0.5 ${textMuted}`}>Avg Mood</p>
                        </div>
                      )}
                      {clientInsights.recentCheckins?.length > 0 && (
                        <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-slate-700/50' : 'bg-emerald-50'}`}>
                          <p className={`text-xl font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{clientInsights.recentCheckins.length}</p>
                          <p className={`text-xs mt-0.5 ${textMuted}`}>Recent Check-Ins</p>
                        </div>
                      )}
                    </div>
                    {clientInsights.recentCheckins?.length > 0 && (
                      <div className="space-y-2">
                        {clientInsights.recentCheckins.slice(0, 5).map((c, i) => (
                          <div key={i} className={`flex items-center gap-3 py-2 border-b last:border-0 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                            <span className={`text-xs font-semibold ${textSecondary} w-24`}>{c.date}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                              Self: {c.selfEnergy || '—'}/10
                            </span>
                            {c.mood && <span className={`text-xs ${textMuted}`}>{['','Struggling','Low','Okay','Good','Great'][c.mood] || ''}</span>}
                            {(c.activeParts || []).length > 0 && (
                              <span className={`text-xs ${textMuted} truncate`}>{(c.activeParts || []).length} part{c.activeParts.length !== 1 ? 's' : ''} active</span>
                            )}
                            {c.intention && <span className={`text-xs italic ${textMuted} truncate flex-1`}>"{c.intention}"</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {(parseFloat(clientInsights.avgSelfEnergy) <= 3 || parseFloat(clientInsights.avgMood) <= 2) && (
                      <div className={`mt-3 p-3 rounded-xl ${isDark ? 'bg-amber-900/20 border border-amber-700/40' : 'bg-amber-50 border border-amber-200'}`}>
                        <p className={`text-xs font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                          ⚠️ Low self-energy or mood detected — consider adjusting session focus or reaching out.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {clientInsights.journalEntries && clientInsights.journalEntries.length > 0 && (
                  <div className={`${cardBg} rounded-2xl border ${glowStyles.amber} p-5`}>
                    <h3 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2 tracking-tight`}>
                      <FileText className="w-5 h-5 text-amber-500" />
                      Journal Entries
                      <span className={`text-xs font-normal ${textMuted} ml-1`}>({clientInsights.journalEntries.length})</span>
                    </h3>
                    <div className="space-y-3">
                      {clientInsights.journalEntries.map((entry, i) => {
                        const isExpanded = expandedJournals[entry.id];
                        const content = entry.content || '';
                        const needsTruncate = content.length > 200;
                        return (
                          <div key={entry.id || i} className={`p-4 rounded-lg border ${cardBorder} ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm font-medium ${textPrimary}`}>{entry.title || 'Untitled Entry'}</p>
                                {entry.parts_dialogue?.isPartsJournal && entry.parts_identified?.[0] && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    entry.parts_dialogue?.partType === 'manager' ? 'bg-blue-100 text-blue-700' :
                                    entry.parts_dialogue?.partType === 'firefighter' ? 'bg-red-100 text-red-700' :
                                    entry.parts_dialogue?.partType === 'exile' ? 'bg-amber-100 text-amber-700' :
                                    'bg-emerald-100 text-emerald-700'
                                  }`}>{entry.parts_identified[0]}</span>
                                )}
                                {entry.mood && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    entry.mood === 'great' || entry.mood === 'happy' ? 'bg-emerald-100 text-emerald-700' :
                                    entry.mood === 'good' || entry.mood === 'calm' ? 'bg-blue-100 text-blue-700' :
                                    entry.mood === 'okay' || entry.mood === 'neutral' ? 'bg-amber-100 text-amber-700' :
                                    entry.mood === 'bad' || entry.mood === 'sad' ? 'bg-orange-100 text-orange-700' :
                                    entry.mood === 'terrible' || entry.mood === 'angry' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>{entry.mood}</span>
                                )}
                              </div>
                              <span className={`text-xs ${textMuted} whitespace-nowrap`}>
                                {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}
                              </span>
                            </div>
                            <p className={`text-sm ${textSecondary} leading-relaxed`}>
                              {isExpanded || !needsTruncate ? content : `${content.substring(0, 200)}...`}
                            </p>
                            {needsTruncate && (
                              <button
                                onClick={() => setExpandedJournals(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                                className={`text-xs font-medium mt-2 ${isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'}`}
                              >
                                {isExpanded ? 'Show less' : 'Read more'}
                              </button>
                            )}
                            {entry.tags && entry.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {entry.tags.map((tag, ti) => (
                                  <span key={ti} className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {clientInsights.moduleProgress && clientInsights.moduleProgress.length > 0 && (
                  <div className={`${cardBg} rounded-2xl border ${glowStyles.blue} p-5`}>
                    <h3 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2 tracking-tight`}>
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                      Module Progress
                    </h3>
                    <div className="space-y-3">
                      {clientInsights.moduleProgress.map((prog, i) => {
                        const completedSteps = Array.isArray(prog.completed_steps) ? prog.completed_steps.length : (prog.completed_steps || 0);
                        const totalSteps = prog.total_steps || 0;
                        const currentStep = prog.current_step || 0;
                        const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : (prog.completed ? 100 : 0);
                        return (
                          <div key={prog.id || i} className={`flex items-center gap-3 p-3 rounded-lg border ${cardBorder} ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                            {prog.completed ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${textPrimary}`}>
                                {(prog.module_id || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${prog.completed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <span className={`text-xs ${textMuted} whitespace-nowrap`}>
                                  {totalSteps > 0 ? `${completedSteps}/${totalSteps} steps` : (prog.completed ? 'Complete' : `Step ${currentStep}`)}
                                </span>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${prog.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {prog.completed ? 'Done' : 'In Progress'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className={`${cardBg} rounded-2xl border ${glowStyles.blue} p-5`}>
                  <h3 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2 tracking-tight`}>
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    Module Responses
                  </h3>
                  {!clientInsights.moduleResponses || Object.keys(clientInsights.moduleResponses).length === 0 ? (
                    <div className="text-center py-6">
                      <MessageSquare className={`w-8 h-8 mx-auto mb-2 ${textMuted}`} />
                      <p className={`text-sm ${textSecondary}`}>No module responses recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(clientInsights.moduleResponses)
                        .sort((a, b) => {
                          const modA = curriculumModules.find(m => m.id === a[0]);
                          const modB = curriculumModules.find(m => m.id === b[0]);
                          return (modA?.order || 999) - (modB?.order || 999);
                        })
                        .map(([moduleId, responses]) => {
                          const moduleData = curriculumModules.find(m => m.id === moduleId);
                          const moduleName = moduleData?.title || getModuleName(moduleId) || moduleId;
                          const isExpanded = expandedResponseModules[moduleId];
                          const totalResponses = responses.reduce((sum, r) => sum + Object.keys(r.answers || {}).filter(k => {
                            const v = r.answers[k];
                            return typeof v === 'string' && v.trim().length > 0;
                          }).length, 0);
                          const completedModules = clientInsights.moduleProgress?.filter(p => p.completed && p.module_id === moduleId);
                          const isCompleted = completedModules && completedModules.length > 0;
                          const clientWound = clientInsights.assessment?.primary_wound || client?.primaryWound || 'abandonment';

                          return (
                            <div key={moduleId} className={`rounded-lg border ${cardBorder} overflow-hidden`}>
                              <button
                                onClick={() => setExpandedResponseModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))}
                                className={`w-full flex items-center justify-between p-3 ${hoverBg} transition-colors`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                  <span className={`text-sm font-medium ${textPrimary} truncate`}>{moduleName}</span>
                                  {isCompleted && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">Completed</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`text-xs ${textMuted}`}>{totalResponses} response{totalResponses !== 1 ? 's' : ''}</span>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </button>
                              {isExpanded && (
                                <div className={`p-3 pt-0 space-y-3`}>
                                  {totalResponses === 0 ? (
                                    <p className={`text-sm ${textMuted} text-center py-3`}>No responses yet</p>
                                  ) : (
                                    responses.map((resp, ri) =>
                                      Object.entries(resp.answers || {})
                                        .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
                                        .map(([key, value], qi) => {
                                          const questionText = mapResponseKey(key, moduleData, clientWound);
                                          const badge = getResponseBadge(key);
                                          return (
                                            <div key={`${ri}-${qi}`} className={`p-3 rounded-lg border ${cardBorder} ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                                              <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                                              </div>
                                              <p className={`text-sm ${textMuted} mb-1.5`}>{questionText}</p>
                                              <p className={`text-sm ${textPrimary} leading-relaxed`}>"{value}"</p>
                                            </div>
                                          );
                                        })
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {clientInsights.activityProgress.length > 0 && (
                  <div className={`${cardBg} rounded-2xl border ${glowStyles.emerald} p-5`}>
                    <h3 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2 tracking-tight`}>
                      <Activity className="w-5 h-5 text-emerald-500" />
                      Therapy Activity Progress
                    </h3>
                    <div className="space-y-3">
                      {clientInsights.activityProgress.map((act, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${cardBorder} ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                          {act.completed ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${textPrimary}`}>{act.activity_id}</p>
                            <p className={`text-xs ${textMuted}`}>{act.completed ? 'Completed' : 'In Progress'}</p>
                          </div>
                          {act.reflections && Object.keys(act.reflections).length > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Has reflections</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(() => {
                  const recs = generateSmartRecommendations(client, clientInsights, clientGam);
                  if (recs.length === 0) return null;
                  const iconMap = {
                    BookOpen: BookOpen, FileText: FileText, Heart: Heart, AlertTriangle: AlertTriangle,
                    RefreshCw: RefreshCw, Zap: Zap, Shield: Shield, Clock: Clock, Flame: Flame,
                    Trophy: Trophy, Target: Target
                  };
                  const priorityStyles = {
                    high: { bg: isDark ? 'bg-red-900/20' : 'bg-red-50', border: isDark ? 'border-red-800/50' : 'border-red-200', badge: 'bg-red-100 text-red-700', label: 'High' },
                    medium: { bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50', border: isDark ? 'border-amber-800/50' : 'border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'Medium' },
                    low: { bg: isDark ? 'bg-green-900/20' : 'bg-green-50', border: isDark ? 'border-green-800/50' : 'border-green-200', badge: 'bg-green-100 text-green-700', label: 'Low' }
                  };
                  return (
                    <div className={`${cardBg} rounded-2xl border ${glowStyles.blue} p-5`}>
                      <h3 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2 tracking-tight`}>
                        <Sparkles className="w-5 h-5 text-blue-500" />
                        Smart Recommendations
                      </h3>
                      <p className={`text-sm ${textSecondary} mb-4`}>
                        Personalized next-step suggestions for {client?.name} based on their data:
                      </p>
                      <div className="space-y-3">
                        {recs.map((rec, i) => {
                          const RIcon = iconMap[rec.icon] || Lightbulb;
                          const pStyle = priorityStyles[rec.priority] || priorityStyles.medium;
                          return (
                            <div key={i} className={`p-4 rounded-xl border ${pStyle.border} ${pStyle.bg} transition-all hover:shadow-sm`}>
                              <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  rec.priority === 'high' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                                  rec.priority === 'low' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                                  'bg-gradient-to-br from-brand-gold-600 to-brand-emerald-700'
                                }`}>
                                  <RIcon className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className={`text-sm font-semibold ${textPrimary}`}>{rec.title}</p>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${pStyle.badge}`}>{pStyle.label}</span>
                                  </div>
                                  <p className={`text-xs ${textSecondary} leading-relaxed`}>{rec.desc}</p>
                                  {rec.action && (
                                    <p className={`text-xs font-medium mt-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                      → {rec.action}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className={`${cardBg} rounded-2xl border ${glowStyles.amber} p-5`}>
                  <h3 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2 tracking-tight`}>
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    Session Prep
                  </h3>
                  <p className={`text-sm ${textSecondary} mb-4`}>
                    Suggested talking points for your next session with {client?.name}:
                  </p>
                  <ul className="space-y-2.5">
                    {clientInsights.sessionPrep.map((point, i) => (
                      <li key={i} className={`flex items-start gap-3 text-sm ${textSecondary}`}>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-gold-600 to-brand-emerald-700 flex items-center justify-center text-white text-xs font-medium flex-shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={`${cardBg} rounded-2xl border ${glowStyles.emerald} p-5`}>
                  <h3 className={`text-lg font-bold ${textPrimary} mb-4 flex items-center gap-2 tracking-tight`}>
                    <FileText className="w-5 h-5 text-emerald-500" />
                    Advisor Feedback
                  </h3>
                  <p className={`text-sm ${textSecondary} mb-3`}>
                    Write your feedback or comments on {client?.name}'s responses:
                  </p>
                  <textarea
                    value={therapistFeedback[selectedInsightClient] || ''}
                    onChange={(e) => handleFeedbackChange(selectedInsightClient, e.target.value)}
                    rows={5}
                    placeholder={`Add your notes and feedback for ${client?.name}...`}
                    className={`w-full px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none resize-none`}
                  />
                  <p className={`text-xs ${textMuted} mt-2 flex items-center gap-1`}>
                    <CheckCircle className="w-3 h-3" />
                    Feedback is automatically saved
                  </p>
                </div>

                {clientInsights.timeline && clientInsights.timeline.length > 0 && (() => {
                  const filterTypes = [
                    { id: 'all', label: 'All', icon: List },
                    { id: 'module', label: 'Modules', icon: BookOpen },
                    { id: 'journal', label: 'Journals', icon: PenTool },
                    { id: 'assessment', label: 'Assessments', icon: ClipboardCheck },
                    { id: 'mood', label: 'Moods', icon: Smile },
                    { id: 'homework', label: 'Homework', icon: ClipboardCheck },
                    { id: 'checkin', label: 'Check-Ins', icon: CheckCircle }
                  ];
                  const filtered = timelineFilter === 'all'
                    ? clientInsights.timeline
                    : clientInsights.timeline.filter(e => e.type === timelineFilter);

                  const formatTimelineDate = (ts) => {
                    if (!ts) return '';
                    const d = new Date(ts);
                    const now = new Date();
                    const diffMs = now - d;
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    if (diffDays === 0) {
                      return 'Today at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    }
                    if (diffDays === 1) return 'Yesterday';
                    if (diffDays < 7) return `${diffDays} days ago`;
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
                  };

                  const timelineIconMap = {
                    module: BookOpen,
                    journal: PenTool,
                    assessment: ClipboardCheck,
                    mood: Smile,
                    homework: ClipboardCheck,
                    checkin: CheckCircle,
                  };

                  const timelineColorMap = {
                    blue: { icon: 'text-brand-stone-500', bg: isDark ? 'bg-slate-800/60' : 'bg-brand-stone-100' },
                    amber: { icon: 'text-amber-500', bg: isDark ? 'bg-amber-900/30' : 'bg-amber-50' },
                    emerald: { icon: 'text-emerald-500', bg: isDark ? 'bg-emerald-900/30' : 'bg-emerald-50' },
                    orange: { icon: 'text-orange-500', bg: isDark ? 'bg-orange-900/30' : 'bg-orange-50' },
                    red: { icon: 'text-red-500', bg: isDark ? 'bg-red-900/30' : 'bg-red-50' },
                    yellow: { icon: 'text-yellow-500', bg: isDark ? 'bg-yellow-900/30' : 'bg-yellow-50' },
                  };

                  return (
                    <div className={`${cardBg} rounded-2xl border ${glowStyles.blue} p-5`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-bold ${textPrimary} flex items-center gap-2 tracking-tight`}>
                          <List className="w-5 h-5 text-brand-stone-500" />
                          Activity Timeline
                          <span className={`text-xs font-normal ${textMuted} ml-1`}>({filtered.length})</span>
                        </h3>
                      </div>
                      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                        {filterTypes.map(ft => {
                          const FIcon = ft.icon;
                          const count = ft.id === 'all' ? clientInsights.timeline.length : clientInsights.timeline.filter(e => e.type === ft.id).length;
                          if (ft.id !== 'all' && count === 0) return null;
                          return (
                            <button
                              key={ft.id}
                              onClick={() => setTimelineFilter(ft.id)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                                timelineFilter === ft.id
                                  ? 'bg-blue-500 text-white shadow-sm'
                                  : `${isDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                              }`}
                            >
                              <FIcon className="w-3 h-3" />
                              {ft.label}
                              <span className={`text-[10px] ${timelineFilter === ft.id ? 'text-blue-100' : textMuted}`}>({count})</span>
                            </button>
                          );
                        })}
                      </div>
                      {filtered.length === 0 ? (
                        <div className="text-center py-6">
                          <List className={`w-8 h-8 mx-auto mb-2 ${textMuted}`} />
                          <p className={`text-sm ${textSecondary}`}>No events match this filter</p>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className={`absolute left-5 top-0 bottom-0 w-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                          <div className="space-y-0">
                            {filtered.slice(0, 50).map((event) => {
                              const EIcon = event.isResponse ? MessageSquare : (timelineIconMap[event.type] || Activity);
                              const colors = timelineColorMap[event.colorKey] || timelineColorMap.blue;
                              return (
                                <div key={event.id} className="relative flex items-start gap-3 pl-1 py-2.5">
                                  <div className={`relative z-10 w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0 border ${cardBorder}`}>
                                    <EIcon className={`w-4 h-4 ${colors.icon}`} />
                                  </div>
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className={`text-sm font-semibold ${textPrimary}`}>{event.title}</p>
                                      <span className={`text-xs ${textMuted} whitespace-nowrap flex-shrink-0`}>{formatTimelineDate(event.timestamp)}</span>
                                    </div>
                                    {event.description && (
                                      <p className={`text-xs ${textSecondary} mt-0.5 leading-relaxed`}>{event.description}</p>
                                    )}
                                    {event.meta && (
                                      <p className={`text-[10px] ${textMuted} mt-0.5 italic`}>{event.meta}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {filtered.length > 50 && (
                            <p className={`text-xs ${textMuted} text-center mt-3`}>Showing 50 of {filtered.length} events</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'co-therapy' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-rose-600 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${textPrimary}`}>Co-Therapy Sessions</h2>
              <p className={`text-sm ${textSecondary}`}>Guide therapy activities together with your client in real time</p>
            </div>
          </div>

          <div className={`${cardBg} rounded-xl border ${cardBorder} p-6 mb-6`}>
            <p className={`text-sm ${textSecondary} mb-4`}>
              Select a client and launch a guided therapy activity. You'll walk through each step together, with space for your clinical notes and observations at every stage.
            </p>
            <div className="mb-4">
              <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Select Client</label>
              <select
                className={`w-full sm:w-80 px-3 py-2.5 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none`}
                defaultValue=""
                id="co-therapy-client-select"
              >
                <option value="">Choose a client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Link
              to="/co-therapy"
              onClick={(e) => {
                const select = document.getElementById('co-therapy-client-select');
                const clientId = select?.value;
                if (clientId) {
                  sessionStorage.setItem('co_therapy_client_id', clientId);
                  const client = clients.find(c => c.id === clientId);
                  if (client) sessionStorage.setItem('co_therapy_client_name', client.name);
                } else {
                  e.preventDefault();
                  alert('Please select a client first');
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-rose-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-rose-700 transition-all shadow-md"
            >
              <Play className="w-4 h-4" />
              Launch Co-Therapy Session
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Guided Parts Dialogue', desc: 'Advisor-led conversation with internal parts', duration: '20-30 min', category: 'in-session' },
              { title: 'Protector Negotiation', desc: 'Help protective parts feel safe for deeper work', duration: '25-35 min', category: 'in-session' },
              { title: 'Unburdening Ceremony', desc: 'Sacred step-by-step guide for burden release', duration: '30-45 min', category: 'in-session' },
              { title: 'Inner Child Rescue', desc: 'Find, comfort, and retrieve wounded exile parts', duration: '25-40 min', category: 'in-session' },
              { title: 'Parts Council Meeting', desc: 'Facilitate communication between multiple parts', duration: '30-45 min', category: 'in-session' },
              { title: 'Somatic Parts Work', desc: 'Use body sensations to discover and heal parts', duration: '20-30 min', category: 'in-session' },
              { title: 'Attachment Repair', desc: 'Reparent exile parts and repair attachment wounds', duration: '30-40 min', category: 'in-session' },
              { title: 'Self-Energy Cultivation', desc: 'Strengthen the compassionate core of Self', duration: '15-20 min', category: 'in-session' },
              { title: 'Trailhead Exploration', desc: 'Use real-life triggers to discover healing paths', duration: '20-30 min', category: 'in-session' }
            ].map((activity, i) => (
              <div key={i} className={`${cardBg} rounded-xl border ${cardBorder} p-4 transition-all hover:shadow-md`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-rose-600 flex items-center justify-center text-white flex-shrink-0">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium ${textPrimary} text-sm`}>{activity.title}</h4>
                    <p className={`text-xs ${textMuted} mt-1`}>{activity.desc}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs ${textMuted} flex items-center gap-1`}>
                        <Clock className="w-3 h-3" />
                        {activity.duration}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{activity.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'roadmap' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-stone-600 flex items-center justify-center">
              <Gem className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${textPrimary}`}>Future Features Roadmap</h2>
              <p className={`text-sm ${textSecondary}`}>Upcoming enhancements planned for the IFS therapy platform</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Parts Relationship Mapping', desc: 'Interactive visual SVG map showing how a client\'s protectors, managers, firefighters, and exiles relate to each other — including alliances, conflicts, and polarizations between parts. Navigate to Parts Studio to use.', icon: Users, color: 'from-blue-500 to-cyan-600', status: 'Live' },
              { title: 'Guided Unburdening Protocol', desc: '8-step digital unburdening ceremony with guided prompts, visualization, and burden release tracking. Includes post-unburdening integration exercises. Available under Therapy Integration.', icon: Heart, color: 'from-rose-500 to-emerald-600', status: 'Live' },
              { title: 'Assessment Builder', desc: 'Create custom assessments tailored to your practice — define questions, scoring, and wound mappings. Generate shareable client links. Available under Quick Actions.', icon: Target, color: 'from-sky-500 to-blue-600', status: 'Live' },
              { title: 'Parts Dialogue Voice Mode', desc: 'Voice-guided parts dialogue where clients speak to their parts using speech recognition, with AI facilitating the conversation and text-to-speech responses. Available under Parts Dialogue.', icon: MessageCircle, color: 'from-teal-500 to-emerald-600', status: 'Live' },
              { title: 'AI-Powered Session Summaries', desc: 'Automatically generate structured session summaries from advisor notes using AI, with key themes, parts identified, progress markers, and suggested homework — saving advisors 15+ minutes per session.', icon: Sparkles, color: 'from-amber-500 to-stone-600', status: 'In Development' },
              { title: 'Mood & Parts Pattern Analytics', desc: 'Advanced analytics dashboard showing correlations between mood entries, active parts, triggers, and healing progress over time — with trend detection and early warning alerts.', icon: TrendingUp, color: 'from-emerald-500 to-teal-600', status: 'Live', link: '/mood-analytics' },
              { title: 'Client Self-Check-In Between Sessions', desc: 'Daily micro check-ins where clients rate their parts activity, Self-energy level, and emotional state — with automatic alerts to advisor if concerning patterns emerge.', icon: Activity, color: 'from-amber-500 to-yellow-600', status: 'Live', link: '/daily-checkin' },
              { title: 'Secure Video Session Integration', desc: 'Built-in HIPAA-compliant video sessions with real-time parts tracking sidebar, live session notes, and automatic recording transcription for review.', icon: Play, color: 'from-red-500 to-orange-600', status: 'Researching' },
              { title: 'Group Therapy Module', desc: 'Support for IFS-informed group therapy with shared exercises, group parts mapping, anonymous reflection sharing, and facilitator controls for managing group dynamics.', icon: Users, color: 'from-brand-gold-600 to-brand-emerald-700', status: 'Researching' },
              { title: 'Multi-Advisor Practice Management', desc: 'Support for therapy practices with multiple advisors — shared client handoffs, supervisor oversight, cross-advisor analytics, billing integration, and team coordination tools.', icon: Crown, color: 'brightness-105', status: 'Planned' }
            ].map((feature, idx) => {
              const FIcon = feature.icon;
              const statusColors = {
                'Live': isDark ? 'bg-amber-900/40 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-700 border-amber-200',
                'In Development': isDark ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-700 border-emerald-200',
                'Planned': isDark ? 'bg-blue-900/40 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-700 border-blue-200',
                'Researching': isDark ? 'bg-amber-900/40 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-700 border-amber-200'
              };
              return (
                <div key={idx} className={`${cardBg} rounded-xl border ${cardBorder} p-5 transition-all hover:border-amber-300/50`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                      <FIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className={`font-bold ${textPrimary}`}>{feature.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusColors[feature.status]}`}>
                          {feature.status}
                        </span>
                      </div>
                      <p className={`text-sm ${textSecondary} leading-relaxed`}>{feature.desc}</p>
                    </div>
                    <span className={`text-xs font-bold ${textMuted} flex-shrink-0`}>#{idx + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {deletingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-md w-full p-8`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-red-600">Delete Client</h2>
              <button onClick={() => { setDeletingClient(null); setDeleteConfirmText(''); }} className={`${textMuted} hover:${textPrimary} transition-colors`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-red-400' : 'text-red-700'}`}>This action is permanent and cannot be undone.</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-red-300/80' : 'text-red-600/80'}`}>
                      All data for <strong>{deletingClient.name}</strong> will be permanently deleted, including assessments, progress, journal entries, parts, messages, homework, and curriculum.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className={`w-full px-4 py-3 rounded-lg border ${inputBg} focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none`}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setDeletingClient(null); setDeleteConfirmText(''); }}
                  className={`flex-1 px-6 py-3 ${isDark ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} rounded-lg font-semibold transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteClient}
                  disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserX className="w-4 h-4 mr-2" /> Delete Permanently</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-md w-full p-8`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${textPrimary}`}>Edit Client</h2>
              <button onClick={() => setEditingClient(null)} className={`${textMuted} hover:${textPrimary} transition-colors`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={editClientForm.name}
                  onChange={(e) => setEditClientForm(f => ({ ...f, name: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Email Address</label>
                <input
                  type="email"
                  value={editClientForm.email}
                  onChange={(e) => setEditClientForm(f => ({ ...f, email: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Phone Number</label>
                <input
                  type="tel"
                  value={editClientForm.phone}
                  onChange={(e) => setEditClientForm(f => ({ ...f, phone: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none`}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                <div>
                  <p className={`text-sm font-medium ${textPrimary}`}>PIN</p>
                  <p className="font-mono text-lg font-bold tracking-widest text-amber-600">{editingClient.pin}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(editingClient.pin)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy PIN
                </button>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className={`flex-1 px-6 py-3 ${isDark ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} rounded-lg font-semibold transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditClientSave}
                  disabled={editClientSaving || !editClientForm.name.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-amber-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                >
                  {editClientSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {accessControlClient && accessControlForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto`}>
            <div className="sticky top-0 z-10 p-6 pb-4 border-b border-gray-200 dark:border-slate-600" style={{ backgroundColor: isDark ? '#1e293b' : '#fff' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
                    <Shield className="w-5 h-5 text-stone-500" />
                    Access Controls
                  </h2>
                  <p className={`text-sm ${textMuted} mt-1`}>{accessControlClient.name}</p>
                </div>
                <button onClick={() => { setAccessControlClient(null); setAccessControlForm(null); }} className={`${textMuted} hover:${textPrimary} transition-colors`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-4 p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                <div>
                  <p className={`text-sm font-semibold ${textPrimary}`}>Full Access</p>
                  <p className={`text-xs ${textMuted}`}>{accessControlFullAccess ? 'Client can access all content' : 'Custom restrictions applied'}</p>
                </div>
                <button
                  onClick={() => {
                    const next = !accessControlFullAccess;
                    setAccessControlFullAccess(next);
                    if (next) setAccessControlForm({ ...DEFAULT_ACCESS_FORM });
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${accessControlFullAccess ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${accessControlFullAccess ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            {!accessControlFullAccess && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    Modules ({accessControlForm.modules.length}/{MODULE_SEQUENCE.length})
                  </h3>
                  <div className="space-y-1.5">
                    {MODULE_SEQUENCE.map(m => (
                      <label key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${hoverBg} transition-colors`}>
                        <input
                          type="checkbox"
                          checked={accessControlForm.modules.includes(m.id)}
                          onChange={() => toggleAccessModule(m.id)}
                          className="w-4 h-4 rounded border-gray-300 text-stone-600 focus:ring-stone-500"
                        />
                        <span className={`text-sm ${textSecondary}`}>
                          <span className={`font-medium ${textPrimary}`}>Module {m.order}:</span> {m.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                    <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                    Assessments ({accessControlForm.assessments.length}/4)
                  </h3>
                  <div className="space-y-1.5">
                    {Object.entries(ASSESSMENT_LABELS).map(([key, label]) => (
                      <label key={key} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${hoverBg} transition-colors`}>
                        <input
                          type="checkbox"
                          checked={accessControlForm.assessments.includes(key)}
                          onChange={() => toggleAccessAssessment(key)}
                          className="w-4 h-4 rounded border-gray-300 text-stone-600 focus:ring-stone-500"
                        />
                        <span className={`text-sm ${textSecondary}`}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
                    <Zap className="w-4 h-4 text-amber-500" />
                    Features ({Object.values(accessControlForm.features).filter(Boolean).length}/14)
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                      <label key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${hoverBg} transition-colors`}>
                        <input
                          type="checkbox"
                          checked={accessControlForm.features[key]}
                          onChange={() => toggleAccessFeature(key)}
                          className="w-4 h-4 rounded border-gray-300 text-stone-600 focus:ring-stone-500"
                        />
                        <span className={`text-xs ${textSecondary}`}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="sticky bottom-0 p-6 pt-4 border-t border-gray-200 dark:border-slate-600" style={{ backgroundColor: isDark ? '#1e293b' : '#fff' }}>
              <div className="flex gap-3">
                <button
                  onClick={() => { setAccessControlClient(null); setAccessControlForm(null); }}
                  className={`flex-1 px-6 py-3 ${isDark ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} rounded-lg font-semibold transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccessControlSave}
                  disabled={accessControlSaving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-stone-600 to-amber-600 text-white rounded-lg font-semibold hover:from-stone-700 hover:to-amber-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                >
                  {accessControlSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Access Controls</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {emailClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className="sticky top-0 z-10 p-6 pb-4 border-b border-gray-200 dark:border-slate-600" style={{ backgroundColor: isDark ? '#1e293b' : '#fff' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
                    <Mail className="w-5 h-5 text-blue-500" />
                    Send Email
                  </h2>
                  <p className={`text-sm ${textMuted} mt-1`}>To: {emailClient.name} {emailClient.email ? `(${emailClient.email})` : ''}</p>
                </div>
                <button onClick={() => { setEmailClient(null); setEmailError(''); setEmailSent(false); setEmailPreviewHtml(''); }} className={`${textMuted} hover:${textPrimary} transition-colors`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {!emailClient.email ? (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border`}>
                  <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                    This client does not have an email address. Please edit the client profile to add one before sending emails.
                  </p>
                  <button
                    onClick={() => {
                      setEmailClient(null);
                      setEditingClient(emailClient);
                      setEditClientForm({ name: emailClient.name, email: emailClient.email || '', phone: emailClient.phone || '' });
                    }}
                    className="mt-3 px-4 py-2 bg-gradient-to-r from-amber-600 to-stone-600 text-white rounded-lg text-sm font-medium hover:from-amber-700 hover:to-stone-700"
                  >
                    <Edit2 className="w-3.5 h-3.5 inline mr-1.5" />
                    Edit Client
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className={`block text-sm font-medium ${textSecondary} mb-1.5`}>Email Template</label>
                    <select
                      value={emailTemplateId}
                      onChange={(e) => handleEmailTemplateChange(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    >
                      {getAvailableTemplates().map(t => (
                        <option key={t.id} value={t.id}>{t.label} — {t.description}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondary} mb-1.5`}>Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>

                  {emailLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  ) : emailPreviewHtml ? (
                    <div>
                      <label className={`block text-sm font-medium ${textSecondary} mb-1.5`}>Preview</label>
                      <div className={`border ${isDark ? 'border-slate-600' : 'border-gray-200'} rounded-lg overflow-hidden`}>
                        <iframe
                          srcDoc={emailPreviewHtml}
                          title="Email Preview"
                          className="w-full bg-white"
                          style={{ height: '360px', border: 'none' }}
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </div>
                  ) : null}

                  {emailError && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'} text-sm`}>
                      {emailError}
                    </div>
                  )}

                  {emailSent && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/20 text-green-300' : 'bg-green-50 text-green-700'} text-sm flex items-center gap-2`}>
                      <CheckCircle className="w-4 h-4" />
                      Email sent successfully to {emailClient.email}
                    </div>
                  )}
                </>
              )}
            </div>

            {emailClient.email && (
              <div className="sticky bottom-0 p-6 pt-4 border-t border-gray-200 dark:border-slate-600" style={{ backgroundColor: isDark ? '#1e293b' : '#fff' }}>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setEmailClient(null); setEmailError(''); setEmailSent(false); setEmailPreviewHtml(''); }}
                    className={`flex-1 px-6 py-3 ${isDark ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} rounded-lg font-semibold transition-colors`}
                  >
                    {emailSent ? 'Close' : 'Cancel'}
                  </button>
                  {!emailSent && (
                    <button
                      onClick={handleSendEmail}
                      disabled={emailSending || !emailPreviewHtml || !emailSubject || emailLoading}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-stone-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-stone-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                    >
                      {emailSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Mail className="w-4 h-4 mr-2" /> Send Email</>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapistDashboard;
