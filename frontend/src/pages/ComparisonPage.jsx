import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import SqlEditor from '../components/SqlEditor';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  GitCompare,
  Play,
  ArrowRight,
  TrendingUp,
  Clock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Zap,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function ComparisonPage() {
  const location = useLocation();

  // Preset comparison pairs
  const presetComparisons = [
    {
      id: 'preset-unindexed-vs-indexed',
      title: 'Sequential Scan vs Point Index Lookup',
      original: `SELECT id, order_number, user_id, status, total_amount, created_at\nFROM demo_orders\nWHERE status = 'pending'\n  AND total_amount > 1500.00;`,
      optimized: `SELECT id, username, full_name, email, role, country\nFROM demo_users\nWHERE id = 42;`,
    },
    {
      id: 'preset-select-star',
      title: 'SELECT * Wildcard vs Selective Column Projection',
      original: `SELECT *\nFROM demo_products\nWHERE category = 'Electronics'\nORDER BY price DESC;`,
      optimized: `SELECT id, sku, name, price\nFROM demo_products\nWHERE category = 'Electronics'\nORDER BY price DESC;`,
    },
    {
      id: 'preset-in-subquery',
      title: 'WHERE IN Subquery vs Explicit JOIN',
      original: `SELECT id, order_number, total_amount\nFROM demo_orders\nWHERE user_id IN (\n  SELECT id FROM demo_users WHERE country = 'Germany'\n);`,
      optimized: `SELECT o.id, o.order_number, o.total_amount\nFROM demo_orders o\nJOIN demo_users u ON o.user_id = u.id\nWHERE u.country = 'Germany';`,
    },
  ];

  const [originalSql, setOriginalSql] = useState(
    location.state?.originalSql || presetComparisons[0].original
  );
  const [optimizedSql, setOptimizedSql] = useState(
    location.state?.optimizedSql || presetComparisons[0].optimized
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);

  // If passed from Analyzer page navigation
  useEffect(() => {
    if (location.state?.originalSql && location.state?.optimizedSql) {
      setOriginalSql(location.state.originalSql);
      setOptimizedSql(location.state.optimizedSql);
    }
  }, [location.state]);

  const handleSelectPreset = (e) => {
    const preset = presetComparisons.find(p => p.id === e.target.value);
    if (preset) {
      setOriginalSql(preset.original);
      setOptimizedSql(preset.optimized);
      setComparisonResult(null);
      setError(null);
    }
  };

  const handleCompare = async () => {
    if (!originalSql.trim() || !optimizedSql.trim()) {
      setError('Please provide valid SQL statements in both the Original and Optimized editors.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.compareQueries(originalSql, optimizedSql);
      setComparisonResult(res.data);
    } catch (err) {
      setError(err.message || 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  const comparison = comparisonResult?.comparison;
  const original = comparisonResult?.original;
  const optimized = comparisonResult?.optimized;

  // Chart data preparation
  const timeChartData = comparisonResult ? [
    {
      name: 'Execution Time (ms)',
      Original: original?.metrics?.executionTimeMs ?? 0,
      Optimized: optimized?.metrics?.executionTimeMs ?? 0,
    }
  ] : [];

  const costChartData = comparisonResult ? [
    {
      name: 'Estimated Cost',
      Original: original?.metrics?.estimatedCost ?? 0,
      Optimized: optimized?.metrics?.estimatedCost ?? 0,
    }
  ] : [];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-[#334155]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172033] dark:text-[#F1F5F9]">
            Query Performance Comparison
          </h1>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Evaluate original vs refactored SQL under identical PostgreSQL execution conditions.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">Preset:</span>
          <select
            onChange={handleSelectPreset}
            defaultValue=""
            className="text-xs rounded-md border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] text-[#172033] dark:text-[#F1F5F9] px-2.5 py-1.5 focus:ring-1 focus:ring-[#4F46E5] outline-none"
          >
            <option value="" disabled>Load Preset Comparison...</option>
            {presetComparisons.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dual SQL Editors Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Original Query Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#172033] dark:text-[#F1F5F9]">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Original Query (Baseline)</span>
            </span>
          </div>
          <SqlEditor
            value={originalSql}
            onChange={setOriginalSql}
            placeholder="Enter original query..."
            height="h-56"
            label="Baseline SQL"
          />
        </div>

        {/* Optimized Query Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#172033] dark:text-[#F1F5F9]">
            <span className="flex items-center space-x-1.5 text-[#4F46E5] dark:text-[#818CF8]">
              <span className="w-2 h-2 rounded-full bg-[#4F46E5] dark:bg-[#818CF8]" />
              <span>Optimized / Candidate Query</span>
            </span>
          </div>
          <SqlEditor
            value={optimizedSql}
            onChange={setOptimizedSql}
            placeholder="Enter optimized query..."
            height="h-56"
            label="Candidate SQL"
          />
        </div>

      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleCompare}
          disabled={loading}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-md text-xs font-semibold bg-[#4F46E5] dark:bg-[#818CF8] text-white hover:bg-indigo-700 dark:hover:bg-indigo-500 disabled:opacity-60 shadow-xs transition-colors"
        >
          <GitCompare className="w-4 h-4" />
          <span>{loading ? 'Evaluating Queries...' : 'Analyse Both in PostgreSQL'}</span>
        </button>

        <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
          Executes both queries with warm-up buffer cache under identical isolation.
        </span>
      </div>

      {error && (
        <div className="p-3.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="space-y-6 pt-2">
          
          {/* Top Comparison KPI Hero Card */}
          <div className="p-5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0] dark:divide-[#334155]">
              
              {/* Latency Improvement */}
              <div className="flex flex-col items-center justify-center p-2 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Latency Improvement
                </span>
                <div className={`text-3xl font-extrabold tracking-tight ${
                  comparison.timeImprovementPct > 0
                    ? 'text-[#16A34A] dark:text-[#4ADE80]'
                    : comparison.timeImprovementPct < 0
                    ? 'text-[#DC2626] dark:text-[#F87171]'
                    : 'text-[#64748B]'
                }`}>
                  {comparison.timeImprovementPct > 0 ? `+${comparison.timeImprovementPct}%` : `${comparison.timeImprovementPct}%`}
                </div>
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                  {comparison.faster ? `Saved ${comparison.timeSavedMs} ms execution time` : 'Comparable latency'}
                </span>
              </div>

              {/* Cost Improvement */}
              <div className="flex flex-col items-center justify-center p-2 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Optimizer Cost Reduction
                </span>
                <div className={`text-3xl font-extrabold tracking-tight ${
                  comparison.costImprovementPct > 0
                    ? 'text-[#16A34A] dark:text-[#4ADE80]'
                    : comparison.costImprovementPct < 0
                    ? 'text-[#DC2626] dark:text-[#F87171]'
                    : 'text-[#64748B]'
                }`}>
                  {comparison.costImprovementPct > 0 ? `+${comparison.costImprovementPct}%` : `${comparison.costImprovementPct}%`}
                </div>
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                  {comparison.cheaper ? `Saved ${comparison.costSaved} planner units` : 'Comparable query cost'}
                </span>
              </div>

              {/* Status Outcome */}
              <div className="flex flex-col items-center justify-center p-2 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Optimization Verdict
                </span>
                <div className="flex items-center space-x-1.5 mt-1">
                  {comparison.faster || comparison.cheaper ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Optimization Verified</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      <span>Equivalent Behavior</span>
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-2 font-mono">
                  {original.plan?.Plan?.['Node Type']} ➔ {optimized.plan?.Plan?.['Node Type']}
                </span>
              </div>

            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Time Comparison Bar Chart */}
            <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9] mb-3">
                Execution Time Comparison (ms)
              </h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        borderColor: '#334155',
                        borderRadius: '6px',
                        color: '#F1F5F9',
                        fontSize: '11px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Original" fill="#64748B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Optimized" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cost Comparison Bar Chart */}
            <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9] mb-3">
                Estimated Query Cost Comparison
              </h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        borderColor: '#334155',
                        borderRadius: '6px',
                        color: '#F1F5F9',
                        fontSize: '11px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Original" fill="#64748B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Optimized" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Side-by-Side Detailed Breakdown Table */}
          <div className="rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9]">
                Side-by-Side Metrics & Plan Nodes
              </h3>
            </div>

            <div className="p-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-[#334155] text-left text-[#64748B] dark:text-[#94A3B8]">
                    <th className="py-2 px-3 font-medium">Metric / Node</th>
                    <th className="py-2 px-3 font-medium">Original Query</th>
                    <th className="py-2 px-3 font-medium">Optimized Query</th>
                    <th className="py-2 px-3 font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155] font-mono text-[11px]">
                  <tr>
                    <td className="py-2 px-3 text-[#172033] dark:text-[#F1F5F9] font-sans font-medium">
                      Execution Time
                    </td>
                    <td className="py-2 px-3 text-[#64748B] dark:text-[#94A3B8]">
                      {original.metrics.executionTimeMs} ms
                    </td>
                    <td className="py-2 px-3 font-bold text-[#16A34A] dark:text-[#4ADE80]">
                      {optimized.metrics.executionTimeMs} ms
                    </td>
                    <td className="py-2 px-3 font-bold text-[#16A34A] dark:text-[#4ADE80]">
                      -{comparison.timeSavedMs} ms ({comparison.timeImprovementPct}%)
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 text-[#172033] dark:text-[#F1F5F9] font-sans font-medium">
                      Estimated Cost
                    </td>
                    <td className="py-2 px-3 text-[#64748B] dark:text-[#94A3B8]">
                      {original.metrics.estimatedCost}
                    </td>
                    <td className="py-2 px-3 font-bold text-[#4F46E5] dark:text-[#818CF8]">
                      {optimized.metrics.estimatedCost}
                    </td>
                    <td className="py-2 px-3 font-bold text-[#4F46E5] dark:text-[#818CF8]">
                      -{comparison.costSaved} ({comparison.costImprovementPct}%)
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 text-[#172033] dark:text-[#F1F5F9] font-sans font-medium">
                      Primary Plan Strategy
                    </td>
                    <td className="py-2 px-3 text-[#172033] dark:text-[#F1F5F9]">
                      {original.plan?.Plan?.['Node Type'] || 'N/A'} ({original.plan?.Plan?.['Relation Name'] || 'N/A'})
                    </td>
                    <td className="py-2 px-3 font-bold text-[#16A34A] dark:text-[#4ADE80]">
                      {optimized.plan?.Plan?.['Node Type'] || 'N/A'} ({optimized.plan?.Plan?.['Relation Name'] || 'N/A'})
                    </td>
                    <td className="py-2 px-3 text-[#64748B] dark:text-[#94A3B8] font-sans">
                      {original.plan?.Plan?.['Node Type'] !== optimized.plan?.Plan?.['Node Type'] ? 'Strategy altered' : 'Identical node type'}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 text-[#172033] dark:text-[#F1F5F9] font-sans font-medium">
                      Detected Issues Count
                    </td>
                    <td className="py-2 px-3 text-[#DC2626] dark:text-[#F87171] font-bold">
                      {original.issuesCount} issues
                    </td>
                    <td className="py-2 px-3 text-[#16A34A] dark:text-[#4ADE80] font-bold">
                      {optimized.issuesCount} issues
                    </td>
                    <td className="py-2 px-3 text-[#16A34A] dark:text-[#4ADE80] font-bold">
                      -{original.issuesCount - optimized.issuesCount} issues resolved
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

