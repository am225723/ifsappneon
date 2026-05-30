import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, Circle, ArrowRight, ArrowLeft, RotateCcw, 
  Heart, Shield, Sparkles, AlertTriangle, Clock, TrendingUp,
  Award, Eye, Brain, Star, Flame, Users, Activity, Plus, MapPin,
  Play, Pause, Volume2, VolumeX, Lock
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useParts } from '../contexts/PartsContext';
import { useData } from '../contexts/DataContext';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';
import { aiCurriculumPersonalizer } from '../lib/aiCurriculumPersonalizer';
import { canAccessAssessment } from '../lib/accessControl';

const protectivePartsDefinitions = {
  manager: [
    { name: 'The Inner Critic', trigger: [3], threshold: 4, description: 'Criticizes you harshly to motivate improvement and prevent failure', role: 'Drives perfectionism through self-criticism', strategy: 'Harsh inner voice that points out flaws before others can' },
    { name: 'The Planner', trigger: [1], threshold: 4, description: 'Plans everything meticulously to prevent chaos and maintain control', role: 'Prevents surprises through hyper-organization', strategy: 'Over-planning, list-making, need for predictability' },
    { name: 'The Perfectionist', trigger: [7], threshold: 4, description: 'Demands flawless performance to avoid criticism or failure', role: 'Prevents exposure of perceived flaws', strategy: 'Setting impossibly high standards, never feeling "good enough"' },
    { name: 'The People Pleaser', trigger: [9], threshold: 4, description: 'Puts others first to avoid conflict, rejection, or abandonment', role: 'Keeps relationships safe through compliance', strategy: 'Saying yes when you mean no, suppressing your own needs' },
    { name: 'The Controller', trigger: [5], threshold: 4, description: 'Maintains tight control over emotions and environment for safety', role: 'Manages situations to prevent vulnerability', strategy: 'Emotional suppression, rigidity, need to be in charge' },
    { name: 'The Worrier', trigger: [14], threshold: 4, description: 'Constantly scans for threats and worries about others\' opinions', role: 'Anticipates danger through hypervigilance', strategy: 'Rumination, anxiety, catastrophizing' }
  ],
  firefighter: [
    { name: 'The Distractor', trigger: [2], threshold: 4, description: 'Zones out or distracts when overwhelming emotions surface', role: 'Prevents feeling overwhelming pain', strategy: 'Screen time, daydreaming, staying busy to avoid feelings' },
    { name: 'The Numbing Part', trigger: [6], threshold: 4, description: 'Uses substances, food, or activities to numb difficult feelings', role: 'Creates emotional distance from pain', strategy: 'Overeating, substance use, excessive screen time' },
    { name: 'The Impulse Part', trigger: [4], threshold: 4, description: 'Acts impulsively when stress builds up, seeking quick relief', role: 'Releases emotional pressure through action', strategy: 'Impulsive spending, risky behavior, sudden outbursts' },
    { name: 'The Shutdown Part', trigger: [8], threshold: 4, description: 'Shuts down emotionally or dissociates when feelings get intense', role: 'Protects from emotional overwhelm through withdrawal', strategy: 'Going numb, disconnecting, feeling "nothing"' },
    { name: 'The Self-Destructive Part', trigger: [10], threshold: 3, description: 'Turns pain inward through self-destructive behaviors', role: 'Redirects unbearable emotional pain', strategy: 'Self-sabotage, self-harm urges, reckless behavior' }
  ],
  exile: [
    { name: 'The Scared Child', trigger: [11], threshold: 4, description: 'A young part that carries fear, smallness, and vulnerability', role: 'Holds the original feelings of being small and helpless', strategy: 'Needs safety, comfort, and reassurance from Self' },
    { name: 'The Lonely Child', trigger: [12], threshold: 4, description: 'Carries deep loneliness and longing for connection', role: 'Holds unmet needs for belonging and attachment', strategy: 'Needs to feel seen, held, and never alone again' },
    { name: 'The Grieving Child', trigger: [13], threshold: 4, description: 'Carries sadness and grief from painful past experiences', role: 'Holds unprocessed loss and sorrow', strategy: 'Needs to be witnessed, validated, and allowed to mourn' },
    { name: 'The Shamed Child', trigger: [15], threshold: 4, description: 'Carries a deep sense of shame about who they are at their core', role: 'Holds beliefs of being fundamentally flawed or broken', strategy: 'Needs to be told "you are enough" and "nothing is wrong with you"' }
  ]
};

