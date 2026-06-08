import { Link } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarCheck,
  ClipboardCheck,
  Compass,
  FileText,
  HeartPulse,
  Headphones,
  Library,
  Lock,
  Mail,
  Map,
  MessageSquare,
  PenLine,
  ScrollText,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Video,
  Wand2,
} from 'lucide-react';
import { canAccessFeature } from '../lib/accessControl';
import { clientAuth } from '../lib/supabasePersonalization';

const selfWorkRoles = ['client', 'therapist', 'advisor', 'admin', 'supervisor'];
const clientRoles = selfWorkRoles;
const advisorRoles = ['therapist', 'advisor', 'admin', 'supervisor'];
const adminRoles = ['admin', 'supervisor'];

const sections = [
  {
    title: 'Core IFS Path',
    description: 'Start with Curriculum / IFS Path, then use assessments and progress views to support the journey.',
    items: [
      { label: 'Curriculum / IFS Path', description: 'Follow the main guided path through IFS, then use reflections and tools to support what you are learning.', to: '/curriculum', icon: BookOpen, roles: ['client', 'therapist', 'advisor', 'admin', 'supervisor'] },
      { label: 'Interactive Assessments', description: 'Wound Patterns, Parts System, Self-Energy, and Attachment Pattern reflections.', to: '/assessments', icon: Brain, roles: ['client', 'therapist', 'advisor', 'admin', 'supervisor'] },
      { label: 'My IFS Work', description: 'Your personal self-work home for curriculum, parts, and reflections.', to: '/my-ifs', icon: Sparkles, roles: ['client', 'therapist', 'advisor', 'admin', 'supervisor'] },
      { label: 'My Assessments & Progress', description: 'Review assessment insights and progress summaries.', to: '/profile', icon: ClipboardCheck, roles: ['client', 'therapist', 'advisor', 'admin', 'supervisor'] },
      { label: 'Progress Timeline', description: 'See curriculum and practice progress over time.', to: '/progress-timeline', icon: Trophy, roles: ['client', 'therapist', 'advisor', 'admin', 'supervisor'] },
    ],
  },
  {
    title: 'Daily Practice',
    description: 'Short IFS practices for grounding, noticing, and daily self-guidance.',
    items: [
      { label: 'Daily Check-In', to: '/daily-checkin', icon: CalendarCheck, roles: clientRoles, feature: 'dailyCheckin' },
      { label: 'IFS in Daily Life', description: 'Practice IFS in daily life. Saved reflections appear across your IFS path.', to: '/life-integration', icon: Sparkles, roles: clientRoles },
      { label: 'Notice a Part in the Moment', description: 'Pause and identify which part is showing up right now.', to: '/life-integration/notice-part', icon: Sparkles, roles: clientRoles },
      { label: 'Return to Self-Energy', description: 'Unblend gently and reconnect with a Self-energy quality.', to: '/life-integration/return-to-self', icon: Wand2, roles: clientRoles },
      { label: 'Reflect on a Trigger', description: 'Explore which parts reacted and what they may need.', to: '/life-integration/trigger-reflection', icon: PenLine, roles: clientRoles },
      { label: 'Repair After Conflict', description: 'Move toward repair, a boundary, or clearer communication from Self-energy.', to: '/life-integration/repair-after-conflict', icon: HeartPulse, roles: clientRoles },
      { label: 'Protector Check-In', description: 'Appreciate a protector and ask what it needs today.', to: '/life-integration/protector-check-in', icon: Shield, roles: clientRoles },
      { label: 'Needs & Boundaries Reflection', description: 'Listen for the need or boundary a part is trying to express.', to: '/life-integration/needs-boundaries', icon: ScrollText, roles: clientRoles },
      { label: 'Guided Meditation & Practice Library', description: 'Open the full library of quick practices, meditation cards, breathing exercises, and in-app fallbacks.', to: '/meditation', icon: HeartPulse, roles: clientRoles, feature: 'meditations' },
      { label: 'Self-Energy Practice', to: '/qualities', icon: Wand2, roles: clientRoles },
      { label: 'Affirmations', to: '/affirmations', icon: Sparkles, roles: clientRoles },
      { label: 'Micro-Learning', to: '/micro-learning', icon: BookOpen, roles: clientRoles },
      { label: 'Mood Tracker', to: '/mood-tracker', icon: HeartPulse, roles: clientRoles },
    ],
  },
  {
    title: 'Parts Work',
    description: 'Map, listen to, and build relationship with parts of your inner system.',
    items: [
      { label: 'Parts Map', to: '/parts-mapping', icon: Compass, roles: clientRoles },
      { label: 'Inner System Map', description: 'Place parts and relationships around Self-energy.', to: '/parts-relationships', icon: Map, roles: clientRoles },
      { label: 'Parts Dialogue', to: '/parts-dialogue', icon: MessageSquare, roles: clientRoles, feature: 'partsDialogue' },
      { label: 'Parts Cards', to: '/parts-cards', icon: ScrollText, roles: clientRoles, feature: 'partsCards' },
      { label: 'Parts Studio', to: '/parts-studio', icon: Sparkles, roles: clientRoles, feature: 'partsStudio' },
      { label: 'Unburdening Practice', to: '/unburdening', icon: HeartPulse, roles: clientRoles, feature: 'unburdening' },
    ],
  },
  {
    title: 'Reflection & Journaling',
    description: 'Reflective places to write, notice patterns, and honor milestones with Advisor-visible support where appropriate.',
    items: [
      { label: 'Journal', to: '/journal', icon: PenLine, roles: clientRoles, feature: 'journal' },
      { label: 'Letters', to: '/letters', icon: Mail, roles: clientRoles, feature: 'letters' },
      { label: 'Weekly Reflection', to: '/weekly-reflection', icon: CalendarCheck, roles: clientRoles, feature: 'weeklyReflection' },
      { label: 'Healing Tracker', to: '/healing-tracker', icon: HeartPulse, roles: clientRoles, feature: 'healingTracker' },
      { label: 'Milestones', to: '/milestones', icon: Trophy, roles: clientRoles, feature: 'milestones' },
    ],
  },
  {
    title: 'Advisor Support',
    description: 'Advisor-guided practices, session preparation, messages, and live support.',
    items: [
      { label: 'Assigned IFS Practices', to: '/assigned-practices', icon: BookOpen, roles: clientRoles },
      { label: 'Advisor Session Check-In', to: '/pre-session-checkin', icon: CalendarCheck, roles: clientRoles },
      { label: 'Inbox / Messages', to: '/inbox', icon: MessageSquare, roles: clientRoles },
      { label: 'Live Guided Practice', to: '/live-session', icon: Video, roles: clientRoles },
      { label: 'Notifications', to: '/notifications', icon: Bell, roles: clientRoles },
    ],
  },
  {
    title: 'Progress & Analytics',
    description: 'Review healing milestones, mood patterns, and achievements.',
    items: [
      { label: 'Healing Timeline', to: '/healing-timeline', icon: Trophy, roles: clientRoles },
      { label: 'Progress Timeline', to: '/progress-timeline', icon: BarChart3, roles: clientRoles },
      { label: 'Mood Analytics', to: '/mood-analytics', icon: HeartPulse, roles: clientRoles, feature: 'moodAnalytics' },
      { label: 'Gamification / Achievements', to: '/gamification', icon: Trophy, roles: clientRoles },
      { label: 'Milestones', to: '/milestones', icon: CalendarCheck, roles: clientRoles, feature: 'milestones' },
    ],
  },
  {
    title: 'Advanced / Optional Tools',
    description: 'Helpful reference and optional practice spaces that support the main IFS Path.',
    items: [
      { label: 'Resource Library', to: '/resource-library', icon: Library, roles: clientRoles, feature: 'resourceLibrary' },
      { label: 'Resources', to: '/resources', icon: Library, roles: clientRoles },
      { label: 'IFS Cheat Sheet', to: '/cheat-sheet', icon: FileText, roles: clientRoles },
      { label: 'Micro-Learning', to: '/micro-learning', icon: BookOpen, roles: clientRoles },
      { label: 'Healing Tracker', to: '/healing-tracker', icon: HeartPulse, roles: clientRoles, feature: 'healingTracker' },
      { label: 'Letters', to: '/letters', icon: Mail, roles: clientRoles, feature: 'letters' },
    ],
  },
  {
    title: 'Admin / Advisor Tools',
    description: 'Workflow-based Advisor and Admin access for clients, curriculum, review, and reporting.',
    items: [
      { label: 'Advisor Dashboard', to: '/therapist', icon: ClipboardCheck, roles: advisorRoles },
      { label: 'Admin Hub', to: '/admin-hub', icon: Shield, roles: adminRoles },
      { label: 'Clients', to: '/therapist', icon: Users, roles: advisorRoles },
      { label: 'Caseload', to: '/caseload', icon: Users, roles: advisorRoles },
      { label: 'Curriculum & Assessments', to: '/curriculum', icon: BookOpen, roles: advisorRoles },
      { label: 'Assessment Generator', to: '/assessment-builder', icon: ClipboardCheck, roles: advisorRoles },
      { label: 'Practice Generator', to: '/advisor-homework', icon: Sparkles, roles: advisorRoles },
      { label: 'Meditation Media Library', to: '/admin/meditation-media', icon: Headphones, roles: advisorRoles },
      { label: 'Review Queue', to: '/advisor-homework', icon: CalendarCheck, roles: advisorRoles },
      { label: 'Growth Goals', to: '/treatment-plans', icon: Trophy, roles: advisorRoles },
      { label: 'Advisor Notes', to: '/therapist', icon: PenLine, roles: advisorRoles },
      { label: 'Shared Reflections', to: '/advisor/shared-reflections', icon: ScrollText, roles: advisorRoles },
      { label: 'Messages', to: '/messages', icon: MessageSquare, roles: advisorRoles },
      { label: 'Reports', to: '/reports', icon: FileText, roles: advisorRoles },
      { label: 'Analytics', to: '/analytics', icon: BarChart3, roles: advisorRoles },
      { label: 'Longitudinal Insights', to: '/longitudinal-analytics', icon: BarChart3, roles: advisorRoles },
      { label: 'Live Practice', to: '/live-co-therapy', icon: Video, roles: advisorRoles },
    ],
  },
];

