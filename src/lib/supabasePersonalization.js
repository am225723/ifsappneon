import { supabase } from './supabase';
import { generatePersonalizedCurriculum, rankWounds } from '../utils/curriculumPersonalizer';
import { tokenAuth } from './tokenAuth.js';

/**
 * Client Authentication & Management
 */
export const clientAuth = {
  /**
   * Authenticate client with PIN
   */
  async authenticateWithPIN(pin) {
    try {
      console.log('🔍 Starting PIN authentication for:', pin);
      
      // Validate PIN format
      if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        console.log('❌ Invalid PIN format:', pin);
        return { success: false, error: 'Invalid PIN format. Please enter 6 digits.' };
      }

      console.log('🔍 Querying ifs_clients table...');
      const { data, error } = await supabase
        .from('ifs_clients')
        .select('*')
        .eq('pin', pin)
        .eq('status', 'active');

      console.log('📊 Database response:', { data, error });

      if (error) {
        console.error('❌ Database error:', error);
        return { 
          success: false, 
          error: `Database error: ${error.message}`,
          details: error
        };
      }

      if (!data || data.length === 0) {
        console.log('❌ No client found with PIN:', pin);
        return { 
          success: false, 
          error: 'Invalid PIN. No active client found with this PIN.' 
        };
      }

      console.log('✅ Found clients:', data.length);
      
      // Handle multiple results - take the most recently created/updated
      const client = data.length === 1 ? data[0] : data.reduce((mostRecent, current) => {
        const mostRecentDate = new Date(mostRecent.created_at || mostRecent.updated_at);
        const currentDate = new Date(current.created_at || current.updated_at);
        return currentDate > mostRecentDate ? current : mostRecent;
      });

      console.log('✅ Selected client:', { id: client.id, name: client.name, pin: client.pin });

      // Update last active
      console.log('🔄 Updating last active timestamp...');
      const { error: updateError } = await supabase
        .from('ifs_clients')
        .update({ last_active: new Date().toISOString() })
        .eq('id', client.id);

      if (updateError) {
        console.warn('⚠️ Failed to update last_active:', updateError);
        // Don't fail authentication for this
      } else {
        console.log('✅ Updated last_active timestamp');
      }

      // Store client session
      console.log('💾 Storing client session...');
      localStorage.setItem('client_id', client.id);
      localStorage.setItem('client_pin', pin);
      localStorage.setItem('client_name', client.name);
      localStorage.setItem('client_user_role', client.user_role || 'client');
      if (client.access_restrictions) {
        localStorage.setItem('client_access_restrictions', JSON.stringify(client.access_restrictions));
      } else {
        localStorage.removeItem('client_access_restrictions');
      }

      console.log('✅ Authentication successful!');
      return { success: true, client };
    } catch (error) {
      console.error('💥 Unexpected authentication error:', error);
      return { 
        success: false, 
        error: `Authentication failed: ${error.message}`,
        details: error
      };
    }
  },

  /**
   * Get current client from session
   */
  getCurrentClient() {
    const clientId = localStorage.getItem('client_id');
    const clientName = localStorage.getItem('client_name');
    const clientPin = localStorage.getItem('client_pin');
    const userRole = localStorage.getItem('client_user_role');

    if (!clientId) return null;

    const rawRestrictions = localStorage.getItem('client_access_restrictions');
    let accessRestrictions = null;
    if (rawRestrictions) {
      try { accessRestrictions = JSON.parse(rawRestrictions); } catch (e) { /* ignore */ }
    }

    return {
      id: clientId,
      name: clientName,
      pin: clientPin,
      user_role: userRole || 'client',
      access_restrictions: accessRestrictions
    };
  },

  /**
   * Logout client
   */
  logout() {
    localStorage.removeItem('client_id');
    localStorage.removeItem('client_pin');
    localStorage.removeItem('client_name');
    localStorage.removeItem('client_user_role');
    localStorage.removeItem('client_access_restrictions');
  },

  /**
   * Authenticate with token parameter
   * @param {string} token - Token from URL parameter
   * @param {string} module - Module slug for validation
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateWithToken(token, module = 'ifs-program') {
    try {
      console.log('🔐 Starting token authentication...');

      // Validate token with external API
      const validation = await tokenAuth.validateToken(token, module);
      
      if (!validation.success || !validation.valid) {
        console.log('❌ Token validation failed:', validation);
        return {
          success: false,
          error: validation.error || 'Invalid or expired token'
        };
      }

      // Create client data from token validation
      const clientData = tokenAuth.createClientFromToken(validation);
      
      if (!clientData) {
        return {
          success: false,
          error: 'Failed to create client from token validation'
        };
      }

      localStorage.setItem('client_id', clientData.id);
      localStorage.setItem('client_name', clientData.name || '');
      localStorage.setItem('client_pin', clientData.pin || '');
      localStorage.setItem('client_user_role', clientData.user_role || 'client');
      if (clientData.access_restrictions) {
        localStorage.setItem('client_access_restrictions', JSON.stringify(clientData.access_restrictions));
      } else {
        localStorage.removeItem('client_access_restrictions');
      }
      
      tokenAuth.cleanTokenFromURL();

      console.log('✅ Token authentication successful:', { name: clientData.name });
      return {
        success: true,
        client: clientData
      };

    } catch (error) {
      console.error('❌ Token authentication error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Check for and handle token authentication from URL
   * @returns {Promise<Object|null>} Authentication result if token found, null otherwise
   */
  async handleTokenFromURL() {
    if (window.location.pathname === '/sso/callback') {
      return null;
    }
    const token = tokenAuth.extractTokenFromURL();
    
    if (!token) {
      console.log('🔍 No token found in URL');
      return null;
    }

    console.log('🔍 Found token in URL, attempting authentication...');
    return await this.authenticateWithToken(token);
  },

  /**
   * Check if current session is valid (handles token expiration)
   * @param {Object} client - Current client
   * @returns {boolean} True if session is valid
   */
  isSessionValid(client) {
    if (!client) {
      return false;
    }

    // Check token expiration
    if (client.token_auth && tokenAuth.isTokenExpired(client)) {
      console.log('⏰ Token session expired');
      return false;
    }

    return true;
  },

  /**
   * Get current client with session validation
   * @returns {Object|null} Current client if session is valid
   */
  getCurrentClientValidated() {
    const client = this.getCurrentClient();
    
    if (client && this.isSessionValid(client)) {
      return client;
    }

    // Clear invalid session
    if (client) {
      this.logout();
    }

    return null;
  },

  /**
   * Create new client (admin function)
   */
  async createClient(clientData) {
    try {
      console.log('🏗️ Creating new client:', clientData);
      
      // Generate unique 6-digit PIN
      let pin;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        pin = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`🎲 Generated PIN attempt ${attempts + 1}: ${pin}`);
        
        const { data: existingPin, error: checkError } = await supabase
          .from('ifs_clients')
          .select('id')
          .eq('pin', pin)
          .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ Error checking PIN uniqueness:', checkError);
          break;
        }
        
        if (!existingPin || attempts >= maxAttempts) {
          console.log(`✅ Found unique PIN: ${pin}`);
          break; // Found unique PIN or max attempts reached
        }
        console.log(`🔄 PIN ${pin} already exists, trying again...`);
        attempts++;
      } while (true);

      console.log('💾 Inserting new client into database...');
      const { data, error } = await supabase
        .from('ifs_clients')
        .insert({
          pin,
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          therapist_notes: clientData.notes,
          user_role: clientData.role || 'client',
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error inserting client:', error);
        throw error;
      }

      console.log('✅ Client created successfully:', { id: data.id, name: data.name, pin });
      return { success: true, client: data, pin };
    } catch (error) {
      console.error('💥 Error creating client:', error);
      return { success: false, error: error.message, details: error };
    }
  },

  /**
   * Check for duplicate PINs (admin function)
   */
  async findDuplicatePINs() {
    try {
      const { data, error } = await supabase
        .from('ifs_clients')
        .select('pin, id, name, status, created_at')
        .eq('status', 'active');

      if (error) throw error;

      // Find PINs that appear more than once
      const pinCounts = {};
      const duplicates = [];

      data.forEach(client => {
        pinCounts[client.pin] = (pinCounts[client.pin] || 0) + 1;
      });

      Object.entries(pinCounts).forEach(([pin, count]) => {
        if (count > 1) {
          const duplicateClients = data.filter(client => client.pin === pin);
          duplicates.push({
            pin,
            count,
            clients: duplicateClients
          });
        }
      });

      return { success: true, duplicates };
    } catch (error) {
      console.error('Error finding duplicate PINs:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fix duplicate PINs by reassigning new PINs (admin function)
   */
  async fixDuplicatePINs() {
    try {
      const { success, duplicates } = await this.findDuplicatePINs();
      
      if (!success) {
        return { success: false, error: 'Could not find duplicates' };
      }

      const fixedClients = [];

      for (const duplicate of duplicates) {
        // Keep the oldest client with this PIN, reassign others
        const clientsToKeep = duplicate.clients.sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        ).slice(1); // Keep the oldest, reassign the rest

        for (const client of clientsToKeep) {
          // Generate new unique PIN
          let newPin;
          let attempts = 0;
          
          do {
            newPin = Math.floor(100000 + Math.random() * 900000).toString();
            const { data: existingPin } = await supabase
              .from('ifs_clients')
              .select('id')
              .eq('pin', newPin)
              .single();
            
            if (!existingPin || attempts >= 10) {
              break;
            }
            attempts++;
          } while (true);

          // Update the client with new PIN
          const { data: updatedClient, error: updateError } = await supabase
            .from('ifs_clients')
            .update({ pin: newPin })
            .eq('id', client.id)
            .select()
            .single();

          if (!updateError) {
            fixedClients.push({
              id: client.id,
              name: client.name,
              oldPin: client.pin,
              newPin
            });
          }
        }
      }

      return { success: true, fixedClients };
    } catch (error) {
      console.error('Error fixing duplicate PINs:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Assessment Management
 */
export const assessmentManager = {
  /**
   * Save assessment results
   */
  async saveAssessmentResults(clientId, assessmentData) {
    try {
      // Calculate wound rankings
      const rankedWounds = rankWounds(assessmentData);

      const { data, error } = await supabase
        .from('ifs_assessment_results')
        .insert({
          client_id: clientId,
          abandonment_score: assessmentData.abandonment_score,
          shame_score: assessmentData.shame_score,
          neglect_score: assessmentData.neglect_score,
          betrayal_score: assessmentData.betrayal_score,
          helplessness_score: assessmentData.helplessness_score || 0,
          primary_wound: rankedWounds[0].type,
          secondary_wound: rankedWounds[1].type,
          tertiary_wounds: rankedWounds.slice(2).map(w => w.type),
          responses: assessmentData.responses,
          protector_types: assessmentData.protector_types || [],
          assessment_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, assessment: data };
    } catch (error) {
      console.error('Error saving assessment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get latest assessment for client
   */
  async getLatestAssessment(clientId) {
    try {
      const { data, error } = await supabase
        .from('ifs_assessment_results')
        .select('*')
        .eq('client_id', clientId)
        .order('assessment_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return { success: true, assessment: data };
    } catch (error) {
      console.error('Error fetching assessment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all assessments for client (track progress over time)
   */
  async getAllAssessments(clientId) {
    try {
      const { data, error } = await supabase
        .from('ifs_assessment_results')
        .select('*')
        .eq('client_id', clientId)
        .order('assessment_date', { ascending: false });

      if (error) throw error;

      return { success: true, assessments: data || [] };
    } catch (error) {
      console.error('Error fetching assessments:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Personalized Curriculum Management
 */
export const curriculumManager = {
  /**
   * Generate and save personalized curriculum
   */
  async generateAndSaveCurriculum(clientId, assessmentResults, baseModules) {
    try {
      // Generate personalized curriculum
      const personalizedCurriculum = generatePersonalizedCurriculum(
        assessmentResults,
        baseModules
      );

      // Save each module to database
      const modulePromises = personalizedCurriculum.modules.map((module, index) => {
        return supabase
          .from('ifs_personalized_curriculum')
          .upsert({
            client_id: clientId,
            assessment_id: assessmentResults.id,
            module_id: module.id,
            module_order: index + 1,
            module_title: module.title,
            module_description: module.description,
            customized_content: module,
            original_module_id: module.id.replace('personalized-', ''),
            primary_wound_focus: (module.primaryWoundFocus || '').substring(0, 50) || null,
            customization_notes: `Customized for ${personalizedCurriculum.woundProfile.primary.customization.title}`,
            estimated_minutes: module.estimatedMinutes || 30,
            difficulty_level: index < 2 ? 'beginner' : index < 4 ? 'intermediate' : 'advanced',
            prerequisite_modules: index > 0 ? [personalizedCurriculum.modules[index - 1].id] : []
          }, {
            onConflict: 'client_id,module_id'
          });
      });

      await Promise.all(modulePromises);

      return { success: true, curriculum: personalizedCurriculum };
    } catch (error) {
      console.error('Error generating curriculum:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get personalized curriculum for client
   */
  async getPersonalizedCurriculum(clientId) {
    try {
      const { data, error } = await supabase
        .from('ifs_personalized_curriculum')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return { success: true, modules: data || [] };
    } catch (error) {
      console.error('Error fetching curriculum:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get specific module
   */
  async getModule(clientId, moduleId) {
    try {
      const { data, error } = await supabase
        .from('ifs_personalized_curriculum')
        .select('*')
        .eq('client_id', clientId)
        .eq('module_id', moduleId)
        .single();

      if (error) throw error;

      return { success: true, module: data };
    } catch (error) {
      console.error('Error fetching module:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Progress Tracking
 */
export const progressTracker = {
  /**
   * Save module progress
   */
  async saveModuleProgress(clientId, moduleId, progressData) {
    try {
      const { data, error } = await supabase
        .from('ifs_client_progress')
        .upsert({
          client_id: clientId,
          module_id: moduleId,
          activity_id: progressData.activityId,
          activity_type: progressData.activityType,
          current_step: progressData.currentStep,
          total_steps: progressData.totalSteps,
          completed_steps: progressData.completedSteps || [],
          completed: progressData.completed || false,
          responses: progressData.responses || {},
          client_notes: progressData.notes,
          insights: progressData.insights,
          started_at: progressData.startedAt || new Date().toISOString(),
          completed_at: progressData.completed ? new Date().toISOString() : null,
          time_spent_minutes: progressData.timeSpent,
          last_accessed: new Date().toISOString()
        }, {
          onConflict: 'client_id,module_id,activity_id'
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, progress: data };
    } catch (error) {
      console.error('Error saving progress:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get module progress
   */
  async getModuleProgress(clientId, moduleId) {
    try {
      const { data, error } = await supabase
        .from('ifs_client_progress')
        .select('*')
        .eq('client_id', clientId)
        .eq('module_id', moduleId);

      if (error) throw error;

      return { success: true, progress: data || [] };
    } catch (error) {
      console.error('Error fetching progress:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all progress for client
   */
  async getAllProgress(clientId) {
    try {
      const { data, error } = await supabase
        .from('ifs_client_progress')
        .select('*')
        .eq('client_id', clientId)
        .order('last_accessed', { ascending: false });

      if (error) throw error;

      return { success: true, progress: data || [] };
    } catch (error) {
      console.error('Error fetching all progress:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get completion statistics
   */
  async getCompletionStats(clientId) {
    try {
      // Get all progress
      const { data: progressData, error: progressError } = await supabase
        .from('ifs_client_progress')
        .select('module_id, completed')
        .eq('client_id', clientId);

      if (progressError) throw progressError;

      // Get all modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('ifs_personalized_curriculum')
        .select('module_id')
        .eq('client_id', clientId);

      if (modulesError) throw modulesError;

      const totalModules = modulesData?.length || 0;
      const completedActivities = progressData?.filter(p => p.completed).length || 0;
      const uniqueModulesStarted = new Set(progressData?.map(p => p.module_id)).size;
      const completedModules = progressData?.filter(p => p.completed)
        .map(p => p.module_id)
        .filter((v, i, a) => a.indexOf(v) === i).length || 0;

      return {
        success: true,
        stats: {
          totalModules,
          completedModules,
          modulesStarted: uniqueModulesStarted,
          completedActivities,
          overallProgress: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0
        }
      };
    } catch (error) {
      console.error('Error fetching completion stats:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Parts Management
 */
export const partsManager = {
  /**
   * Save identified part
   */
  async savePart(clientId, partData) {
    try {
      const { data, error } = await supabase
        .from('ifs_parts')
        .upsert({
          client_id: clientId,
          part_name: partData.name,
          part_type: partData.type,
          role: partData.role,
          description: partData.description,
          age_of_part: partData.age,
          visual_representation: partData.visualization,
          triggers: partData.triggers || [],
          behaviors: partData.behaviors || [],
          positive_intentions: partData.positiveIntentions || [],
          burdens: partData.burdens || [],
          origin_story: partData.originStory,
          trust_level: partData.trustLevel || 5,
          willingness_to_unblend: partData.willingnessToUnblend || 5,
          unburdening_status: partData.unburdeningStatus || 'not_started',
          related_wound: partData.relatedWound,
          discovered_in_module: partData.discoveredInModule,
          is_active: true
        }, {
          onConflict: 'client_id,part_name'
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, part: data };
    } catch (error) {
      console.error('Error saving part:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all parts for client
   */
  async getAllParts(clientId) {
    try {
      const { data, error } = await supabase
        .from('ifs_parts')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return { success: true, parts: data || [] };
    } catch (error) {
      console.error('Error fetching parts:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update part unburdening status
   */
  async updateUnburdeningStatus(clientId, partName, status, notes) {
    try {
      const { data, error } = await supabase
        .from('ifs_parts')
        .update({
          unburdening_status: status,
          unburdening_date: status === 'completed' ? new Date().toISOString() : null,
          transformation_notes: notes
        })
        .eq('client_id', clientId)
        .eq('part_name', partName)
        .select()
        .single();

      if (error) throw error;

      return { success: true, part: data };
    } catch (error) {
      console.error('Error updating unburdening status:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Journal Management
 */
export const journalManager = {
  /**
   * Save journal entry
   */
  async saveEntry(clientId, entryData) {
    try {
      const { data, error } = await supabase
        .from('ifs_journal_entries')
        .insert({
          client_id: clientId,
          title: entryData.title,
          content: entryData.content,
          mood: entryData.mood,
          mood_intensity: entryData.moodIntensity,
          emotions: entryData.emotions || [],
          parts_identified: entryData.partsIdentified || [],
          parts_dialogue: entryData.partsDialogue || {},
          related_wound: entryData.relatedWound,
          related_module: entryData.relatedModule,
          tags: entryData.tags || [],
          is_breakthrough: entryData.isBreakthrough || false,
          is_private: false,
          shared_with_therapist: true
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, entry: data };
    } catch (error) {
      console.error('Error saving journal entry:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all journal entries
   */
  async getAllEntries(clientId) {
    try {
      const { data, error } = await supabase
        .from('ifs_journal_entries')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, entries: data || [] };
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get entries by wound type
   */
  async getEntriesByWound(clientId, woundType) {
    try {
      const { data, error } = await supabase
        .from('ifs_journal_entries')
        .select('*')
        .eq('client_id', clientId)
        .eq('related_wound', woundType)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, entries: data || [] };
    } catch (error) {
      console.error('Error fetching wound-specific entries:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Milestones Management
 */
export const milestonesManager = {
  /**
   * Record milestone achievement
   */
  async recordMilestone(clientId, milestoneData) {
    try {
      const { data, error } = await supabase
        .from('ifs_milestones')
        .insert({
          client_id: clientId,
          milestone_type: milestoneData.type,
          title: milestoneData.title,
          description: milestoneData.description,
          related_module: milestoneData.relatedModule,
          related_wound: milestoneData.relatedWound,
          related_part: milestoneData.relatedPart,
          celebration_message: milestoneData.celebrationMessage,
          badge_earned: milestoneData.badge,
          points_earned: milestoneData.points || 0
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, milestone: data };
    } catch (error) {
      console.error('Error recording milestone:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all milestones
   */
  async getAllMilestones(clientId) {
    try {
      const { data, error } = await supabase
        .from('ifs_milestones')
        .select('*')
        .eq('client_id', clientId)
        .order('achieved_at', { ascending: false });

      if (error) throw error;

      return { success: true, milestones: data || [] };
    } catch (error) {
      console.error('Error fetching milestones:', error);
      return { success: false, error: error.message };
    }
  }
};

export default {
  clientAuth,
  assessmentManager,
  curriculumManager,
  progressTracker,
  partsManager,
  journalManager,
  milestonesManager
};