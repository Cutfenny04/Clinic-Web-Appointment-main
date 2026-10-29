import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Standard Axios instance configured for JanjiCare backend
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Attach Authorization Bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('janjicare_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with graceful fallback
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Server returned HTTP status out of 2xx range
      console.warn(`[API Error ${error.response.status}]`, error.response.data);
      return Promise.reject(error);
    } else if (error.request) {
      // Backend not running yet
      console.info('[API Backend Offline - Ready for Express integration]', error.message);
      return Promise.reject(new Error('Backend server is not reachable. Ensure Express API is running at ' + API_BASE_URL));
    } else {
      return Promise.reject(error);
    }
  }
);

/**
 * API Service wrapper
 */
export const apiService = {
  get: (url, params) => api.get(url, { params }),
  post: (url, data) => api.post(url, data),
  put: (url, data) => api.put(url, data),
  patch: (url, data) => api.patch(url, data),
  delete: (url) => api.delete(url),
};

export default api;
