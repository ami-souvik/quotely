import axios from 'axios';
import { create } from 'zustand';
import { AuthUser, ProductFamilySerializer } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const { getState, setState } = useAuthStore;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = getState().refreshToken;
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });
          
          const { access } = response.data;
          setState({ accessToken: access });
          localStorage.setItem('accessToken', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          
          return api(originalRequest);
        } else {
            getState().logout();
        }
      } catch (refreshError) {
        getState().logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Auth Store (Zustand)
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  selectedProductFamilies: ProductFamilySerializer[];
  isLoading: boolean; // <-- Add isLoading state

  initialize: () => void; // <-- Add initialize action
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  setProductFamiliesForQuote: (families: ProductFamilySerializer[]) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  selectedProductFamilies: [],
  isLoading: true, // <-- Initialize isLoading to true

  initialize: () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const user = localStorage.getItem('user');
      if (accessToken && refreshToken && user) {
        set({
          accessToken,
          refreshToken,
          user: JSON.parse(user),
        });
      }
    } catch (error) {
      console.error("Failed to initialize auth store:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  setTokens: (access, refresh) => {
    set({ accessToken: access, refreshToken: refresh });
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  },

  setUser: (user) => {
    set({ user });
    localStorage.setItem('user', JSON.stringify(user));
  },

  logout: () => {
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      selectedProductFamilies: [],
    });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  isAuthenticated: () => {
    const state = get();
    return !!state.accessToken && !!state.user;
  },

  setProductFamiliesForQuote: (families) => {
    set({ selectedProductFamilies: families });
  },
}));

// Initialize the auth store on app load
if (typeof window !== 'undefined') {
  useAuthStore.getState().initialize();
}
