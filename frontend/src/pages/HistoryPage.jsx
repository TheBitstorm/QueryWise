import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  History,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Clock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  X,
  Database
} from 'lucide-react';

export default function HistoryPage() {
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Inspection modal state
  const [inspectItem, setInspectItem] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getHistory({
        status: statusFilter,
        search: search.trim(),
        limit: 50,
      });
      setRecords(res.data.records || []);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      await api.deleteHistory(itemToDelete.id);
      setItemToDelete(null);
      fetchHistory();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleViewDetail = async (id) => {
    try {
      setLoadingDetail(true);
      const res = await api.getHistoryDetail(id);
      setInspectItem(res.data);
    } catch (err) {
      alert(`Failed to load details: ${err.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-[#334155]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#172033] dark:text-[#F1F5F9]">
            Query Execution Audit & History
          </h1>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Archived SQL performance profiles, execution traces, and optimization outcomes.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F1F5F9] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queries by SQL or table..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md text-xs border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] text-[#172033] dark:text-[#F1F5F9] focus:ring-1 focus:ring-[#4F46E5] outline-none"
          />
        </form>

        {/* Status Filter */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
          <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-md border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] text-[#172033] dark:text-[#F1F5F9] px-2.5 py-1.5 focus:ring-1 focus:ring-[#4F46E5] outline-none"
          >
            <option value="all">All Statuses ({totalCount})</option>
            <option value="optimal">Optimal</option>
            <option value="warning">Warning</option>
            <option value="slow">Critical Bottlenecks</option>
          </select>
        </div>

      </div>

      {error && (
        <div className="p-3.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* History Records Table */}
      <div className="rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#111827] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {records.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] dark:bg-[#0B1120] text-[#64748B] dark:text-[#94A3B8] border-b border-[#E2E8F0] dark:border-[#334155]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">SQL Statement</th>
                  <th className="py-2.5 px-4 font-medium">Timestamp</th>
                  <th className="py-2.5 px-4 font-medium">Execution Time</th>
                  <th className="py-2.5 px-4 font-medium">Est. Cost</th>
                  <th className="py-2.5 px-4 font-medium">Health Status</th>
                  <th className="py-2.5 px-4 font-medium">Issues</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-[#172033] dark:text-[#F1F5F9] max-w-sm truncate">
                      {r.query_text}
                    </td>
                    <td className="py-3 px-4 text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap text-[11px]">
                      {new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#172033] dark:text-[#F1F5F9]">
                      {parseFloat(r.execution_time_ms).toFixed(2)} ms
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {parseFloat(r.estimated_cost).toFixed(1)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {r.performance_status === 'optimal' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          Optimal
                        </span>
                      )}
                      {r.performance_status === 'warning' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          Warning
                        </span>
                      )}
                      {r.performance_status === 'slow' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300">
                          Bottleneck
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {r.issues_count}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetail(r.id)}
                          className="px-2 py-1 rounded text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                          title="View complete analysis results"
                        >
                          View
                        </button>

                        <button
                          onClick={() => navigate(`/analyzer?rerun=${r.id}`)}
                          className="px-2 py-1 rounded text-[11px] font-medium text-[#0F766E] dark:text-[#2DD4BF] hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-colors"
                          title="Open query in Analyzer"
                        >
                          Re-run
                        </button>

                        <button
                          onClick={() => setItemToDelete(r)}
                          className="p-1 rounded text-[#DC2626] dark:text-[#F87171] hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
              {loading ? 'Loading query audit logs...' : 'No historical analysis records found.'}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-lg max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#172033] dark:text-[#F1F5F9]">
                Confirm Record Deletion
              </h3>
              <button onClick={() => setItemToDelete(null)} className="text-[#94A3B8] hover:text-[#172033]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              Are you sure you want to permanently delete this query analysis record? This action will remove its execution plan metrics and recommendations from the audit logs.
            </p>

            <div className="p-2.5 rounded bg-[#F8FAFC] dark:bg-[#0B1120] font-mono text-[11px] text-slate-800 dark:text-slate-200 border border-[#E2E8F0] dark:border-[#334155] max-h-24 overflow-y-auto">
              {itemToDelete.query_text}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-3 py-1.5 rounded-md text-xs border border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#DC2626] dark:bg-[#F87171] text-white hover:bg-red-700 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Item Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B]">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-[#F1F5F9]">
                  Historical Analysis Profile
                </h3>
              </div>
              <button onClick={() => setInspectItem(null)} className="text-[#94A3B8] hover:text-[#172033]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              
              {/* SQL Statement */}
              <div>
                <span className="font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase text-[10px] block mb-1">
                  SQL Statement
                </span>
                <div className="p-3 rounded-md bg-[#0B1120] text-[#F1F5F9] font-mono text-[11px] overflow-x-auto whitespace-pre border border-[#334155]">
                  {inspectItem.sql}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155]">
                <div>
                  <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">Execution Time</span>
                  <span className="font-mono font-bold text-sm text-[#172033] dark:text-[#F1F5F9]">
                    {inspectItem.metrics?.executionTimeMs} ms
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">Estimated Cost</span>
                  <span className="font-mono font-bold text-sm text-[#D97706] dark:text-[#FBBF24]">
                    {inspectItem.metrics?.estimatedCost}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">Rows Returned</span>
                  <span className="font-mono font-bold text-sm text-[#172033] dark:text-[#F1F5F9]">
                    {inspectItem.metrics?.rowsReturned}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">Status</span>
                  <span className="font-semibold text-xs capitalize text-[#4F46E5] dark:text-[#818CF8]">
                    {inspectItem.performanceStatus}
                  </span>
                </div>
              </div>

              {/* AI Explanation Summary */}
              {inspectItem.explanation?.summary && (
                <div className="p-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0B1120] space-y-1.5">
                  <span className="font-semibold text-[11px] text-[#4F46E5] dark:text-[#818CF8] block">
                    AI Summary & Bottleneck
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {inspectItem.explanation.summary}
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 leading-relaxed text-[11px]">
                    {inspectItem.explanation.whySlow}
                  </p>
                </div>
              )}

              {/* Raw Plan Output */}
              {inspectItem.rawPlanText && (
                <div>
                  <span className="font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase text-[10px] block mb-1">
                    EXPLAIN Output
                  </span>
                  <div className="p-3 rounded-md bg-[#0B1120] text-[#F1F5F9] font-mono text-[10px] overflow-x-auto whitespace-pre border border-[#334155] max-h-48">
                    {inspectItem.rawPlanText}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-between">
              <button
                onClick={() => {
                  const id = inspectItem.id;
                  setInspectItem(null);
                  navigate(`/analyzer?rerun=${id}`);
                }}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#4F46E5] dark:bg-[#818CF8] text-white hover:bg-indigo-700 transition-colors"
              >
                Load Query into Analyzer
              </button>

              <button
                onClick={() => setInspectItem(null)}
                className="px-3 py-1.5 rounded-md text-xs border border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

