import React, { useState } from 'react';
import {
  Layers,
  FileText,
  CornerDownRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  Filter,
  KeyRound,
  ArrowUpDown
} from 'lucide-react';

export default function PlanVisualizer({ plan, rawPlanText, flattenedNodes }) {
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'raw'

  const rootPlan = plan?.Plan || (Array.isArray(plan) ? plan[0]?.Plan : plan);

  const getNodeBadge = (nodeType, hasFilter, rowsRemoved) => {
    switch (nodeType) {
      case 'Seq Scan':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
            rowsRemoved > 50
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
          }`}>
            Sequential Scan
          </span>
        );
      case 'Index Scan':
      case 'Index Only Scan':
      case 'Bitmap Index Scan':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            {nodeType}
          </span>
        );
      case 'Sort':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
            Sort
          </span>
        );
      case 'Hash Join':
      case 'Merge Join':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
            {nodeType}
          </span>
        );
      case 'Nested Loop':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700">
            Nested Loop Join
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {nodeType}
          </span>
        );
    }
  };

  /**
   * Recursive node renderer for tree structure
   */
  const renderNode = (node, depth = 0, isLast = true) => {
    if (!node) return null;

    const nodeType = node['Node Type'];
    const relation = node['Relation Name'];
    const totalCost = node['Total Cost'];
    const actualTime = node['Actual Total Time'];
    const actualRows = node['Actual Rows'];
    const planRows = node['Plan Rows'];
    const filter = node['Filter'];
    const rowsRemoved = node['Rows Removed by Filter'] || 0;
    const indexName = node['Index Name'];
    const sortKey = node['Sort Key'];
    const isExpensive = rowsRemoved > 50 || (actualTime && actualTime > 15) || totalCost > 50;

    return (
      <div key={`${nodeType}-${depth}-${Math.random()}`} className="relative">
        <div
          className={`p-3.5 my-2 rounded-lg border transition-all ${
            isExpensive
              ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 shadow-xs'
              : 'bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-[#334155]'
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              {depth > 0 && <CornerDownRight className="w-3.5 h-3.5 text-[#94A3B8]" />}
              {getNodeBadge(nodeType, Boolean(filter), rowsRemoved)}
              
              {relation && (
                <span className="font-mono text-xs font-semibold text-[#172033] dark:text-[#F1F5F9]">
                  on {relation}
                </span>
              )}

              {indexName && (
                <span className="flex items-center space-x-1 text-[11px] font-mono text-[#0F766E] dark:text-[#2DD4BF]">
                  <KeyRound className="w-3 h-3" />
                  <span>({indexName})</span>
                </span>
              )}
            </div>

            {/* Metrics Chips */}
            <div className="flex items-center space-x-3 text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
              <div className="flex items-center space-x-1" title="Node Total Cost">
                <Coins className="w-3 h-3 text-[#D97706] dark:text-[#FBBF24]" />
                <span>Cost: {totalCost?.toFixed(1) || '0'}</span>
              </div>

              {actualTime !== null && actualTime !== undefined && (
                <div className="flex items-center space-x-1" title="Actual Execution Time">
                  <Clock className="w-3 h-3 text-[#4F46E5] dark:text-[#818CF8]" />
                  <span>Time: {actualTime?.toFixed(2)}ms</span>
                </div>
              )}

              <div className="flex items-center space-x-1" title="Rows Processed">
                <span>Rows: {actualRows ?? planRows ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Details / Warnings */}
          {(filter || sortKey || rowsRemoved > 0) && (
            <div className="mt-2.5 pt-2 border-t border-[#E2E8F0]/70 dark:border-[#334155]/70 space-y-1 text-xs">
              {filter && (
                <div className="flex items-start space-x-1.5 text-slate-700 dark:text-slate-300">
                  <Filter className="w-3.5 h-3.5 mt-0.5 text-[#64748B] dark:text-[#94A3B8] shrink-0" />
                  <span className="font-mono text-[11px] break-all">
                    Filter: <span className="text-[#0F766E] dark:text-[#2DD4BF]">{filter}</span>
                  </span>
                </div>
              )}

              {rowsRemoved > 0 && (
                <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-400 font-medium text-[11px]">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{rowsRemoved} rows read from disk and discarded by filter (indicates missing index).</span>
                </div>
              )}

              {sortKey && (
                <div className="flex items-center space-x-1.5 text-purple-700 dark:text-purple-300 text-[11px]">
                  <ArrowUpDown className="w-3 h-3 shrink-0" />
                  <span className="font-mono">Sort Key: {Array.isArray(sortKey) ? sortKey.join(', ') : sortKey}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Render child plans */}
        {Array.isArray(node.Plans) && node.Plans.map((child, idx) =>
          renderNode(child, depth + 1, idx === node.Plans.length - 1)
        )}
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] overflow-hidden">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B]">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9]">
            PostgreSQL Execution Plan
          </h3>
        </div>

        <div className="flex items-center space-x-1 bg-white dark:bg-[#111827] p-0.5 rounded-md border border-[#E2E8F0] dark:border-[#334155]">
          <button
            onClick={() => setViewMode('visual')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'visual'
                ? 'bg-[#4F46E5] dark:bg-[#818CF8] text-white shadow-xs'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Structured Tree</span>
          </button>

          <button
            onClick={() => setViewMode('raw')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'raw'
                ? 'bg-[#4F46E5] dark:bg-[#818CF8] text-white shadow-xs'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Raw Text Plan</span>
          </button>
        </div>
      </div>

      {/* Plan Body */}
      <div className="p-4">
        {viewMode === 'visual' ? (
          <div>
            {rootPlan ? (
              renderNode(rootPlan, 0, true)
            ) : (
              <div className="py-8 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                No structured plan nodes available.
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#0B1120] text-[#F1F5F9] p-4 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed border border-[#334155]">
            {rawPlanText || JSON.stringify(plan, null, 2)}
          </div>
        )}
      </div>
    </div>
  );
}

