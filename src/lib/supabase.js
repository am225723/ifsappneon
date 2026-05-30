import { createNeonBackedSupabaseClient } from './neonClient.js';

// Backward-compatible client: existing app code can keep using
// supabase.from(...), while data now flows through /api/db -> Neon.
export const supabase = createNeonBackedSupabaseClient();

export const supabaseHelpers = {
  async saveModuleProgress(userId, moduleId, progress) {
    const progressData = {
      current_step: progress.currentStep ?? progress.current_step ?? 0,
      responses: progress.responses || {},
      completed_steps: progress.completedSteps ?? progress.completed_steps ?? [],
      completed: progress.isCompleted ?? progress.is_completed ?? progress.completed ?? false,
      updated_at: new Date().toISOString()
    };
    if (progress.completedAt || progress.completed_at) {
      progressData.completed_at = progress.completedAt || progress.completed_at;
    }

    const { data: existingRows } = await supabase
      .from('ifs_client_progress')
      .select('id')
      .eq('client_id', userId)
      .eq('module_id', moduleId)
      .order('updated_at', { ascending: false });

    const existing = existingRows?.[0] || null;

    if (existingRows && existingRows.length > 1) {
      const dupeIds = existingRows.slice(1).map(r => r.id);
      await supabase.from('ifs_client_progress').delete().in('id', dupeIds);
    }

    let data, error;
    if (existing) {
      ({ data, error } = await supabase
        .from('ifs_client_progress')
        .update(progressData)
        .eq('id', existing.id)
        .select());
    } else {
      ({ data, error } = await supabase
        .from('ifs_client_progress')
        .insert({ client_id: userId, module_id: moduleId, ...progressData })
        .select());
    }
    if (error) console.error('Error saving module progress:', error);
    return data;
  },

  async getModuleProgress(userId, moduleId) {
    const { data, error } = await supabase
      .from('ifs_client_progress')
      .select('*')
      .eq('client_id', userId)
      .eq('module_id', moduleId)
      .order('updated_at', { ascending: false })
      .maybeSingle();
    if (error) console.error('Error fetching module progress:', error);
    return data || null;
  },

  async getAllModuleProgress(userId) {
    const { data, error } = await supabase
      .from('ifs_client_progress')
      .select('*')
      .eq('client_id', userId);
    if (error) console.error('Error fetching all progress:', error);
    return data || [];
  },

  async saveInteractiveData(userId, moduleId, interactiveData) {
    const { error } = await supabase
      .from('ifs_interactive_data')
      .upsert({
        client_id: userId,
        module_id: moduleId,
        data: interactiveData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,module_id' });
    if (error) console.error('Error saving interactive data:', error);
    return !error;
  },

  async getInteractiveData(userId, moduleId) {
    const { data, error } = await supabase
      .from('ifs_interactive_data')
      .select('data')
      .eq('client_id', userId)
      .eq('module_id', moduleId)
      .single();
    if (error) console.error('Error fetching interactive data:', error);
    return data?.data || {};
  },

  async saveAssessment(userId, assessmentData) {
    const safeData = {
      client_id: userId,
      abandonment_score: assessmentData.abandonment_score || 0,
      shame_score: assessmentData.shame_score || 0,
      neglect_score: assessmentData.neglect_score || 0,
      betrayal_score: assessmentData.betrayal_score || 0,
      helplessness_score: assessmentData.helplessness_score || 0,
      primary_wound: assessmentData.primary_wound || null,
      secondary_wound: assessmentData.secondary_wound || null,
      tertiary_wounds: assessmentData.tertiary_wounds || [],
      responses: assessmentData.responses || assessmentData.answers || {},
      protector_types: assessmentData.protector_types || [],
      assessment_date: assessmentData.assessment_date || new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('ifs_assessment_results')
      .insert(safeData)
      .select();
    if (error) {
      console.error('Error saving assessment:', error);
      const { helplessness_score, ...fallbackData } = safeData;
      const { data: retryData, error: retryError } = await supabase
        .from('ifs_assessment_results')
        .insert(fallbackData)
        .select();
      if (retryError) {
        console.error('Retry save also failed:', retryError);
        return null;
      }
      return retryData;
    }
    return data;
  },

  async getAssessment(userId) {
    const { data, error } = await supabase
      .from('ifs_assessment_results')
      .select('*')
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.error('Error fetching assessment:', error);
    return data;
  },

  async saveJournalEntry(userId, entry) {
    const { data, error } = await supabase
      .from('ifs_journal_entries')
      .insert({
        client_id: userId,
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        tags: entry.tags || [],
        parts_identified: entry.partsIdentified,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) console.error('Error saving journal entry:', error);
    return data;
  },

  async deleteJournalEntry(entryId) {
    const { error } = await supabase
      .from('ifs_journal_entries')
      .delete()
      .eq('id', entryId);
    if (error) console.error('Error deleting journal entry:', error);
    return !error;
  },

  async getJournalEntries(userId) {
    const { data, error } = await supabase
      .from('ifs_journal_entries')
      .select('*')
      .eq('client_id', userId)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching journal entries:', error);
    return data || [];
  },

  async savePart(userId, partData) {
    const { data, error } = await supabase
      .from('ifs_parts')
      .upsert({
        client_id: userId,
        id: partData.id,
        name: partData.name,
        type: partData.type,
        role: partData.role,
        description: partData.description,
        triggers: partData.triggers,
        positive_intentions: partData.positiveIntentions,
        x: partData.x,
        y: partData.y,
        size: partData.size,
        color: partData.color,
        notes: partData.notes,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,id' });
    if (error) console.error('Error saving part:', error);
    return data;
  },

  async getParts(userId) {
    const { data, error } = await supabase
      .from('ifs_parts')
      .select('*')
      .eq('client_id', userId)
      .order('updated_at', { ascending: false });
    if (error) console.error('Error fetching parts:', error);
    return data || [];
  },

  async deletePart(userId, partId) {
    const { error } = await supabase
      .from('ifs_parts')
      .delete()
      .eq('client_id', userId)
      .eq('id', partId);
    if (error) console.error('Error deleting part:', error);
    return !error;
  },

  async saveExerciseProgress(userId, exerciseId, progress) {
    const { data, error } = await supabase
      .from('ifs_exercise_progress')
      .upsert({
        client_id: userId,
        exercise_id: exerciseId,
        completed: progress.completed,
        notes: progress.notes,
        completion_time: progress.completionTime,
        data: progress.data || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,exercise_id' });
    if (error) console.error('Error saving exercise progress:', error);
    return data;
  },

  async getExerciseProgress(userId) {
    const { data, error } = await supabase
      .from('ifs_exercise_progress')
      .select('*')
      .eq('client_id', userId);
    if (error) console.error('Error fetching exercise progress:', error);
    return data || [];
  },

  async getClientData(userId) {
    const { data, error } = await supabase
      .from('ifs_clients')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) console.error('Error fetching client data:', error);
    return data;
  },

  async saveClientData(userId, userData) {
    const { data, error } = await supabase
      .from('ifs_clients')
      .update({
        ...userData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    if (error) console.error('Error saving client data:', error);
    return data;
  },

  async saveUserData(userId, userData) {
    return this.saveClientData(userId, userData);
  },

  async saveModuleAnswers(userId, moduleId, stepId, answers) {
    const { data, error } = await supabase
      .from('ifs_module_answers')
      .upsert({
        client_id: userId,
        module_id: moduleId,
        step_id: stepId,
        answers: answers,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,module_id,step_id' });
    if (error) console.error('Error saving module answers:', error);
    return data;
  },

  async getModuleAnswers(userId, moduleId, stepId) {
    const { data, error } = await supabase
      .from('ifs_module_answers')
      .select('*')
      .eq('client_id', userId)
      .eq('module_id', moduleId)
      .eq('step_id', stepId)
      .single();
    if (error) console.error('Error fetching module answers:', error);
    return data?.answers || {};
  },

  async getAllModuleAnswers(userId, moduleId) {
    const { data, error } = await supabase
      .from('ifs_module_answers')
      .select('*')
      .eq('client_id', userId)
      .eq('module_id', moduleId);
    if (error) console.error('Error fetching all module answers:', error);
    return data || [];
  },

  async saveMoodEntry(userId, entry) {
    const { data, error } = await supabase
      .from('ifs_mood_entries')
      .insert({
        client_id: userId,
        mood: entry.mood,
        energy: entry.energy,
        emotions: entry.emotions || [],
        notes: entry.notes,
        date: entry.date || new Date().toISOString()
      })
      .select()
      .single();
    if (error) console.error('Error saving mood entry:', error);
    return data;
  },

  async getMoodEntries(userId) {
    const { data, error } = await supabase
      .from('ifs_mood_entries')
      .select('*')
      .eq('client_id', userId)
      .order('date', { ascending: false });
    if (error) console.error('Error fetching mood entries:', error);
    return data || [];
  },

  async saveTherapySession(userId, session) {
    const { data, error } = await supabase
      .from('ifs_therapy_sessions')
      .insert({
        client_id: userId,
        session_date: session.date,
        therapist_notes: session.therapistNotes,
        my_notes: session.myNotes,
        parts_discussed: session.partsDiscussed,
        insights: session.insights,
        next_session_goals: session.nextSessionGoals
      })
      .select()
      .single();
    if (error) console.error('Error saving therapy session:', error);
    return data;
  },

  async getTherapySessions(userId) {
    const { data, error } = await supabase
      .from('ifs_therapy_sessions')
      .select('*')
      .eq('client_id', userId)
      .order('session_date', { ascending: false });
    if (error) console.error('Error fetching therapy sessions:', error);
    return data || [];
  },

  async saveTherapyHomework(userId, hw) {
    const { data, error } = await supabase
      .from('ifs_therapy_homework')
      .insert({
        client_id: userId,
        title: hw.title,
        description: hw.description,
        due_date: hw.dueDate,
        completed: hw.completed || false
      })
      .select()
      .single();
    if (error) console.error('Error saving homework:', error);
    return data;
  },

  async updateTherapyHomework(homeworkId, updates) {
    const { data, error } = await supabase
      .from('ifs_therapy_homework')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', homeworkId)
      .select()
      .single();
    if (error) console.error('Error updating homework:', error);
    return data;
  },

  async getTherapyHomework(userId) {
    const { data, error } = await supabase
      .from('ifs_therapy_homework')
      .select('*')
      .eq('client_id', userId)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching homework:', error);
    return data || [];
  },

  async saveTherapyActivityProgress(userId, activityId, progressData) {
    const { data, error } = await supabase
      .from('ifs_therapy_activity_progress')
      .upsert({
        client_id: userId,
        activity_id: activityId,
        progress_data: progressData.data || {},
        completed: progressData.completed || false,
        reflections: progressData.reflections || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,activity_id' });
    if (error) console.error('Error saving activity progress:', error);
    return data;
  },

  async getTherapyActivityProgress(userId) {
    const { data, error } = await supabase
      .from('ifs_therapy_activity_progress')
      .select('*')
      .eq('client_id', userId);
    if (error) console.error('Error fetching activity progress:', error);
    return data || [];
  },

  async savePartsDialogue(userId, partId, messages) {
    const { data, error } = await supabase
      .from('ifs_parts_dialogue')
      .upsert({
        client_id: userId,
        part_id: partId,
        messages: messages,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id,part_id' });
    if (error) console.error('Error saving parts dialogue:', error);
    return data;
  },

  async getPartsDialogue(userId, partId) {
    const { data, error } = await supabase
      .from('ifs_parts_dialogue')
      .select('messages')
      .eq('client_id', userId)
      .eq('part_id', partId)
      .single();
    if (error) console.error('Error fetching parts dialogue:', error);
    return data?.messages || [];
  },

  async getAllPartsDialogues(userId) {
    const { data, error } = await supabase
      .from('ifs_parts_dialogue')
      .select('*')
      .eq('client_id', userId);
    if (error) console.error('Error fetching all dialogues:', error);
    return data || [];
  },

  async saveGamification(userId, gamData) {
    const { data, error } = await supabase
      .from('ifs_gamification')
      .upsert({
        client_id: userId,
        xp: gamData.xp || 0,
        level: gamData.level || 1,
        badges: gamData.badges || {},
        weekly_challenges: gamData.weeklyChallenges || [],
        streak_current: gamData.streakCurrent || 0,
        streak_longest: gamData.streakLongest || 0,
        last_login_date: gamData.lastLoginDate,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id' });
    if (error) console.error('Error saving gamification:', error);
    return data;
  },

  async getGamification(userId) {
    const { data, error } = await supabase
      .from('ifs_gamification')
      .select('*')
      .eq('client_id', userId)
      .single();
    if (error) console.error('Error fetching gamification:', error);
    return data;
  },

  async savePreferences(userId, prefs) {
    const { data, error } = await supabase
      .from('ifs_client_preferences')
      .upsert({
        client_id: userId,
        theme: prefs.theme || {},
        animations_enabled: prefs.animationsEnabled !== undefined ? prefs.animationsEnabled : true,
        animation_speed: prefs.animationSpeed || 'normal',
        favorite_affirmations: prefs.favoriteAffirmations || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id' });
    if (error) console.error('Error saving preferences:', error);
    return data;
  },

  async getPreferences(userId) {
    const { data, error } = await supabase
      .from('ifs_client_preferences')
      .select('*')
      .eq('client_id', userId)
      .single();
    if (error) console.error('Error fetching preferences:', error);
    return data;
  },

  async saveMilestone(userId, milestone) {
    const { data, error } = await supabase
      .from('ifs_milestones')
      .insert({
        client_id: userId,
        type: milestone.type,
        title: milestone.title,
        description: milestone.description,
        details: milestone.details,
        achieved_at: milestone.date || milestone.achieved_at || new Date().toISOString()
      })
      .select()
      .single();
    if (error) console.error('Error saving milestone:', error);
    return data;
  },

  async getMilestones(userId) {
    const { data, error } = await supabase
      .from('ifs_milestones')
      .select('*')
      .eq('client_id', userId)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching milestones:', error);
    return data || [];
  },

  async savePersonalizedCurriculum(userId, curriculumData) {
    const modules = curriculumData?.personalizedModules || curriculumData?.modules || [];
    if (modules.length === 0) return null;

    const truncate = (val, max) => (val && val.length > max ? val.substring(0, max) : val);
    const rows = modules.map((m, i) => ({
      client_id: userId,
      module_id: m.id || m.moduleId || `module_${i + 1}`,
      module_title: m.title || m.moduleTitle || `Module ${i + 1}`,
      module_order: i + 1,
      module_description: m.description || m.moduleDescription || '',
      customized_content: m.customizedContent || m.content || m.personalizedContent || {},
      primary_wound_focus: truncate(m.primaryWoundFocus || m.woundFocus || (m.personalizedContent?.woundFocus ? m.personalizedContent.woundFocus : null), 50),
      estimated_minutes: m.estimatedMinutes || m.duration || 30,
      difficulty_level: truncate(m.difficultyLevel || m.difficulty || 'beginner', 20),
      updated_at: new Date().toISOString()
    }));

    const { error: deleteError } = await supabase
      .from('ifs_personalized_curriculum')
      .delete()
      .eq('client_id', userId);
    if (deleteError) throw new Error('Failed to clear existing curriculum: ' + deleteError.message);

    const { data, error } = await supabase
      .from('ifs_personalized_curriculum')
      .insert(rows);
    if (error) throw new Error('Failed to save curriculum modules: ' + error.message);
    return data;
  },

  async getPersonalizedCurriculum(userId) {
    const { data, error } = await supabase
      .from('ifs_personalized_curriculum')
      .select('*')
      .eq('client_id', userId);
    if (error) console.error('Error fetching curriculum:', error);
    if (!data || data.length === 0) return null;
    return {
      personalizedModules: data
        .sort((a, b) => (a.module_order || 0) - (b.module_order || 0))
        .map(row => ({
          id: row.module_id,
          moduleId: row.module_id,
          title: row.module_title,
          moduleTitle: row.module_title,
          description: row.module_description || '',
          customizedContent: row.customized_content || {},
          primaryWoundFocus: row.primary_wound_focus,
          estimatedMinutes: row.estimated_minutes || 30,
          difficultyLevel: row.difficulty_level || 'beginner',
          order: row.module_order
        }))
    };
  },

  async saveTherapistFeedback(therapistId, clientId, feedback) {
    const { data, error } = await supabase
      .from('ifs_therapist_feedback')
      .insert({
        therapist_id: therapistId,
        client_id: clientId,
        module_id: feedback.moduleId,
        step_id: feedback.stepId,
        feedback: feedback.feedback,
        flagged: feedback.flagged || false
      })
      .select()
      .single();
    if (error) console.error('Error saving feedback:', error);
    return data;
  },

  async getTherapistFeedback(clientId) {
    const { data, error } = await supabase
      .from('ifs_therapist_feedback')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching feedback:', error);
    return data || [];
  },

  async saveTherapistNotes(therapistId, clientId, notes) {
    const { data, error } = await supabase
      .from('ifs_therapist_notes')
      .insert({
        therapist_id: therapistId,
        client_id: clientId,
        note_type: notes.noteType || 'session',
        content: notes.content,
        session_date: notes.sessionDate
      })
      .select()
      .single();
    if (error) console.error('Error saving therapist notes:', error);
    return data;
  },

  async getTherapistNotes(clientId) {
    const { data, error } = await supabase
      .from('ifs_therapist_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching therapist notes:', error);
    return data || [];
  },

  generateUserId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

export default supabase;
