import {
  Heart,
  HeartPulse,
  Smile,
  Sun,
  Feather,
  ShieldCheck,
  MessageSquare,
  Compass,
  BookOpen,
  CalendarCheck,
  Brain,
  Play,
  Library,
  Layers,
  Sparkles,
  Trophy,
  ClipboardCheck
} from 'lucide-react';

export const DAILY_TILES = [
  {
    id: 'mood-tracker',
    to: '/mood-analytics',
    icon: HeartPulse,
    title: 'Mood & Daily Check-In',
    detail: 'Notice patterns in how you’ve been feeling.',
    image: '/images/dashboard/daily-mood.jpg'
  },
  {
    id: 'notice-a-part',
    to: '/life-integration/notice-part',
    icon: Smile,
    title: 'Notice a Part in the Moment',
    detail: 'Pause and name what’s showing up right now.',
    image: '/images/dashboard/daily-notice-part.jpg'
  },
  {
    id: 'return-to-self',
    to: '/life-integration/return-to-self',
    icon: Sun,
    title: 'Return to Self-Energy',
    detail: 'Reconnect with calm, curiosity, or compassion.',
    image: '/images/dashboard/daily-return-to-self.jpg'
  },
  {
    id: 'trigger-reflection',
    to: '/life-integration/trigger-reflection',
    icon: Feather,
    title: 'Reflect on a Trigger',
    detail: 'Explore what happened and what a part may need.',
    image: '/images/dashboard/daily-trigger-reflection.jpg'
  },
  {
    id: 'repair-after-conflict',
    to: '/life-integration/repair-after-conflict',
    icon: Heart,
    title: 'Repair After Conflict',
    detail: 'Understand activated parts and choose one honest repair.',
    image: '/images/dashboard/daily-repair-after-conflict.jpg'
  },
  {
    id: 'protector-check-in',
    to: '/life-integration/protector-check-in',
    icon: ShieldCheck,
    title: 'Protector Check-In',
    detail: 'Appreciate a protector and ask what it needs today.',
    image: '/images/dashboard/daily-protector-checkin.jpg'
  }
];

export const DEEP_WORK_TILES = [
  {
    id: 'parts-dialogue',
    to: '/parts-dialogue',
    icon: MessageSquare,
    title: 'Parts Dialogue',
    detail: 'A curious, compassionate conversation with a part.',
    image: '/images/dashboard/deep-parts-dialogue.jpg'
  },
  {
    id: 'inner-system-map',
    to: '/parts-relationships',
    icon: Compass,
    title: 'Inner System Map',
    detail: 'Map the parts you meet as the curriculum invites deeper work.',
    image: '/images/dashboard/deep-inner-system-map.jpg'
  },
  {
    id: 'healing-journal',
    to: '/journal',
    icon: BookOpen,
    title: 'Healing Journal',
    detail: 'Reflect on module prompts, needs, and insights.',
    image: '/images/dashboard/deep-healing-journal.jpg'
  },
  {
    id: 'weekly-reflection',
    to: '/weekly-reflection',
    icon: CalendarCheck,
    title: 'Weekly Reflection',
    detail: 'Look back gently at the week’s curriculum and practice.',
    image: '/images/dashboard/deep-weekly-reflection.jpg'
  },
  {
    id: 'wound-assessment',
    to: '/assessments',
    icon: Brain,
    title: 'Wound & Interactive Assessments',
    detail: 'Review the themes shaping your parts work.',
    image: '/images/dashboard/deep-wound-assessment.jpg'
  },
  {
    id: 'unburdening',
    to: '/unburdening',
    icon: Feather,
    title: 'Unburdening Practice',
    detail: 'For when your path invites deeper release work.',
    image: '/images/dashboard/deep-unburdening.jpg'
  }
];

export const TOOLS_TILES = [
  {
    id: 'guided-meditation',
    to: '/meditation',
    icon: Play,
    title: 'Guided Meditation',
    detail: 'Grounding and Self-energy audio practices.',
    image: '/images/dashboard/tools-meditation.jpg'
  },
  {
    id: 'resource-library',
    to: '/resource-library',
    icon: Library,
    title: 'Resource Library',
    detail: 'Learning supports that reinforce your modules.',
    image: '/images/dashboard/tools-resource-library.jpg'
  },
  {
    id: 'cheat-sheet',
    to: '/cheat-sheet',
    icon: Layers,
    title: 'IFS Cheat Sheet',
    detail: 'Keep core concepts close while you work.',
    image: '/images/dashboard/tools-cheat-sheet.jpg'
  },
  {
    id: 'affirmations',
    to: '/qualities',
    icon: Sparkles,
    title: 'Affirmations & Self-Energy',
    detail: 'Supportive qualities for your IFS path.',
    image: '/images/dashboard/tools-affirmations.jpg'
  },
  {
    id: 'healing-timeline',
    to: '/healing-timeline',
    icon: Trophy,
    title: 'Healing Timeline',
    detail: 'Notice milestones and growth without pressure.',
    image: '/images/dashboard/tools-healing-timeline.jpg'
  },
  {
    id: 'assessment-insights',
    to: '/profile',
    icon: ClipboardCheck,
    title: 'Assessment Insights',
    detail: 'Review the themes your assessments point to.',
    image: '/images/dashboard/tools-assessment-insights.jpg'
  }
];

export const FOCUS_CATEGORIES = [
  { key: 'daily', label: 'Daily', tiles: DAILY_TILES },
  { key: 'deep', label: 'Deep Work', tiles: DEEP_WORK_TILES },
  { key: 'tools', label: 'Tools', tiles: TOOLS_TILES }
];

export const HERO_IMAGE = '/images/dashboard/hero-sunrise.jpg';
export const CONTINUE_PATH_IMAGE = '/images/dashboard/continue-path.jpg';
