import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  register: (email: string, password: string, name: string) =>
    api.post('/api/auth/register', { email, password, name }),

  getMe: () => api.get('/api/auth/me'),
};

export const keysApi = {
  getAll: () => api.get('/api/keys'),

  create: (name: string) => api.post('/api/keys', { label: name }),

  update: (id: string, data: { active?: boolean; name?: string }) =>
    api.put(`/api/keys/${id}`, {
      ...(data.name !== undefined ? { label: data.name } : {}),
      ...(data.active !== undefined ? { isActive: data.active } : {}),
    }),

  delete: (id: string) => api.delete(`/api/keys/${id}`),
};

export const imagesApi = {
  getFormats: () => api.get('/api/images/formats'),

  convert: (formData: FormData) =>
    api.post('/api/images/convert', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

export const billingApi = {
  getSubscription: () => api.get('/api/billing/subscription'),

  subscribe: (plan: string) =>
    api.post('/api/billing/subscription', { plan }),

  cancel: () => api.delete('/api/billing/subscription'),
};

export default api;
