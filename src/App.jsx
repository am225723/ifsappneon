import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { SignIn, SignUp, useAuth, UserButton } from '@clerk/clerk-react';
import { Settings as SettingsIcon, Home as HomeIcon, BookOpen, ClipboardList, BookHeart, Handshake, LogOut, MessageSquare, Compass as CompassIcon } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';
import { supabase } from './lib/supabase';
import SSOCallback from './components/SSOCallback';
import PINAuthDiagnostic from './components/PINAuthDiagnostic';
import TestClientCreator from './components/TestClientCreator';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CurriculumSystem from './components/CurriculumSystem';
import LearningModuleRenderer from './components/LearningModuleRenderer';
import CheatSheet from './pages/CheatSheet';
import Wounds from './pages/Wounds';
import Qualities from './pages/Qualities';
import PartsMapping from './pages/PartsMapping';
import Exercises from './pages/Exercises';
import Assessment from './pages/Assessment';
import Assessments from './pages/Assessments';
import Resources from './pages/Resources';
import Journal from './pages/Journal';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import PartsStudio from './pages/PartsStudio';
import MicroLearning from './pages/MicroLearning';
import Affirmations from './pages/Affirmations';
import TherapyIntegration from './pages/TherapyIntegration';
import TherapistDashboard from './pages/TherapistDashboard';
import TreatmentPlans from './pages/TreatmentPlans';
import CoTherapySession from './pages/CoTherapySession';
import ProgressTimeline from './pages/ProgressTimeline';
import MoodTracker from './pages/MoodTracker';
import GamificationHub from './pages/GamificationHub';
import PartsDialogue from './pages/PartsDialogue';
import TherapistMessages from './pages/TherapistMessages';
import TherapistHomework from './pages/TherapistHomework';
import TherapistReports from './pages/TherapistReports';
import LiveCoTherapy from './pages/LiveCoTherapy';
import ClientLiveSession from './pages/ClientLiveSession';
import ClientInbox from './pages/ClientInbox';
import ClientHomework from './pages/ClientHomework';
import Notifications from './pages/Notifications';
import NotificationPreferences from './pages/NotificationPreferences';
import PreSessionCheckin from './components/PreSessionCheckin';
import PartsRelationshipMap from './pages/PartsRelationshipMap';
import UnburdeningProtocol from './pages/UnburdeningProtocol';
import AssessmentBuilder from './pages/AssessmentBuilder';
import CustomAssessment from './pages/CustomAssessment';
import GuidedMeditation from './pages/GuidedMeditation';
import DailyCheckin from './pages/DailyCheckin';
import MoodAnalytics from './pages/MoodAnalytics';
import LongitudinalAnalytics from './pages/LongitudinalAnalytics';
import HealingTimeline from './components/HealingTimeline';
import AdminHub from './pages/AdminHub';
import Milestones from './pages/Milestones';
import WeeklyReflection from './pages/WeeklyReflection';
import LetterWriting from './pages/LetterWriting';
import PartsCards from './pages/PartsCards';
import HealingTracker from './pages/HealingTracker';
import OnboardingFlow from './components/OnboardingFlow';
import { initializePushNotifications } from './lib/pushNotifications';
import ResourceLibrary from './pages/ResourceLibrary';
import InnerLibraryMockup from './pages/InnerLibraryMockup';
import AuthDebug from './components/AuthDebug';
import CaseloadManager from './components/CaseloadManager';
import NotificationBell from './components/NotificationBell';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PartsProvider } from './contexts/PartsContext';
import { clientAuth } from './lib/supabasePersonalization';
import { canAccessFeature } from './lib/accessControl';
import { clearClientSession, claimClientWithPin, fetchLinkedClient, persistClientSession } from './lib/clerkClientAuth';
import { Lock } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-sanctuary dark:bg-brand-midnight">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-gold-600"></div>
    </div>
  );
}

function ClaimClientProfile({ onClaim }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(pin)) {
      setError('Enter your 6-digit client PIN.');
      return;
    }

    setIsSubmitting(true);
    const result = await onClaim(pin);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Unable to link your client profile.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-sanctuary dark:bg-brand-midnight px-4">
      <div className="w-full max-w-md soft-card p-8">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="IFS" className="w-16 h-auto mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-semibold text-brand-stone-900 dark:text-slate-100">Link your IFS profile</h1>
          <p className="text-sm text-brand-stone-600 dark:text-slate-400 mt-2">
            Enter your old 6-digit PIN once. We’ll connect your existing progress, assessments, journal entries, and messages to your Clerk login.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="w-full rounded-2xl border border-brand-stone-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-center text-2xl tracking-[0.35em] font-semibold text-brand-stone-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-gold-600"
          />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-sanctuary-primary disabled:opacity-60"
          >
            {isSubmitting ? 'Linking…' : 'Link my profile'}
          </button>
        </form>

        <p className="text-xs text-brand-stone-500 dark:text-slate-500 text-center mt-5">
          Your app data stays linked to your existing client ID. Clerk only replaces the login method.
        </p>
      </div>
    </div>
  );
}

