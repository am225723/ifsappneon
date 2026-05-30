import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Palette, Sparkles, Zap, Moon, Sun, Check, Play } from 'lucide-react';
import { useTheme, themePresets } from '../contexts/ThemeContext';
import NotificationSettings from '../components/NotificationSettings';

export default function Settings() {
  const { 
    theme, 
    selectTheme, 
    animationsEnabled, 
    setAnimationsEnabled,
    animationSpeed,
    setAnimationSpeed,
    getAnimationClass 
  } = useTheme();

  const speedOptions = [
    { id: 'slow', label: 'Relaxed', description: 'Gentle, slow transitions' },
    { id: 'normal', label: 'Normal', description: 'Balanced speed' },
    { id: 'fast', label: 'Quick', description: 'Faster responsiveness' }
  ];

  return (
    <div className={`min-h-screen ${theme.isDark ? 'text-slate-100' : ''}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          to="/" 
          className={`inline-flex items-center gap-2 ${theme.isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} mb-8 ${getAnimationClass('transition')}`}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${theme.isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            Personalize Your Experience
          </h1>
          <p className={theme.isDark ? 'text-slate-300' : 'text-gray-600'}>
            Customize colors and animations to create a space that feels safe and supportive for your healing journey.
          </p>
        </div>

        <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6 mb-8 ${getAnimationClass('transition')}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-xl ${theme.isDark ? 'bg-amber-900/50' : 'bg-amber-100'}`}>
              <Palette className={`w-6 h-6 ${theme.isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>Color Theme</h2>
              <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Choose colors that resonate with you</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(themePresets).map((preset) => (
              <button
                key={preset.id}
                onClick={() => selectTheme(preset.id)}
                className={`relative p-4 rounded-xl border-2 text-left ${getAnimationClass('transition')} ${getAnimationClass('hover')} ${
                  theme.id === preset.id 
                    ? 'ring-2' 
                    : `border-transparent ${preset.isDark ? 'bg-slate-800' : 'bg-gray-50'} hover:border-gray-200`
                }`}
                style={theme.id === preset.id ? { 
                  borderColor: preset.accentColor,
                  boxShadow: `0 0 0 2px ${preset.accentColor}30`
                } : {}}
              >
                {theme.id === preset.id && (
                  <div 
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: preset.accentColor }}
                  >
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`w-full h-12 rounded-lg bg-gradient-to-br ${preset.primary} mb-3 border ${preset.isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                  <div className={`h-full w-1/3 rounded-l-lg bg-gradient-to-r ${preset.headerBg}`}></div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  {preset.isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <h3 className={`font-medium ${preset.isDark && theme.id !== preset.id ? 'text-slate-300' : ''}`}>{preset.name}</h3>
                </div>
                <p className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6 mb-8 ${getAnimationClass('transition')}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-xl ${theme.isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
              <Sparkles className={`w-6 h-6 ${theme.isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>Animations</h2>
              <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Control motion and transitions</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-medium ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>Enable Animations</h3>
                <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Turn off if you prefer reduced motion
                </p>
              </div>
              <button
                onClick={() => setAnimationsEnabled(!animationsEnabled)}
                className={`relative w-14 h-8 rounded-full transition-colors`}
                style={{ backgroundColor: animationsEnabled ? theme.accentColor : (theme.isDark ? '#475569' : '#D1D5DB') }}
              >
                <span 
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    animationsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {animationsEnabled && (
              <div>
                <h3 className={`font-medium ${theme.isDark ? 'text-white' : 'text-gray-900'} mb-3`}>Animation Speed</h3>
                <div className="grid grid-cols-3 gap-3">
                  {speedOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setAnimationSpeed(option.id)}
                      className={`p-3 rounded-xl border-2 text-center ${getAnimationClass('transition')} ${
                        animationSpeed === option.id
                          ? ''
                          : `border-transparent ${theme.isDark ? 'bg-slate-700' : 'bg-gray-50'}`
                      }`}
                      style={{ borderColor: animationSpeed === option.id ? theme.accentColor : 'transparent' }}
                    >
                      <Zap className={`w-5 h-5 mx-auto mb-1 ${
                        option.id === 'slow' ? 'opacity-40' : option.id === 'fast' ? 'opacity-100' : 'opacity-70'
                      }`} />
                      <span className={`text-sm font-medium ${theme.isDark ? 'text-white' : ''}`}>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <NotificationSettings />
        </div>

        <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6 ${getAnimationClass('transition')}`}>
          <h3 className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Preview</h3>
          <div className={`bg-gradient-to-br ${theme.primary} rounded-xl p-6 border ${theme.isDark ? 'border-slate-600' : 'border-gray-200'}`}>
            <div className={`bg-gradient-to-r ${theme.headerBg} rounded-lg p-4 mb-4`}>
              <h4 className="text-white font-medium">Sample Header</h4>
            </div>
            <div className={`${theme.cardBg} rounded-lg p-4 ${getAnimationClass('transition')} ${getAnimationClass('hover')} cursor-pointer`}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.accentColor + '20' }}
                >
                  <Play className="w-5 h-5" style={{ color: theme.accentColor }} />
                </div>
                <div>
                  <p className={`font-medium ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>Sample Card</p>
                  <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Hover to see animation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
