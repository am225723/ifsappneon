import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  FileText, 
  Download, 
  Printer,
  Heart,
  Shield,
  AlertCircle,
  TrendingUp,
  Calendar,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Brain,
  Sparkles,
  ClipboardList,
  Users
} from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const protectivePartsDefinitions = {
  manager: [
    { name: 'The Inner Critic', trigger: [3], threshold: 4, description: 'Criticizes you harshly to motivate improvement and prevent failure', role: 'Drives perfectionism through self-criticism' },
    { name: 'The Planner', trigger: [1], threshold: 4, description: 'Plans everything meticulously to prevent chaos and maintain control', role: 'Prevents surprises through hyper-organization' },
    { name: 'The Perfectionist', trigger: [7], threshold: 4, description: 'Demands flawless performance to avoid criticism or failure', role: 'Prevents exposure of perceived flaws' },
    { name: 'The People Pleaser', trigger: [9], threshold: 4, description: 'Puts others first to avoid conflict, rejection, or abandonment', role: 'Keeps relationships safe through compliance' },
    { name: 'The Controller', trigger: [5], threshold: 4, description: 'Maintains tight control over emotions and environment for safety', role: 'Manages situations to prevent vulnerability' },
    { name: 'The Worrier', trigger: [14], threshold: 4, description: 'Constantly scans for threats and worries about others\' opinions', role: 'Anticipates danger through hypervigilance' }
  ],
  firefighter: [
    { name: 'The Distractor', trigger: [2], threshold: 4, description: 'Zones out or distracts when overwhelming emotions surface', role: 'Prevents feeling overwhelming pain' },
    { name: 'The Numbing Part', trigger: [6], threshold: 4, description: 'Uses substances, food, or activities to numb difficult feelings', role: 'Creates emotional distance from pain' },
    { name: 'The Impulse Part', trigger: [4], threshold: 4, description: 'Acts impulsively when stress builds up, seeking quick relief', role: 'Releases emotional pressure through action' },
    { name: 'The Shutdown Part', trigger: [8], threshold: 4, description: 'Shuts down emotionally or dissociates when feelings get intense', role: 'Protects from emotional overwhelm through withdrawal' },
    { name: 'The Self-Destructive Part', trigger: [10], threshold: 3, description: 'Turns pain inward through self-destructive behaviors', role: 'Redirects unbearable emotional pain' }
  ],
  exile: [
    { name: 'The Scared Child', trigger: [11], threshold: 4, description: 'A young part that carries fear, smallness, and vulnerability', role: 'Holds the original feelings of being small and helpless' },
    { name: 'The Lonely Child', trigger: [12], threshold: 4, description: 'Carries deep loneliness and longing for connection', role: 'Holds unmet needs for belonging and attachment' },
    { name: 'The Grieving Child', trigger: [13], threshold: 4, description: 'Carries sadness and grief from painful past experiences', role: 'Holds unprocessed loss and sorrow' },
    { name: 'The Shamed Child', trigger: [15], threshold: 4, description: 'Carries a deep sense of shame about who they are at their core', role: 'Holds beliefs of being fundamentally flawed or broken' }
  ]
};

function getIdentifiedParts(answers) {
  if (!answers) return [];
  const identified = [];
  Object.entries(protectivePartsDefinitions).forEach(([type, partsList]) => {
    partsList.forEach(partDef => {
      const triggerScores = partDef.trigger.map(qId => answers[qId] || 0);
      const maxScore = Math.max(...triggerScores);
      if (maxScore >= partDef.threshold) {
        identified.push({ ...partDef, type, intensity: maxScore, intensityLabel: maxScore >= 5 ? 'Very Active' : 'Active' });
      }
    });
  });
  identified.sort((a, b) => b.intensity - a.intensity);
  return identified;
}

const typeLabels = { manager: 'Manager', firefighter: 'Firefighter', exile: 'Exile' };
const typeColors = {
  manager: { bg: 'bg-brand-emerald-50', border: 'border-brand-emerald-100', text: 'text-brand-emerald-700', badge: 'bg-brand-emerald-50 text-brand-emerald-700', fill: 'bg-brand-stone-500' },
  firefighter: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', fill: 'bg-amber-500' },
  exile: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700', fill: 'bg-rose-500' }
};

