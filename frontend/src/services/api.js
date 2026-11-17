const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Reusable HTTP client wrapper with error handling
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `HTTP error ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Request Error [${endpoint}]:`, error.message);
    throw error;
  }
}

/**
 * Health check endpoints
 */
export const healthApi = {
  checkPing: () => apiRequest('/health/ping'),
  checkReadiness: () => apiRequest('/health/ready')
};

export default {
  apiRequest,
  healthApi
};

