const API_BASE = '/api';

/**
 * Handle API JSON responses with error throwing
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.detail = data.detail;
      err.hint = data.hint;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.status) throw err;
    throw new Error(`Network error connecting to QueryWise API: ${err.message}`);
  }
}

export const api = {
  // Query Analysis
  analyzeQuery: (sql, explainOnly = false) =>
    request('/analyze', {
      method: 'POST',
      body: JSON.stringify({ sql, explainOnly }),
    }),

  // Query Comparison
  compareQueries: (originalSql, optimizedSql) =>
    request('/compare', {
      method: 'POST',
      body: JSON.stringify({ originalSql, optimizedSql }),
    }),

  // History
  getHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/history${query ? `?${query}` : ''}`);
  },

  getHistoryDetail: (id) => request(`/history/${id}`),

  deleteHistory: (id) =>
    request(`/history/${id}`, {
      method: 'DELETE',
    }),

  // Dashboard Aggregates
  getDashboard: () => request('/dashboard'),

  // Health & Diagnostic Status
  getHealth: () => request('/health'),

  // Demo Sample Queries
  getSamples: () => request('/demo/samples'),

  // Demo Database Schema Information
  getSchema: () => request('/demo/schema'),
};

