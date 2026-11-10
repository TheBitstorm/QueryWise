import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import {
  Database,
  BarChart2,
  Terminal,
  GitCompare,
  History,
  Settings,
  Sun,
  Moon,
  Cpu,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.getHealth()
      .then(res => {
        if (isMounted) setHealth(res);
      })
      .catch(() => {
        if (isMounted) setHealth({ status: 'unreachable' });
      });
    return () => { isMounted = false; };
  }, []);

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: BarChart2 },
    { to: '/analyzer', label: 'Query Analyzer', icon: Terminal },
    { to: '/compare', label: 'Comparison', icon: GitCompare },
    { to: '/history', label: 'History', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] dark:border-[#334155] bg-white/95 dark:bg-[#111827]/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5] dark:bg-[#818CF8] flex items-center justify-center text-white shadow-sm">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight text-[#172033] dark:text-[#F1F5F9]">
                Query<span className="text-[#4F46E5] dark:text-[#818CF8]">Wise</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase rounded bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#334155]">
                Intelligence
              </span>
            </div>
          </Link>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#F1F5F9] dark:bg-[#1E293B] text-[#4F46E5] dark:text-[#818CF8] font-semibold'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Status Indicators & Theme Switcher */}
        <div className="flex items-center space-x-3">
          
          {/* Database Engine Status Pill */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8]">
            <span className={`w-2 h-2 rounded-full ${health?.database?.connected ? 'bg-[#16A34A] dark:bg-[#4ADE80]' : 'bg-[#DC2626] dark:bg-[#F87171]'}`} />
            <span>{health?.database?.type?.includes('RDS') ? 'AWS RDS' : 'PostgreSQL 16'}</span>
          </div>

          {/* AI Status Pill */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8]">
            <Cpu className="w-3 h-3 text-[#0F766E] dark:text-[#2DD4BF]" />
            <span>{health?.aiService?.hasApiKey ? 'Gemini AI' : 'Rule Engine'}</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="p-2 rounded-md text-[#64748B] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F1F5F9] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#FBBF24]" />
            ) : (
              <Moon className="w-4 h-4 text-[#4F46E5]" />
            )}
          </button>
        </div>

      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden flex border-t border-[#E2E8F0] dark:border-[#334155] px-2 py-1 bg-[#F8FAFC] dark:bg-[#0B1120] overflow-x-auto space-x-1">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-white dark:bg-[#1E293B] text-[#4F46E5] dark:text-[#818CF8] font-semibold shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`
            }
          >
            <Icon className="w-3 h-3" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </header>
  );
}

