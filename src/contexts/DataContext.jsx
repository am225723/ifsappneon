import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [userId, setUserId] = useState(() => {
    const client = clientAuth.getCurrentClient();
    return client?.id || null;
  });
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const client = clientAuth.getCurrentClient();
      const currentId = client?.id || null;
      if (currentId && currentId !== userId) {
        setUserId(currentId);
        initializeUser();
      } else if (!currentId && userId) {
        setUserId(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userId]);

  const initializeUser = async () => {
    try {
      setLoading(true);
      const client = clientAuth.getCurrentClient();
      if (client?.id) {
        setUserId(client.id);
        await supabaseHelpers.saveUserData(client.id, {
          last_active: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error initializing user:', err);
      const client = clientAuth.getCurrentClient();
      if (client?.id) setUserId(client.id);
    } finally {
      setLoading(false);
      setIsReady(true);
    }
  };

  const awardXP = useCallback(async (action, amount) => {
    if (!userId) return;
    try {
      const data = await supabaseHelpers.getGamification(userId);
      const currentXP = data?.xp || 0;
      const newXP = currentXP + amount;
      const newLevel = Math.min(Math.floor(newXP / 500) + 1, 10);
      const badges = data?.badges || {};
      
      const ensureBadge = (id) => {
        if (!badges[id]) badges[id] = { unlocked: false, progress: 0 };
      };
      
      if (action === 'module_complete') {
        ensureBadge('module_1');
        ensureBadge('knowledge_seeker');
        ensureBadge('all_modules');
        badges.module_1 = { unlocked: true, progress: 1 };
        badges.knowledge_seeker.progress = (badges.knowledge_seeker.progress || 0) + 1;
        if (badges.knowledge_seeker.progress >= 5) badges.knowledge_seeker.unlocked = true;
        badges.all_modules.progress = (badges.all_modules.progress || 0) + 1;
        if (badges.all_modules.progress >= 8) badges.all_modules.unlocked = true;
      }
      if (action === 'journal_entry') {
        ensureBadge('journal_keeper');
        badges.journal_keeper.progress = (badges.journal_keeper.progress || 0) + 1;
        if (badges.journal_keeper.progress >= 15) badges.journal_keeper.unlocked = true;
      }
      if (action === 'assessment_complete') {
        ensureBadge('first_assessment');
        ensureBadge('wound_healer');
        badges.first_assessment = { unlocked: true, progress: 1 };
        badges.wound_healer.progress = (badges.wound_healer.progress || 0) + 1;
        if (badges.wound_healer.progress >= 3) badges.wound_healer.unlocked = true;
      }
      if (action === 'exercise_complete') {
        ensureBadge('exercises_10');
        badges.exercises_10.progress = (badges.exercises_10.progress || 0) + 1;
        if (badges.exercises_10.progress >= 10) badges.exercises_10.unlocked = true;
      }
      if (action === 'parts_mapped') {
        ensureBadge('parts_explorer');
        badges.parts_explorer.progress = (badges.parts_explorer.progress || 0) + 1;
        if (badges.parts_explorer.progress >= 5) badges.parts_explorer.unlocked = true;
      }

      await supabaseHelpers.saveGamification(userId, {
        xp: newXP,
        level: newLevel,
        badges,
        streakCurrent: data?.streak_current || 1,
        streakLongest: data?.streak_longest || 1,
        lastLoginDate: data?.last_login_date || new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      console.error('Error awarding XP:', err);
    }
  }, [userId]);

  const saveModuleProgress = useCallback(async (moduleId, progress) => {
    if (!userId) return;
    try {
      await supabaseHelpers.saveModuleProgress(userId, moduleId, progress);
    } catch (err) {
      console.error('Error saving module progress:', err);
    }
  }, [userId]);

  const getModuleProgress = useCallback(async (moduleId) => {
    if (!userId) return null;
    try {
      return await supabaseHelpers.getModuleProgress(userId, moduleId);
    } catch (err) {
      console.error('Error getting module progress:', err);
      return null;
    }
  }, [userId]);

  const getAllModuleProgress = useCallback(async () => {
    if (!userId) return [];
    try {
      return await supabaseHelpers.getAllModuleProgress(userId);
    } catch (err) {
      console.error('Error getting all progress:', err);
      return [];
    }
  }, [userId]);

  const saveInteractiveData = useCallback(async (moduleId, data) => {
    if (!userId) return;
    try {
      await supabaseHelpers.saveInteractiveData(userId, moduleId, data);
    } catch (err) {
      console.error('Error saving interactive data:', err);
    }
  }, [userId]);

  const getInteractiveData = useCallback(async (moduleId) => {
    if (!userId) return {};
    try {
      return await supabaseHelpers.getInteractiveData(userId, moduleId);
    } catch (err) {
      console.error('Error getting interactive data:', err);
      return {};
    }
  }, [userId]);

  const saveAssessment = useCallback(async (assessmentData) => {
    if (!userId) return null;
    try {
      return await supabaseHelpers.saveAssessment(userId, { ...assessmentData, user_id: userId });
    } catch (err) {
      console.error('Error saving assessment:', err);
      return null;
    }
  }, [userId]);

  const getAssessment = useCallback(async () => {
    if (!userId) return null;
    try {
      return await supabaseHelpers.getAssessment(userId);
    } catch (err) {
      console.error('Error getting assessment:', err);
      return null;
    }
  }, [userId]);

  const saveJournalEntry = useCallback(async (entry) => {
    if (!userId) return null;
    try {
      return await supabaseHelpers.saveJournalEntry(userId, entry);
    } catch (err) {
      console.error('Error saving journal entry:', err);
      return null;
    }
  }, [userId]);

  const getJournalEntries = useCallback(async () => {
    if (!userId) return [];
    try {
      return await supabaseHelpers.getJournalEntries(userId);
    } catch (err) {
      console.error('Error getting journal entries:', err);
      return [];
    }
  }, [userId]);

  const savePart = useCallback(async (partData) => {
    if (!userId) return null;
    try {
      return await supabaseHelpers.savePart(userId, partData);
    } catch (err) {
      console.error('Error saving part:', err);
      return null;
    }
  }, [userId]);

  const getParts = useCallback(async () => {
    if (!userId) return [];
    try {
      return await supabaseHelpers.getParts(userId);
    } catch (err) {
      console.error('Error getting parts:', err);
      return [];
    }
  }, []);

  const saveModuleAnswers = useCallback(async (moduleId, stepId, answers) => {
    if (!userId) return null;
    try {
      return await supabaseHelpers.saveModuleAnswers(userId, moduleId, stepId, {
        ...answers,
        savedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error saving module answers:', err);
      return null;
    }
  }, [userId]);

  const getModuleAnswers = useCallback(async (moduleId, stepId) => {
    if (!userId) return {};
    try {
      return await supabaseHelpers.getModuleAnswers(userId, moduleId, stepId);
    } catch (err) {
      console.error('Error getting module answers:', err);
      return {};
    }
  }, [userId]);

  const getAllModuleAnswers = useCallback(async (moduleId) => {
    if (!userId) return [];
    try {
      return await supabaseHelpers.getAllModuleAnswers(userId, moduleId);
    } catch (err) {
      console.error('Error getting all module answers:', err);
      return [];
    }
  }, [userId]);

  const saveExerciseProgress = useCallback(async (exerciseId, progress) => {
    if (!userId) return null;
    try {
      return await supabaseHelpers.saveExerciseProgress(userId, exerciseId, progress);
    } catch (err) {
      console.error('Error saving exercise progress:', err);
      return null;
    }
  }, [userId]);

  const getExerciseProgress = useCallback(async () => {
    if (!userId) return [];
    try {
      return await supabaseHelpers.getExerciseProgress(userId);
    } catch (err) {
      console.error('Error getting exercise progress:', err);
      return [];
    }
  }, [userId]);

  const clearAllData = useCallback(() => {
    setUserId(null);
    initializeUser();
  }, []);

  const value = {
    userId,
    loading,
    error,
    saveModuleProgress,
    getModuleProgress,
    getAllModuleProgress,
    saveInteractiveData,
    getInteractiveData,
    saveAssessment,
    getAssessment,
    saveJournalEntry,
    getJournalEntries,
    savePart,
    getParts,
    saveExerciseProgress,
    getExerciseProgress,
    saveModuleAnswers,
    getModuleAnswers,
    getAllModuleAnswers,
    clearAllData,
    awardXP,
    initializeUser,
    isReady,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;