function isAllowedForRole(item, role) {
  return item.roles.includes(role);
}

function ToolCard({ item }) {
  const Icon = item.icon;
  const available = !item.feature || canAccessFeature(item.feature);
  const content = (
    <>
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${available ? 'bg-brand-gold-50 text-brand-gold-700 dark:bg-brand-gold-950/30 dark:text-brand-gold-500' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
        {available ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`font-semibold ${available ? 'text-brand-stone-900 dark:text-slate-100' : 'text-brand-stone-500 dark:text-slate-500'}`}>{item.label}</h3>
          {item.description && <p className="mt-1 text-xs leading-relaxed text-brand-stone-500 dark:text-slate-500">{item.description}</p>}
          {item.feature && !available && <p className="mt-1 text-xs text-brand-stone-500 dark:text-slate-500">Available when this practice is included with your account.</p>}
        </div>
      </div>
    </>
  );

  if (!available) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-5 dark:border-slate-700 dark:bg-slate-900/40" aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link to={item.to} className="rounded-3xl border border-brand-stone-200/70 bg-white/85 p-5 transition hover:-translate-y-0.5 hover:border-brand-gold-200 hover:shadow-lg dark:border-slate-800 dark:bg-brand-cardDark/90 dark:hover:border-brand-gold-900/50">
      {content}
    </Link>
  );
}

