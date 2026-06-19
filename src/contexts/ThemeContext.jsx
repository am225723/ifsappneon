import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const themePresets = {
  calm: {
    id: 'calm',
    name: 'Calm Waters',
    description: 'Peaceful blues and soft transitions',
    primary: 'from-blue-50 via-cyan-50/30 to-teal-50/30',
    accent: 'blue',
    accentColor: '#3B82F6',
    headerBg: 'from-blue-600/90 to-cyan-600/90',
    cardBg: 'bg-white/80',
    animation: 'gentle',
    pageBackground: 'linear-gradient(135deg, #eff6ff 0%, #ecfeff 48%, #f0fdfa 100%)',
    surfaceBackground: '#ffffffcc',
    textPrimary: '#111827'
  },
  nurturing: {
    id: 'nurturing',
    name: 'Nurturing Garden',
    description: 'Warm greens for growth and healing',
    primary: 'from-emerald-50 via-green-50/30 to-lime-50/30',
    accent: 'emerald',
    accentColor: '#10B981',
    headerBg: 'from-emerald-600/90 to-green-600/90',
    cardBg: 'bg-white/80',
    animation: 'bloom',
    pageBackground: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #f7fee7 100%)',
    surfaceBackground: '#ffffffcc',
    textPrimary: '#111827'
  },
  warmth: {
    id: 'warmth',
    name: 'Inner Warmth',
    description: 'Comforting amber and coral tones',
    primary: 'from-amber-50 via-orange-50/30 to-rose-50/30',
    accent: 'amber',
    accentColor: '#F59E0B',
    headerBg: 'from-amber-500/90 to-orange-500/90',
    cardBg: 'bg-white/80',
    animation: 'warm',
    pageBackground: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 50%, #fff1f2 100%)',
    surfaceBackground: '#ffffffcc',
    textPrimary: '#111827'
  },
  sanctuary: {
    id: 'sanctuary',
    name: 'Safe Sanctuary',
    description: 'Deep purples for inner peace',
    primary: 'from-slate-50 via-purple-50/30 to-pink-50/30',
    accent: 'purple',
    accentColor: '#8B5CF6',
    headerBg: 'from-purple-600/90 to-pink-600/90',
    cardBg: 'bg-white/80',
    animation: 'gentle',
    pageBackground: 'linear-gradient(135deg, #f8fafc 0%, #faf5ff 50%, #fdf2f8 100%)',
    surfaceBackground: '#ffffffcc',
    textPrimary: '#111827'
  },
  night: {
    id: 'night',
    name: 'Peaceful Night',
    description: 'Dark mode for evening reflection',
    primary: 'from-slate-900 via-slate-800 to-indigo-900',
    accent: 'indigo',
    accentColor: '#6366F1',
    headerBg: 'from-slate-800/95 to-indigo-900/95',
    cardBg: 'bg-slate-800/80',
    textColor: 'text-slate-100',
    animation: 'subtle',
    isDark: true,
    pageBackground: 'linear-gradient(135deg, #0b0f19 0%, #111827 52%, #1e1b4b 100%)',
    surfaceBackground: '#141b2dcc',
    textPrimary: '#f8fafc'
  }
};

const darkTextMap = {
  'text-gray-900': 'text-slate-100',
  'text-gray-800': 'text-slate-100',
  'text-gray-700': 'text-slate-200',
  'text-gray-600': 'text-slate-300',
  'text-gray-500': 'text-slate-400',
  'text-slate-900': 'text-slate-100',
  'text-slate-800': 'text-slate-100',
  'text-slate-700': 'text-slate-200',
  'text-slate-600': 'text-slate-300',
  'bg-white/80': 'bg-slate-800/80',
  'bg-white': 'bg-slate-800',
  'bg-white/70': 'bg-slate-800/70',
  'bg-white/60': 'bg-slate-800/60',
  'bg-gray-50': 'bg-slate-800/50',
  'bg-gray-100': 'bg-slate-700/50',
  'border-gray-200': 'border-slate-600',
  'border-gray-100': 'border-slate-700',
};

const animationStyles = {
  gentle: {
    slow: { transition: 'transition-all duration-700 ease-out', hover: 'hover:scale-[1.02] hover:shadow-lg' },
    normal: { transition: 'transition-all duration-500 ease-out', hover: 'hover:scale-[1.02] hover:shadow-lg' },
    fast: { transition: 'transition-all duration-200 ease-out', hover: 'hover:scale-[1.02] hover:shadow-lg' }
  },
  bloom: {
    slow: { transition: 'transition-all duration-500 ease-in-out', hover: 'hover:scale-105 hover:shadow-xl hover:rotate-1' },
    normal: { transition: 'transition-all duration-300 ease-in-out', hover: 'hover:scale-105 hover:shadow-xl hover:rotate-1' },
    fast: { transition: 'transition-all duration-150 ease-in-out', hover: 'hover:scale-105 hover:shadow-xl hover:rotate-1' }
  },
  warm: {
    slow: { transition: 'transition-all duration-600 ease-out', hover: 'hover:scale-[1.03] hover:shadow-lg' },
    normal: { transition: 'transition-all duration-400 ease-out', hover: 'hover:scale-[1.03] hover:shadow-lg' },
    fast: { transition: 'transition-all duration-200 ease-out', hover: 'hover:scale-[1.03] hover:shadow-lg' }
  },
  subtle: {
    slow: { transition: 'transition-all duration-400', hover: 'hover:brightness-110' },
    normal: { transition: 'transition-all duration-200', hover: 'hover:brightness-110' },
    fast: { transition: 'transition-all duration-100', hover: 'hover:brightness-110' }
  }
};

