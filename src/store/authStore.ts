import { create } from 'zustand';
import { AppUser } from '../api/authApi';

interface AuthState {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  updateUser: (patch: Partial<AppUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  updateUser: (patch) => set((state) => ({ user: state.user ? { ...state.user, ...patch } : null })),
  logout: () => set({ user: null }),
}));