const woundColors = {
  abandonment: { bg: 'bg-brand-emerald-50', border: 'border-brand-emerald-400', text: 'text-brand-emerald-700', fill: 'bg-brand-stone-500' },
  shame: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700', fill: 'bg-amber-500' },
  neglect: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700', fill: 'bg-amber-500' },
  betrayal: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', fill: 'bg-red-500' },
  helplessness: { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-700', fill: 'bg-rose-500' }
};

const attachmentPatternDescriptions = {
  secure: 'Secure patterns often reflect comfort with closeness, repair, and asking for support.',
  anxious: 'Anxious patterns may show a part that seeks reassurance, closeness, or signs that the relationship is okay.',
  avoidant: 'Avoidant patterns may show protective parts that create distance, self-reliance, or emotional space to feel safe.',
  disorganized: 'Disorganized patterns may show parts with mixed needs: wanting closeness while also feeling unsure, guarded, or overwhelmed.'
};

function getAttachmentPrimarySecondary(assessment) {
  const primary = assessment?.primary || assessment?.primaryPattern || assessment?.style || assessment?.ranked?.[0]?.[0] || null;
  const secondary = assessment?.secondary || assessment?.secondaryPattern || assessment?.ranked?.[1]?.[0] || null;
  return { primary, secondary };
}

const woundDescriptions = {
  abandonment: "A deep fear of being left alone or rejected. This wound often develops when caregivers were physically or emotionally unavailable.",
  shame: "A core belief of being fundamentally flawed or unworthy. This wound develops from criticism, humiliation, or conditional love.",
  neglect: "Feeling invisible or that your needs don't matter. This wound comes from emotional or physical needs being consistently unmet.",
  betrayal: "Difficulty trusting others due to broken promises or violated boundaries. This wound develops from experiences of deception or abandonment.",
  helplessness: "A deep sense of powerlessness or feeling trapped. This wound develops when a child's autonomy was suppressed or they felt unable to influence their environment."
};

const Profile = ({ client }) => {
  const navigate = useNavigate();
  const printRef = useRef();
  const [assessment, setAssessment] = useState(null);
  const [allAssessments, setAllAssessments] = useState([]);
  const [partsAssessment, setPartsAssessment] = useState(null);
  const [selfEnergyAssessment, setSelfEnergyAssessment] = useState(null);
  const [attachmentAssessment, setAttachmentAssessment] = useState(null);
  const [customAssessments, setCustomAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [moodEntries, setMoodEntries] = useState([]);
  const [gamificationData, setGamificationData] = useState({});
  const [streakData, setStreakData] = useState({});
  const [timeline, setTimeline] = useState([]);

  const loadAssessmentData = async () => {
    setProfileError('');
    setAssessment(null);
    setAllAssessments([]);
    setPartsAssessment(null);
    setSelfEnergyAssessment(null);
    setAttachmentAssessment(null);
    setCustomAssessments([]);

    if (!client?.id) {
      setProfileError('Your profile could not be loaded right now. Please refresh or return to My IFS Work.');
      setLoading(false);
      setProfileError('Your profile could not be loaded right now. Please refresh or return to My IFS Work.');
      return;
    }

    setLoading(true);
    setProfileError('');
    setAssessment(null);
    setAllAssessments([]);
    setPartsAssessment(null);
    setSelfEnergyAssessment(null);
    setAttachmentAssessment(null);
    setCustomAssessments([]);
    try {
      const interactiveResult = await supabase
        .from('ifs_interactive_data')
        .select('*')
        .eq('client_id', client.id)
        .like('module_id', 'assessment_%');

      if (interactiveResult?.error) throw interactiveResult.error;

      const interactiveData = Array.isArray(interactiveResult?.data) ? interactiveResult.data : [];
      setAllAssessments(
        interactiveData
          .filter(d => d.module_id === 'assessment_wounds' && d.data)
          .map(d => ({
            id: d.id,
            primary_wound: d.data.primary,
            secondary_wound: d.data.secondary,
            assessment_date: d.data.completedAt || d.updated_at,
            created_at: d.updated_at
          }))
      );

      // Wound results: ONLY from the client's actual assessment tab answers
      const woundsEntry = interactiveData.find(d => d.module_id === 'assessment_wounds');
      if (woundsEntry?.data) {
        const wd = woundsEntry.data;
        setAssessment({
          primary_wound: wd.primary,
          secondary_wound: wd.secondary,
          abandonment_score: wd.scores?.abandonment?.total || 0,
          shame_score: wd.scores?.shame?.total || 0,
          neglect_score: wd.scores?.neglect?.total || 0,
          betrayal_score: wd.scores?.betrayal?.total || 0,
          helplessness_score: wd.scores?.helplessness?.total || 0,
          scores: {
            abandonment: wd.scores?.abandonment?.total || 0,
            shame: wd.scores?.shame?.total || 0,
            neglect: wd.scores?.neglect?.total || 0,
            betrayal: wd.scores?.betrayal?.total || 0,
            helplessness: wd.scores?.helplessness?.total || 0
          },
          assessment_date: wd.completedAt || woundsEntry.updated_at,
          created_at: woundsEntry.updated_at
        });
      }

      const partsEntry = interactiveData.find(d => d.module_id === 'assessment_parts');
      const selfEnergyEntry = interactiveData.find(d => d.module_id === 'assessment_self-energy');
      const attachmentEntry = interactiveData.find(d => d.module_id === 'assessment_attachment');
      if (partsEntry?.data) setPartsAssessment(partsEntry.data);
      if (selfEnergyEntry?.data) setSelfEnergyAssessment(selfEnergyEntry.data);
      if (attachmentEntry?.data) setAttachmentAssessment(attachmentEntry.data);

      const { data: customData, error: customError } = await supabase
        .from('ifs_interactive_data')
        .select('*')
        .eq('client_id', client.id)
        .like('module_id', 'custom_assessment_response_%');
      if (customError) throw customError;
      if (Array.isArray(customData) && customData.length > 0) {
        setCustomAssessments(customData.map(d => ({ ...(d.data || {}), moduleId: d.module_id, updatedAt: d.updated_at })));
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[Profile] assessment data load failed', { message: error?.message || 'Request failed', status: error?.status || error?.statusCode || null });
      }
      setProfileError('Your profile could not be loaded right now. Please refresh or return to My IFS Work.');
    } finally {
      setLoading(false);
    }
  };

  const loadSupabaseData = async () => {
    const currentClient = clientAuth.getCurrentClient();
    const clientId = currentClient?.id || client?.id;
    if (!clientId) return;
    try {
      const [moodResult, gamResult, milesResult] = await Promise.allSettled([
        supabaseHelpers.getMoodEntries(clientId),
        supabaseHelpers.getGamification(clientId),
        supabaseHelpers.getMilestones(clientId),
      ]);
      if (moodResult.status === 'fulfilled') setMoodEntries(moodResult.value || []);
      if (gamResult.status === 'fulfilled' && gamResult.value) {
        const gam = gamResult.value;
        setGamificationData({ xp: gam.xp, level: gam.level, badges: gam.badges });
        setStreakData({ currentStreak: gam.streak_current, longestStreak: gam.streak_longest, totalLogins: gam.total_logins });
      }
      setTimeline(milesResult.status === 'fulfilled' ? (milesResult.value || []) : []);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[Profile] optional profile data load failed', { message: err?.message || 'Request failed', status: err?.status || err?.statusCode || null });
      }
    }
  };

  useEffect(() => {
    // Existing profile hydration intentionally kicks off both async loaders when the active client changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAssessmentData();
    loadSupabaseData();
  }, [client]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    let report = `IFS HEALING JOURNEY - COMPREHENSIVE PROGRESS REPORT\n`;
    report += `${'='.repeat(55)}\n`;
    report += `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    report += `Client: ${client?.name || 'Anonymous'}\n\n`;

    if (assessment) {
      report += `WOUND PATTERNS ASSESSMENT\n${'-'.repeat(30)}\n`;
      const scores = assessment.scores || {};
      Object.entries(scores).forEach(([wound, score]) => {
        const intensity = getIntensityLevel(score);
        report += `${wound.charAt(0).toUpperCase() + wound.slice(1)}: ${intensity.level} theme\n`;
      });
      report += `\nCompleted: ${formatDate(assessment.created_at)}\n\n`;
    }

    if (streakData.currentStreak) {
      report += `ENGAGEMENT & STREAKS\n${'-'.repeat(30)}\n`;
      report += `Current Streak: ${streakData.currentStreak || 0} days\n`;
      report += `Longest Streak: ${streakData.longestStreak || 0} days\n`;
      report += `Total Logins: ${streakData.totalLogins || 0}\n\n`;
    }

    if (gamificationData.xp) {
      report += `PROGRESS & ACHIEVEMENTS\n${'-'.repeat(30)}\n`;
      report += `XP Earned: ${gamificationData.xp || 0}\n`;
      report += `Level: ${gamificationData.level || 1}\n`;
      const badges = gamificationData.badges?.filter(b => b.unlocked) || [];
      if (badges.length > 0) {
        report += `Badges Earned: ${badges.map(b => b.name).join(', ')}\n`;
      }
      report += '\n';
    }

    if (moodEntries.length > 0) {
      report += `MOOD & ENERGY TRENDS (Last 7 entries)\n${'-'.repeat(30)}\n`;
      const recent = moodEntries.slice(-7);
      recent.forEach(entry => {
        report += `${entry.date}: Mood=${entry.mood || 'N/A'}, Energy=${entry.energy || 'N/A'}/10`;
        if (entry.notes) report += ` - ${entry.notes}`;
        report += '\n';
      });
      const avgEnergy = recent.reduce((s, e) => s + (e.energy || 0), 0) / recent.length;
      report += `Average Energy: ${avgEnergy.toFixed(1)}/10\n\n`;
    }

    if (timeline.length > 0) {
      report += `JOURNEY MILESTONES (Last 10)\n${'-'.repeat(30)}\n`;
      timeline.slice(-10).forEach(m => {
        report += `${m.date}: [${m.type}] ${m.title}\n`;
      });
      report += '\n';
    }

    report += `${'='.repeat(55)}\n`;
    report += `This report is for personal reflection and optional Advisor review.\n`;
    report += `For crisis support: 988 Suicide & Crisis Lifeline\n`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IFS_Progress_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getIntensityLevel = (score) => {
    if (score >= 18) return { level: 'High', color: 'text-red-600' };
    if (score >= 12) return { level: 'Moderate', color: 'text-amber-600' };
    if (score >= 6) return { level: 'Mild', color: 'text-yellow-600' };
    return { level: 'Low', color: 'text-green-600' };
  };

  const getScorePercentage = (score) => Math.round((score / 25) * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-600">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading your assessments and progress…</span>
        </div>
      </div>
    );
  }


  if (profileError) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="soft-card p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
            <h1 className="text-2xl font-serif font-normal text-brand-stone-900 dark:text-slate-100">Your profile could not be loaded right now.</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-brand-stone-600 dark:text-slate-400">Please refresh or return to My IFS Work.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => window.location.reload()} className="btn-sanctuary-primary">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button type="button" onClick={() => navigate('/my-ifs')} className="btn-sanctuary-secondary">
                Return to My IFS Work
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            padding: 20px;
          }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="no-print flex items-center gap-2 text-amber-600 hover:text-amber-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <div ref={printRef} className="print-area">
          <div className="soft-card overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-brand-gold-600 to-brand-emerald-700 px-4 sm:px-8 py-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">{client?.name || 'Your Profile'}</h1>
                  <p className="text-amber-100">Assessments & Progress</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-emerald-500" />
                  Wound Patterns Assessment
                </h2>
                <div className="no-print flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-2 bg-brand-stone-100 dark:bg-slate-800/60 hover:bg-brand-stone-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-brand-stone-700 dark:text-slate-300 text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="btn-sanctuary-primary px-3 py-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Save PDF</span>
                  </button>
                </div>
              </div>

              {!assessment ? (
                <div className="text-center py-12 bg-brand-stone-50 dark:bg-slate-800/50 rounded-xl">
                  <AlertCircle className="w-12 h-12 text-brand-stone-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-brand-stone-700 dark:text-slate-300 mb-2">No assessment yet</h3>
                  <p className="text-brand-stone-500 dark:text-slate-500 mb-4">Your assessments will appear here after you complete them. Start with an assessment when you are ready so the curriculum can personalize support for your parts work.</p>
                  <button
                    onClick={() => navigate('/assessments')}
                    className="no-print px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Start Assessment
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-brand-stone-500 dark:text-slate-500 mb-6">
                    <Calendar className="w-4 h-4" />
                    Completed: {formatDate(assessment.assessment_date || assessment.created_at)}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className={`p-6 rounded-xl ${woundColors[assessment.primary_wound]?.bg || 'bg-brand-stone-100 dark:bg-slate-800/60'} border-2 ${woundColors[assessment.primary_wound]?.border || 'border-brand-stone-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5" />
                        <span className="text-sm font-medium uppercase tracking-wide">Primary Pattern</span>
                      </div>
                      <h3 className={`text-2xl font-bold capitalize mb-2 ${woundColors[assessment.primary_wound]?.text || 'text-brand-stone-700 dark:text-slate-300'}`}>
                        {assessment.primary_wound}
                      </h3>
                      <p className="text-sm text-brand-stone-600 dark:text-slate-400">
                        {woundDescriptions[assessment.primary_wound]}
                      </p>
                    </div>

                    {assessment.secondary_wound && (
                      <div className={`p-6 rounded-xl ${woundColors[assessment.secondary_wound]?.bg || 'bg-brand-stone-100 dark:bg-slate-800/60'} border-2 ${woundColors[assessment.secondary_wound]?.border || 'border-brand-stone-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-5 h-5" />
                          <span className="text-sm font-medium uppercase tracking-wide">Secondary Pattern</span>
                        </div>
                        <h3 className={`text-2xl font-bold capitalize mb-2 ${woundColors[assessment.secondary_wound]?.text || 'text-brand-stone-700 dark:text-slate-300'}`}>
                          {assessment.secondary_wound}
                        </h3>
                        <p className="text-sm text-brand-stone-600 dark:text-slate-400">
                          {woundDescriptions[assessment.secondary_wound]}
                        </p>
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-stone-500" />
                    Pattern overview
                  </h3>

                  <div className="space-y-4 mb-8">
                    {['abandonment', 'shame', 'neglect', 'betrayal', 'helplessness'].map((wound) => {
                      const scoreKey = `${wound}_score`;
                      const score = assessment[scoreKey] || 0;
                      const intensity = getIntensityLevel(score);
                      const percentage = getScorePercentage(score);
                      const colors = woundColors[wound];

                      return (
                        <div key={wound} className="bg-brand-stone-50 dark:bg-slate-800/50 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`font-medium capitalize ${colors.text}`}>{wound}</span>
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-semibold ${intensity.color}`}>{intensity.level} theme</span>
                            </div>
                          </div>
                          <div className="w-full bg-brand-stone-200 dark:bg-slate-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${colors.fill}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-gradient-to-r from-amber-50 to-stone-50 rounded-xl p-6 border border-amber-200">
                    <h3 className="font-semibold text-amber-800 mb-3">How this can support your IFS path</h3>
                    <p className="text-brand-stone-700 dark:text-slate-300 leading-relaxed">
                      Your assessment points to <strong className="text-amber-700">{assessment.primary_wound}</strong> themes as a place for extra compassion and curiosity. This does not define you; it helps the curriculum offer more relevant parts work, reflection, and Self-energy practices.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {partsAssessment && (() => {
            const identifiedParts = getIdentifiedParts(partsAssessment.answers);
            return (
            <div className="soft-card overflow-hidden mb-8">
              <div className="p-4 sm:p-8">
                <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100 flex items-center gap-2 mb-6">
                  <Shield className="w-5 h-5 text-brand-gold-700" />
                  Protective Parts Assessment
                </h2>
                {partsAssessment.completedAt && (
                  <div className="flex items-center gap-2 text-sm text-brand-stone-500 dark:text-slate-500 mb-6">
                    <Calendar className="w-4 h-4" />
                    Completed: {formatDate(partsAssessment.completedAt)}
                  </div>
                )}
                {partsAssessment.ranked && partsAssessment.ranked.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {partsAssessment.ranked.map(([category, data], idx) => {
                      const colors = idx === 0 ? 'bg-brand-gold-600' : idx === 1 ? 'bg-brand-emerald-600' : 'bg-brand-stone-500';
                      const percentage = data.maxScale ? (data.average / data.maxScale) * 100 : (data.total / (data.count * 5)) * 100;
                      return (
                        <div key={category} className="bg-brand-stone-50 dark:bg-slate-800/50 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium capitalize text-brand-stone-700 dark:text-slate-300">{category}</span>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                percentage >= 66 ? 'bg-red-100 text-red-700' :
                                percentage >= 33 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {percentage >= 66 ? 'High' : percentage >= 33 ? 'Moderate' : 'Low'}
                              </span>
                              <span className="font-bold text-brand-stone-700 dark:text-slate-300">
                                {data.label || `${Math.round(percentage)}%`}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-brand-stone-200 dark:bg-slate-700 rounded-full h-3">
                            <div className={`h-3 rounded-full transition-all duration-500 ${colors}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {identifiedParts.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-brand-gold-700" />
                      Your Identified Parts
                    </h3>
                    {['manager', 'firefighter', 'exile'].map(type => {
                      const typeParts = identifiedParts.filter(p => p.type === type);
                      if (typeParts.length === 0) return null;
                      const tc = typeColors[type];
                      return (
                        <div key={type} className="mb-4 last:mb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tc.badge}`}>
                              {typeLabels[type]}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {typeParts.map((part) => (
                              <div key={part.name} className={`p-4 rounded-xl border ${tc.border} ${tc.bg}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`font-semibold ${tc.text}`}>{part.name}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    part.intensityLabel === 'Very Active' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {part.intensityLabel}
                                  </span>
                                </div>
                                <p className="text-sm text-brand-stone-600 dark:text-slate-400 mb-1">{part.description}</p>
                                <p className="text-xs text-brand-stone-500 dark:text-slate-500 italic">{part.role}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {identifiedParts.length === 0 && (
                  <div className="bg-brand-stone-100 rounded-xl p-6 border border-brand-stone-200 text-center">
                    <Shield className="w-8 h-8 text-brand-stone-400 mx-auto mb-2" />
                    <p className="text-sm text-brand-stone-600">No strongly active protective parts were identified from this assessment. You can return later as your awareness grows.</p>
                  </div>
                )}
              </div>
            </div>
            );
          })()}

          {selfEnergyAssessment && (
            <div className="soft-card overflow-hidden mb-8">
              <div className="p-4 sm:p-8">
                <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100 flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  Self-Energy Assessment
                </h2>
                {selfEnergyAssessment.completedAt && (
                  <div className="flex items-center gap-2 text-sm text-brand-stone-500 dark:text-slate-500 mb-6">
                    <Calendar className="w-4 h-4" />
                    Completed: {formatDate(selfEnergyAssessment.completedAt)}
                  </div>
                )}
                {Array.isArray(selfEnergyAssessment.ranked) && selfEnergyAssessment.ranked.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {selfEnergyAssessment.ranked.map(([category, data = {}], idx) => {
                      const colors = ['bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-green-500', 'bg-lime-500', 'bg-sky-500', 'bg-brand-emerald-600', 'bg-brand-gold-600'];
                      const percentage = data.maxScale ? (data.average / data.maxScale) * 100 : (data.total / (data.count * 5)) * 100;
                      const level = percentage >= 80 ? 'Strong' : percentage >= 60 ? 'Developing' : 'Growing Edge';
                      const levelStyle = percentage >= 80 ? 'bg-emerald-100 text-emerald-700' : percentage >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700';
                      return (
                        <div key={category} className="bg-brand-stone-50 dark:bg-slate-800/50 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium capitalize text-brand-stone-700 dark:text-slate-300">{category}</span>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelStyle}`}>{level}</span>
                            </div>
                          </div>
                          <div className="w-full bg-brand-stone-200 dark:bg-slate-700 rounded-full h-3">
                            <div className={`h-3 rounded-full transition-all duration-500 ${colors[idx % colors.length]}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
                  <h3 className="font-semibold text-emerald-800 mb-3">Understanding Self-Energy</h3>
                  <p className="text-brand-stone-700 dark:text-slate-300 leading-relaxed">
                    Self-energy reflects your connection to qualities like curiosity, compassion, and calm. Treat these results as a gentle snapshot of which Self qualities feel available now and which may want more practice.
                  </p>
                </div>
              </div>
            </div>
          )}

          {attachmentAssessment && (
            <div className="soft-card overflow-hidden mb-8">
              <div className="p-4 sm:p-8">
                <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100 flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-brand-gold-700" />
                  Attachment Pattern Assessment
                </h2>
                {attachmentAssessment.completedAt && (
                  <div className="flex items-center gap-2 text-sm text-brand-stone-500 dark:text-slate-500 mb-6">
                    <Calendar className="w-4 h-4" />
                    Completed: {formatDate(attachmentAssessment.completedAt)}
                  </div>
                )}
                {Array.isArray(attachmentAssessment.ranked) && attachmentAssessment.ranked.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {attachmentAssessment.ranked.map(([category, data = {}], idx) => {
                      const colors = ['bg-brand-gold-600', 'bg-brand-emerald-600', 'bg-brand-stone-600', 'bg-brand-stone-500'];
                      const styleLabels = { secure: 'Secure', anxious: 'Anxious-Preoccupied', avoidant: 'Dismissive-Avoidant', disorganized: 'Fearful-Avoidant' };
                      const percentage = data.maxScale ? (data.average / data.maxScale) * 100 : (data.total / (data.count * 5)) * 100;
                      const level = percentage >= 80 ? 'Dominant' : percentage >= 60 ? 'Present' : 'Minimal';
                      const levelStyle = percentage >= 80 ? 'bg-brand-gold-50 text-brand-gold-700' : percentage >= 60 ? 'bg-brand-emerald-50 text-brand-emerald-700' : 'bg-brand-stone-100 text-brand-stone-600';
                      return (
                        <div key={category} className="bg-brand-stone-50 dark:bg-slate-800/50 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-brand-stone-700 dark:text-slate-300">{styleLabels[category] || category}</span>
                            <div className="flex items-center gap-3">
                              {idx === 0 && <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-brand-gold-50 text-brand-gold-700">Primary Pattern</span>}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelStyle}`}>{level}</span>
                            </div>
                          </div>
                          <div className="w-full bg-brand-stone-200 dark:bg-slate-700 rounded-full h-3">
                            <div className={`h-3 rounded-full transition-all duration-500 ${colors[idx % colors.length]}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="bg-brand-gold-50 rounded-xl p-6 border border-brand-gold-100">
                  <h3 className="font-semibold text-brand-gold-700 mb-3">Understanding Attachment Patterns</h3>
                  <p className="text-brand-stone-700 dark:text-slate-300 leading-relaxed">
                    Your attachment patterns reflect learned ways of seeking closeness, safety, and independence. Most people have a blend of patterns. Understanding them can support more compassionate parts work and more secure connection over time.
                  </p>
                  {(() => {
                    const { primary, secondary } = getAttachmentPrimarySecondary(attachmentAssessment);
                    const primaryKey = String(primary || '').toLowerCase();
                    const secondaryKey = String(secondary || '').toLowerCase();
                    return (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {Object.entries(attachmentPatternDescriptions).map(([key, description]) => {
                          const isPrimary = key === primaryKey;
                          const isSecondary = key === secondaryKey;
                          return (
                            <div key={key} className={`rounded-xl bg-white/75 p-4 ${isPrimary ? 'ring-2 ring-brand-gold-200' : isSecondary ? 'ring-2 ring-brand-emerald-100' : ''}`}>
                              <p className={`text-xs font-bold uppercase tracking-wide ${isPrimary ? 'text-brand-gold-700' : isSecondary ? 'text-brand-emerald-700' : 'text-brand-stone-600'}`}>
                                {isPrimary ? 'Primary Pattern · ' : isSecondary ? 'Secondary Pattern · ' : ''}{key}
                              </p>
                              <p className="mt-2 text-sm leading-relaxed text-brand-stone-700">{description}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {customAssessments.length > 0 && (
            <div className="soft-card overflow-hidden mb-8">
              <div className="p-4 sm:p-8">
                <h2 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100 flex items-center gap-2 mb-6">
                  <ClipboardList className="w-5 h-5 text-amber-500" />
                  Custom Assessment Results
                </h2>
                <div className="space-y-6">
                  {customAssessments.map((ca, caIdx) => (
                    <div key={ca.moduleId || caIdx} className="border border-brand-stone-200 dark:border-slate-800 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100">{ca.assessmentTitle || 'Custom Assessment'}</h3>
                        {(ca.completedAt || ca.updatedAt) && (
                          <span className="text-xs text-brand-stone-500 dark:text-slate-500">
                            {formatDate(ca.completedAt || ca.updatedAt)}
                          </span>
                        )}
                      </div>
                      {Array.isArray(ca.ranked) && ca.ranked.length > 0 && (
                        <div className="space-y-3">
                          {ca.ranked.map(([category, data = {}], idx) => {
                            const barColors = ['bg-amber-500', 'bg-emerald-500', 'bg-brand-stone-500', 'bg-brand-stone-600', 'bg-rose-500'];
                            const percentage = data.percentage || ((data.average / (data.maxScale || 5)) * 100);
                            return (
                              <div key={category} className="bg-brand-stone-50 dark:bg-slate-800/50 rounded-xl p-3">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-sm font-medium capitalize text-brand-stone-700 dark:text-slate-300">{category}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      data.label === 'High' ? 'bg-red-100 text-red-700' :
                                      data.label === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>{data.label || 'N/A'}</span>
                                    <span className="text-sm font-semibold text-brand-stone-600 dark:text-slate-400">
                                      {data.label || 'Theme noted'}
                                    </span>
                                  </div>
                                </div>
                                <div className="w-full bg-brand-stone-200 dark:bg-slate-700 rounded-full h-2.5">
                                  <div className={`h-2.5 rounded-full transition-all duration-500 ${barColors[idx % barColors.length]}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
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
            </div>
          )}

          {allAssessments.length > 1 && (
            <div className="soft-card overflow-hidden no-print">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full px-8 py-4 flex items-center justify-between hover:bg-brand-stone-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <h2 className="text-lg font-semibold text-brand-stone-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-stone-500" />
                  Wound Patterns History ({allAssessments.length} total)
                </h2>
                {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showHistory && (
                <div className="px-8 pb-6">
                  <div className="space-y-3">
                    {allAssessments.map((a, index) => (
                      <div 
                        key={a.id || index}
                        className={`p-4 rounded-lg border ${index === 0 ? 'bg-amber-50 border-amber-200' : 'bg-brand-stone-50 dark:bg-slate-800/50 border-brand-stone-200 dark:border-slate-800'}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm text-brand-stone-500 dark:text-slate-500">
                              {formatDate(a.assessment_date || a.created_at)}
                            </span>
                            {index === 0 && (
                              <span className="ml-2 text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-sm">
                            <span className={`font-medium capitalize ${woundColors[a.primary_wound]?.text}`}>
                              {a.primary_wound}
                            </span>
                            {a.secondary_wound && (
                              <span className="text-brand-stone-400 dark:text-slate-500"> / {a.secondary_wound}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
