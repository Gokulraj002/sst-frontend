import axios from 'axios';

// IMPORTANT: Use relative baseURL ('') so all requests go through the
// Vite dev-server proxy → backend on :5001. This keeps cookies same-origin
// (SameSite=Lax) and avoids CORS preflight problems in development.
// In production set VITE_API_BASE_URL to your real API domain.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — pass through
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor
// NOTE: Do NOT use window.location.href here — that causes a full page reload.
// 401 handling is done by AuthContext (sets isAuthenticated=false) which
// causes ProtectedRoute to render <Navigate to="/login"> via React Router.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message =
        error.response.data?.error ||
        error.response.data?.message ||
        `Request failed with status ${error.response.status}`;
      return Promise.reject(new Error(message));
    } else if (error.request) {
      return Promise.reject(
        new Error('Network error — make sure the backend server is running on port 5001.')
      );
    }
    return Promise.reject(new Error(error.message));
  }
);

export default api;