const assessmentDefinitions = [
  {
    id: 'wounds',
    title: 'IFS Wound Assessment',
    subtitle: 'Discover which inner child wounds may be affecting you',
    icon: Heart,
    gradient: 'from-brand-gold-600 to-brand-emerald-700',
    lightBg: 'from-brand-gold-50 to-brand-emerald-50',
    categories: {
      abandonment: { label: 'Abandonment', icon: Users, color: '#059669', description: 'Fear of being left or forgotten, difficulty trusting others will stay' },
      shame: { label: 'Shame', icon: Eye, color: '#D97706', description: 'Deep sense of being flawed or defective, hiding your true self' },
      neglect: { label: 'Neglect', icon: Heart, color: '#78716C', description: 'Feeling unseen, unheard, or emotionally invisible to caregivers' },
      betrayal: { label: 'Betrayal', icon: Shield, color: '#F59E0B', description: 'Difficulty trusting after broken promises or violated boundaries' },
      helplessness: { label: 'Helplessness', icon: AlertTriangle, color: '#EF4444', description: 'Feeling powerless, trapped, or unable to change your circumstances' }
    },
    protectorQuestions: [
      { category: 'abandonment', text: 'Do you have a part that tries to be a "people pleaser" or "caretaker" to ensure no one leaves you?', protectorType: 'People-pleaser managers' },
      { category: 'shame', text: 'Do you have a part that is a harsh "Inner Critic" or a "Perfectionist" trying to hide your flaws?', protectorType: 'Inner Critic / Perfectionist managers' },
      { category: 'neglect', text: 'Do you have a part that withdraws, dissociates, or "numbs out" to avoid needing anything?', protectorType: 'Withdrawal / Numbing protectors' },
      { category: 'betrayal', text: 'Do you have a part that is aggressive, controlling, or extremely suspicious to keep you safe?', protectorType: 'Controller / Hypervigilant managers' },
      { category: 'helplessness', text: 'Do you have a part that freezes, shuts down, or gives up when things feel overwhelming?', protectorType: 'Freeze / Collapse protectors' }
    ],
    questions: [
      { id: 1, text: 'I often feel anxious when people get too close to me emotionally.', category: 'abandonment' },
      { id: 2, text: 'When I am alone, I feel a deep, hollow sense of panic or emptiness.', category: 'abandonment' },
      { id: 3, text: 'I cling to relationships even when they are unhealthy, because being alone feels worse.', category: 'abandonment' },
      { id: 4, text: 'I frequently scan others\' faces or tones for signs that they are pulling away from me.', category: 'abandonment' },
      { id: 5, text: 'I worry that if people really knew me, they would leave.', category: 'abandonment' },
      { id: 6, text: 'I feel fundamentally flawed, as if there is something wrong with me at my core.', category: 'shame' },
      { id: 7, text: 'I am extremely hard on myself when I make mistakes \u2014 I don\u2019t just feel guilt, I feel shame.', category: 'shame' },
      { id: 8, text: 'I feel like I have to hide parts of myself to be accepted.', category: 'shame' },
      { id: 9, text: 'I constantly apologize, even for taking up space or having basic needs.', category: 'shame' },
      { id: 10, text: 'I feel uncomfortable receiving compliments; a part of me believes they are fake or undeserved.', category: 'shame' },
      { id: 11, text: 'I struggle to ask for help, even when I really need it.', category: 'neglect' },
      { id: 12, text: 'I feel like my needs don\u2019t matter as much as others\'.', category: 'neglect' },
      { id: 13, text: 'I struggle to identify what I want or need; I am much better at knowing what others need.', category: 'neglect' },
      { id: 14, text: 'I often feel like I am on the outside looking in, disconnected from the warmth others share.', category: 'neglect' },
      { id: 15, text: 'I feel empty or numb much of the time.', category: 'neglect' },
      { id: 16, text: 'I find it nearly impossible to trust that people are who they say they are.', category: 'betrayal' },
      { id: 17, text: 'I become hypervigilant in relationships, always waiting for the "other shoe to drop."', category: 'betrayal' },
      { id: 18, text: 'Vulnerability feels dangerous; showing emotion feels like handing someone a weapon.', category: 'betrayal' },
      { id: 19, text: 'I need to be in control of my environment at all times to feel safe.', category: 'betrayal' },
      { id: 20, text: 'I find it hard to set boundaries, or I set them too rigidly to protect myself.', category: 'betrayal' },
      { id: 21, text: 'I often feel powerless to change my situation, even when I know something is wrong.', category: 'helplessness' },
      { id: 22, text: 'When faced with conflict or difficulty, I tend to freeze or shut down rather than take action.', category: 'helplessness' },
      { id: 23, text: 'I feel like no matter what I do, the outcome will be the same — so why try.', category: 'helplessness' },
      { id: 24, text: 'I often feel trapped in patterns or relationships but believe I cannot escape them.', category: 'helplessness' },
      { id: 25, text: 'As a child, I learned that expressing my needs or opinions would not change anything.', category: 'helplessness' }
    ]
  },
  {
    id: 'parts',
    title: 'Identify Your Protective Parts',
    subtitle: 'Learn which protective parts are most active in your system',
    icon: Shield,
    gradient: 'from-brand-emerald-600 to-brand-gold-600',
    lightBg: 'from-brand-emerald-50 to-brand-stone-50',
    categories: {
      manager: { label: 'Manager Parts', icon: Shield, color: '#57534E', description: 'Proactive protectors that try to prevent pain through control, planning, and perfectionism' },
      firefighter: { label: 'Firefighter Parts', icon: Flame, color: '#F59E0B', description: 'Reactive protectors that numb or distract when pain surfaces through impulsive behaviors' },
      exile: { label: 'Exile Parts', icon: Heart, color: '#D97706', description: 'Young, vulnerable parts carrying wounds of pain, shame, fear, and loneliness' }
    },
    questions: [
      { id: 1, text: 'I plan everything carefully to avoid surprises or chaos.', category: 'manager' },
      { id: 2, text: 'When I feel overwhelmed, I tend to zone out or distract myself.', category: 'firefighter' },
      { id: 3, text: 'I criticize myself harshly to motivate myself to do better.', category: 'manager' },
      { id: 4, text: 'I sometimes engage in impulsive behaviors when I\'m stressed.', category: 'firefighter' },
      { id: 5, text: 'I work hard to maintain control over my emotions and environment.', category: 'manager' },
      { id: 6, text: 'I use food, substances, or screen time to numb difficult feelings.', category: 'firefighter' },
      { id: 7, text: 'I strive for perfection to avoid criticism or failure.', category: 'manager' },
      { id: 8, text: 'When emotions get intense, I shut down or dissociate.', category: 'firefighter' },
      { id: 9, text: 'I people-please to avoid conflict or rejection.', category: 'manager' },
      { id: 10, text: 'I can be self-destructive when I\'m in pain.', category: 'firefighter' },
      { id: 11, text: 'I often feel small, scared, or like a child inside.', category: 'exile' },
      { id: 12, text: 'I carry a deep sense of loneliness that never fully goes away.', category: 'exile' },
      { id: 13, text: 'I sometimes feel overwhelmed by sadness or grief from my past.', category: 'exile' },
      { id: 14, text: 'I worry constantly about what others think of me.', category: 'manager' },
      { id: 15, text: 'I feel a deep sense of shame about who I am.', category: 'exile' }
    ]
  },
  {
    id: 'self-energy',
    title: 'Self-Energy Assessment',
    subtitle: 'Evaluate your connection to the 8 C\'s of Self',
    icon: Sparkles,
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'from-emerald-50 to-teal-50',
    categories: {
      calmness: { label: 'Calmness', icon: Activity, color: '#06B6D4', description: 'Ability to remain centered and peaceful even in stressful situations' },
      curiosity: { label: 'Curiosity', icon: Eye, color: '#78716C', description: 'Genuine interest in understanding your inner experiences without judgment' },
      compassion: { label: 'Compassion', icon: Heart, color: '#D97706', description: 'Warmth and kindness toward yourself and your parts, especially those in pain' },
      confidence: { label: 'Confidence', icon: Star, color: '#F59E0B', description: 'Trust in your ability to handle whatever arises in your inner and outer world' },
      courage: { label: 'Courage', icon: Shield, color: '#EF4444', description: 'Willingness to face your fears and take steps toward healing' },
      clarity: { label: 'Clarity', icon: Brain, color: '#57534E', description: 'Ability to see situations clearly without being clouded by parts\' perspectives' },
      creativity: { label: 'Creativity', icon: Sparkles, color: '#10B981', description: 'Capacity to think flexibly and find novel solutions to challenges' },
      connectedness: { label: 'Connectedness', icon: Users, color: '#059669', description: 'Feeling of connection to others, nature, and something larger than yourself' }
    },
    questions: [
      { id: 1, text: 'I can remain calm even in stressful situations.', category: 'calmness' },
      { id: 2, text: 'I approach my inner experiences with genuine curiosity rather than judgment.', category: 'curiosity' },
      { id: 3, text: 'I feel compassion for myself and my struggles.', category: 'compassion' },
      { id: 4, text: 'I trust my ability to handle difficult situations.', category: 'confidence' },
      { id: 5, text: 'I can face my fears and take necessary risks for growth.', category: 'courage' },
      { id: 6, text: 'I see situations clearly without being clouded by strong emotions.', category: 'clarity' },
      { id: 7, text: 'I can think creatively and find novel solutions to problems.', category: 'creativity' },
      { id: 8, text: 'I feel connected to others and to something larger than myself.', category: 'connectedness' },
      { id: 9, text: 'I can sit with difficult emotions without being overwhelmed.', category: 'calmness' },
      { id: 10, text: 'I am interested in understanding why I react the way I do.', category: 'curiosity' },
      { id: 11, text: 'I can hold space for my pain without trying to fix it immediately.', category: 'compassion' },
      { id: 12, text: 'I believe I am capable of healing and growth.', category: 'confidence' },
      { id: 13, text: 'I am willing to explore painful memories when it serves my healing.', category: 'courage' },
      { id: 14, text: 'I can distinguish between my own feelings and those influenced by others.', category: 'clarity' },
      { id: 15, text: 'I can adapt my approach when something isn\'t working.', category: 'creativity' },
      { id: 16, text: 'I feel a sense of belonging and meaningful connections in my life.', category: 'connectedness' }
    ]
  },
  {
    id: 'attachment',
    title: 'Attachment Style Assessment',
    subtitle: 'Understand your relationship patterns and attachment style',
    icon: Users,
    gradient: 'from-brand-stone-600 to-brand-gold-600',
    lightBg: 'from-brand-stone-50 to-brand-gold-50',
    categories: {
      secure: { label: 'Secure', icon: Heart, color: '#10B981', description: 'Comfortable with intimacy and independence; trusts others and self' },
      anxious: { label: 'Anxious-Preoccupied', icon: AlertTriangle, color: '#F59E0B', description: 'Craves closeness but fears rejection; hypervigilant to relationship cues' },
      avoidant: { label: 'Dismissive-Avoidant', icon: Shield, color: '#059669', description: 'Values independence highly; uncomfortable with vulnerability or emotional closeness' },
      disorganized: { label: 'Fearful-Avoidant', icon: Brain, color: '#EF4444', description: 'Desires closeness but fears it; oscillates between approach and withdrawal' }
    },
    questions: [
      { id: 1, text: 'I find it easy to get close to others and feel comfortable depending on them.', category: 'secure' },
      { id: 2, text: 'I worry that my partner doesn\'t really love me or won\'t want to stay with me.', category: 'anxious' },
      { id: 3, text: 'I prefer not to depend on others and don\'t like them depending on me.', category: 'avoidant' },
      { id: 4, text: 'I want to be emotionally close to others but find it difficult to fully trust them.', category: 'disorganized' },
      { id: 5, text: 'I am comfortable sharing my feelings and being vulnerable with people I care about.', category: 'secure' },
      { id: 6, text: 'I often worry that others will abandon or reject me if I\'m not perfect.', category: 'anxious' },
      { id: 7, text: 'I feel uncomfortable when others want to get too emotionally close.', category: 'avoidant' },
      { id: 8, text: 'I sometimes push people away right when we\'re getting close, even though I want connection.', category: 'disorganized' },
      { id: 9, text: 'I trust that the people I care about will be there for me when I need them.', category: 'secure' },
      { id: 10, text: 'I need a lot of reassurance that I am valued and loved in my relationships.', category: 'anxious' },
      { id: 11, text: 'I feel more comfortable dealing with problems on my own rather than turning to others.', category: 'avoidant' },
      { id: 12, text: 'I find myself caught between wanting closeness and fearing being hurt if I let someone in.', category: 'disorganized' },
      { id: 13, text: 'I can communicate my needs openly without fear of rejection or conflict.', category: 'secure' },
      { id: 14, text: 'I become very anxious or upset when I sense emotional distance from someone important to me.', category: 'anxious' },
      { id: 15, text: 'Emotional conversations make me want to withdraw or change the subject.', category: 'avoidant' },
      { id: 16, text: 'In relationships, I can suddenly shift from feeling very close to feeling panicked and needing space.', category: 'disorganized' },
      { id: 17, text: 'I feel secure in who I am even when my relationships face challenges.', category: 'secure' },
      { id: 18, text: 'I tend to give more than I receive in relationships, hoping it will keep people close.', category: 'anxious' },
      { id: 19, text: 'I feel relieved when I have significant alone time away from close relationships.', category: 'avoidant' },
      { id: 20, text: 'I sometimes feel confused about whether I want more closeness or more distance in my relationships.', category: 'disorganized' }
    ]
  }
];

