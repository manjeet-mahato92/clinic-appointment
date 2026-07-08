import axios from 'axios';

const productionApiUrl = 'https://clinic-appointment-production-126a.up.railway.app/api';
const configuredApiUrl = import.meta.env.VITE_API_URL;

const baseURL = import.meta.env.PROD
  ? configuredApiUrl && !configuredApiUrl.includes('localhost')
    ? configuredApiUrl
    : productionApiUrl
  : configuredApiUrl || 'http://localhost:4000/api';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ctm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ctm_token');
      localStorage.removeItem('ctm_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
