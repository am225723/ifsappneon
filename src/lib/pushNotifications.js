import { supabase } from './supabase';
import { clientAuth } from './supabasePersonalization';

const DEFAULT_PREFERENCES = {
  dailyCheckin: true,
  homeworkReminders: true,
  journalStreak: true,
  meditationReminders: false,
  weeklyReflection: true,
  advisorMessages: true,
};

export async function initializePushNotifications(client) {
  if (!client?.id) return;

  try {
    if (typeof window === 'undefined' || !window.OneSignalDeferred) return;

    window.OneSignalDeferred.push(async function (OneSignal) {
      const permission = await OneSignal.Notifications.permission;
      if (!permission) {
        await OneSignal.Notifications.requestPermission();
      }

      await OneSignal.login(client.id);

      await OneSignal.User.addTags({
        user_role: client.user_role || 'client',
        client_name: client.name || '',
        app_version: '1.0',
      });
    });
  } catch (err) {
    console.warn('Push notification init skipped:', err.message);
  }
}

export async function updatePushTags(tags) {
  try {
    if (!window.OneSignalDeferred) return;
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.User.addTags(tags);
    });
  } catch (err) {
    console.warn('Failed to update push tags:', err.message);
  }
}

export async function loadNotificationPreferences(clientId) {
  if (!clientId) return { ...DEFAULT_PREFERENCES };

  try {
    const { data, error } = await supabase
      .from('ifs_clients')
      .select('notification_preferences')
      .eq('id', clientId)
      .single();

    if (!error && data?.notification_preferences) {
      return { ...DEFAULT_PREFERENCES, ...data.notification_preferences };
    }

    const localPrefs = localStorage.getItem(`notification_prefs_${clientId}`);
    if (localPrefs) {
      try {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(localPrefs) };
      } catch {}
    }

    return { ...DEFAULT_PREFERENCES };
  } catch {
    const localPrefs = localStorage.getItem(`notification_prefs_${clientId}`);
    if (localPrefs) {
      try {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(localPrefs) };
      } catch {}
    }
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function saveNotificationPreferences(clientId, preferences) {
  if (!clientId) return false;

  try {
    const { error } = await supabase
      .from('ifs_clients')
      .update({ notification_preferences: preferences })
      .eq('id', clientId);

    if (error) {
      if (error.message?.includes('notification_preferences') || error.code === '42703') {
        localStorage.setItem(`notification_prefs_${clientId}`, JSON.stringify(preferences));
        console.warn('notification_preferences column not yet available, saved to localStorage');
      } else {
        console.error('Failed to save notification preferences:', error);
      }
      return false;
    }

    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async function (OneSignal) {
        const tagUpdates = {};
        Object.entries(preferences).forEach(([key, enabled]) => {
          tagUpdates[`pref_${key}`] = enabled ? '1' : '0';
        });
        await OneSignal.User.addTags(tagUpdates);
      });
    }

    return true;
  } catch (err) {
    console.error('Failed to save notification preferences:', err);
    return false;
  }
}

export function requestNotificationPermission() {
  return new Promise((resolve) => {
    try {
      if (!window.OneSignalDeferred) { resolve(false); return; }
      window.OneSignalDeferred.push(async function (OneSignal) {
        try {
          const granted = await OneSignal.Notifications.requestPermission();
          resolve(granted);
        } catch {
          resolve(false);
        }
      });
    } catch {
      resolve(false);
    }
  });
}

export function getNotificationPermissionStatus() {
  try {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
}

export const REMINDER_CATEGORIES = [
  {
    key: 'dailyCheckin',
    label: 'Daily Check-In',
    description: 'A gentle reminder to complete your daily Self-energy check-in',
    icon: 'Sun',
  },
  {
    key: 'homeworkReminders',
    label: 'Homework Due',
    description: 'Reminders when you have assignments approaching their due date',
    icon: 'ClipboardList',
  },
  {
    key: 'journalStreak',
    label: 'Journal Streak',
    description: "Keep your journaling streak alive with a daily nudge",
    icon: 'BookHeart',
  },
  {
    key: 'meditationReminders',
    label: 'Meditation Practice',
    description: 'Reminders to take a moment for guided meditation',
    icon: 'Sparkles',
  },
  {
    key: 'weeklyReflection',
    label: 'Weekly Reflection',
    description: 'A weekly prompt to review your progress and insights',
    icon: 'Calendar',
  },
  {
    key: 'advisorMessages',
    label: 'Advisor Messages',
    description: 'Get notified when your advisor sends you a message',
    icon: 'MessageSquare',
  },
];
