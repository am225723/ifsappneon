import {
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarCheck,
  ClipboardCheck,
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
import PageHero from '../components/PageHero';
import PhotoTile from '../components/PhotoTile';

const TOOLS_DIRECTORY_HERO_IMAGE = '/images/dashboard/tools-meditation.jpg';

const TOOL_IMAGES = {
  '/curriculum': '/images/tools/curriculum.jpg',
  '/assessments': '/images/tools/assessments.jpg',
  '/my-ifs': '/images/tools/my-ifs.jpg',
  '/profile': '/images/tools/profile.jpg',
  '/progress-timeline': '/images/tools/progress-timeline.jpg',
  '/daily-checkin': '/images/tools/daily-checkin.jpg',
  '/life-integration': '/images/tools/life-integration.jpg',
  '/life-integration/notice-part': '/images/tools/notice-part.jpg',
  '/life-integration/return-to-self': '/images/tools/return-to-self.jpg',
  '/life-integration/trigger-reflection': '/images/tools/trigger-reflection.jpg',
  '/life-integration/repair-after-conflict': '/images/tools/repair-after-conflict.jpg',
  '/life-integration/protector-check-in': '/images/tools/protector-check-in.jpg',
  '/life-integration/needs-boundaries': '/images/tools/needs-boundaries.jpg',
  '/meditation': '/images/tools/meditation-library.jpg',
  '/qualities': '/images/tools/self-energy-practice.jpg',
  '/affirmations': '/images/tools/affirmations.jpg',
  '/micro-learning': '/images/tools/micro-learning-hub.jpg',
  '/mood-tracker': '/images/tools/mood-tracker.jpg',
  '/parts-relationships': '/images/tools/parts-relationships.jpg',
  '/parts-dialogue': '/images/tools/parts-dialogue.jpg',
  '/parts-cards': '/images/tools/parts-cards.jpg',
  '/parts-studio': '/images/tools/parts-studio.jpg',
  '/unburdening': '/images/tools/unburdening.jpg',
  '/journal': '/images/tools/journal.jpg',
  '/letters': '/images/tools/letters.jpg',
  '/weekly-reflection': '/images/tools/weekly-reflection.jpg',
  '/healing-tracker': '/images/tools/healing-tracker.jpg',
  '/milestones': '/images/tools/milestones.jpg',
  '/assigned-practices': '/images/tools/assigned-practices.jpg',
  '/pre-session-checkin': '/images/tools/pre-session-checkin.jpg',
  '/inbox': '/images/tools/inbox.jpg',
  '/live-session': '/images/tools/live-session.jpg',
  '/notifications': '/images/tools/notifications.jpg',
  '/healing-timeline': '/images/tools/healing-timeline.jpg',
  '/mood-analytics': '/images/tools/mood-analytics.jpg',
  '/gamification': '/images/tools/gamification.jpg',
  '/resource-library': '/images/tools/resource-library-hub.jpg',
  '/resources': '/images/tools/resources-hub.jpg',
  '/cheat-sheet': '/images/tools/cheat-sheet.jpg',
  '/advisor-workspace': '/images/tools/advisor-workspace.jpg',
  '/admin-hub': '/images/tools/admin-hub.jpg',
  '/caseload': '/images/tools/caseload.jpg',
  '/assessment-builder': '/images/tools/assessment-builder.jpg',
  '/advisor-homework': '/images/tools/advisor-homework.jpg',
  '/admin/meditation-media': '/images/tools/meditation-media-library.jpg',
  '/treatment-plans': '/images/tools/treatment-plans.jpg',
  '/advisor/shared-reflections': '/images/tools/shared-reflections.jpg',
  '/messages': '/images/tools/messages.jpg',
  '/reports': '/images/tools/reports.jpg',
  '/analytics': '/images/tools/analytics.jpg',
  '/longitudinal-analytics': '/images/tools/longitudinal-analytics.jpg',
  '/live-co-therapy': '/images/tools/live-co-therapy.jpg',
};

const SECTION_TONES = {
  'Core IFS Path': 'daily',
  'Daily Practice': 'daily',
  'Parts Work': 'deep',
  'Reflection & Journaling': 'deep',
  'Advisor Support': 'advisor',
  'Progress & Analytics': 'tools',
  'Advanced / Optional Tools': 'tools',
  'Admin / Advisor Tools': 'advisor',
};

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
      { label: 'Advisor Dashboard', to: '/advisor-workspace', icon: ClipboardCheck, roles: advisorRoles },
      { label: 'Admin Hub', to: '/admin-hub', icon: Shield, roles: adminRoles },
      { label: 'Clients', to: '/advisor-workspace', icon: Users, roles: advisorRoles },
      { label: 'Caseload', to: '/caseload', icon: Users, roles: advisorRoles },
      { label: 'Curriculum & Assessments', to: '/curriculum', icon: BookOpen, roles: advisorRoles },
      { label: 'Assessment Generator', to: '/assessment-builder', icon: ClipboardCheck, roles: advisorRoles },
      { label: 'Practice Generator', to: '/advisor-homework', icon: Sparkles, roles: advisorRoles },
      { label: 'Meditation Media Library', to: '/admin/meditation-media', icon: Headphones, roles: advisorRoles },
      { label: 'Review Queue', to: '/advisor-homework', icon: CalendarCheck, roles: advisorRoles },
      { label: 'Growth Goals', to: '/treatment-plans', icon: Trophy, roles: advisorRoles },
      { label: 'Advisor Notes', to: '/advisor-workspace', icon: PenLine, roles: advisorRoles },
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

function ToolCard({ item, tone }) {
  const Icon = item.icon;
  const available = !item.feature || canAccessFeature(item.feature);
  const image = TOOL_IMAGES[item.to] || TOOLS_DIRECTORY_HERO_IMAGE;
  const detail = !available
    ? 'Available when this practice is included with your account.'
    : item.description;

  return (
    <PhotoTile
      to={available ? item.to : undefined}
      disabled={!available}
      aria-disabled={!available}
      tabIndex={available ? undefined : -1}
      image={image}
      icon={available ? Icon : Lock}
      title={item.label}
      detail={detail}
      tone={tone}
      className={available ? '' : 'grayscale opacity-60 pointer-events-none'}
    />
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
      <PageHero
        image={TOOLS_DIRECTORY_HERO_IMAGE}
        eyebrow="Tools"
        title="Tools & Practices"
        subtitle="Find the IFS tools, reflections, assessments, and support areas available to your account. Start with the Curriculum / IFS Path; these practices are here to support it."
      />

      <div className="space-y-8">
        {visibleSections.map((section) => (
          <section key={section.title} aria-labelledby={`${section.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-heading`}>
            <div className="mb-4">
              <h2 id={`${section.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-heading`} className="text-2xl font-serif font-semibold text-brand-stone-900 dark:text-slate-100">{section.title}</h2>
              <p className="mt-1 text-sm text-brand-stone-600 dark:text-slate-400">{section.description}</p>
            </div>
            <div className={`grid gap-4 sm:grid-cols-2 ${section.title === 'Admin / Advisor Tools' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {section.items.map((item) => (
                <ToolCard key={`${section.title}-${item.label}-${item.to}`} item={item} tone={SECTION_TONES[section.title]} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
