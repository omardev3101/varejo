import axios from 'axios';

const isElectron = navigator.userAgent.toLowerCase().includes('electron');
const isDev = import.meta.env.MODE === 'development';

const getBaseURL = () => {
    if (isDev) {
        return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    }
    if (isElectron) {
        return 'https://pessistemas.vps-kinghost.net/varejo/api';
    }
    return '/varejo/api';
};

const api = axios.create({
    baseURL: getBaseURL()
});

api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('@VarejoPro:token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            sessionStorage.removeItem('@VarejoPro:token');
            sessionStorage.removeItem('@VarejoPro:user');
            // Redireciona para o login se a sessão expirou
            window.location.href = import.meta.env.BASE_URL || '/';
        }
        return Promise.reject(error);
    }
);

export default api;
