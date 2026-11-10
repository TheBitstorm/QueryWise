import React from 'react';
import {
  Sparkles,
  Info,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';

export default function AiExplanationCard({ explanation }) {
  if (!explanation) return null;

  const {
    isAiGenerated,
    provider,
    summary,
    whySlow,
    planBreakdown,
    issuesExplained = [],
    howOptimizationHelps,
    nextSteps = [],
  } = explanation;

  return (
    <div className="rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] overflow-hidden shadow-xs">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B]">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded flex items-center justify-center bg-[#4F46E5]/10 dark:bg-[#818CF8]/20 text-[#4F46E5] dark:text-[#818CF8]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9]">
            AI Performance Intelligence & Explanation
          </h3>
        </div>

        {/* Provider Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <Cpu className="w-3 h-3 text-[#4F46E5] dark:text-[#818CF8]" />
          <span>{provider || (isAiGenerated ? 'Google Gemini AI' : 'Deterministic Engine')}</span>
        </div>
      </div>

      <div className="p-5 space-y-5 text-xs text-[#172033] dark:text-[#F1F5F9]">
        
        {/* 1. What the query does */}
        <div>
          <div className="flex items-center space-x-1.5 font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1 uppercase tracking-wider text-[11px]">
            <Info className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
            <span>Query Operation Summary</span>
          </div>
          <p className="text-sm leading-relaxed text-[#172033] dark:text-[#F1F5F9] font-normal">
            {summary}
          </p>
        </div>

        {/* 2. Why the query may be slow */}
        <div className="p-3.5 rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40">
          <div className="flex items-center space-x-1.5 font-semibold text-amber-800 dark:text-amber-300 mb-1 uppercase tracking-wider text-[11px]">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Root Cause & Bottleneck Analysis</span>
          </div>
          <p className="leading-relaxed text-amber-900 dark:text-amber-200/90">
            {whySlow}
          </p>
        </div>

        {/* 3. Execution Plan Breakdown */}
        <div>
          <h4 className="font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1 uppercase tracking-wider text-[11px]">
            Execution Plan Walkthrough
          </h4>
          <p className="leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
            {planBreakdown}
          </p>
        </div>

        {/* 4. What detected issues mean */}
        {issuesExplained.length > 0 && (
          <div>
            <h4 className="font-semibold text-[#64748B] dark:text-[#94A3B8] mb-2 uppercase tracking-wider text-[11px]">
              Detected Issues Explained in Plain Terms
            </h4>
            <div className="space-y-2">
              {issuesExplained.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0B1120]">
                  <span className="font-semibold text-[#172033] dark:text-[#F1F5F9] block mb-0.5">
                    {item.issueName}
                  </span>
                  <span className="text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                    {item.plainLanguageMeaning}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. How optimization helps */}
        <div className="p-3.5 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40">
          <div className="flex items-center space-x-1.5 font-semibold text-emerald-800 dark:text-emerald-300 mb-1 uppercase tracking-wider text-[11px]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Expected Mechanical Optimization Benefit</span>
          </div>
          <p className="leading-relaxed text-emerald-900 dark:text-emerald-200/90">
            {howOptimizationHelps}
          </p>
        </div>

        {/* 6. Actionable next steps */}
        {nextSteps.length > 0 && (
          <div>
            <h4 className="font-semibold text-[#64748B] dark:text-[#94A3B8] mb-2 uppercase tracking-wider text-[11px]">
              Recommended Next Steps
            </h4>
            <ul className="space-y-1.5">
              {nextSteps.map((step, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#4ADE80] mt-0.5 shrink-0" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

