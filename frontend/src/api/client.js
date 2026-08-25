const API_BASE = '/api';

/**
 * Universal helper for backend HTTP requests with JSON serialization and robust error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || `HTTP error ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Products
  getProducts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'ALL') query.append('category', params.category);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString();
    return request(`/products${qs ? `?${qs}` : ''}`);
  },

  getProductById: (id) => request(`/products/${id}`),

  simulateOrder: (id) => request(`/products/${id}/orders`, { method: 'POST' }),

  updateStock: (id, stockLevel) =>
    request(`/products/${id}/stock`, {
      method: 'PATCH',
      body: { stockLevel: Number(stockLevel) },
    }),

  // Manual Strategy Suggestions
  suggestPricing: (id, { triggerReason = 'MANUAL', strategy } = {}) => {
    const query = strategy ? `?strategy=${strategy}` : '';
    return request(`/products/${id}/suggest-pricing${query}`, {
      method: 'POST',
      body: { triggerReason },
    });
  },

  suggestReorder: (id, { triggerReason = 'MANUAL', strategy } = {}) => {
    const query = strategy ? `?strategy=${strategy}` : '';
    return request(`/products/${id}/suggest-reorder${query}`, {
      method: 'POST',
      body: { triggerReason },
    });
  },

  // Suggestion Queries
  getPricingSuggestions: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.productId) query.append('productId', params.productId);
    if (params.triggerReason && params.triggerReason !== 'ALL') query.append('triggerReason', params.triggerReason);
    const qs = query.toString();
    return request(`/pricing-suggestions${qs ? `?${qs}` : ''}`);
  },

  getReorderSuggestions: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.productId) query.append('productId', params.productId);
    if (params.triggerReason && params.triggerReason !== 'ALL') query.append('triggerReason', params.triggerReason);
    const qs = query.toString();
    return request(`/reorder-suggestions${qs ? `?${qs}` : ''}`);
  },

  // Suggestion Reviews (Accept / Reject)
  acceptPricingSuggestion: (id) =>
    request(`/pricing-suggestions/${id}/accept`, { method: 'PATCH' }),

  rejectPricingSuggestion: (id) =>
    request(`/pricing-suggestions/${id}/reject`, { method: 'PATCH' }),

  acceptReorderSuggestion: (id) =>
    request(`/reorder-suggestions/${id}/accept`, { method: 'PATCH' }),

  rejectReorderSuggestion: (id) =>
    request(`/reorder-suggestions/${id}/reject`, { method: 'PATCH' }),
};

export default api;
