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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) {
        const user = JSON.parse(stored) as AuthUser;
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
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
      const user: AuthUser = {
        id: data.userId,
        email: data.email,
        displayName: data.displayName || email.split('@')[0],
      };

      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch {
      return { success: false, error: 'Server unreachable. Check if the backend is running.' };
    }
  },

  logout: () => {
    localStorage.removeItem(AUTH_KEY);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
