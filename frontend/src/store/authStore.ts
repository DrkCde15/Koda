import { create } from "zustand";

import { User } from "@/types";
import { clearTokens, getStoredTokens, storeTokens } from "@/lib/axios";
import { AuthData } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (auth: AuthData) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const token = getStoredTokens().access;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: Boolean(token),
  setAuth: (auth) => {
    storeTokens(auth);
    set({ user: auth.user, isAuthenticated: true });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },
}));
