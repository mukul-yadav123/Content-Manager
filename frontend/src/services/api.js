const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'linkedin_content_studio_token';

export const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const clearAuthToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Reusable HTTP client wrapper with error handling & dual token/cookie support
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    credentials: 'include', // Automatically send and receive httpOnly cookies
    ...options,
    headers
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json();

    if (!res.ok) {
      const errorMessage = data.message || `HTTP error ${res.status}`;
      const error = new Error(errorMessage);
      error.statusCode = res.status;
      error.errors = data.errors || [];
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Request Error [${endpoint}]:`, error.message);
    throw error;
  }
}

/**
 * Authentication Endpoints
 */
export const authApi = {
  register: (payload) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  login: (payload) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  logout: () =>
    apiRequest('/auth/logout', {
      method: 'POST'
    }),

  getMe: () =>
    apiRequest('/auth/me', {
      method: 'GET'
    })
};

/**
 * Topic Management Endpoints
 */
export const topicApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.search) query.set('search', params.search);
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.priority && params.priority !== 'all') query.set('priority', params.priority);
    if (params.isActive && params.isActive !== 'all') query.set('isActive', params.isActive);
    const queryString = query.toString();
    return apiRequest(`/topics${queryString ? `?${queryString}` : ''}`);
  },

  getMetadata: () => apiRequest('/topics/categories'),

  getById: (id) => apiRequest(`/topics/${id}`),

  create: (data) =>
    apiRequest('/topics', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id, data) =>
    apiRequest(`/topics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  toggle: (id) =>
    apiRequest(`/topics/${id}/toggle`, {
      method: 'PATCH'
    }),

  delete: (id) =>
    apiRequest(`/topics/${id}`, {
      method: 'DELETE'
    })
};

/**
 * Dashboard & Analytics Endpoints
 */
export const dashboardApi = {
  getOverview: () => apiRequest('/dashboard/overview'),

  updateDraftStatus: (id, status) =>
    apiRequest(`/dashboard/posts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),

  toggleInteresting: (id) =>
    apiRequest(`/dashboard/news/${id}/toggle-interesting`, {
      method: 'PATCH'
    })
};

/**
 * News Discovery Endpoints
 */
export const newsApi = {
  discover: (payload) =>
    apiRequest('/news/discover', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.topicId && params.topicId !== 'all') query.set('topicId', params.topicId);
    if (params.publisher && params.publisher !== 'all') query.set('publisher', params.publisher);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.isInteresting && params.isInteresting !== 'all') query.set('isInteresting', params.isInteresting);
    if (params.freshness && params.freshness !== 'all') query.set('freshness', params.freshness);
    if (params.minScore) query.set('minScore', params.minScore);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params.search) query.set('search', params.search);
    const queryString = query.toString();
    return apiRequest(`/news${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => apiRequest(`/news/${id}`),

  evaluate: (id, payload = {}) =>
    apiRequest(`/news/${id}/evaluate`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  evaluateBatch: (payload = {}) =>
    apiRequest('/news/evaluate-batch', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  approve: (id) =>
    apiRequest(`/news/${id}/approve`, {
      method: 'PATCH'
    }),

  reject: (id, reason = '') =>
    apiRequest(`/news/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    }),

  research: (id) =>
    apiRequest(`/news/${id}/research`, {
      method: 'POST'
    }),

  getResearch: (id) => apiRequest(`/news/${id}/research`),

  updateResearch: (id, payload = {}) =>
    apiRequest(`/news/${id}/research`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  update: (id, payload) =>
    apiRequest(`/news/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  delete: (id) =>
    apiRequest(`/news/${id}`, {
      method: 'DELETE'
    })
};

/**
 * Content Studio & Post Generation Endpoints
 */
export const studioApi = {
  generate: (payload) =>
    apiRequest('/studio/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getDrafts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.topicId) query.set('topicId', params.topicId);
    if (params.newsArticleId) query.set('newsArticleId', params.newsArticleId);
    if (params.search) query.set('search', params.search);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    const qs = query.toString();
    return apiRequest(`/studio/drafts${qs ? `?${qs}` : ''}`);
  },

  getDraftById: (id) => apiRequest(`/studio/drafts/${id}`),

  selectVariation: (id, payload) =>
    apiRequest(`/studio/drafts/${id}/select-variation`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  regenerateHooks: (id, payload = {}) =>
    apiRequest(`/studio/drafts/${id}/regenerate-hooks`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  regeneratePost: (id, payload = {}) =>
    apiRequest(`/studio/drafts/${id}/regenerate-post`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  changeAngle: (id, payload) =>
    apiRequest(`/studio/drafts/${id}/angle`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  humanize: (id, payload = {}) =>
    apiRequest(`/studio/drafts/${id}/humanize`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  approve: (id) =>
    apiRequest(`/studio/drafts/${id}/approve`, {
      method: 'POST'
    }),

  revertVersion: (id, payload) =>
    apiRequest(`/studio/drafts/${id}/revert-version`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  updateDraft: (id, payload) =>
    apiRequest(`/studio/drafts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteDraft: (id) =>
    apiRequest(`/studio/drafts/${id}`, {
      method: 'DELETE'
    })
};

/**
 * Writing Profile Endpoints
 */
export const profileApi = {
  getProfile: () => apiRequest('/profile'),

  analyzeSamples: (payload) =>
    apiRequest('/profile/analyze', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateProfile: (payload) =>
    apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  addSample: (sample) =>
    apiRequest('/profile/samples', {
      method: 'POST',
      body: JSON.stringify({ sample })
    }),

  handleSuggestion: (id, action = 'accept') =>
    apiRequest(`/profile/suggestions/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action })
    }),

  resetDefault: () =>
    apiRequest('/profile/reset-default', {
      method: 'POST'
    })
};

/**
 * AI Media Generation Endpoints
 */
export const mediaApi = {
  generateImage: (payload) =>
    apiRequest('/media/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  generateVariation: (draftId, payload) =>
    apiRequest(`/media/drafts/${draftId}/variation`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  generatePrompt: (payload) =>
    apiRequest('/media/generate-prompt', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getDraftMedia: (draftId) => apiRequest(`/media/drafts/${draftId}`),

  selectPreferred: (id) =>
    apiRequest(`/media/${id}/select`, {
      method: 'PATCH'
    }),

  delete: (id) =>
    apiRequest(`/media/${id}`, {
      method: 'DELETE'
    })
};

/**
 * Health check endpoints
 */
export const healthApi = {
  checkPing: () => apiRequest('/health/ping'),
  checkReadiness: () => apiRequest('/health/ready')
};

export default {
  apiRequest,
  authApi,
  topicApi,
  newsApi,
  studioApi,
  profileApi,
  mediaApi,
  dashboardApi,
  healthApi,
  getAuthToken,
  setAuthToken,
  clearAuthToken
};