function normalizeTheme(themeLike) {
  if (!themeLike) return themePresets.warmth;
  if (typeof themeLike === 'string') return themePresets[themeLike] || themePresets.warmth;
  if (themeLike.id && themePresets[themeLike.id]) {
    return { ...themePresets[themeLike.id], ...themeLike };
  }
  return themeLike;
}

function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return;

  const resolvedTheme = normalizeTheme(theme);
  const root = document.documentElement;
  const body = document.body;
  const isDark = !!resolvedTheme.isDark;

  root.classList.toggle('dark', isDark);
  root.dataset.ifsTheme = resolvedTheme.id || 'custom';
  root.style.colorScheme = isDark ? 'dark' : 'light';
  root.style.setProperty('--ifs-accent', resolvedTheme.accentColor || '#F59E0B');
  root.style.setProperty('--ifs-page-bg', resolvedTheme.pageBackground || (isDark ? themePresets.night.pageBackground : themePresets.warmth.pageBackground));
  root.style.setProperty('--ifs-surface-bg', resolvedTheme.surfaceBackground || (isDark ? '#141b2dcc' : '#ffffffcc'));
  root.style.setProperty('--ifs-text-primary', resolvedTheme.textPrimary || (isDark ? '#f8fafc' : '#111827'));

  if (body) {
    body.classList.toggle('dark', isDark);
    body.dataset.ifsTheme = resolvedTheme.id || 'custom';
    body.style.background = 'var(--ifs-page-bg)';
    body.style.color = 'var(--ifs-text-primary)';
  }
}

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(themePresets.warmth);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState('normal');
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    const localThemeId = localStorage.getItem('ifs-theme-id');
    if (localThemeId && themePresets[localThemeId]) {
      setCurrentTheme(themePresets[localThemeId]);
      applyThemeToDocument(themePresets[localThemeId]);
    } else {
      applyThemeToDocument(themePresets.warmth);
    }
    loadPreferences();
  }, []);

  useEffect(() => {
    applyThemeToDocument(currentTheme);
    localStorage.setItem('ifs-theme-id', currentTheme.id || 'custom');
  }, [currentTheme]);

  useEffect(() => {
    if (prefsLoaded) {
      savePreferences();
    }
  }, [currentTheme, animationsEnabled, animationSpeed, prefsLoaded]);

  const loadPreferences = async () => {
    try {
      const { clientAuth } = await import('../lib/supabasePersonalization');
      const client = clientAuth.getCurrentClient();
      if (!client?.id) { setPrefsLoaded(true); return; }
      const { supabaseHelpers } = await import('../lib/supabase');
      const prefs = await supabaseHelpers.getPreferences(client.id);
      if (prefs) {
        if (prefs.theme && Object.keys(prefs.theme).length > 0) setCurrentTheme(normalizeTheme(prefs.theme));
        if (prefs.animations_enabled !== null && prefs.animations_enabled !== undefined) setAnimationsEnabled(prefs.animations_enabled);
        if (prefs.animation_speed) setAnimationSpeed(prefs.animation_speed);
      }
    } catch (e) {
      console.error('Error loading theme preferences:', e);
    } finally {
      setPrefsLoaded(true);
    }
  };

  const savePreferences = async () => {
    try {
      const { clientAuth } = await import('../lib/supabasePersonalization');
      const client = clientAuth.getCurrentClient();
      if (!client?.id) return;
      const { supabaseHelpers } = await import('../lib/supabase');
      await supabaseHelpers.savePreferences(client.id, {
        theme: currentTheme,
        animationsEnabled,
        animationSpeed
      });
    } catch (e) {
      console.error('Error saving theme preferences:', e);
    }
  };

  const selectTheme = (themeId) => {
    if (themePresets[themeId]) {
      setCurrentTheme(themePresets[themeId]);
    }
  };

  const getAnimationClass = (type = 'transition') => {
    if (!animationsEnabled) return '';
    const styleGroup = animationStyles[currentTheme.animation] || animationStyles.gentle;
    const speedStyles = styleGroup[animationSpeed] || styleGroup.normal;
    return speedStyles[type] || '';
  };

  const tc = (lightClass) => {
    if (!currentTheme.isDark) return lightClass;
    return darkTextMap[lightClass] || lightClass;
  };

  const value = {
    theme: currentTheme,
    themes: themePresets,
    selectTheme,
    animationsEnabled,
    setAnimationsEnabled,
    animationSpeed,
    setAnimationSpeed,
    getAnimationClass,
    tc
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { themePresets };