const ASSESSMENT_AUDIO = {
  wounds: '/audio/assessments/wound-assessment-intro.mp3',
  parts: '/audio/assessments/parts-assessment-intro.mp3',
  'self-energy': '/audio/assessments/self-energy-assessment-intro.mp3',
  attachment: '/audio/assessments/attachment-assessment-intro.mp3',
};

function AudioIntroPlayer({ src, isDark }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playError, setPlayError] = useState(false);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [src]);

  const toggle = () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(src);
      audio.onended = () => { setPlaying(false); setProgress(0); };
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
      };
      audio.onerror = () => { setPlaying(false); setPlayError(true); };
      audioRef.current = audio;
    }

    setPlayError(false);
    audioRef.current.play().then(() => {
      setPlaying(true);
    }).catch(() => {
      setPlayError(true);
      setPlaying(false);
    });
  };

  if (playError) return null;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50/50 border-amber-100'}`}>
      <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
        playing
          ? (isDark ? 'bg-amber-600 text-white' : 'bg-amber-500 text-white')
          : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white text-amber-600 hover:bg-amber-100 shadow-sm')
      }`}>
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          Listen to the introduction
        </p>
        <div className={`mt-1.5 h-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-amber-100'}`}>
          <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <Volume2 className={`w-4 h-4 flex-shrink-0 ${playing ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-slate-500' : 'text-gray-400')}`} />
    </div>
  );
}

function AudioIntroSection({ src, isDark }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playError, setPlayError] = useState(false);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [src]);

  const toggle = () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(src);
      audio.onended = () => { setPlaying(false); setProgress(0); };
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
      };
      audio.onerror = () => { setPlaying(false); setPlayError(true); };
      audioRef.current = audio;
    }

    setPlayError(false);
    audioRef.current.play().then(() => {
      setPlaying(true);
    }).catch(() => {
      setPlayError(true);
      setPlaying(false);
    });
  };

  return (
    <div className="mb-6">
      <p className={`text-xs font-medium mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        Listen to a guided introduction before you begin
      </p>
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50/50 border-amber-100'}`}>
        <button onClick={toggle} className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          playing
            ? (isDark ? 'bg-amber-600 text-white' : 'bg-amber-500 text-white')
            : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white text-amber-600 hover:bg-amber-100 shadow-sm')
        }`}>
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
            {playError ? 'Audio unavailable' : playing ? 'Playing introduction...' : 'Tap to listen'}
          </p>
          <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-amber-100'}`}>
            <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <Volume2 className={`w-5 h-5 flex-shrink-0 ${playing ? (isDark ? 'text-amber-400' : 'text-amber-500') : (isDark ? 'text-slate-500' : 'text-gray-400')}`} />
      </div>
    </div>
  );
}