export default function ToolsDirectory({ currentClient }) {
  const currentUser = currentClient || clientAuth.getCurrentClient();
  const role = currentUser?.user_role || 'client';
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isAllowedForRole(item, role)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
      <header className="mb-8 rounded-[2rem] border border-brand-gold-100 bg-gradient-to-br from-white via-brand-sanctuary to-brand-gold-50/60 p-6 shadow-sm dark:border-brand-gold-900/40 dark:from-brand-cardDark dark:via-brand-midnight dark:to-brand-gold-950/20 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold-700 dark:text-brand-gold-500">Tools</p>
        <h1 className="mt-3 text-3xl font-serif font-semibold text-brand-stone-900 dark:text-slate-100 md:text-4xl">Tools & Practices</h1>
        <p className="mt-3 max-w-3xl text-brand-stone-600 dark:text-slate-300">Find the IFS tools, reflections, assessments, and support areas available to your account. Start with the Curriculum / IFS Path; these practices are here to support it.</p>
      </header>

      <div className="space-y-8">
        {visibleSections.map((section) => (
          <section key={section.title} aria-labelledby={`${section.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-heading`}>
            <div className="mb-4">
              <h2 id={`${section.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-heading`} className="text-2xl font-serif font-semibold text-brand-stone-900 dark:text-slate-100">{section.title}</h2>
              <p className="mt-1 text-sm text-brand-stone-600 dark:text-slate-400">{section.description}</p>
            </div>
            <div className={`grid gap-4 sm:grid-cols-2 ${section.title === 'Admin / Advisor Tools' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {section.items.map((item) => <ToolCard key={`${section.title}-${item.label}-${item.to}`} item={item} />)}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
