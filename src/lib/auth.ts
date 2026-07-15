'use client';

import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hydrate: () => void;
}

const AUTH_KEY = 'ama_auth_user';
const TOKEN_KEY = 'ama_auth_token';

/** Read the stored bearer token (client only). */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Authorization header for authenticated API calls. Spread into a fetch
 * `headers` object: `{ ...authHeaders(), 'Content-Type': 'application/json' }`.
 */
export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      // Require BOTH a user record and a token — a user blob alone (e.g. hand-set
      // in devtools) is not a valid session without a server-signed token.
      if (stored && token) {
        const user = JSON.parse(stored) as AuthUser;
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    try {
      const resp = await fetch(`/api/crewai/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        return { success: false, error: data.detail || 'Invalid credentials' };
      }

      const data = await resp.json();
      if (!data.token) {
        return { success: false, error: 'Server did not return an auth token.' };
      }
      const user: AuthUser = {
        id: data.userId,
        email: data.email,
        displayName: data.displayName || email.split('@')[0],
      };

      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, data.token);
      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch {
      return { success: false, error: 'Server unreachable. Check if the backend is running.' };
    }
  },

  logout: () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