function ClerkAuthRoutes({ onClaim }) {
  return (
    <Routes>
      <Route
        path="/sign-in/*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-brand-sanctuary dark:bg-brand-midnight px-4">
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/claim-account" />
          </div>
        }
      />
      <Route
        path="/sign-up/*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-brand-sanctuary dark:bg-brand-midnight px-4">
            <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" afterSignUpUrl="/claim-account" />
          </div>
        }
      />
      <Route path="/claim-account" element={<ClaimClientProfile onClaim={onClaim} />} />
      <Route path="/test-client" element={<TestClientCreator />} />
      <Route path="/diagnostic" element={<PINAuthDiagnostic />} />
      <Route path="/auth-debug" element={<AuthDebug />} />
      <Route path="*" element={<Navigate to="/sign-in" replace />} />
    </Routes>
  );
}

function FeatureGate({ feature, children }) {
  const { theme } = useTheme();
  if (!canAccessFeature(feature)) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.isDark ? 'text-slate-100' : ''}`}>
        <div className="text-center px-6 max-w-md">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${theme.isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <Lock className={`w-8 h-8 ${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          </div>
          <h2 className={`text-xl font-bold mb-2 ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
            Feature Not Available
          </h2>
          <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            This feature is not yet available for your account. Contact your advisor to request access.
          </p>
        </div>
      </div>
    );
  }
  return children;
}


function UnauthorizedRedirect({ currentClient, message = 'This area is not available for your role.' }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="soft-card p-6 text-center">
        <h1 className="text-xl font-semibold text-brand-stone-900 dark:text-slate-100">Access restricted</h1>
        <p className="mt-2 text-sm text-brand-stone-600 dark:text-slate-400">{message}</p>
        <Link to="/" className="btn-sanctuary-primary inline-flex mt-5">Return home</Link>
      </div>
      <div className="sr-only">Current role: {currentClient?.user_role || 'unknown'}</div>
    </div>
  );
}

function BottomNav() {
  const location = useLocation();
  const navItems = [
    { path: '/', icon: HomeIcon, label: 'Home' },
    { path: '/exercises', icon: BookOpen, label: 'Practice' },
    { path: '/journal', icon: BookHeart, label: 'Journal' },
    { path: '/parts-mapping', icon: CompassIcon, label: 'Parts' },
    { path: '/inbox', icon: MessageSquare, label: 'Advisor' },
    { path: '/profile', icon: Handshake, label: 'Profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg border-t shadow-[0_-2px_10px_rgba(120,80,40,0.06)] bg-white/90 dark:bg-brand-midnight/90 border-brand-stone-200/50 dark:border-slate-800/60">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[60px] ${
                isActive
                  ? 'text-brand-gold-700 dark:text-brand-gold-500'
                  : 'text-brand-stone-400 dark:text-slate-500 hover:text-brand-stone-600 dark:hover:text-slate-300'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all duration-200 ${isActive ? 'bg-brand-gold-50 dark:bg-brand-gold-950/30' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              </div>
              <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

function App() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      if (!isLoaded) return;

      if (!isSignedIn) {
        clearClientSession();
        setIsAuthenticated(false);
        setCurrentClient(null);
        setShowOnboarding(false);
        setOnboardingChecked(false);
        setAuthChecked(true);
        return;
      }

      try {
        const client = await fetchLinkedClient(getToken);
        if (client) {
          persistClientSession(client);
          setIsAuthenticated(true);
          setCurrentClient(client);
          initializePushNotifications(client);
        } else {
          clearClientSession();
          setIsAuthenticated(false);
          setCurrentClient(null);
        }
      } catch (error) {
        console.error('Error loading Clerk-linked client:', error);
        clearClientSession();
        setIsAuthenticated(false);
        setCurrentClient(null);
      }

      setAuthChecked(true);
    };

    initializeAuth();
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!isAuthenticated || !currentClient) return;
    if (currentClient.user_role === 'therapist') {
      queueMicrotask(() => setOnboardingChecked(true));
      return;
    }

    const checkAssessments = async () => {
      try {
        const { data, error } = await supabase
          .from('ifs_interactive_data')
          .select('module_id')
          .eq('client_id', currentClient.id)
          .in('module_id', ['assessment_wounds', 'assessment_parts', 'assessment_self-energy']);

        if (error) {
          console.error('Error checking assessment status:', error);
          setShowOnboarding(true);
          setOnboardingChecked(true);
          return;
        }

        const completedIds = (data || []).map(r => r.module_id);
        const allDone = ['assessment_wounds', 'assessment_parts', 'assessment_self-energy'].every(id => completedIds.includes(id));

        if (!allDone) {
          setShowOnboarding(true);
        } else {
          localStorage.setItem(`onboarding_completed_${currentClient.id}`, 'true');
        }
      } catch (err) {
        console.error('Error checking assessment status:', err);
        setShowOnboarding(true);
      }
      setOnboardingChecked(true);
    };

    checkAssessments();
  }, [isAuthenticated, currentClient]);

  const handleClaim = async (pin) => {
    try {
      const client = await claimClientWithPin(getToken, pin);
      persistClientSession(client);
      setIsAuthenticated(true);
      setCurrentClient(client);
      setShowOnboarding(false);
      setOnboardingChecked(false);
      initializePushNotifications(client);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleLogout = async () => {
    clientAuth.logout();
    clearClientSession();
    setIsAuthenticated(false);
    setCurrentClient(null);
    setShowOnboarding(false);
    setOnboardingChecked(false);
    await signOut({ redirectUrl: '/sign-in' });
  };

  return (
    <ThemeProvider>
    <PartsProvider>
    <DataProvider>
      <Router>
        <AppContent
          authChecked={authChecked}
          clerkLoaded={isLoaded}
          clerkSignedIn={!!isSignedIn}
          isAuthenticated={isAuthenticated}
          currentClient={currentClient}
          handleClaim={handleClaim}
          handleLogout={handleLogout}
          showOnboarding={showOnboarding}
          onboardingChecked={onboardingChecked}
          onOnboardingComplete={() => setShowOnboarding(false)}
        />
      </Router>
    </DataProvider>
    </PartsProvider>
    </ThemeProvider>
  );
}

function AppContent({ authChecked, clerkLoaded, clerkSignedIn, isAuthenticated, currentClient, handleClaim, handleLogout, showOnboarding, onboardingChecked, onOnboardingComplete }) {
  const location = useLocation();
  const bgClass = isAuthenticated ? 'bg-brand-sanctuary dark:bg-brand-midnight' : '';
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const isClient = currentClient?.user_role === 'client';
  const isTherapist = currentClient?.user_role === 'therapist';
  const isAdminOrSupervisor = currentClient?.user_role === 'admin' || currentClient?.user_role === 'supervisor';
  const isTherapistRole = isTherapist || isAdminOrSupervisor;
  const messagePath = isTherapistRole ? '/messages' : '/inbox';
  const homeElement = <Home clientId={currentClient?.id} client={currentClient} />;
  const clientOnly = (element, message) => isClient ? element : <UnauthorizedRedirect currentClient={currentClient} message={message || 'Client workspace access is required for this page.'} />;
  const therapistOnly = (element, message) => isTherapistRole ? element : <UnauthorizedRedirect currentClient={currentClient} message={message || 'Advisor, supervisor, or admin access is required for this page.'} />;

  const fetchUnreadCount = useCallback(async () => {
    if (!currentClient?.id) return;
    try {
      const isTherapist = currentClient.user_role === 'therapist';
      let query = supabase.from('ifs_messages').select('*');
      if (isTherapist) {
        query = query.eq('therapist_id', currentClient.id).eq('sender_role', 'client');
      } else {
        query = query.eq('client_id', currentClient.id).eq('sender_role', 'therapist');
      }
      const { data, error } = await query;
      if (error) throw error;
      setUnreadMsgCount((data || []).filter((message) => !message.read_at).length);
    } catch (e) {
      console.error('Error fetching unread count:', e);
    }
  }, [currentClient?.id, currentClient?.user_role]);

  useEffect(() => {
    if (!isAuthenticated || !currentClient?.id) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentClient?.id, fetchUnreadCount]);

  return (
    <div className={`min-h-screen ${bgClass}`}>
      {!clerkLoaded || !authChecked ? (
        <LoadingScreen />
      ) : !isAuthenticated ? (
        location.pathname.startsWith('/sso/callback') ? (
          <SSOCallback />
        ) : clerkSignedIn ? (
          <Routes>
            <Route path="/claim-account" element={<ClaimClientProfile onClaim={handleClaim} />} />
            <Route path="/test-client" element={<TestClientCreator />} />
            <Route path="/diagnostic" element={<PINAuthDiagnostic />} />
            <Route path="/auth-debug" element={<AuthDebug />} />
            <Route path="*" element={<Navigate to="/claim-account" replace />} />
          </Routes>
        ) : (
          <ClerkAuthRoutes onClaim={handleClaim} />
        )
      ) : (isAuthenticated && !onboardingChecked) ? (
        <LoadingScreen />
      ) : showOnboarding ? (
        location.pathname === '/assessments' ? (
          <div className={`min-h-screen ${bgClass}`}>
            <div className="pb-4">
              <Routes>
                <Route path="/assessments" element={<Assessments />} />
              </Routes>
            </div>
          </div>
        ) : (
          <OnboardingFlow
            onComplete={onOnboardingComplete}
            clientName={currentClient?.name?.split(' ')[0]}
            clientId={currentClient?.id}
          />
        )
      ) : (
        <>
          <Navbar
            unreadCount={unreadMsgCount}
            messagePath={messagePath}
            rightSlot={
              <>
                {isTherapistRole && (
                  <Link
                    to={isAdminOrSupervisor ? '/admin-hub' : '/therapist-dashboard'}
                    className="p-2.5 rounded-xl transition-all text-brand-stone-500 dark:text-slate-400 hover:text-brand-gold-700 dark:hover:text-brand-gold-500 hover:bg-brand-gold-50 dark:hover:bg-slate-800/50"
                    title={isAdminOrSupervisor ? 'Supervisor Admin Hub' : 'Advisor Dashboard'}
                  >
                    <ClipboardList className="w-5 h-5" />
                  </Link>
                )}
                <NotificationBell />
                <Link
                  to="/settings"
                  className="p-2.5 rounded-xl transition-all text-brand-stone-500 dark:text-slate-400 hover:text-brand-gold-700 dark:hover:text-brand-gold-500 hover:bg-brand-gold-50 dark:hover:bg-slate-800/50"
                  title="Settings"
                >
                  <SettingsIcon className="w-5 h-5" />
                </Link>
                <div className="px-1">
                  <UserButton afterSignOutUrl="/sign-in">
                    <UserButton.UserProfilePage
                      label="Assessment Results"
                      labelIcon={<ClipboardList className="w-4 h-4" />}
                      url="assessment-results"
                    >
                      <div className="max-h-[calc(100vh-10rem)] overflow-y-auto rounded-xl bg-brand-sanctuary dark:bg-brand-midnight">
                        <Profile client={currentClient} embedded />
                      </div>
                    </UserButton.UserProfilePage>
                  </UserButton>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl transition-all text-brand-stone-500 dark:text-slate-400 hover:text-brand-stone-900 dark:hover:text-slate-100 hover:bg-brand-stone-100 dark:hover:bg-slate-800/50"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            }
          />
              
              <div className="pb-20">
              <Routes>
                <Route path="/" element={homeElement} />
                <Route path="/home" element={clientOnly(homeElement)} />
                <Route path="/curriculum" element={<CurriculumSystem clientId={currentClient?.id} userProgress={{}} />} />
                <Route path="/curriculum/module/:moduleId" element={<LearningModuleRenderer userProgress={{}} />} />
                <Route path="/cheat-sheet" element={<CheatSheet />} />
                <Route path="/wounds" element={<Wounds />} />
                <Route path="/qualities" element={<Qualities />} />
                <Route path="/parts-mapping" element={<PartsMapping />} />
                <Route path="/exercises" element={<FeatureGate feature="exercises"><Exercises /></FeatureGate>} />
                <Route path="/assessment" element={<Assessment />} />
                <Route path="/assessments" element={<Assessments />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/resource-library" element={<FeatureGate feature="resourceLibrary"><ResourceLibrary /></FeatureGate>} />
                <Route path="/inner-library-mockup" element={<InnerLibraryMockup />} />
                <Route path="/journal" element={<FeatureGate feature="journal"><Journal /></FeatureGate>} />
                <Route path="/profile" element={<Profile client={currentClient} />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/notifications" element={<Notifications currentClient={currentClient} />} />
                <Route path="/notification-preferences" element={<NotificationPreferences currentClient={currentClient} />} />
                <Route path="/parts-studio" element={<FeatureGate feature="partsStudio"><PartsStudio /></FeatureGate>} />
                <Route path="/micro-learning" element={<MicroLearning />} />
                <Route path="/affirmations" element={<Affirmations />} />
                <Route path="/therapy" element={<TherapyIntegration />} />
                <Route path="/admin" element={therapistOnly(<TherapistDashboard />)} />
                <Route path="/therapist" element={therapistOnly(<TherapistDashboard />)} />
                <Route path="/therapist-dashboard" element={therapistOnly(<TherapistDashboard />)} />
                <Route path="/treatment-plans" element={therapistOnly(<TreatmentPlans />)} />
                <Route path="/admin-hub" element={isAdminOrSupervisor ? <AdminHub /> : <UnauthorizedRedirect currentClient={currentClient} message="Admin or supervisor access is required for this page." />} />
                <Route path="/co-therapy" element={therapistOnly(<CoTherapySession />)} />
                <Route path="/live-co-therapy" element={therapistOnly(<LiveCoTherapy />)} />
                <Route path="/caseload" element={therapistOnly(<CaseloadManager />)} />
                <Route path="/advisor-messages" element={therapistOnly(<TherapistMessages />)} />
                <Route path="/messages" element={therapistOnly(<TherapistMessages />)} />
                <Route path="/advisor-homework" element={therapistOnly(<TherapistHomework />)} />
                <Route path="/advisor-reports" element={therapistOnly(<TherapistReports />)} />
                <Route path="/reports" element={therapistOnly(<TherapistReports />)} />
                <Route path="/analytics" element={therapistOnly(<LongitudinalAnalytics />)} />
                <Route path="/longitudinal-analytics" element={therapistOnly(<LongitudinalAnalytics />)} />
                <Route path="/inbox" element={clientOnly(<ClientInbox />)} />
                <Route path="/my-homework" element={clientOnly(<ClientHomework />)} />
                <Route path="/homework" element={clientOnly(<ClientHomework />)} />
                <Route path="/pre-session-checkin" element={clientOnly(<PreSessionCheckin />)} />
                <Route path="/live-session" element={clientOnly(<ClientLiveSession />)} />
                <Route path="/progress-timeline" element={<ProgressTimeline />} />
                <Route path="/healing-timeline" element={clientOnly(<HealingTimeline />)} />
                <Route path="/mood-tracker" element={<MoodTracker />} />
                <Route path="/gamification" element={<GamificationHub />} />
                <Route path="/parts-dialogue" element={<FeatureGate feature="partsDialogue"><PartsDialogue /></FeatureGate>} />
                <Route path="/parts-relationships" element={<PartsRelationshipMap />} />
                <Route path="/unburdening" element={<FeatureGate feature="unburdening"><UnburdeningProtocol /></FeatureGate>} />
                <Route path="/assessment-builder" element={<AssessmentBuilder />} />
                <Route path="/custom-assessment/:assessmentId" element={<CustomAssessment />} />
                <Route path="/meditation" element={<FeatureGate feature="meditations"><GuidedMeditation /></FeatureGate>} />
                <Route path="/daily-checkin" element={<FeatureGate feature="dailyCheckin"><DailyCheckin /></FeatureGate>} />
                <Route path="/mood-analytics" element={clientOnly(<FeatureGate feature="moodAnalytics"><MoodAnalytics /></FeatureGate>)} />
                <Route path="/milestones" element={<FeatureGate feature="milestones"><Milestones /></FeatureGate>} />
                <Route path="/weekly-reflection" element={<FeatureGate feature="weeklyReflection"><WeeklyReflection /></FeatureGate>} />
                <Route path="/letters" element={<FeatureGate feature="letters"><LetterWriting /></FeatureGate>} />
                <Route path="/parts-cards" element={<FeatureGate feature="partsCards"><PartsCards /></FeatureGate>} />
                <Route path="/healing-tracker" element={<FeatureGate feature="healingTracker"><HealingTracker /></FeatureGate>} />
                <Route path="/test-client" element={<TestClientCreator />} />
                <Route path="/diagnostic" element={<PINAuthDiagnostic />} />
                <Route path="/auth-debug" element={<AuthDebug />} />
                <Route path="/sign-in/*" element={<Navigate to="/" replace />} />
                <Route path="/sign-up/*" element={<Navigate to="/" replace />} />
                <Route path="/claim-account" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Home clientId={currentClient?.id} />} />
              </Routes>
              </div>

              <BottomNav />
            </>
          )}
        </div>
  );
}

export default App;
