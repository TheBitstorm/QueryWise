import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Activity,
  Clock,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const summary = data?.summary || {
    totalQueries: 0,
    avgExecutionTimeMs: 0,
    slowQueriesCount: 0,
    totalRecommendationsCount: 0,
  };

  const healthData = data?.healthDistribution || [
    { name: 'Optimal', value: 0, color: '#16A34A' },
    { name: 'Warning', value: 0, color: '#D97706' },
    { name: 'Bottleneck', value: 0, color: '#DC2626' },
  ];

  const trendData = data?.performanceTrend || [];
  const recentQueries = data?.recentQueries || [];

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Hero Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-[#334155]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172033] dark:text-[#F1F5F9]">
            Database Performance Intelligence
          </h1>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Real-time execution analytics, plan bottleneck detection, and AI recommendations.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F1F5F9] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/analyzer"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#4F46E5] dark:bg-[#818CF8] text-white hover:bg-indigo-700 dark:hover:bg-indigo-500 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Analyse New Query</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>Failed to load dashboard metrics: {error}</span>
          <button onClick={fetchDashboardData} className="underline font-semibold ml-2">Retry</button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Queries */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] text-xs">
            <span className="font-medium">Total Queries Analysed</span>
            <Activity className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-[#172033] dark:text-[#F1F5F9]">
              {loading ? '...' : summary.totalQueries}
            </span>
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">logged</span>
          </div>
        </div>

        {/* Avg Execution Time */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] text-xs">
            <span className="font-medium">Avg Execution Time</span>
            <Clock className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-[#172033] dark:text-[#F1F5F9]">
              {loading ? '...' : `${summary.avgExecutionTimeMs}`}
            </span>
            <span className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">ms</span>
          </div>
        </div>

        {/* Slow Queries */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] text-xs">
            <span className="font-medium">Slow Queries Detected</span>
            <AlertTriangle className="w-4 h-4 text-[#DC2626] dark:text-[#F87171]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-[#DC2626] dark:text-[#F87171]">
              {loading ? '...' : summary.slowQueriesCount}
            </span>
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">bottlenecks</span>
          </div>
        </div>

        {/* Optimization Recommendations */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] text-xs">
            <span className="font-medium">Optimizations Generated</span>
            <Lightbulb className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-[#172033] dark:text-[#F1F5F9]">
              {loading ? '...' : summary.totalRecommendationsCount}
            </span>
            <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">suggestions</span>
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Performance Overview Bar Chart */}
        <div className="lg:col-span-2 p-4 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9]">
                Query Performance Timeline
              </h2>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Execution latency (ms) across recent query executions
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#4F46E5] dark:text-[#818CF8]">EXPLAIN ANALYZE</span>
          </div>

          <div className="h-60 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <Bar dataKey="timeMs" name="Execution Time (ms)" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                <Activity className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <span>No query data recorded yet. Submit a query in the Analyzer!</span>
              </div>
            )}
          </div>
        </div>

        {/* Query Health Distribution Chart */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827]">
          <div className="mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9]">
              Query Health Distribution
            </h2>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              Optimal vs warnings vs critical bottlenecks
            </p>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            {summary.totalQueries > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {healthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      borderColor: '#334155',
                      borderRadius: '6px',
                      color: '#F1F5F9',
                      fontSize: '11px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(val) => <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-center text-[#64748B] dark:text-[#94A3B8]">
                No queries analyzed yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Recent Query Analyses Table */}
      <div className="rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9]">
            Recent Query Analyses
          </h2>
          <Link
            to="/history"
            className="flex items-center space-x-1 text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline"
          >
            <span>View All History</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {recentQueries.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] dark:bg-[#0B1120] text-[#64748B] dark:text-[#94A3B8] border-b border-[#E2E8F0] dark:border-[#334155]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">SQL Query</th>
                  <th className="py-2.5 px-4 font-medium">Execution Time</th>
                  <th className="py-2.5 px-4 font-medium">Est. Cost</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Issues</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
                {recentQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#172033] dark:text-[#F1F5F9] max-w-xs truncate">
                      {q.query_text}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {parseFloat(q.execution_time_ms).toFixed(2)} ms
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {parseFloat(q.estimated_cost).toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4">
                      {q.performance_status === 'optimal' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          Optimal
                        </span>
                      )}
                      {q.performance_status === 'warning' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          Warning
                        </span>
                      )}
                      {q.performance_status === 'slow' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300">
                          Bottleneck
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[#64748B] dark:text-[#94A3B8] font-mono text-[11px]">
                      {q.issues_count}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/analyzer?rerun=${q.id}`)}
                        className="inline-flex items-center space-x-1 text-[#4F46E5] dark:text-[#818CF8] hover:underline text-[11px] font-medium"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
              No queries logged yet. Start by testing a query in the Query Analyzer!
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

