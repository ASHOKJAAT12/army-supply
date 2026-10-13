import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('logis_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle global 401 → clear session
// Skip redirect if already on an auth page to prevent redirect loops
const PUBLIC_PATHS = ['/login', '/register'];
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            const isPublicPage = PUBLIC_PATHS.some((p) => window.location.pathname.startsWith(p));
            if (!isPublicPage) {
                localStorage.removeItem('logis_token');
                localStorage.removeItem('logis_user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
