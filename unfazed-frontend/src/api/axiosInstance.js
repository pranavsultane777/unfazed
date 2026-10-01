import axios from 'axios';
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const axiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});
axiosInstance.interceptors.request.use((config) => {
  const path = config.url || '';
  const isClientArea = window.location.pathname.startsWith('/client');
  const isClientRequest = isClientArea || path.startsWith('/client-auth') || path.startsWith('/client-portal');
  const token = isClientRequest
    ? localStorage.getItem('clientToken')
    : localStorage.getItem('therapistToken') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    if (status === 401) {
      const clientArea = window.location.pathname.startsWith('/client');
      window.dispatchEvent(new CustomEvent(clientArea ? 'client-auth-expired' : 'auth-expired'));
    }
    if (status === 403 && data?.code === 'FEATURE_LOCKED') {
      window.dispatchEvent(new CustomEvent('feature-locked', { detail: data }));
    }
    return Promise.reject(error);
  }
);
export default axiosInstance;