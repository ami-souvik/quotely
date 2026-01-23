import axios from 'axios';
import { create } from 'zustand';
import { ProductFamilySerializer } from '../types';
import { User } from 'oidc-client-ts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
// const API_BASE_URL = 'https://af3zoi4ci0.execute-api.ap-south-1.amazonaws.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  try {
    // Get OIDC token from sessionStorage
    const authority = process.env.NEXT_PUBLIC_COGNITO_AUTHORITY || "https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_BvTJlEG5R";
    const clientId = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || "5dqss2ei776k8n7jb9e54le8q4";
    const key = `oidc.user:${authority}:${clientId}`;
    
    // Check both session and local storage just in case config changes
    const storageString = sessionStorage.getItem(key) || localStorage.getItem(key);
    
    if (storageString) {
      const user = useAuthStore.getState().user;
      const token = user?.id_token?.toString(); // Sending ID Token for backend validation
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.debug("No auth session found", error);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
        useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;

interface AuthUser extends User {
  id: string;
  email?: string,
  org_id?: string,
  org_name?: string,
  role: 'ADMIN' | 'DEFAULT'
}

// Auth Store (Zustand)
interface AuthState {
  user: AuthUser | null;
  selectedProductFamilies: ProductFamilySerializer[];
  isLoading: boolean;

  initialize: () => void;
  setUser: (user: User) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
  setProductFamiliesForQuote: (families: ProductFamilySerializer[]) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  selectedProductFamilies: [],
  isLoading: true,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        set({ user: JSON.parse(userStr) });
      }
    } catch (error) {
      console.error("Failed to initialize auth store:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: async (user) => {
    // 1. Set initial user with OIDC data to ensure token is available for API calls
    const initialUser = {
      ...user,
      id: user.profile.sub,
      email: user.profile.email,
      // Default/Fallback values
      org_id: user.profile['custom:org_id'] as string | undefined,
      org_name: user.profile['custom:org_name'] as string | undefined,
      role: (user.profile['custom:role'] as 'ADMIN' | 'DEFAULT') || 'DEFAULT',
      
      expires_in: user.expires_in,
      expired: user.expired,
      scopes: user.scopes,
      toStorageString: user.toStorageString
    };
    console.log('Initial User');
    console.log(initialUser);
    set({ user: initialUser });
    localStorage.setItem('user', JSON.stringify(initialUser));
  },

  logout: () => {
    // Clear OIDC storage
    const authority = process.env.NEXT_PUBLIC_COGNITO_AUTHORITY || "https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_BvTJlEG5R";
    const clientId = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || "5dqss2ei776k8n7jb9e54le8q4";
    const key = `oidc.user:${authority}:${clientId}`;
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);

    set({
      user: null,
      selectedProductFamilies: [],
    });
    localStorage.removeItem('user');
    
    // Redirect to login if needed or let the app handle it
    window.location.href = '/login';
  },

  isAuthenticated: () => {
    const state = get();
    return !!state.user;
  },

  setProductFamiliesForQuote: (families) => {
    set({ selectedProductFamilies: families });
  },
}));

// Initialize the auth store on app load
if (typeof window !== 'undefined') {
  useAuthStore.getState().initialize();
}
