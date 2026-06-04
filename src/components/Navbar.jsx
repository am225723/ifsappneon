import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Sparkles, User, MessageSquare, Heart, Menu, X, Compass, Grid3X3 } from 'lucide-react';
import { useState } from 'react';

const Navbar = ({ unreadCount = 0, messagePath = '/inbox', rightSlot = null, workspaceLinks = [] }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = workspaceLinks.length ? [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/tools', icon: Grid3X3, label: 'Tools' },
    { path: messagePath, icon: MessageSquare, label: 'Messages', badge: unreadCount },
    { path: '/profile', icon: Heart, label: 'Profile' },
  ] : [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/curriculum', icon: BookOpen, label: 'Curriculum' },
    { path: '/life-integration', icon: Sparkles, label: 'Daily Life' },
    { path: '/journal', icon: User, label: 'Journal' },
    { path: '/parts-mapping', icon: Compass, label: 'Parts' },
    { path: messagePath, icon: MessageSquare, label: 'Advisor Support', badge: unreadCount },
    { path: '/tools', icon: Grid3X3, label: 'Tools' },
    { path: '/profile', icon: Heart, label: 'Profile' },
  ];

  const modeLinks = workspaceLinks.filter(Boolean);

  return (
    <nav className="bg-white/80 dark:bg-brand-midnight/80 backdrop-blur-md border-b border-brand-stone-200/30 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-gold-500 to-brand-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-gold-500/20 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="text-xl font-serif font-semibold tracking-tight text-brand-stone-900 dark:text-slate-100">
              The Luminous Self
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {modeLinks.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-emerald-50 dark:bg-brand-emerald-950/30 text-brand-emerald-700 dark:text-brand-emerald-100'
                      : 'text-brand-stone-500 dark:text-slate-400 hover:text-brand-stone-900 dark:hover:text-slate-100 hover:bg-brand-stone-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center space-x-2 px-5 py-2.5 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-gold-50 dark:bg-brand-gold-950/30 text-brand-gold-700 dark:text-brand-gold-500'
                      : 'text-brand-stone-500 dark:text-slate-400 hover:text-brand-stone-900 dark:hover:text-slate-100 hover:bg-brand-stone-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-brand-emerald-600 rounded-full px-1">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-1">{rightSlot}</div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2.5 rounded-xl text-brand-stone-600 dark:text-slate-400 hover:bg-brand-stone-100 dark:hover:bg-slate-800"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-6 space-y-2 animate-in slide-in-from-top duration-300">
            {modeLinks.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`relative flex items-center space-x-3 px-4 py-4 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-emerald-50 dark:bg-brand-emerald-950/30 text-brand-emerald-700 dark:text-brand-emerald-100'
                      : 'text-brand-stone-600 dark:text-slate-400 hover:bg-brand-stone-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="font-semibold">{item.label}</span>
                </Link>
              );
            })}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`relative flex items-center space-x-3 px-4 py-4 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-gold-50 dark:bg-brand-gold-950/30 text-brand-gold-700 dark:text-brand-gold-500'
                      : 'text-brand-stone-600 dark:text-slate-400 hover:bg-brand-stone-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center text-[10px] font-bold text-white bg-brand-emerald-600 rounded-full px-1.5">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            {rightSlot && (
              <div className="flex items-center gap-1 px-1 pt-3 border-t border-brand-stone-200/50 dark:border-slate-800/60">
                {rightSlot}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
