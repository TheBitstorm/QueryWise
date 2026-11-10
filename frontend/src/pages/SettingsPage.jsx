import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Cloud,
  FileCode2,
  Table
} from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await api.getHealth();
      setHealth(res);
    } catch (err) {
      setHealth({ status: 'unhealthy', error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="pb-2 border-b border-[#E2E8F0] dark:border-[#334155]">
        <h1 className="text-xl font-bold tracking-tight text-[#172033] dark:text-[#F1F5F9]">
          Platform Settings & Environment Diagnostics
        </h1>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
          Configuration profiles, database connectivity state, and AI runtime health.
        </p>
      </div>

      {/* 1. Theme Configuration */}
      <div className="rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9]">
            Theme Appearance
          </h2>
        </div>

        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-medium text-[#172033] dark:text-[#F1F5F9] block">
              Interface Color Mode
            </span>
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Select your preferred color theme. Saved automatically across sessions.
            </span>
          </div>

          <div className="flex items-center space-x-1.5 p-1 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0B1120]">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-white text-[#4F46E5] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Light</span>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-[#1E293B] text-[#818CF8] shadow-xs font-semibold'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-[#818CF8]" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Database Connection Diagnostics */}
      <div className="rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B]">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9]">
              Database Connection & Schema Status
            </h2>
          </div>

          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center space-x-1 text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="p-3 rounded-md bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">Connection State</span>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${health?.database?.connected ? 'bg-[#16A34A] dark:bg-[#4ADE80]' : 'bg-[#DC2626]'}`} />
                <span className="font-semibold text-xs text-[#172033] dark:text-[#F1F5F9]">
                  {health?.database?.connected ? 'Online & Responsive' : 'Connection Failed'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-md bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">Active Engine Type</span>
              <span className="font-semibold text-xs text-[#172033] dark:text-[#F1F5F9] block mt-1">
                {health?.database?.type || 'PostgreSQL Engine'}
              </span>
            </div>

            <div className="p-3 rounded-md bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">Round-Trip Ping Latency</span>
              <span className="font-mono font-bold text-xs text-[#0F766E] dark:text-[#2DD4BF] block mt-1">
                {health?.database?.latencyMs ?? 0} ms
              </span>
            </div>

          </div>

          {/* Seed Tables Summary */}
          {health?.database?.tableCounts && (
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase block mb-2">
                Evaluation Tables & Row Volumes
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                {Object.entries(health.database.tableCounts).map(([table, count]) => (
                  <div key={table} className="p-2.5 rounded border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] flex items-center justify-between">
                    <span className="text-[#64748B] dark:text-[#94A3B8] font-sans">{table}</span>
                    <span className="font-bold text-[#172033] dark:text-[#F1F5F9]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. AI Service Provider */}
      <div className="rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9]">
            AI Explanation Engine
          </h2>
        </div>

        <div className="p-4 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-md bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#334155]">
            <div>
              <span className="font-semibold text-[#172033] dark:text-[#F1F5F9] block">
                Active Provider: {health?.aiService?.provider}
              </span>
              <span className="text-[#64748B] dark:text-[#94A3B8] text-[11px]">
                {health?.aiService?.notice}
              </span>
            </div>

            <div className="shrink-0">
              {health?.aiService?.hasApiKey ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Gemini API Key Active</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <span>Deterministic Fallback Mode</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Application & Cloud Architecture Info */}
      <div className="rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center space-x-2">
          <Cloud className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9]">
            Project & Cloud Deployment Specifications
          </h2>
        </div>

        <div className="p-4 space-y-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-md border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0B1120]">
              <span className="font-semibold text-[#172033] dark:text-[#F1F5F9] block mb-1">
                College Project Details
              </span>
              <p className="text-[11px] leading-relaxed">
                QueryWise: AI-Assisted Database Performance Intelligence Platform. Developed by a team of 3 students for the Cloud Computing curriculum.
              </p>
            </div>

            <div className="p-3 rounded-md border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0B1120]">
              <span className="font-semibold text-[#172033] dark:text-[#F1F5F9] block mb-1">
                AWS Deployment Architecture
              </span>
              <p className="text-[11px] leading-relaxed">
                Configured for deployment on AWS App Runner or Elastic Beanstalk with Amazon RDS PostgreSQL. Containerized via Docker.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] dark:text-[#4ADE80]" />
            <span>Read-Only Sandbox Guard: Mutating statements (INSERT, UPDATE, DELETE, DROP) are strictly intercepted and blocked by the SQL validator.</span>
          </div>
        </div>
      </div>

    </div>
  );
}

