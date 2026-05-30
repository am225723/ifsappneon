import { useState, useEffect } from 'react';
import {
  Bell, BellOff, Sun, ClipboardList, BookHeart,
  Sparkles, Calendar, MessageSquare, RefreshCw, Check, X, AlertTriangle
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { clientAuth } from '../lib/supabasePersonalization';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  REMINDER_CATEGORIES,
} from '../lib/pushNotifications';

const ICON_MAP = {
  Sun, ClipboardList, BookHeart, Sparkles, Calendar, MessageSquare,
};

export default function NotificationSettings() {
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const client = clientAuth.getCurrentClient();
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-slate-800/60' : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700/50' : 'border-gray-200';
  const toggleOnBg = 'bg-emerald-500';
  const toggleOffBg = isDark ? 'bg-slate-600' : 'bg-gray-300';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const prefs = await loadNotificationPreferences(client?.id);
      setPreferences(prefs);
      setPermissionStatus(getNotificationPermissionStatus());
      setLoading(false);
    };
    load();
  }, [client?.id]);

  const handleToggle = async (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    setSaving(true);
    setSaved(false);
    const success = await saveNotificationPreferences(client?.id, updated);
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleEnableNotifications = async () => {
    await requestNotificationPermission();
    setTimeout(() => {
      setPermissionStatus(getNotificationPermissionStatus());
    }, 500);
  };

  if (loading) {
    return (
      <div className={`${cardBg} rounded-2xl border ${cardBorder} p-6`}>
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${cardBg} rounded-2xl border ${cardBorder} overflow-hidden`}>
      <div className="p-5 border-b border-inherit">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-amber-900/50' : 'bg-amber-100'} flex items-center justify-center`}>
              <Bell className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <h3 className={`font-semibold ${textPrimary}`}>Notification Reminders</h3>
              <p className={`text-xs ${textMuted}`}>Choose what you'd like to be reminded about</p>
            </div>
          </div>
          {saving && <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />}
          {saved && <Check className="w-4 h-4 text-emerald-500" />}
        </div>
      </div>

      {permissionStatus === 'denied' && (
        <div className="px-5 pt-4">
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3.5">
            <BellOff className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Notifications Blocked</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Please enable notifications in your browser settings to receive reminders.
              </p>
            </div>
          </div>
        </div>
      )}

      {permissionStatus === 'default' && (
        <div className="px-5 pt-4">
          <button
            onClick={handleEnableNotifications}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-white text-sm font-medium hover:from-amber-600 hover:to-emerald-600 transition-all"
          >
            <Bell className="w-4 h-4" />
            Enable Push Notifications
          </button>
        </div>
      )}

      {permissionStatus === 'unsupported' && (
        <div className="px-5 pt-4">
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Not Available</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Push notifications aren't supported in this browser.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 space-y-1">
        {REMINDER_CATEGORIES.map((cat) => {
          const IconComp = ICON_MAP[cat.icon] || Bell;
          const isEnabled = preferences?.[cat.key] ?? false;

          return (
            <div
              key={cat.key}
              className={`flex items-center justify-between p-3.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <IconComp className={`w-5 h-5 flex-shrink-0 ${isEnabled ? 'text-amber-500' : textMuted}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${textPrimary}`}>{cat.label}</p>
                  <p className={`text-xs ${textMuted} truncate`}>{cat.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(cat.key)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${isEnabled ? toggleOnBg : toggleOffBg}`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
