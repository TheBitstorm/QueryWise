import React from 'react';
import { ShieldCheck, Cloud, Terminal } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] py-6 text-xs text-[#64748B] dark:text-[#94A3B8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center space-x-2">
          <span className="font-medium text-[#172033] dark:text-[#F1F5F9]">QueryWise</span>
          <span>•</span>
          <span>AI-Assisted Database Performance Intelligence Platform</span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#4ADE80]" />
            <span>Read-Only Sandbox</span>
          </div>

          <div className="flex items-center space-x-1">
            <Cloud className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
            <span>AWS Cloud Architecture</span>
          </div>
        </div>

      </div>
    </footer>
  );
}