function getIdentifiedParts(results) {
  if (!results?.answers) return [];
  const identified = [];

  Object.entries(protectivePartsDefinitions).forEach(([type, partsList]) => {
    partsList.forEach(partDef => {
      const triggerScores = partDef.trigger.map(qId => results.answers[qId] || 0);
      const maxScore = Math.max(...triggerScores);
      if (maxScore >= partDef.threshold) {
        identified.push({
          ...partDef,
          type,
          intensity: maxScore,
          intensityLabel: maxScore >= 5 ? 'Very Active' : 'Active'
        });
      }
    });
  });

  identified.sort((a, b) => b.intensity - a.intensity);
  return identified;
}

export default function Assessments() {
  const { theme, getAnimationClass } = useTheme();
  const { parts, addPart, saveToSupabase } = useParts();
  const { awardXP } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [savedResults, setSavedResults] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addedParts, setAddedParts] = useState({});
  const [protectorAnswers, setProtectorAnswers] = useState({});
  const [autoStartHandled, setAutoStartHandled] = useState(false);

  useEffect(() => {
    loadSavedResults();
  }, []);

  useEffect(() => {
    if (loading || autoStartHandled) return;
    const startParam = searchParams.get('start');
    if (startParam) {
      const assessment = assessmentDefinitions.find(a => a.id === startParam);
      if (assessment && !savedResults[startParam]) {
        setActiveAssessment(startParam);
        setShowIntro(true);
        setSearchParams({}, { replace: true });
      }
      setAutoStartHandled(true);
    }
  }, [loading, searchParams, savedResults, autoStartHandled, setSearchParams]);

  const loadSavedResults = async () => {
    try {
      const client = clientAuth.getCurrentClientValidated();
      if (!client) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('ifs_interactive_data')
        .select('data, module_id')
        .eq('client_id', client.id)
        .in('module_id', ['assessment_wounds', 'assessment_parts', 'assessment_self-energy', 'assessment_attachment']);

      if (!error && data) {
        const results = {};
        data.forEach(row => {
          const assessmentId = row.module_id.replace('assessment_', '');
          results[assessmentId] = row.data;
        });
        setSavedResults(results);
      }
    } catch (e) {
      console.error('Error loading assessment results:', e);
    }
    setLoading(false);
  };

  const calculateResults = (assessmentId) => {
    const assessment = assessmentDefinitions.find(a => a.id === assessmentId);
    if (!assessment) return null;

    const categoryScores = {};
    Object.keys(assessment.categories).forEach(cat => {
      categoryScores[cat] = { total: 0, count: 0, average: 0 };
    });

    assessment.questions.forEach(q => {
      const answer = answers[q.id];
      if (answer !== undefined) {
        categoryScores[q.category].total += answer;
        categoryScores[q.category].count += 1;
      }
    });

    Object.keys(categoryScores).forEach(cat => {
      if (categoryScores[cat].count > 0) {
        categoryScores[cat].average = categoryScores[cat].total / categoryScores[cat].count;
      }
    });

    const sorted = Object.entries(categoryScores)
      .sort((a, b) => b[1].average - a[1].average);

    const protectorPatterns = {};
    if (assessment.protectorQuestions) {
      assessment.protectorQuestions.forEach(pq => {
        if (protectorAnswers[pq.category]) {
          protectorPatterns[pq.category] = {
            answer: protectorAnswers[pq.category],
            protectorType: pq.protectorType
          };
        }
      });
    }

    return {
      scores: categoryScores,
      ranked: sorted,
      primary: sorted[0]?.[0],
      secondary: sorted[1]?.[0],
      protectorPatterns,
      completedAt: new Date().toISOString(),
      answers: { ...answers }
    };
  };

  const saveResults = async (assessmentId, results) => {
    setSaving(true);
    try {
      const client = clientAuth.getCurrentClientValidated();
      const moduleId = `assessment_${assessmentId}`;

      if (client) {
        await supabase
          .from('ifs_interactive_data')
          .upsert({
            client_id: client.id,
            module_id: moduleId,
            data: results,
            updated_at: new Date().toISOString()
          }, { onConflict: 'client_id,module_id' });

        if (assessmentId === 'wounds') {
          const ranked = results.ranked || [];
          const tertiary = ranked.slice(2).map(([id]) => id);

          await supabaseHelpers.saveAssessment(client.id, {
            abandonment_score: results.scores.abandonment?.total || 0,
            shame_score: results.scores.shame?.total || 0,
            neglect_score: results.scores.neglect?.total || 0,
            betrayal_score: results.scores.betrayal?.total || 0,
            helplessness_score: results.scores.helplessness?.total || 0,
            primary_wound: results.primary,
            secondary_wound: results.secondary,
            tertiary_wounds: tertiary,
            responses: results.answers || {},
            protector_types: results.protectorPatterns ? Object.keys(results.protectorPatterns) : [],
            assessment_date: new Date().toISOString()
          });

          try {
            const assessmentForPersonalizer = results.ranked.map(([id, data]) => ({
              id,
              score: data.total || 0
            }));
            const personalizedCurriculum = aiCurriculumPersonalizer.analyzeAndPersonalize(assessmentForPersonalizer);
            if (personalizedCurriculum && personalizedCurriculum.personalizedModules?.length > 0) {
              await supabaseHelpers.savePersonalizedCurriculum(client.id, personalizedCurriculum);
            }
          } catch (personalizationError) {
            console.error('Error generating personalized curriculum:', personalizationError);
          }
        }
      }

      const updatedResults = { ...savedResults, [assessmentId]: results };
      setSavedResults(updatedResults);
    } catch (e) {
      console.error('Error saving assessment:', e);
      const updatedResults = { ...savedResults, [assessmentId]: results };
      setSavedResults(updatedResults);
    }
    setSaving(false);
  };

  const handleSubmit = async () => {
    const results = calculateResults(activeAssessment);
    await saveResults(activeAssessment, results);
    if (awardXP) awardXP('assessment_complete', 50);
    setShowResults(true);
  };

  const handleRetake = (assessmentId) => {
    setActiveAssessment(assessmentId);
    setAnswers({});
    setProtectorAnswers({});
    setShowResults(false);
    setShowIntro(true);
  };

  const getScoreLevel = (average, assessmentId) => {
    if (assessmentId === 'self-energy') {
      if (average >= 4) return { level: 'Strong', color: 'text-emerald-600', bg: 'bg-emerald-100', barColor: 'bg-emerald-500' };
      if (average >= 3) return { level: 'Developing', color: 'text-yellow-600', bg: 'bg-yellow-100', barColor: 'bg-yellow-500' };
      return { level: 'Growing Edge', color: 'text-orange-600', bg: 'bg-orange-100', barColor: 'bg-orange-500' };
    }
    if (assessmentId === 'attachment') {
      if (average >= 4) return { level: 'Dominant', color: 'text-brand-gold-700', bg: 'bg-brand-gold-50', barColor: 'bg-brand-gold-600' };
      if (average >= 3) return { level: 'Present', color: 'text-brand-emerald-700', bg: 'bg-brand-emerald-50', barColor: 'bg-brand-emerald-600' };
      return { level: 'Minimal', color: 'text-slate-600', bg: 'bg-slate-100', barColor: 'bg-slate-400' };
    }
    if (average >= 4) return { level: 'High', color: 'text-red-600', bg: 'bg-red-100', barColor: 'bg-red-500' };
    if (average >= 3) return { level: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-100', barColor: 'bg-yellow-500' };
    return { level: 'Low', color: 'text-green-600', bg: 'bg-green-100', barColor: 'bg-green-500' };
  };

  const handleAddPartToMap = (partDef) => {
    const typeMap = { manager: 'manager', firefighter: 'firefighter', exile: 'exile' };
    const existingNames = parts.map(p => p.name?.toLowerCase().trim());
    if (existingNames.includes(partDef.name.toLowerCase().trim())) {
      setAddedParts(prev => ({ ...prev, [partDef.name]: 'exists' }));
      return;
    }
    addPart({
      type: typeMap[partDef.type] || 'protector',
      name: partDef.name,
      role: partDef.role,
      notes: `${partDef.description}\n\nStrategy: ${partDef.strategy}`,
      color: partDef.type === 'manager' ? '#57534E' : partDef.type === 'firefighter' ? '#F59E0B' : '#D97706'
    });
    setAddedParts(prev => ({ ...prev, [partDef.name]: 'added' }));
    setTimeout(() => saveToSupabase(), 500);
  };

  const handleAddAllPartsToMap = (identifiedParts) => {
    let addedCount = 0;
    const existingNames = parts.map(p => p.name?.toLowerCase().trim());
    identifiedParts.forEach(partDef => {
      if (existingNames.includes(partDef.name.toLowerCase().trim())) {
        setAddedParts(prev => ({ ...prev, [partDef.name]: 'exists' }));
        return;
      }
      addPart({
        type: partDef.type,
        name: partDef.name,
        role: partDef.role,
        notes: `${partDef.description}\n\nStrategy: ${partDef.strategy}`,
        color: partDef.type === 'manager' ? '#57534E' : partDef.type === 'firefighter' ? '#F59E0B' : '#D97706'
      });
      setAddedParts(prev => ({ ...prev, [partDef.name]: 'added' }));
      addedCount++;
    });
    if (addedCount > 0) {
      setTimeout(() => saveToSupabase(), 500);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (activeAssessment && showIntro && !showResults) {
    const assessment = assessmentDefinitions.find(a => a.id === activeAssessment);
    const audioSrc = ASSESSMENT_AUDIO[activeAssessment];
    const isRetake = !!savedResults[activeAssessment];

    return (
      <div className={`min-h-screen ${theme.isDark ? 'text-slate-100' : ''}`}>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={() => { setActiveAssessment(null); setShowIntro(false); }}
            className={`inline-flex items-center gap-2 mb-6 ${theme.isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Assessments
          </button>

          <div className="soft-card p-8 text-center">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${assessment.gradient} flex items-center justify-center mx-auto mb-5`}>
              <assessment.icon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-serif font-normal mb-2 text-brand-stone-900 dark:text-slate-100">
              {assessment.title}
            </h1>
            <p className="text-sm mb-1 text-brand-stone-500 dark:text-slate-400">
              {assessment.subtitle}
            </p>
            {isRetake && (
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${theme.isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                Retaking Assessment
              </span>
            )}

            <div className="my-6 p-5 rounded-xl border bg-brand-stone-50 dark:bg-slate-800/50 border-brand-stone-200 dark:border-slate-700 text-left">
              <p className="text-sm leading-relaxed text-brand-stone-600 dark:text-slate-300">
                {assessment.id === 'wounds' && 'This assessment helps you discover which inner child wounds may be affecting your life today. You\'ll rate 25 statements based on how strongly they resonate with you. There are no right or wrong answers — this is about understanding your inner world with curiosity and compassion.'}
                {assessment.id === 'parts' && 'This assessment helps you identify which protective parts are most active in your inner system — Managers, Firefighters, and Exiles. You\'ll rate 15 statements about your common experiences and reactions.'}
                {assessment.id === 'self-energy' && 'This assessment evaluates your current connection to the eight qualities of Self — Calmness, Curiosity, Compassion, Confidence, Courage, Clarity, Creativity, and Connectedness. Your results will show where your Self-energy is strongest.'}
                {assessment.id === 'attachment' && 'This assessment explores your attachment patterns in close relationships. Understanding your attachment style helps illuminate how your inner child wounds show up in your connections with others.'}
              </p>
            </div>

            {audioSrc && (
              <AudioIntroSection src={audioSrc} isDark={theme.isDark} />
            )}

            <button
              onClick={() => setShowIntro(false)}
              className="btn-sanctuary-primary w-full"
            >
              {isRetake ? 'Begin Retake' : 'Begin Assessment'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeAssessment && showResults) {
    const assessment = assessmentDefinitions.find(a => a.id === activeAssessment);
    const results = savedResults[activeAssessment];
    if (!results) {
      return (
        <div className={`min-h-screen ${theme.isDark ? 'text-slate-100' : ''}`}>
          <div className="max-w-4xl mx-auto px-4 py-8">
            <button
              onClick={() => { setActiveAssessment(null); setShowResults(false); setAnswers({}); }}
              className={`inline-flex items-center gap-2 mb-6 ${theme.isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Assessments
            </button>
            <div className={`${theme.cardBg} rounded-2xl shadow-lg p-8 border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} text-center`}>
              <p className={`${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>Results are loading or not yet available. Please try retaking the assessment.</p>
              <button
                onClick={() => { setShowResults(false); setShowIntro(true); setAnswers({}); }}
                className="mt-4 px-6 py-3 btn-sanctuary-primary"
              >
                Retake Assessment
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`min-h-screen ${theme.isDark ? 'text-slate-100' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => { setActiveAssessment(null); setShowResults(false); setAnswers({}); }}
            className={`inline-flex items-center gap-2 mb-6 ${theme.isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Assessments
          </button>

          <div className={`${theme.cardBg} rounded-2xl shadow-lg p-8 mb-8 border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${assessment.gradient} flex items-center justify-center`}>
                <assessment.icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                  {assessment.title} Results
                </h1>
                <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Completed {new Date(results.completedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {results.ranked.map(([categoryId, data], index) => {
                const category = assessment.categories[categoryId];
                const scoreLevel = getScoreLevel(data.average, activeAssessment);
                const CategoryIcon = category.icon;

                return (
                  <div key={categoryId} className={`p-4 rounded-xl ${theme.isDark ? 'bg-slate-800' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: category.color + '20' }}>
                          <CategoryIcon className="w-4 h-4" style={{ color: category.color }} />
                        </div>
                        <div>
                          <span className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                            {category.label}
                          </span>
                          {index === 0 && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                              Primary
                            </span>
                          )}
                          {index === 1 && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-stone-100 text-amber-700 font-medium">
                              Secondary
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium px-2 py-1 rounded-lg ${scoreLevel.bg} ${scoreLevel.color}`}>
                          {scoreLevel.level}
                        </span>
                        <span className={`font-bold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                          {data.average.toFixed(1)}/5
                        </span>
                      </div>
                    </div>
                    <div className={`w-full h-2 rounded-full ${theme.isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                      <div
                        className={`h-2 rounded-full ${scoreLevel.barColor} transition-all duration-700`}
                        style={{ width: `${(data.average / 5) * 100}%` }}
                      />
                    </div>
                    <p className={`text-sm mt-2 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {category.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${theme.cardBg} rounded-2xl shadow-lg p-8 mb-8 border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <h3 className={`text-xl font-bold mb-4 ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
              What These Results Mean
            </h3>
            {activeAssessment === 'wounds' && (
              <div className={`space-y-3 ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                <p>Your results highlight which inner child wounds may be most active in your life right now. Higher scores indicate areas where protective patterns have formed around early experiences.</p>
                <p>Your <strong>primary wound</strong> ({assessment.categories[results.primary]?.label}) is likely a core theme in your healing journey. Many of your protective parts may have formed in response to this wound.</p>
                <p>Remember: These wounds are not permanent. With IFS work, you can unburden the exiles carrying these wounds and transform the protective parts guarding them.</p>
              </div>
            )}
            {activeAssessment === 'wounds' && results.protectorPatterns && Object.values(results.protectorPatterns).some(val => val?.answer === 'Yes') && (
              <div className={`mt-6 p-5 rounded-xl ${theme.isDark ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-200'}`}>
                <h4 className={`font-bold mb-3 flex items-center gap-2 ${theme.isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                  <Shield className="w-5 h-5" />
                  Your Protector Patterns
                </h4>
                <div className="space-y-2">
                  {Object.entries(results.protectorPatterns)
                    .filter(([, val]) => val.answer === 'Yes')
                    .map(([category, val]) => (
                      <div key={category} className={`flex items-center gap-2 text-sm ${theme.isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span><strong>{assessment.categories[category]?.label}:</strong> {val.protectorType}</span>
                      </div>
                    ))
                  }
                </div>
                <p className={`text-xs mt-3 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  These protector parts formed to keep you safe from the wounds they guard. In IFS, we approach them with gratitude before asking them to step back.
                </p>
              </div>
            )}
            {activeAssessment === 'parts' && (
              <div className={`space-y-3 ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                <p>This assessment reveals which types of protective parts are most active in your system. Understanding your protectors is the first step toward building a relationship with them.</p>
                <p><strong>Manager parts</strong> work proactively to prevent pain. <strong>Firefighter parts</strong> react when pain breaks through. <strong>Exile parts</strong> are the vulnerable ones your protectors are trying to shield.</p>
                <p>All parts have positive intentions, even when their strategies cause problems. Approach each part with curiosity and compassion.</p>
              </div>
            )}
            {activeAssessment === 'self-energy' && (
              <div className={`space-y-3 ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                <p>The 8 C's represent the qualities of Self energy in IFS. Higher scores indicate areas where you naturally access Self, while lower scores show where parts may be blending with you.</p>
                <p>Your strongest qualities are resources you can draw upon. Your growing edges are areas where daily practice can strengthen your connection to Self.</p>
                <p>Self energy is always present — it can't be damaged or lost. Parts just sometimes block access to it. As you do IFS work, these qualities naturally become more available.</p>
              </div>
            )}
            {activeAssessment === 'attachment' && (
              <div className={`space-y-3 ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                <p>Your results reveal your dominant attachment patterns — the ways you learned to relate to others based on your earliest experiences with caregivers. These patterns often operate outside of conscious awareness.</p>
                <p>Your <strong>primary attachment style</strong> ({assessment.categories[results.primary]?.label}) reflects the relational strategies your inner child developed to feel safe. Higher scores indicate stronger presence of that pattern in your relationships.</p>
                <p><strong>Secure</strong> attachment reflects comfort with closeness and independence. <strong>Anxious</strong> attachment involves craving reassurance and fearing abandonment. <strong>Avoidant</strong> attachment prioritizes self-reliance and discomfort with vulnerability. <strong>Fearful-Avoidant</strong> attachment involves conflicting desires for both closeness and distance.</p>
                <p>In IFS, attachment patterns are maintained by protective parts that learned these strategies in childhood. As you build a relationship with these parts and unburden the exiles they protect, your capacity for secure connection naturally grows.</p>
              </div>
            )}
          </div>

          {activeAssessment === 'parts' && (() => {
            const identifiedParts = getIdentifiedParts(results);
            if (identifiedParts.length === 0) return null;

            const typeColors = {
              manager: { bg: 'from-brand-stone-500 to-brand-stone-600', light: theme.isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-brand-stone-50 border-brand-stone-200', text: theme.isDark ? 'text-slate-300' : 'text-brand-stone-600', badge: 'bg-brand-stone-100 text-brand-stone-600' },
              firefighter: { bg: 'from-amber-500 to-orange-600', light: theme.isDark ? 'bg-amber-900/30 border-amber-800' : 'bg-amber-50 border-amber-200', text: theme.isDark ? 'text-amber-300' : 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
              exile: { bg: 'from-brand-emerald-600 to-brand-gold-600', light: theme.isDark ? 'bg-emerald-900/30 border-emerald-800' : 'bg-emerald-50 border-emerald-200', text: theme.isDark ? 'text-emerald-300' : 'text-emerald-700', badge: 'bg-brand-emerald-50 text-brand-emerald-700' }
            };
            const typeLabels = { manager: 'Manager', firefighter: 'Firefighter', exile: 'Exile' };
            const typeIcons = { manager: Shield, firefighter: Flame, exile: Heart };

            return (
              <div className={`${theme.cardBg} rounded-2xl shadow-lg p-8 mb-8 border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className={`text-xl font-bold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                      Your Identified Parts
                    </h3>
                    <p className={`text-sm mt-1 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Based on your responses, these parts appear most active. Add them to your Parts Map to track and work with them.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddAllPartsToMap(identifiedParts)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        identifiedParts.every(p => addedParts[p.name])
                          ? (theme.isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500') + ' cursor-default'
                          : 'bg-gradient-to-r from-brand-emerald-600 to-brand-emerald-700 text-white hover:brightness-105'
                      }`}
                      disabled={identifiedParts.every(p => addedParts[p.name])}
                    >
                      <Plus className="w-4 h-4" />
                      {identifiedParts.every(p => addedParts[p.name]) ? 'All Added' : 'Add All to Map'}
                    </button>
                    <Link
                      to="/parts-studio"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 text-white text-sm font-medium hover:from-amber-700 hover:to-emerald-700 transition-all"
                    >
                      <MapPin className="w-4 h-4" />
                      View Parts Map
                    </Link>
                  </div>
                </div>

                {['manager', 'firefighter', 'exile'].map(type => {
                  const typeParts = identifiedParts.filter(p => p.type === type);
                  if (typeParts.length === 0) return null;
                  const TypeIcon = typeIcons[type];
                  const colors = typeColors[type];

                  return (
                    <div key={type} className="mb-6 last:mb-0">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors.bg} flex items-center justify-center`}>
                          <TypeIcon className="w-4 h-4 text-white" />
                        </div>
                        <h4 className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-800'}`}>
                          {typeLabels[type]} Parts
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                          {typeParts.length} identified
                        </span>
                      </div>

                      <div className="space-y-3">
                        {typeParts.map((part, i) => {
                          const isAdded = addedParts[part.name];
                          return (
                            <div key={i} className={`p-4 rounded-xl border ${colors.light} transition-all`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>{part.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      part.intensity >= 5 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {part.intensityLabel}
                                    </span>
                                  </div>
                                  <p className={`text-sm mb-2 ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>{part.description}</p>
                                  <div className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                    <span className="font-medium">Role:</span> {part.role}
                                  </div>
                                  <div className={`text-xs mt-1 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                    <span className="font-medium">Strategy:</span> {part.strategy}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleAddPartToMap(part)}
                                  disabled={!!isAdded}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-shrink-0 transition-all ${
                                    isAdded === 'added'
                                      ? 'bg-green-100 text-green-700 cursor-default'
                                      : isAdded === 'exists'
                                      ? (theme.isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500') + ' cursor-default'
                                      : 'btn-sanctuary-primary'
                                  }`}
                                >
                                  {isAdded === 'added' ? (
                                    <><CheckCircle className="w-3.5 h-3.5" /> Added</>
                                  ) : isAdded === 'exists' ? (
                                    <><CheckCircle className="w-3.5 h-3.5" /> Already Mapped</>
                                  ) : (
                                    <><Plus className="w-3.5 h-3.5" /> Add to Map</>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className={`mt-6 p-4 rounded-xl ${theme.isDark ? 'bg-slate-800 border-slate-700' : 'bg-amber-50 border-amber-100'} border`}>
                  <p className={`text-sm ${theme.isDark ? 'text-slate-300' : 'text-amber-700'}`}>
                    <strong>Next Step:</strong> After adding parts to your map, visit the <Link to="/parts-studio" className="underline font-medium">Parts Visualization Studio</Link> to explore how these parts relate to each other and to your Self energy. You can also discuss these identified parts with your advisor using the <Link to="/therapy" className="underline font-medium">Therapy Integration</Link> activities.
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="flex flex-col items-center gap-3">
            {(() => {
              const onboardingDone = localStorage.getItem(`onboarding_completed_${clientAuth.getCurrentClient()?.id}`);
              if (!onboardingDone) {
                return (
                  <button
                    onClick={() => navigate('/')}
                    className="w-full max-w-md px-6 py-3.5 btn-sanctuary-primary"
                  >
                    Continue Setup
                    <ArrowRight className="w-4 h-4" />
                  </button>
                );
              }
              return null;
            })()}
            <div className="flex gap-4">
              <button
                onClick={() => handleRetake(activeAssessment)}
                className={`px-6 py-3 rounded-xl font-medium ${theme.isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-white text-gray-700 hover:bg-gray-50'} border ${theme.isDark ? 'border-slate-600' : 'border-gray-200'}`}
              >
                <RotateCcw className="w-4 h-4 inline mr-2" />
                Retake Assessment
              </button>
              <button
                onClick={() => { setActiveAssessment(null); setShowResults(false); setAnswers({}); }}
                className="px-6 py-3 btn-sanctuary-primary"
              >
                View All Assessments
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeAssessment) {
    const assessment = assessmentDefinitions.find(a => a.id === activeAssessment);
    const totalAnswered = Object.keys(answers).length;
    const totalQuestions = assessment.questions.length;
    const allAnswered = totalAnswered === totalQuestions;

    return (
      <div className={`min-h-screen ${theme.isDark ? 'text-slate-100' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => { setActiveAssessment(null); setAnswers({}); }}
            className={`inline-flex items-center gap-2 mb-6 ${theme.isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Assessments
          </button>

          <div className={`${theme.cardBg} rounded-2xl shadow-lg p-6 mb-6 border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${assessment.gradient} flex items-center justify-center`}>
                <assessment.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className={`text-xl font-bold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                  {assessment.title}
                </h1>
                <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {assessment.subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex-1 h-2 rounded-full ${theme.isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${(totalAnswered / totalQuestions) * 100}%` }}
                />
              </div>
              <span className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                {totalAnswered}/{totalQuestions}
              </span>
            </div>
          </div>

          <div className={`${theme.cardBg} rounded-2xl p-6 mb-6 border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} text-sm ${theme.isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            <p>Rate each statement based on how true it feels for you. Answer honestly — there are no right or wrong answers. This is about understanding yourself better.</p>
            {ASSESSMENT_AUDIO[activeAssessment] && (
              <div className="mt-4">
                <AudioIntroPlayer src={ASSESSMENT_AUDIO[activeAssessment]} isDark={theme.isDark} />
              </div>
            )}
          </div>

          <div className="space-y-4 mb-8">
            {assessment.questions.map((question, index) => (
              <div key={question.id} className={`${theme.cardBg} rounded-xl shadow-sm p-5 border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    answers[question.id] ? 'bg-gradient-to-br from-amber-500 to-emerald-500 text-white' : (theme.isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-400')
                  }`}>
                    <span className="text-sm font-bold">{index + 1}</span>
                  </div>
                  <p className={`font-medium ${theme.isDark ? 'text-white' : 'text-gray-800'}`}>{question.text}</p>
                </div>
                <div className="flex gap-2 ml-11">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={value}
                      onClick={() => setAnswers(prev => ({ ...prev, [question.id]: value }))}
                      className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                        answers[question.id] === value
                          ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-white shadow-md'
                          : theme.isDark
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between ml-11 mt-1">
                  <span className={`text-xs ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>Disagree</span>
                  <span className={`text-xs ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`}>Agree</span>
                </div>
              </div>
            ))}
          </div>

          {assessment.protectorQuestions && allAnswered && (
            <div className={`${theme.cardBg} rounded-2xl p-6 mb-8 border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              <h3 className={`text-lg font-bold mb-2 ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                <Shield className="w-5 h-5 inline mr-2 text-amber-600" />
                Protector Check (Optional)
              </h3>
              <p className={`text-sm mb-4 ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                In IFS, protective parts form in response to wounds. These optional questions help identify which protector patterns may be active in your system.
              </p>
              <div className="space-y-4">
                {assessment.protectorQuestions.map((pq) => (
                  <div key={pq.category} className={`p-4 rounded-xl ${theme.isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <p className={`font-medium mb-3 ${theme.isDark ? 'text-white' : 'text-gray-800'}`}>{pq.text}</p>
                    <div className="flex gap-3">
                      {['Yes', 'No'].map(val => (
                        <button
                          key={val}
                          onClick={() => setProtectorAnswers(prev => ({ ...prev, [pq.category]: val }))}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                            protectorAnswers[pq.category] === val
                              ? 'bg-amber-600 text-white shadow-md'
                              : theme.isDark
                                ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    {protectorAnswers[pq.category] === 'Yes' && (
                      <p className={`mt-2 text-xs ${theme.isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                        Protector pattern: {pq.protectorType}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4 pb-8">
            <button
              onClick={() => { setAnswers({}); setProtectorAnswers({}); }}
              className={`px-6 py-3 rounded-xl font-medium ${theme.isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-700'} border ${theme.isDark ? 'border-slate-600' : 'border-gray-200'}`}
            >
              <RotateCcw className="w-4 h-4 inline mr-2" />
              Reset
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || saving}
              className={`px-8 py-3 rounded-xl font-medium transition-all ${
                allAnswered
                  ? 'btn-sanctuary-primary'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'View Results'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.isDark ? 'text-slate-100' : ''}`}>
      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        <Link
          to="/"
          className={`inline-flex items-center gap-2 mb-6 ${theme.isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-gold-500 to-brand-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-gold-500/20">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl lg:text-6xl font-serif font-normal mb-4 text-brand-stone-900 dark:text-slate-100">
            Self-Assessments
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-brand-stone-600 dark:text-slate-400">
            Gain insights into your inner world through guided self-assessments. These are reflective exercises to increase self-awareness, not diagnostic tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {assessmentDefinitions.map(assessment => {
            const Icon = assessment.icon;
            const hasResults = savedResults[assessment.id];
            const isRestricted = !canAccessAssessment(assessment.id);

            return (
              <div
                key={assessment.id}
                className={`soft-card overflow-hidden ${getAnimationClass('transition')} ${isRestricted ? 'opacity-60' : 'hover:shadow-xl'}`}
              >
                <div className={`bg-gradient-to-br ${assessment.gradient} p-6`}>
                  <Icon className="w-10 h-10 text-white mb-3" />
                  <h2 className="text-xl font-serif font-semibold text-white">{assessment.title}</h2>
                  <p className="text-white/80 text-sm mt-1">{assessment.subtitle}</p>
                </div>
                <div className="p-6">
                  {isRestricted ? (
                    <div className={`text-center py-4`}>
                      <Lock className={`w-8 h-8 mx-auto mb-2 ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                      <p className="text-sm font-medium text-brand-stone-500 dark:text-slate-400">
                        Contact your advisor to unlock this assessment
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4 text-sm text-brand-stone-500 dark:text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>{assessment.questions.length} questions{assessment.protectorQuestions ? ` + ${assessment.protectorQuestions.length} optional` : ''} · ~{assessment.questions.length > 20 ? '8' : '5'} min</span>
                      </div>

                      {hasResults && (
                        <div className="mb-4 p-3 rounded-xl bg-brand-stone-50 dark:bg-slate-800/60">
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="w-4 h-4 text-brand-emerald-600" />
                            <span className="text-sm font-medium text-brand-stone-700 dark:text-slate-300">
                              Completed {new Date(hasResults.completedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {hasResults.ranked?.slice(0, 2).map(([catId, data]) => {
                            const cat = assessment.categories[catId];
                            return (
                              <div key={catId} className="flex items-center justify-between text-sm mb-1">
                                <span className="text-brand-stone-600 dark:text-slate-400">{cat?.label}</span>
                                <span className="font-medium" style={{ color: cat?.color }}>{data.average.toFixed(1)}/5</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setActiveAssessment(assessment.id);
                            setAnswers({});
                            setShowResults(false);
                            setShowIntro(true);
                          }}
                          className={`flex-1 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r ${assessment.gradient} text-white hover:opacity-90 ${getAnimationClass('transition')}`}
                        >
                          {hasResults ? 'Retake' : 'Start'}
                        </button>
                        {hasResults && (
                          <button
                            onClick={() => {
                              setActiveAssessment(assessment.id);
                              setShowResults(true);
                            }}
                            className={`flex-1 py-2.5 rounded-xl font-medium text-sm btn-sanctuary-secondary ${getAnimationClass('transition')}`}
                          >
                            View Results
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {Object.keys(savedResults).length > 0 && (
          <div className="soft-card p-8">
            <h2 className="text-2xl font-serif font-normal mb-6 text-brand-stone-900 dark:text-slate-100">
              Your Assessment Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {assessmentDefinitions.map(assessment => {
                const results = savedResults[assessment.id];
                if (!results) return (
                  <div key={assessment.id} className="p-4 rounded-xl bg-brand-stone-50 dark:bg-slate-800/60 text-center">
                    <assessment.icon className={`w-8 h-8 mx-auto mb-2 ${theme.isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                    <p className="text-sm text-brand-stone-400 dark:text-slate-500">Not yet completed</p>
                  </div>
                );

                return (
                  <div key={assessment.id} className="p-4 rounded-xl bg-brand-stone-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${assessment.gradient} flex items-center justify-center`}>
                        <assessment.icon className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-sm text-brand-stone-900 dark:text-slate-100">
                        {assessment.title.split(' ').slice(0, 2).join(' ')}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {results.ranked?.slice(0, 3).map(([catId, data]) => {
                        const cat = assessment.categories[catId];
                        const scoreLevel = getScoreLevel(data.average, assessment.id);
                        return (
                          <div key={catId}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-brand-stone-600 dark:text-slate-400">{cat?.label}</span>
                              <span className={`font-medium ${scoreLevel.color}`}>{data.average.toFixed(1)}</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full ${theme.isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                              <div className={`h-1.5 rounded-full ${scoreLevel.barColor}`} style={{ width: `${(data.average / 5) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
